-- =====================================================================
-- ZYRA — 0008_viabilidad_views.sql
-- Extiende v_proyectos con la aplicabilidad de viabilidad (snapshot del
-- proyecto). `create or replace view` sólo puede AÑADIR columnas al final,
-- por lo que las tres columnas nuevas se añaden tras `equipo`.
-- La vista mantiene security_invoker=true (respeta RLS de proyectos).
-- =====================================================================
begin;

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
  row_to_json(e.*) as equipo,
  p.requiere_previabilidad,
  p.requiere_ingenieria,
  p.requiere_viabilidad
from proyectos p
left join clientes c on c.id_cliente = p.cliente_id
left join servicios s on s.id_servicio = p.servicio_id
left join equipos e on e.id_equipo = p.equipo_id;

commit;
