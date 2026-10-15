-- =====================================================================
-- ZYRA — 0003_rls.sql
-- Funciones auxiliares + Row Level Security.
-- Seguridad real basada en BD (no en ocultar botones).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Funciones auxiliares (SECURITY DEFINER => evitan recursión de RLS)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_empleado_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select u.empleado_id
  from usuarios u
  where u.id_usuario = auth.uid() and u.activo = true
  limit 1;
$$;

create or replace function public.mi_empresa_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select e.empresa_id
  from empleados e
  where e.id_empleado = public.mi_empleado_id()
  limit 1;
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from usuarios u
    join roles r on r.id_rol = u.rol_id
    where u.id_usuario = auth.uid()
      and u.activo = true
      and lower(r.nombre_rol) = 'admin'
  );
$$;

create or replace function public.es_miembro_equipo(p_equipo_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from empleado_equipo ee
    where ee.equipo_id = p_equipo_id
      and ee.empleado_id = public.mi_empleado_id()
  );
$$;

create or replace function public.es_miembro_proyecto(p_proyecto_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from proyectos p
    where p.id_proyecto = p_proyecto_id
      and public.es_miembro_equipo(p.equipo_id)
  );
$$;

grant execute on function public.mi_empleado_id() to authenticated, service_role;
grant execute on function public.mi_empresa_id() to authenticated, service_role;
grant execute on function public.es_admin() to authenticated, service_role;
grant execute on function public.es_miembro_equipo(integer) to authenticated, service_role;
grant execute on function public.es_miembro_proyecto(integer) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────
-- Habilitar RLS
-- ─────────────────────────────────────────────────────────────────────
alter table roles                     enable row level security;
alter table empresas                  enable row level security;
alter table empleados                 enable row level security;
alter table usuarios                  enable row level security;
alter table equipos                   enable row level security;
alter table empleado_equipo           enable row level security;
alter table clientes                  enable row level security;
alter table servicios                 enable row level security;
alter table materiales                enable row level security;
alter table checklist_servicio        enable row level security;
alter table checklist_servicio_detalle enable row level security;
alter table proyectos                 enable row level security;
alter table proyecto_materiales       enable row level security;
alter table checklists                enable row level security;
alter table checklist_detalle         enable row level security;
alter table avances                   enable row level security;
alter table evidencias                enable row level security;
alter table reportes                  enable row level security;
alter table puntos_historial          enable row level security;
alter table recordatorios             enable row level security;
alter table recordatorio_destinatarios enable row level security;
alter table audit_log                 enable row level security;
alter table operaciones_procesadas    enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- roles (referencia; solo lectura para autenticados)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists roles_select on roles;
create policy roles_select on roles for select to authenticated using (true);
drop policy if exists roles_admin on roles;
create policy roles_admin on roles for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- empresas
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists empresas_select on empresas;
create policy empresas_select on empresas for select to authenticated
  using (public.es_admin() or id_empresa = public.mi_empresa_id());
drop policy if exists empresas_admin on empresas;
create policy empresas_admin on empresas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- empleados
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists empleados_select on empleados;
create policy empleados_select on empleados for select to authenticated
  using (
    public.es_admin()
    or id_empleado = public.mi_empleado_id()
    or exists (
      select 1
      from empleado_equipo me
      join empleado_equipo ot on ot.equipo_id = me.equipo_id
      where me.empleado_id = public.mi_empleado_id()
        and ot.empleado_id = empleados.id_empleado
    )
  );
drop policy if exists empleados_admin on empleados;
create policy empleados_admin on empleados for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- usuarios
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists usuarios_select on usuarios;
create policy usuarios_select on usuarios for select to authenticated
  using (public.es_admin() or id_usuario = auth.uid());
drop policy if exists usuarios_admin on usuarios;
create policy usuarios_admin on usuarios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- equipos / empleado_equipo
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists equipos_select on equipos;
create policy equipos_select on equipos for select to authenticated
  using (public.es_admin() or public.es_miembro_equipo(id_equipo));
drop policy if exists equipos_admin on equipos;
create policy equipos_admin on equipos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists empleado_equipo_select on empleado_equipo;
create policy empleado_equipo_select on empleado_equipo for select to authenticated
  using (public.es_admin() or public.es_miembro_equipo(equipo_id));
drop policy if exists empleado_equipo_admin on empleado_equipo;
create policy empleado_equipo_admin on empleado_equipo for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- clientes (técnico: solo los de sus proyectos)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from proyectos p
      where p.cliente_id = clientes.id_cliente
        and public.es_miembro_proyecto(p.id_proyecto)
    )
  );
drop policy if exists clientes_admin on clientes;
create policy clientes_admin on clientes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- servicios / materiales / plantillas (lectura general, gestión admin)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists servicios_select on servicios;
create policy servicios_select on servicios for select to authenticated using (true);
drop policy if exists servicios_admin on servicios;
create policy servicios_admin on servicios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists materiales_select on materiales;
create policy materiales_select on materiales for select to authenticated using (true);
drop policy if exists materiales_admin on materiales;
create policy materiales_admin on materiales for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists checklist_servicio_select on checklist_servicio;
create policy checklist_servicio_select on checklist_servicio for select to authenticated using (true);
drop policy if exists checklist_servicio_admin on checklist_servicio;
create policy checklist_servicio_admin on checklist_servicio for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists checklist_servicio_detalle_select on checklist_servicio_detalle;
create policy checklist_servicio_detalle_select on checklist_servicio_detalle for select to authenticated using (true);
drop policy if exists checklist_servicio_detalle_admin on checklist_servicio_detalle;
create policy checklist_servicio_detalle_admin on checklist_servicio_detalle for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- proyectos (técnico: solo proyectos de sus equipos; escritura admin/RPC)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists proyectos_select on proyectos;
create policy proyectos_select on proyectos for select to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(id_proyecto));
drop policy if exists proyectos_insert on proyectos;
create policy proyectos_insert on proyectos for insert to authenticated
  with check (public.es_admin());
drop policy if exists proyectos_update on proyectos;
create policy proyectos_update on proyectos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists proyectos_delete on proyectos;
create policy proyectos_delete on proyectos for delete to authenticated
  using (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- proyecto_materiales
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists pm_select on proyecto_materiales;
create policy pm_select on proyecto_materiales for select to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists pm_admin on proyecto_materiales;
create policy pm_admin on proyecto_materiales for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- checklists / checklist_detalle (técnico de sus proyectos puede verificar)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists checklists_select on checklists;
create policy checklists_select on checklists for select to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists checklists_insert on checklists;
create policy checklists_insert on checklists for insert to authenticated
  with check (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists checklists_update on checklists;
create policy checklists_update on checklists for update to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(proyecto_id))
  with check (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists checklists_delete on checklists;
create policy checklists_delete on checklists for delete to authenticated
  using (public.es_admin());

drop policy if exists cd_select on checklist_detalle;
create policy cd_select on checklist_detalle for select to authenticated
  using (
    public.es_admin()
    or exists (select 1 from checklists c
               where c.id_checklist = checklist_detalle.checklist_id
                 and public.es_miembro_proyecto(c.proyecto_id))
  );
drop policy if exists cd_insert on checklist_detalle;
create policy cd_insert on checklist_detalle for insert to authenticated
  with check (
    public.es_admin()
    or exists (select 1 from checklists c
               where c.id_checklist = checklist_detalle.checklist_id
                 and public.es_miembro_proyecto(c.proyecto_id))
  );
drop policy if exists cd_update on checklist_detalle;
create policy cd_update on checklist_detalle for update to authenticated
  using (
    public.es_admin()
    or exists (select 1 from checklists c
               where c.id_checklist = checklist_detalle.checklist_id
                 and public.es_miembro_proyecto(c.proyecto_id))
  )
  with check (
    public.es_admin()
    or (checklist_detalle.empleado_id = public.mi_empleado_id())
  );
drop policy if exists cd_delete on checklist_detalle;
create policy cd_delete on checklist_detalle for delete to authenticated
  using (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- avances (append-only para técnicos)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists avances_select on avances;
create policy avances_select on avances for select to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists avances_insert on avances;
create policy avances_insert on avances for insert to authenticated
  with check (
    public.es_admin()
    or (public.es_miembro_proyecto(proyecto_id) and empleado_id = public.mi_empleado_id())
  );
drop policy if exists avances_update on avances;
create policy avances_update on avances for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists avances_delete on avances;
create policy avances_delete on avances for delete to authenticated
  using (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- evidencias (append para técnicos de sus proyectos)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists evidencias_select on evidencias;
create policy evidencias_select on evidencias for select to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists evidencias_insert on evidencias;
create policy evidencias_insert on evidencias for insert to authenticated
  with check (
    public.es_admin()
    or (public.es_miembro_proyecto(proyecto_id) and empleado_id = public.mi_empleado_id())
  );
drop policy if exists evidencias_update on evidencias;
create policy evidencias_update on evidencias for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists evidencias_delete on evidencias;
create policy evidencias_delete on evidencias for delete to authenticated
  using (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- reportes
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists reportes_select on reportes;
create policy reportes_select on reportes for select to authenticated
  using (public.es_admin() or public.es_miembro_proyecto(proyecto_id));
drop policy if exists reportes_insert on reportes;
create policy reportes_insert on reportes for insert to authenticated
  with check (
    public.es_admin()
    or (public.es_miembro_proyecto(proyecto_id) and empleado_id = public.mi_empleado_id())
  );
drop policy if exists reportes_update on reportes;
create policy reportes_update on reportes for update to authenticated
  using (
    public.es_admin()
    or (public.es_miembro_proyecto(proyecto_id)
        and empleado_id = public.mi_empleado_id()
        and estado = 'rechazado')
  )
  with check (
    public.es_admin()
    or (public.es_miembro_proyecto(proyecto_id) and empleado_id = public.mi_empleado_id())
  );
drop policy if exists reportes_delete on reportes;
create policy reportes_delete on reportes for delete to authenticated
  using (public.es_admin());

-- ─────────────────────────────────────────────────────────────────────
-- puntos_historial (técnico solo LEE sus puntos; nadie inserta desde cliente)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists puntos_select on puntos_historial;
create policy puntos_select on puntos_historial for select to authenticated
  using (public.es_admin() or empleado_id = public.mi_empleado_id());
-- Sin policy de INSERT/UPDATE/DELETE => solo la RPC (SECURITY DEFINER) escribe.

-- ─────────────────────────────────────────────────────────────────────
-- recordatorios
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists recordatorios_select on recordatorios;
create policy recordatorios_select on recordatorios for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from recordatorio_destinatarios d
      where d.recordatorio_id = recordatorios.id_recordatorio
        and d.empleado_id = public.mi_empleado_id()
    )
  );
drop policy if exists recordatorios_admin on recordatorios;
create policy recordatorios_admin on recordatorios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists rd_select on recordatorio_destinatarios;
create policy rd_select on recordatorio_destinatarios for select to authenticated
  using (public.es_admin() or empleado_id = public.mi_empleado_id());
drop policy if exists rd_admin on recordatorio_destinatarios;
create policy rd_admin on recordatorio_destinatarios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists rd_update_self on recordatorio_destinatarios;
create policy rd_update_self on recordatorio_destinatarios for update to authenticated
  using (empleado_id = public.mi_empleado_id())
  with check (empleado_id = public.mi_empleado_id());

-- ─────────────────────────────────────────────────────────────────────
-- audit_log (solo admin lee; inmutable: sin update/delete para nadie)
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select to authenticated
  using (public.es_admin());
revoke update, delete on audit_log from anon, authenticated;

-- operaciones_procesadas: sin policies => deny all (solo owner/service role)
