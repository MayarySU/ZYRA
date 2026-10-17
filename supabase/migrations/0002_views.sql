-- =====================================================================
-- ZYRA — 0002_views.sql
-- Vistas derivadas (el progreso NO se persiste; se calcula).
-- security_invoker=true => respeta RLS de las tablas subyacentes.
-- =====================================================================

-- Progreso: finalizado=100; si hay avances => máximo reportado; si no,
-- porcentaje de checklist verificado; si no, 0.
create or replace function public.calcular_progreso(p_proyecto_id integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, least(100,
    coalesce(
      (select max(a.porcentaje) from avances a
        where a.proyecto_id = p_proyecto_id and a.porcentaje is not null),
      (
        select case
          when count(cd.id_checklist_detalle) = 0 then 0
          else round(100.0 * count(*) filter (where cd.marcado)
                     / count(cd.id_checklist_detalle))::int
        end
        from checklist_detalle cd
        join checklists c on c.id_checklist = cd.checklist_id
        where c.proyecto_id = p_proyecto_id
      ),
      0
    )
  ))::int;
$$;

-- `create or replace view` no puede eliminar columnas de una vista existente;
-- 0008 extiende v_proyectos con columnas al final, así que para mantener el
-- re-aplicado idempotente se recrea desde cero.
drop view if exists public.v_proyectos;

create or replace view public.v_proyectos
with (security_invoker = true)
as
select
  p.id_proyecto,
  p.empresa_id,
  p.cliente_id,
  p.servicio_id,
  p.equipo_id,
  p.nombre_proyecto,
  p.ubicacion,
  p.fecha_inicio,
  p.fecha_fin,
  p.estado,
  p.imagen_url,
  p.version,
  p.creado_por,
  p.creado_en,
  p.actualizado_en,
  public.calcular_progreso(p.id_proyecto) as progreso,
  row_to_json(c.*) as cliente,
  row_to_json(s.*) as servicio,
  row_to_json(e.*) as equipo
from proyectos p
left join clientes c on c.id_cliente = p.cliente_id
left join servicios s on s.id_servicio = p.servicio_id
left join equipos e on e.id_equipo = p.equipo_id;

-- Vista de checklist con material y responsable (cómoda para la UI)
create or replace view public.v_checklist_detalle
with (security_invoker = true)
as
select
  cd.id_checklist_detalle,
  cd.checklist_id,
  c.proyecto_id,
  cd.material_id,
  m.nombre_material,
  m.unidad,
  cd.cantidad_requerida,
  cd.cantidad_cargada,
  cd.marcado,
  cd.empleado_id,
  cd.observaciones,
  cd.actualizado_en
from checklist_detalle cd
join checklists c on c.id_checklist = cd.checklist_id
left join materiales m on m.id_material = cd.material_id;
