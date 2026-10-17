-- =====================================================================
-- ZYRA — seed.sql
-- Datos base (empresa, roles, catálogo). Idempotente (se puede re-ejecutar).
-- NO contiene usuarios: los usuarios se crean con scripts/seed-admin.mjs
-- porque requieren auth.users.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Roles
-- ─────────────────────────────────────────────────────────────────────
insert into roles (nombre_rol, descripcion) values
  ('admin', 'Administrador con acceso total'),
  ('tecnico', 'Técnico de campo')
on conflict (nombre_rol) do nothing;

-- ─────────────────────────────────────────────────────────────────────
-- Empresa
-- ─────────────────────────────────────────────────────────────────────
insert into empresas (nombre, direccion, correo, telefono)
select 'ESSE Solar', 'Nicaragua', 'contacto@essesolar.com', null
where not exists (select 1 from empresas where nombre = 'ESSE Solar');

-- ─────────────────────────────────────────────────────────────────────
-- Servicios
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_empresa integer;
begin
  select id_empresa into v_empresa from empresas where nombre = 'ESSE Solar' limit 1;

  insert into servicios (empresa_id, tipo, descripcion)
  select v_empresa, t.tipo, t.descripcion
  from (values
    ('Instalación Residencial', 'Instalación de sistema solar residencial'),
    ('Instalación Comercial',   'Instalación de sistema solar comercial'),
    ('Mantenimiento',           'Mantenimiento y limpieza de sistemas existentes')
  ) as t(tipo, descripcion)
  where not exists (
    select 1 from servicios s where s.empresa_id = v_empresa and s.tipo = t.tipo
  );
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Materiales
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_empresa integer;
begin
  select id_empresa into v_empresa from empresas where nombre = 'ESSE Solar' limit 1;

  insert into materiales (empresa_id, nombre_material, unidad, stock_disponible)
  select v_empresa, t.nombre, t.unidad, t.stock
  from (values
    ('Panel Solar 550W',        'unidad', 100),
    ('Inversor Híbrido 5kW',    'unidad', 30),
    ('Estructura de Montaje',   'unidad', 60),
    ('Cable DC 6mm',            'metro',  500),
    ('Cable AC 10mm',           'metro',  400),
    ('Protección DC',           'unidad', 80),
    ('Protección AC',           'unidad', 80),
    ('Conectores MC4',          'par',    200),
    ('Medidor Bidireccional',   'unidad', 25),
    ('Tornillería y Anclajes',  'kit',    120),
    ('Tubería Conduit',         'metro',  300)
  ) as t(nombre, unidad, stock)
  where not exists (
    select 1 from materiales m where m.empresa_id = v_empresa and m.nombre_material = t.nombre
  );
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Plantillas de checklist por servicio
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_empresa integer;
  v_servicio integer;
  v_plantilla integer;
begin
  select id_empresa into v_empresa from empresas where nombre = 'ESSE Solar' limit 1;

  -- Instalación Residencial
  select id_servicio into v_servicio from servicios where empresa_id = v_empresa and tipo = 'Instalación Residencial';
  if v_servicio is not null then
    select id_checklist_servicio into v_plantilla
    from checklist_servicio where servicio_id = v_servicio limit 1;
    if v_plantilla is null then
      insert into checklist_servicio (empresa_id, servicio_id, nombre)
      values (v_empresa, v_servicio, 'Checklist Instalación Residencial')
      returning id_checklist_servicio into v_plantilla;
    end if;
    insert into checklist_servicio_detalle (checklist_servicio_id, material_id, cantidad_requerida)
    select v_plantilla, m.id_material, d.cant
    from (values
      ('Panel Solar 550W', 8),
      ('Inversor Híbrido 5kW', 1),
      ('Estructura de Montaje', 8),
      ('Cable DC 6mm', 60),
      ('Cable AC 10mm', 30),
      ('Protección DC', 1),
      ('Protección AC', 1),
      ('Conectores MC4', 4),
      ('Medidor Bidireccional', 1),
      ('Tornillería y Anclajes', 2),
      ('Tubería Conduit', 20)
    ) as d(nombre, cant)
    join materiales m on m.empresa_id = v_empresa and m.nombre_material = d.nombre
    on conflict (checklist_servicio_id, material_id) do nothing;
  end if;

  -- Instalación Comercial
  select id_servicio into v_servicio from servicios where empresa_id = v_empresa and tipo = 'Instalación Comercial';
  if v_servicio is not null then
    select id_checklist_servicio into v_plantilla
    from checklist_servicio where servicio_id = v_servicio limit 1;
    if v_plantilla is null then
      insert into checklist_servicio (empresa_id, servicio_id, nombre)
      values (v_empresa, v_servicio, 'Checklist Instalación Comercial')
      returning id_checklist_servicio into v_plantilla;
    end if;
    insert into checklist_servicio_detalle (checklist_servicio_id, material_id, cantidad_requerida)
    select v_plantilla, m.id_material, d.cant
    from (values
      ('Panel Solar 550W', 40),
      ('Inversor Híbrido 5kW', 4),
      ('Estructura de Montaje', 40),
      ('Cable DC 6mm', 300),
      ('Cable AC 10mm', 150),
      ('Protección DC', 4),
      ('Protección AC', 4),
      ('Conectores MC4', 20),
      ('Medidor Bidireccional', 2),
      ('Tornillería y Anclajes', 10),
      ('Tubería Conduit', 100)
    ) as d(nombre, cant)
    join materiales m on m.empresa_id = v_empresa and m.nombre_material = d.nombre
    on conflict (checklist_servicio_id, material_id) do nothing;
  end if;

  -- Mantenimiento
  select id_servicio into v_servicio from servicios where empresa_id = v_empresa and tipo = 'Mantenimiento';
  if v_servicio is not null then
    select id_checklist_servicio into v_plantilla
    from checklist_servicio where servicio_id = v_servicio limit 1;
    if v_plantilla is null then
      insert into checklist_servicio (empresa_id, servicio_id, nombre)
      values (v_empresa, v_servicio, 'Checklist Mantenimiento')
      returning id_checklist_servicio into v_plantilla;
    end if;
    insert into checklist_servicio_detalle (checklist_servicio_id, material_id, cantidad_requerida)
    select v_plantilla, m.id_material, d.cant
    from (values
      ('Conectores MC4', 4),
      ('Cable DC 6mm', 10)
    ) as d(nombre, cant)
    join materiales m on m.empresa_id = v_empresa and m.nombre_material = d.nombre
    on conflict (checklist_servicio_id, material_id) do nothing;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Viabilidad — aplicabilidad opt-in por servicio (desactivada por
-- defecto). El CUESTIONARIO FUNCIONAL DEFINITIVO se publica como
-- plantillas GLOBALES (servicio_id = null) mediante el sembrador
-- idempotente definido en la migración 0014. Las plantillas provisionales
-- por servicio quedan archivadas (trazabilidad).
--
-- El módulo es opt-in: los proyectos nuevos heredan requiere_*=false y
-- un admin lo habilita por proyecto con establecer_aplicabilidad_viabilidad.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_empresa integer;
begin
  select id_empresa into v_empresa from empresas where nombre = 'ESSE Solar' limit 1;
  if v_empresa is null then return; end if;

  insert into viabilidad_config_servicio (servicio_id, requiere_previabilidad, requiere_ingenieria)
  select s.id_servicio, false, false
  from servicios s
  where s.empresa_id = v_empresa
    and s.tipo in ('Instalación Residencial', 'Instalación Comercial')
  on conflict (servicio_id) do nothing;

  perform public.sembrar_cuestionario_viabilidad_definitivo('ESSE Solar');
end $$;
