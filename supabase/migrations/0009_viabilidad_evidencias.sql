-- =====================================================================
-- ZYRA — 0009_viabilidad_evidencias.sql
-- Evidencias de viabilidad subidas por participantes asignados.
--
-- Problema: el flujo de evidencias existente autoriza por pertenencia al
-- proyecto (`registrar_evidencia` + RLS de `proyectos`/`evidencias`), pero
-- un inspector/especialista de viabilidad puede NO ser miembro del equipo
-- (off-team). Además la escritura directa en `viabilidad_evidencias` es
-- solo-admin.
--
-- Solución acotada: una RPC `security definer` que registra la evidencia y
-- la enlaza a la revisión en una sola transacción, autorizando EXCLUSIVAMENTE
-- al participante del recurso concreto (respuesta/acción/validación) al que
-- está asignado. NO convierte la participación en viabilidad en membresía
-- general del proyecto: no se relaja `registrar_evidencia` ni las RLS de
-- `proyectos`/`evidencias`, y la evidencia general (sin destino) sigue siendo
-- solo-admin.
-- =====================================================================
begin;

create or replace function public.registrar_evidencia_viabilidad(
  p_revision_id integer,
  p_object_key text,
  p_pregunta_id integer default null,
  p_accion_id integer default null,
  p_validacion_id integer default null,
  p_descripcion text default null,
  p_tipo text default 'foto',
  p_content_type text default null,
  p_size_bytes bigint default null,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_rev record;
  v_respuesta_id integer;
  v_evidencia_id uuid;
  v_link_id integer;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_rev from viabilidad_revisiones
   where id_revision_viabilidad = p_revision_id;
  if not found then
    raise exception 'Revisión de viabilidad % no existe', p_revision_id;
  end if;
  if v_rev.estado in ('finalizada','anulada') then
    raise exception 'La revisión está % y no admite evidencias', v_rev.estado;
  end if;
  if p_object_key is null or length(trim(p_object_key)) = 0 then
    raise exception 'object_key es obligatorio';
  end if;
  if num_nonnulls(p_pregunta_id, p_accion_id, p_validacion_id) > 1 then
    raise exception 'La evidencia solo puede asociarse a un destino';
  end if;

  if p_pregunta_id is not null then
    -- Destino: pregunta del cuestionario (típicamente tipo 'evidencia').
    if not (public.es_admin() or v_rev.asignado_empleado_id = public.mi_empleado_id()) then
      raise exception 'Sin permiso para adjuntar evidencia a la pregunta %', p_pregunta_id;
    end if;
    if v_rev.estado not in ('borrador','en_progreso') then
      raise exception 'Solo se pueden adjuntar evidencias al cuestionario abierto (estado %)', v_rev.estado;
    end if;
    -- La pregunta debe pertenecer a la plantilla de la revisión.
    if not exists (
      select 1 from viabilidad_preguntas pg
        join viabilidad_secciones s on s.id_seccion_viabilidad = pg.seccion_id
      where pg.id_pregunta_viabilidad = p_pregunta_id
        and s.plantilla_id = v_rev.plantilla_id
    ) then
      raise exception 'La pregunta % no pertenece a la plantilla de la revisión', p_pregunta_id;
    end if;
    -- Resuelve (o crea) la respuesta a la que se ancla la evidencia. El valor
    -- `true` marca la pregunta de evidencia como respondida para el motor.
    select id_respuesta_viabilidad into v_respuesta_id
      from viabilidad_respuestas
     where revision_id = p_revision_id and pregunta_id = p_pregunta_id;
    if v_respuesta_id is null then
      insert into viabilidad_respuestas(revision_id, pregunta_id, valor, empleado_id)
      values (p_revision_id, p_pregunta_id, 'true'::jsonb, public.mi_empleado_id())
      returning id_respuesta_viabilidad into v_respuesta_id;
    end if;
  elsif p_accion_id is not null then
    if v_rev.estado <> 'evaluada' then
      raise exception 'Solo se pueden adjuntar evidencias a acciones durante la resolución (estado %)', v_rev.estado;
    end if;
    if not (public.es_admin() or exists (
      select 1 from viabilidad_acciones a
       where a.id_accion_viabilidad = p_accion_id
         and a.revision_id = p_revision_id
         and a.responsable_empleado_id = public.mi_empleado_id()
    )) then
      raise exception 'Sin permiso para adjuntar evidencia a la acción %', p_accion_id;
    end if;
  elsif p_validacion_id is not null then
    if v_rev.estado <> 'evaluada' then
      raise exception 'Solo se pueden adjuntar evidencias a validaciones durante la resolución (estado %)', v_rev.estado;
    end if;
    if not (public.es_admin() or exists (
      select 1 from viabilidad_validaciones v
       where v.id_validacion_viabilidad = p_validacion_id
         and v.revision_id = p_revision_id
         and v.especialista_empleado_id = public.mi_empleado_id()
    )) then
      raise exception 'Sin permiso para adjuntar evidencia a la validación %', p_validacion_id;
    end if;
  else
    -- Evidencia general de la revisión: solo admin (evita escrituras amplias
    -- por el mero hecho de participar).
    if not public.es_admin() then
      raise exception 'Solo un administrador puede adjuntar evidencia general a la revisión';
    end if;
  end if;

  insert into evidencias(proyecto_id, empleado_id, object_key, descripcion, tipo, content_type, size_bytes)
  values (v_rev.proyecto_id, public.mi_empleado_id(), p_object_key, p_descripcion, p_tipo, p_content_type, p_size_bytes)
  returning id_evidencia into v_evidencia_id;

  insert into viabilidad_evidencias(revision_id, respuesta_id, accion_id, validacion_id, evidencia_id)
  values (p_revision_id, v_respuesta_id, p_accion_id, p_validacion_id, v_evidencia_id)
  returning id_viabilidad_evidencia into v_link_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'registrar_evidencia_viabilidad', 'viabilidad_evidencias',
          v_link_id::text,
          jsonb_build_object('revision_id', p_revision_id, 'evidencia_id', v_evidencia_id,
                             'respuesta_id', v_respuesta_id, 'accion_id', p_accion_id,
                             'validacion_id', p_validacion_id));

  v_cached := jsonb_build_object(
    'id_evidencia', v_evidencia_id,
    'id_viabilidad_evidencia', v_link_id,
    'revision_id', p_revision_id,
    'respuesta_id', v_respuesta_id,
    'proyecto_id', v_rev.proyecto_id,
    'object_key', p_object_key
  );
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'registrar_evidencia_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

revoke all on function public.registrar_evidencia_viabilidad(integer, text, integer, integer, integer, text, text, text, bigint, uuid) from public, anon;
grant execute on function public.registrar_evidencia_viabilidad(integer, text, integer, integer, integer, text, text, text, bigint, uuid) to authenticated;

commit;
