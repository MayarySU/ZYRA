-- =====================================================================
-- ZYRA — 0011_viabilidad_permisos.sql
-- Endurecimiento de la autorización de las RPC de viabilidad.
--
-- Bug (fail-open): varios guards comparaban el propietario del recurso con
-- `mi_empleado_id()` sin comprobar que el propietario no fuese NULL, p. ej.
--
--     if not (public.es_admin() or v_val.especialista_empleado_id = public.mi_empleado_id()) then
--       raise exception 'Sin permiso ...';
--     end if;
--
-- Cuando el propietario es NULL (revisión sin asignado, acción sin responsable
-- o validación sin especialista), `NULL = mi_empleado_id()` es NULL; `false or
-- NULL` es NULL y `not NULL` es NULL, de modo que el `if` NO entra y la RPC
-- continuaba. Resultado: cualquier usuario autenticado (no admin) podía
-- responder, entregar, resolver acciones o resolver validaciones ajenas sin
-- estar asignado.
--
-- Fix: exigir explícitamente que el propietario sea NO NULL antes de comparar.
-- Las cuatro funciones se redefinen por completo (misma firma) para preservar
-- idempotencia del aplicador de migraciones.
-- =====================================================================
begin;

create or replace function public.guardar_respuesta_viabilidad(
  p_revision_id integer,
  p_pregunta_id integer,
  p_valor jsonb,
  p_version integer default null,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_rev record;
  v_actual integer;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_rev from viabilidad_revisiones where id_revision_viabilidad = p_revision_id;
  if not found then raise exception 'Revisión % no existe', p_revision_id; end if;
  if not (public.es_admin()
          or (v_rev.asignado_empleado_id is not null
              and v_rev.asignado_empleado_id = public.mi_empleado_id())) then
    raise exception 'Sin permiso para responder la revisión %', p_revision_id;
  end if;
  if v_rev.estado not in ('borrador','en_progreso') then
    raise exception 'El cuestionario ya fue entregado (estado %)', v_rev.estado;
  end if;

  select version into v_actual from viabilidad_respuestas
   where revision_id = p_revision_id and pregunta_id = p_pregunta_id;
  if p_version is not null and v_actual is not null and v_actual <> p_version then
    raise exception 'CONFLICTO: la respuesta fue modificada en otro dispositivo (versión %)', v_actual;
  end if;

  insert into viabilidad_respuestas(revision_id, pregunta_id, valor, empleado_id, operation_id)
  values (p_revision_id, p_pregunta_id, p_valor, public.mi_empleado_id(), p_operation_id)
  on conflict (revision_id, pregunta_id) do update
    set valor = excluded.valor,
        empleado_id = public.mi_empleado_id(),
        version = viabilidad_respuestas.version + 1,
        operation_id = excluded.operation_id;

  if v_rev.estado = 'borrador' then
    update viabilidad_revisiones set estado = 'en_progreso', version = version + 1
     where id_revision_viabilidad = p_revision_id;
  end if;

  v_cached := jsonb_build_object('id_revision_viabilidad', p_revision_id, 'pregunta_id', p_pregunta_id);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'guardar_respuesta_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.entregar_revision_viabilidad(
  p_revision_id integer,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_rev record;
  v_senales jsonb;
  v_resultado text;
  v_estado_final text;
  v_pend integer;
begin
  perform set_config('zyra.rpc_viabilidad', 'on', true);
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_rev from viabilidad_revisiones where id_revision_viabilidad = p_revision_id;
  if not found then raise exception 'Revisión % no existe', p_revision_id; end if;
  if not (public.es_admin()
          or (v_rev.asignado_empleado_id is not null
              and v_rev.asignado_empleado_id = public.mi_empleado_id())) then
    raise exception 'Sin permiso sobre la revisión %', p_revision_id;
  end if;
  if v_rev.estado not in ('borrador','en_progreso') then
    raise exception 'La revisión no admite entrega en estado %', v_rev.estado;
  end if;

  perform public._viabilidad_validar_obligatorias(p_revision_id);

  v_senales := public._viabilidad_senales(p_revision_id);
  v_resultado := public._viabilidad_resultado(v_senales);

  -- Congelar el cuestionario ANTES de crear hijas.
  update viabilidad_revisiones
     set estado = 'evaluada', resultado_evaluacion = v_resultado, resultado_calculado = v_senales,
         evaluada_por = public.mi_empleado_id(), evaluada_en = now(), version = version + 1
   where id_revision_viabilidad = p_revision_id;

  -- Crear obligaciones solo si el resultado se resuelve con acciones/validaciones.
  if v_resultado in ('apto_con_acciones','requiere_validacion') then
    insert into viabilidad_acciones(revision_id, descripcion, obligatoria)
    select p_revision_id, x.descripcion, coalesce(x.obligatoria, true)
    from (
      select distinct coalesce(s->>'descripcion_accion', s->>'mensaje') as descripcion,
             (s->>'obligatoria')::boolean as obligatoria
      from jsonb_array_elements(v_senales) s
      where s->>'efecto' = 'accion_requerida'
        and coalesce(s->>'descripcion_accion', s->>'mensaje') is not null
    ) x
    where not exists (select 1 from viabilidad_acciones a
                      where a.revision_id = p_revision_id and a.descripcion = x.descripcion);

    insert into viabilidad_validaciones(revision_id, tipo, creada_por)
    select p_revision_id, x.tipo, public.mi_empleado_id()
    from (
      select distinct s->>'validacion_tipo' as tipo
      from jsonb_array_elements(v_senales) s
      where s->>'efecto' = 'validacion_especializada' and s->>'validacion_tipo' is not null
    ) x
    where not exists (select 1 from viabilidad_validaciones v
                      where v.revision_id = p_revision_id and v.tipo = x.tipo);
  end if;

  select (select count(*) from viabilidad_acciones
           where revision_id = p_revision_id and obligatoria and estado <> 'validada')
       + (select count(*) from viabilidad_validaciones
           where revision_id = p_revision_id and estado = 'pendiente')
    into v_pend;

  if v_pend = 0 then
    update viabilidad_revisiones
       set estado = 'finalizada',
           resultado_final = case when v_resultado = 'no_apto' then 'no_apto' else 'apto' end,
           finalizada_por = public.mi_empleado_id(), finalizada_en = now(), version = version + 1
     where id_revision_viabilidad = p_revision_id;
    v_estado_final := 'finalizada';
  else
    v_estado_final := 'evaluada';
  end if;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'entregar_revision_viabilidad', 'viabilidad_revisiones',
          p_revision_id::text, jsonb_build_object('resultado', v_resultado, 'estado', v_estado_final));

  v_cached := jsonb_build_object('id_revision_viabilidad', p_revision_id,
    'estado', v_estado_final, 'resultado_evaluacion', v_resultado);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'entregar_revision_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.resolver_accion_viabilidad(
  p_accion_id integer,
  p_estado text,
  p_observaciones text default null,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_acc record;
  v_rev record;
  v_estado_final text;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;
  if p_estado not in ('pendiente','en_progreso','completada','validada','rechazada') then
    raise exception 'Estado de acción inválido: %', p_estado;
  end if;

  select * into v_acc from viabilidad_acciones where id_accion_viabilidad = p_accion_id;
  if not found then raise exception 'Acción % no existe', p_accion_id; end if;
  select * into v_rev from viabilidad_revisiones where id_revision_viabilidad = v_acc.revision_id;
  if v_rev.estado <> 'evaluada' then raise exception 'La revisión no está en resolución'; end if;
  if not (public.es_admin()
          or (v_acc.responsable_empleado_id is not null
              and v_acc.responsable_empleado_id = public.mi_empleado_id())) then
    raise exception 'Sin permiso sobre la acción %', p_accion_id;
  end if;

  update viabilidad_acciones
     set estado = p_estado,
         observaciones = coalesce(p_observaciones, observaciones),
         validada_por = case when p_estado = 'validada' then public.mi_empleado_id() else validada_por end,
         validada_en  = case when p_estado = 'validada' then now() else validada_en end,
         version = version + 1
   where id_accion_viabilidad = p_accion_id;

  v_estado_final := public._viabilidad_intentar_cerrar(v_acc.revision_id);

  v_cached := jsonb_build_object('id_accion_viabilidad', p_accion_id, 'estado', p_estado,
    'revision_estado', v_estado_final);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'resolver_accion_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.resolver_validacion_viabilidad(
  p_validacion_id integer,
  p_estado text,
  p_observaciones text default null,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_val record;
  v_rev record;
  v_estado_final text;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;
  if p_estado not in ('aprobada','rechazada') then
    raise exception 'Estado de validación inválido: %', p_estado;
  end if;

  select * into v_val from viabilidad_validaciones where id_validacion_viabilidad = p_validacion_id;
  if not found then raise exception 'Validación % no existe', p_validacion_id; end if;
  select * into v_rev from viabilidad_revisiones where id_revision_viabilidad = v_val.revision_id;
  if v_rev.estado <> 'evaluada' then raise exception 'La revisión no está en resolución'; end if;
  if not (public.es_admin()
          or (v_val.especialista_empleado_id is not null
              and v_val.especialista_empleado_id = public.mi_empleado_id())) then
    raise exception 'Sin permiso sobre la validación %', p_validacion_id;
  end if;

  update viabilidad_validaciones
     set estado = p_estado,
         observaciones = coalesce(p_observaciones, observaciones),
         resuelta_en = now(),
         version = version + 1
   where id_validacion_viabilidad = p_validacion_id;

  v_estado_final := public._viabilidad_intentar_cerrar(v_val.revision_id);

  v_cached := jsonb_build_object('id_validacion_viabilidad', p_validacion_id, 'estado', p_estado,
    'revision_estado', v_estado_final);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'resolver_validacion_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

commit;
