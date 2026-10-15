-- =====================================================================
-- ZYRA — 0004_functions.sql
-- RPC/transacciones de negocio. La autoridad vive aquí, no en React.
-- Idempotencia mediante operaciones_procesadas(operation_id).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Helpers de idempotencia (internos)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public._idempotente_leer(p_operation_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select resultado from operaciones_procesadas where operation_id = p_operation_id;
$$;

create or replace function public._idempotente_guardar(p_operation_id uuid, p_tipo text, p_resultado jsonb)
returns void language sql volatile security definer set search_path = public as $$
  insert into operaciones_procesadas(operation_id, tipo, resultado)
  values (p_operation_id, p_tipo, p_resultado)
  on conflict (operation_id) do nothing;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- _otorgar_puntos (interno; NO expuesto al cliente)
-- Idempotente por (empleado_id, proyecto_id, tipo_evento).
-- ─────────────────────────────────────────────────────────────────────
create or replace function public._otorgar_puntos(
  p_empleado_id integer,
  p_proyecto_id integer,
  p_cantidad integer,
  p_motivo text,
  p_tipo_evento text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into puntos_historial(empleado_id, proyecto_id, cantidad_puntos, motivo, tipo_evento)
  values (p_empleado_id, p_proyecto_id, p_cantidad, p_motivo, p_tipo_evento)
  on conflict (empleado_id, proyecto_id, tipo_evento) where proyecto_id is not null do nothing;
end;
$$;

revoke all on function public._idempotente_leer(uuid) from public, anon, authenticated;
revoke all on function public._idempotente_guardar(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public._otorgar_puntos(integer, integer, integer, text, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- generar_checklist(proyecto): copia la plantilla del servicio del proyecto
-- a proyecto_materiales + checklists + checklist_detalle.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.generar_checklist(
  p_proyecto_id integer,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_proyecto record;
  v_plantilla_id integer;
  v_checklist_id integer;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;
  if not (public.es_admin() or public.es_miembro_proyecto(p_proyecto_id)) then
    raise exception 'Sin permiso sobre el proyecto %', p_proyecto_id;
  end if;

  -- Ya existe checklist: devolverlo
  select id_checklist into v_checklist_id from checklists where proyecto_id = p_proyecto_id;
  if v_checklist_id is null then
    insert into checklists(proyecto_id, estado) values (p_proyecto_id, 'pendiente')
    returning id_checklist into v_checklist_id;
  end if;

  -- Plantilla asociada al servicio
  select cs.id_checklist_servicio into v_plantilla_id
  from checklist_servicio cs
  where cs.servicio_id = v_proyecto.servicio_id
  order by cs.id_checklist_servicio
  limit 1;

  if v_plantilla_id is not null then
    -- proyecto_materiales
    insert into proyecto_materiales(proyecto_id, material_id, cantidad_requerida)
    select p_proyecto_id, d.material_id, d.cantidad_requerida
    from checklist_servicio_detalle d
    where d.checklist_servicio_id = v_plantilla_id
    on conflict (proyecto_id, material_id) do nothing;

    -- checklist_detalle
    insert into checklist_detalle(checklist_id, material_id, cantidad_requerida)
    select v_checklist_id, d.material_id, d.cantidad_requerida
    from checklist_servicio_detalle d
    where d.checklist_servicio_id = v_plantilla_id
    on conflict (checklist_id, material_id) do nothing;
  end if;

  -- Estado: si estaba en borrador/preparacion pasa a checklist_pendiente
  if v_proyecto.estado in ('borrador','preparacion') then
    update proyectos set estado = 'checklist_pendiente', version = version + 1
    where id_proyecto = p_proyecto_id;
  end if;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id)
  values (auth.uid(), public.mi_empleado_id(), 'generar_checklist', 'proyectos', p_proyecto_id::text);

  v_cached := jsonb_build_object('id_checklist', v_checklist_id, 'proyecto_id', p_proyecto_id);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'generar_checklist', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- validar_checklist(checklist): recalcula estado; si todo marcado => completo
-- y el proyecto pasa a listo_para_iniciar.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.validar_checklist(
  p_checklist_id integer,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_checklist record;
  v_total int;
  v_marcados int;
  v_estado text;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_checklist from checklists where id_checklist = p_checklist_id;
  if not found then raise exception 'Checklist % no existe', p_checklist_id; end if;
  if not (public.es_admin() or public.es_miembro_proyecto(v_checklist.proyecto_id)) then
    raise exception 'Sin permiso sobre el checklist %', p_checklist_id;
  end if;

  select count(*), count(*) filter (where marcado)
    into v_total, v_marcados
  from checklist_detalle where checklist_id = p_checklist_id;

  v_estado := case
    when v_total = 0 then 'incompleto'
    when v_marcados = v_total then 'completo'
    else 'incompleto'
  end;

  update checklists
  set estado = v_estado,
      verificado_por = public.mi_empleado_id(),
      verificado_en = now()
  where id_checklist = p_checklist_id;

  if v_estado = 'completo' then
    update proyectos set estado = 'listo_para_iniciar', version = version + 1
    where id_proyecto = v_checklist.proyecto_id
      and estado = 'checklist_pendiente';
  end if;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'validar_checklist', 'checklists',
          p_checklist_id::text, jsonb_build_object('estado', v_estado, 'marcados', v_marcados, 'total', v_total));

  v_cached := jsonb_build_object('id_checklist', p_checklist_id, 'estado', v_estado,
                                 'marcados', v_marcados, 'total', v_total);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'validar_checklist', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- iniciar_proyecto: requiere checklist completo. Descuenta stock y pasa a en_proceso.
-- Técnico autorizado (miembro del equipo) o admin.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.iniciar_proyecto(
  p_proyecto_id integer,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_proyecto record;
  v_estado_checklist text;
  v_faltantes int;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;
  if not (public.es_admin() or public.es_miembro_proyecto(p_proyecto_id)) then
    raise exception 'Sin permiso sobre el proyecto %', p_proyecto_id;
  end if;
  if v_proyecto.estado <> 'listo_para_iniciar' then
    raise exception 'El proyecto no está listo para iniciar (estado: %)', v_proyecto.estado;
  end if;
  if v_proyecto.equipo_id is null then
    raise exception 'El proyecto no tiene equipo responsable asignado';
  end if;

  select c.estado into v_estado_checklist
  from checklists c where c.proyecto_id = p_proyecto_id;
  if v_estado_checklist is null or v_estado_checklist <> 'completo' then
    select count(*) into v_faltantes
    from checklist_detalle cd
    join checklists c on c.id_checklist = cd.checklist_id
    where c.proyecto_id = p_proyecto_id and cd.marcado = false;
    raise exception 'El checklist no está completo (% materiales pendientes)', coalesce(v_faltantes,0);
  end if;

  -- Descuento de stock por material cargado
  update materiales m
  set stock_disponible = m.stock_disponible - cd.cantidad_cargada
  from checklist_detalle cd
  join checklists c on c.id_checklist = cd.checklist_id
  where c.proyecto_id = p_proyecto_id
    and cd.material_id = m.id_material
    and cd.cantidad_cargada > 0;

  update proyectos
  set estado = 'en_proceso',
      fecha_inicio = coalesce(fecha_inicio, current_date),
      version = version + 1
  where id_proyecto = p_proyecto_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_anteriores, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'iniciar_proyecto', 'proyectos', p_proyecto_id::text,
          jsonb_build_object('estado', v_proyecto.estado), jsonb_build_object('estado','en_proceso'));

  v_cached := jsonb_build_object('id_proyecto', p_proyecto_id, 'estado', 'en_proceso');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'iniciar_proyecto', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- reportar_avance (diario de obra)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.reportar_avance(
  p_proyecto_id integer,
  p_descripcion text,
  p_porcentaje integer default null,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_proyecto record;
  v_id integer;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;
  if not (public.es_admin() or public.es_miembro_proyecto(p_proyecto_id)) then
    raise exception 'Sin permiso sobre el proyecto %', p_proyecto_id;
  end if;
  if v_proyecto.estado not in ('en_proceso','pendiente_de_cierre') then
    raise exception 'No se pueden registrar avances en estado %', v_proyecto.estado;
  end if;
  if p_descripcion is null or length(trim(p_descripcion)) = 0 then
    raise exception 'La descripción del avance es obligatoria';
  end if;

  insert into avances(proyecto_id, empleado_id, descripcion, porcentaje, operation_id)
  values (p_proyecto_id, public.mi_empleado_id(), p_descripcion, p_porcentaje, p_operation_id)
  returning id_avance into v_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'reportar_avance', 'avances', v_id::text,
          jsonb_build_object('proyecto_id', p_proyecto_id, 'porcentaje', p_porcentaje));

  v_cached := jsonb_build_object('id_avance', v_id, 'proyecto_id', p_proyecto_id, 'porcentaje', p_porcentaje);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'reportar_avance', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- registrar_evidencia: enlaza un object_key de R2 con su metadata.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.registrar_evidencia(
  p_proyecto_id integer,
  p_object_key text,
  p_descripcion text default null,
  p_tipo text default 'foto',
  p_content_type text default null,
  p_size_bytes bigint default null,
  p_avance_id integer default null,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_id uuid;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  if not (public.es_admin() or public.es_miembro_proyecto(p_proyecto_id)) then
    raise exception 'Sin permiso sobre el proyecto %', p_proyecto_id;
  end if;
  if p_object_key is null or length(trim(p_object_key)) = 0 then
    raise exception 'object_key es obligatorio';
  end if;

  insert into evidencias(proyecto_id, empleado_id, avance_id, object_key, descripcion, tipo, content_type, size_bytes)
  values (p_proyecto_id, public.mi_empleado_id(), p_avance_id, p_object_key, p_descripcion, p_tipo, p_content_type, p_size_bytes)
  returning id_evidencia into v_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'registrar_evidencia', 'evidencias', v_id::text,
          jsonb_build_object('proyecto_id', p_proyecto_id, 'object_key', p_object_key));

  v_cached := jsonb_build_object('id_evidencia', v_id, 'proyecto_id', p_proyecto_id, 'object_key', p_object_key);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'registrar_evidencia', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- enviar_reporte: técnico reporta el fin de jornada/obra.
-- Crea reporte pendiente y pasa el proyecto a pendiente_de_cierre.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.enviar_reporte(
  p_proyecto_id integer,
  p_comentarios text default null,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_proyecto record;
  v_id integer;
begin
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;
  if not (public.es_admin() or public.es_miembro_proyecto(p_proyecto_id)) then
    raise exception 'Sin permiso sobre el proyecto %', p_proyecto_id;
  end if;
  if v_proyecto.estado <> 'en_proceso' then
    raise exception 'Solo se puede reportar en estado en_proceso (actual: %)', v_proyecto.estado;
  end if;

  insert into reportes(proyecto_id, equipo_id, empleado_id, comentarios, estado)
  values (p_proyecto_id, v_proyecto.equipo_id, public.mi_empleado_id(), p_comentarios, 'pendiente')
  returning id_reporte into v_id;

  update proyectos set estado = 'pendiente_de_cierre', version = version + 1
  where id_proyecto = p_proyecto_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'enviar_reporte', 'reportes', v_id::text,
          jsonb_build_object('proyecto_id', p_proyecto_id));

  v_cached := jsonb_build_object('id_reporte', v_id, 'proyecto_id', p_proyecto_id, 'estado', 'pendiente_de_cierre');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'enviar_reporte', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- aprobar_reporte / rechazar_reporte (solo admin)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.aprobar_reporte(
  p_reporte_id integer,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_reporte record;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede aprobar reportes'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_reporte from reportes where id_reporte = p_reporte_id;
  if not found then raise exception 'Reporte % no existe', p_reporte_id; end if;

  update reportes set estado = 'aprobado', version = version + 1 where id_reporte = p_reporte_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'aprobar_reporte', 'reportes', p_reporte_id::text,
          jsonb_build_object('estado','aprobado'));

  v_cached := jsonb_build_object('id_reporte', p_reporte_id, 'estado', 'aprobado');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'aprobar_reporte', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.rechazar_reporte(
  p_reporte_id integer,
  p_motivo text default null,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_reporte record;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede rechazar reportes'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_reporte from reportes where id_reporte = p_reporte_id;
  if not found then raise exception 'Reporte % no existe', p_reporte_id; end if;

  update reportes
  set estado = 'rechazado', version = version + 1,
      comentarios = coalesce(p_motivo, comentarios)
  where id_reporte = p_reporte_id;

  if v_reporte.proyecto_id is not null then
    update proyectos set estado = 'en_proceso', version = version + 1
    where id_proyecto = v_reporte.proyecto_id and estado = 'pendiente_de_cierre';
  end if;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'rechazar_reporte', 'reportes', p_reporte_id::text,
          jsonb_build_object('estado','rechazado','motivo', p_motivo));

  v_cached := jsonb_build_object('id_reporte', p_reporte_id, 'estado', 'rechazado');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'rechazar_reporte', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- avanzar_estado (solo admin) con validación de transiciones.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.avanzar_estado(
  p_proyecto_id integer,
  p_nuevo_estado text,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_proyecto record;
  v_valido boolean;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede cambiar el estado manualmente'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;

  v_valido := case v_proyecto.estado
    when 'borrador'              then p_nuevo_estado in ('preparacion','cancelado')
    when 'preparacion'           then p_nuevo_estado in ('checklist_pendiente','borrador','cancelado')
    when 'checklist_pendiente'   then p_nuevo_estado in ('preparacion','listo_para_iniciar','cancelado')
    when 'listo_para_iniciar'    then p_nuevo_estado in ('checklist_pendiente','en_proceso','cancelado')
    when 'en_proceso'            then p_nuevo_estado in ('pendiente_de_cierre','cancelado')
    when 'pendiente_de_cierre'   then p_nuevo_estado in ('en_proceso','finalizado','cancelado')
    when 'rechazado'             then p_nuevo_estado in ('en_proceso','cancelado')
    else false
  end;
  if not v_valido then
    raise exception 'Transición no permitida: % → %', v_proyecto.estado, p_nuevo_estado;
  end if;

  update proyectos set estado = p_nuevo_estado, version = version + 1 where id_proyecto = p_proyecto_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_anteriores, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'avanzar_estado', 'proyectos', p_proyecto_id::text,
          jsonb_build_object('estado', v_proyecto.estado), jsonb_build_object('estado', p_nuevo_estado));

  v_cached := jsonb_build_object('id_proyecto', p_proyecto_id, 'estado', p_nuevo_estado);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'avanzar_estado', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- finalizar_proyecto (solo admin): verifica checklist + evidencias + reporte
-- aprobado, crea reporte final, finaliza y otorga puntos (idempotente).
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.finalizar_proyecto(
  p_proyecto_id integer,
  p_comentarios text default null,
  p_operation_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_proyecto record;
  v_estado_checklist text;
  v_evidencias int;
  v_reporte_aprobado integer;
  v_numero text;
  v_final_id integer;
  v_miembro record;
  v_puntos jsonb := '[]'::jsonb;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede finalizar proyectos'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;
  if v_proyecto.estado = 'finalizado' then
    v_cached := jsonb_build_object('id_proyecto', p_proyecto_id, 'estado', 'finalizado', 'ya_finalizado', true);
    return v_cached;
  end if;
  if v_proyecto.estado <> 'pendiente_de_cierre' then
    raise exception 'El proyecto debe estar en pendiente_de_cierre para finalizar (actual: %)', v_proyecto.estado;
  end if;

  -- Checklist completo
  select c.estado into v_estado_checklist from checklists c where c.proyecto_id = p_proyecto_id;
  if v_estado_checklist is distinct from 'completo' then
    raise exception 'No se puede finalizar: el checklist no está completo';
  end if;

  -- Evidencias
  select count(*) into v_evidencias from evidencias
  where proyecto_id = p_proyecto_id and eliminado = false;
  if v_evidencias = 0 then
    raise exception 'No se puede finalizar: no hay evidencias registradas';
  end if;

  -- Reporte aprobado
  select id_reporte into v_reporte_aprobado from reportes
  where proyecto_id = p_proyecto_id and estado = 'aprobado'
  order by fecha_reporte desc limit 1;
  if v_reporte_aprobado is null then
    raise exception 'No se puede finalizar: no hay un reporte aprobado';
  end if;

  -- Reporte final con identificador único
  v_numero := 'REP-' || to_char(now(), 'YYYY') || '-' || lpad(p_proyecto_id::text, 5, '0');
  insert into reportes(proyecto_id, equipo_id, empleado_id, comentarios, estado, numero_reporte, es_final)
  values (p_proyecto_id, v_proyecto.equipo_id, public.mi_empleado_id(),
          coalesce(p_comentarios, 'Reporte final del proyecto'), 'aprobado', v_numero, true)
  returning id_reporte into v_final_id;

  update proyectos
  set estado = 'finalizado', fecha_fin = coalesce(fecha_fin, current_date), version = version + 1
  where id_proyecto = p_proyecto_id;

  -- Puntos al equipo (idempotente por empleado+proyecto+tipo_evento)
  for v_miembro in
    select empleado_id from empleado_equipo where equipo_id = v_proyecto.equipo_id
  loop
    perform public._otorgar_puntos(
      v_miembro.empleado_id, p_proyecto_id, 50,
      'Proyecto finalizado: ' || v_proyecto.nombre_proyecto, 'PROYECTO_FINALIZADO');
    v_puntos := v_puntos || jsonb_build_object('empleado_id', v_miembro.empleado_id, 'puntos', 50);
  end loop;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_anteriores, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'finalizar_proyecto', 'proyectos', p_proyecto_id::text,
          jsonb_build_object('estado', v_proyecto.estado),
          jsonb_build_object('estado','finalizado','numero_reporte', v_numero));

  v_cached := jsonb_build_object(
    'id_proyecto', p_proyecto_id, 'estado', 'finalizado',
    'numero_reporte', v_numero, 'id_reporte_final', v_final_id, 'puntos', v_puntos);

  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'finalizar_proyecto', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Permisos de ejecución: solo las RPC públicas para authenticated.
-- ─────────────────────────────────────────────────────────────────────
revoke all on function public.generar_checklist(integer, uuid) from public;
revoke all on function public.validar_checklist(integer, uuid) from public;
revoke all on function public.iniciar_proyecto(integer, uuid) from public;
revoke all on function public.reportar_avance(integer, text, integer, uuid) from public;
revoke all on function public.registrar_evidencia(integer, text, text, text, text, bigint, integer, uuid) from public;
revoke all on function public.enviar_reporte(integer, text, uuid) from public;
revoke all on function public.aprobar_reporte(integer, uuid) from public;
revoke all on function public.rechazar_reporte(integer, text, uuid) from public;
revoke all on function public.avanzar_estado(integer, text, uuid) from public;
revoke all on function public.finalizar_proyecto(integer, text, uuid) from public;

grant execute on function public.generar_checklist(integer, uuid) to authenticated;
grant execute on function public.validar_checklist(integer, uuid) to authenticated;
grant execute on function public.iniciar_proyecto(integer, uuid) to authenticated;
grant execute on function public.reportar_avance(integer, text, integer, uuid) to authenticated;
grant execute on function public.registrar_evidencia(integer, text, text, text, text, bigint, integer, uuid) to authenticated;
grant execute on function public.enviar_reporte(integer, text, uuid) to authenticated;
grant execute on function public.aprobar_reporte(integer, uuid) to authenticated;
grant execute on function public.rechazar_reporte(integer, text, uuid) to authenticated;
grant execute on function public.avanzar_estado(integer, text, uuid) to authenticated;
grant execute on function public.finalizar_proyecto(integer, text, uuid) to authenticated;
