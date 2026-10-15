-- =====================================================================
-- ZYRA — 0005_hardening.sql
-- Fase 5: la máquina de estados vive en PostgreSQL, no en React.
--
--  1) Un trigger impide cambiar proyectos.estado con un UPDATE directo
--     (PostgREST/React). Solo las RPC autorizadas, que marcan una señal
--     transaccional (GUC zyra.rpc_estado), pueden hacerlo.
--  2) avanzar_estado (override manual del admin) ya NO puede saltar a
--     en_proceso / pendiente_de_cierre / finalizado: esas transiciones
--     deben pasar por iniciar_proyecto / enviar_reporte / finalizar_proyecto,
--     que aplican stock, reportes, evidencias, puntos y auditoría.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1) Guardia de estado
-- ─────────────────────────────────────────────────────────────────────
create or replace function public._proteger_estado_proyecto()
returns trigger
language plpgsql
set search_path = public as $$
begin
  if new.estado is distinct from old.estado
     and coalesce(current_setting('zyra.rpc_estado', true), '') <> 'on' then
    raise exception 'El estado del proyecto solo puede modificarse mediante las RPC autorizadas';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_estado_proyecto on public.proyectos;
create trigger trg_proteger_estado_proyecto
  before update on public.proyectos
  for each row execute function public._proteger_estado_proyecto();

-- ─────────────────────────────────────────────────────────────────────
-- 2) generar_checklist (con señal de estado)
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
  perform set_config('zyra.rpc_estado', 'on', true);

  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;
  if not (public.es_admin() or public.es_miembro_proyecto(p_proyecto_id)) then
    raise exception 'Sin permiso sobre el proyecto %', p_proyecto_id;
  end if;

  select id_checklist into v_checklist_id from checklists where proyecto_id = p_proyecto_id;
  if v_checklist_id is null then
    insert into checklists(proyecto_id, estado) values (p_proyecto_id, 'pendiente')
    returning id_checklist into v_checklist_id;
  end if;

  select cs.id_checklist_servicio into v_plantilla_id
  from checklist_servicio cs
  where cs.servicio_id = v_proyecto.servicio_id
  order by cs.id_checklist_servicio
  limit 1;

  if v_plantilla_id is not null then
    insert into proyecto_materiales(proyecto_id, material_id, cantidad_requerida)
    select p_proyecto_id, d.material_id, d.cantidad_requerida
    from checklist_servicio_detalle d
    where d.checklist_servicio_id = v_plantilla_id
    on conflict (proyecto_id, material_id) do nothing;

    insert into checklist_detalle(checklist_id, material_id, cantidad_requerida)
    select v_checklist_id, d.material_id, d.cantidad_requerida
    from checklist_servicio_detalle d
    where d.checklist_servicio_id = v_plantilla_id
    on conflict (checklist_id, material_id) do nothing;
  end if;

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
-- 3) validar_checklist (con señal de estado)
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
  perform set_config('zyra.rpc_estado', 'on', true);

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
-- 4) iniciar_proyecto (con señal de estado)
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
  perform set_config('zyra.rpc_estado', 'on', true);

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
-- 5) enviar_reporte (con señal de estado)
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
  perform set_config('zyra.rpc_estado', 'on', true);

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
-- 6) rechazar_reporte (con señal de estado)
-- ─────────────────────────────────────────────────────────────────────
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
  perform set_config('zyra.rpc_estado', 'on', true);

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
-- 7) avanzar_estado (solo admin): override manual LIMITADO.
--    No puede iniciar (en_proceso), enviar a cierre (pendiente_de_cierre)
--    ni finalizar: eso exige iniciar_proyecto / enviar_reporte /
--    finalizar_proyecto respectivamente.
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
  perform set_config('zyra.rpc_estado', 'on', true);

  if not public.es_admin() then raise exception 'Solo un administrador puede cambiar el estado manualmente'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_proyecto from proyectos where id_proyecto = p_proyecto_id;
  if not found then raise exception 'Proyecto % no existe', p_proyecto_id; end if;

  v_valido := case v_proyecto.estado
    when 'borrador'              then p_nuevo_estado in ('preparacion','cancelado')
    when 'preparacion'           then p_nuevo_estado in ('borrador','checklist_pendiente','cancelado')
    when 'checklist_pendiente'   then p_nuevo_estado in ('preparacion','listo_para_iniciar','cancelado')
    when 'listo_para_iniciar'    then p_nuevo_estado in ('checklist_pendiente','cancelado')
    when 'en_proceso'            then p_nuevo_estado in ('cancelado')
    when 'pendiente_de_cierre'   then p_nuevo_estado in ('en_proceso','cancelado')
    when 'rechazado'             then p_nuevo_estado in ('en_proceso','cancelado')
    else false
  end;
  if not v_valido then
    raise exception 'Transición manual no permitida: % → % (usa la acción correspondiente)', v_proyecto.estado, p_nuevo_estado;
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
-- 8) finalizar_proyecto (con señal de estado)
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
  perform set_config('zyra.rpc_estado', 'on', true);

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

  select c.estado into v_estado_checklist from checklists c where c.proyecto_id = p_proyecto_id;
  if v_estado_checklist is distinct from 'completo' then
    raise exception 'No se puede finalizar: el checklist no está completo';
  end if;

  select count(*) into v_evidencias from evidencias
  where proyecto_id = p_proyecto_id and eliminado = false;
  if v_evidencias = 0 then
    raise exception 'No se puede finalizar: no hay evidencias registradas';
  end if;

  select id_reporte into v_reporte_aprobado from reportes
  where proyecto_id = p_proyecto_id and estado = 'aprobado'
  order by fecha_reporte desc limit 1;
  if v_reporte_aprobado is null then
    raise exception 'No se puede finalizar: no hay un reporte aprobado';
  end if;

  v_numero := 'REP-' || to_char(now(), 'YYYY') || '-' || lpad(p_proyecto_id::text, 5, '0');
  insert into reportes(proyecto_id, equipo_id, empleado_id, comentarios, estado, numero_reporte, es_final)
  values (p_proyecto_id, v_proyecto.equipo_id, public.mi_empleado_id(),
          coalesce(p_comentarios, 'Reporte final del proyecto'), 'aprobado', v_numero, true)
  returning id_reporte into v_final_id;

  update proyectos
  set estado = 'finalizado', fecha_fin = coalesce(fecha_fin, current_date), version = version + 1
  where id_proyecto = p_proyecto_id;

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
-- 9) Permisos: reafirmar ACL (create or replace resetea a los defaults
--    de Supabase, que incluyen anon). Solo authenticated puede ejecutar.
-- ─────────────────────────────────────────────────────────────────────
revoke all on function public.generar_checklist(integer, uuid) from public, anon;
revoke all on function public.validar_checklist(integer, uuid) from public, anon;
revoke all on function public.iniciar_proyecto(integer, uuid) from public, anon;
revoke all on function public.enviar_reporte(integer, text, uuid) from public, anon;
revoke all on function public.rechazar_reporte(integer, text, uuid) from public, anon;
revoke all on function public.avanzar_estado(integer, text, uuid) from public, anon;
revoke all on function public.finalizar_proyecto(integer, text, uuid) from public, anon;
revoke all on function public.reportar_avance(integer, text, integer, uuid) from public, anon;
revoke all on function public.registrar_evidencia(integer, text, text, text, text, bigint, integer, uuid) from public, anon;
revoke all on function public.aprobar_reporte(integer, uuid) from public, anon;
revoke all on function public._proteger_estado_proyecto() from public, anon, authenticated;

grant execute on function public.generar_checklist(integer, uuid) to authenticated;
grant execute on function public.validar_checklist(integer, uuid) to authenticated;
grant execute on function public.iniciar_proyecto(integer, uuid) to authenticated;
grant execute on function public.enviar_reporte(integer, text, uuid) to authenticated;
grant execute on function public.rechazar_reporte(integer, text, uuid) to authenticated;
grant execute on function public.avanzar_estado(integer, text, uuid) to authenticated;
grant execute on function public.finalizar_proyecto(integer, text, uuid) to authenticated;
grant execute on function public.reportar_avance(integer, text, integer, uuid) to authenticated;
grant execute on function public.registrar_evidencia(integer, text, text, text, text, bigint, integer, uuid) to authenticated;
grant execute on function public.aprobar_reporte(integer, uuid) to authenticated;
