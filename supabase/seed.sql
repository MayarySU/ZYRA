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
-- defecto) y plantillas base de Previabilidad / Ingeniería para los
-- servicios Residencial y Comercial. Idempotente: solo crea contenido
-- cuando no existe una plantilla activa de esa etapa para el servicio.
--
-- El módulo es opt-in: los proyectos nuevos heredan requiere_*=false y
-- un admin lo habilita por proyecto con establecer_aplicabilidad_viabilidad.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_empresa integer;
  v_servicio integer;
  v_plantilla integer;
  v_seccion integer;
  v_q_tipo_inmueble integer;
  v_q_area_techo integer;
  v_q_tipo_techo integer;
  v_q_area_terreno integer;
  v_q_consumo integer;
  v_q_potencia integer;
  v_q_interconexion integer;
  v_q_proteccion integer;
  v_q_acceso integer;
begin
  select id_empresa into v_empresa from empresas where nombre = 'ESSE Solar' limit 1;
  if v_empresa is null then return; end if;

  insert into viabilidad_config_servicio (servicio_id, requiere_previabilidad, requiere_ingenieria)
  select s.id_servicio, false, false
  from servicios s
  where s.empresa_id = v_empresa
    and s.tipo in ('Instalación Residencial', 'Instalación Comercial')
  on conflict (servicio_id) do nothing;

  for v_servicio in
    select id_servicio from servicios
    where empresa_id = v_empresa
      and tipo in ('Instalación Residencial', 'Instalación Comercial')
  loop
    select id_plantilla_viabilidad into v_plantilla
    from viabilidad_plantillas
    where empresa_id = v_empresa and servicio_id = v_servicio
      and tipo_etapa = 'previabilidad' and estado = 'activa'
    limit 1;

    if v_plantilla is null then
      insert into viabilidad_plantillas (empresa_id, servicio_id, tipo_etapa, version, nombre, estado)
      values (v_empresa, v_servicio, 'previabilidad', 1, 'Previabilidad Solar v1', 'activa')
      returning id_plantilla_viabilidad into v_plantilla;

      -- Sección 1: inmueble
      insert into viabilidad_secciones (plantilla_id, orden, codigo, titulo)
      values (v_plantilla, 1, 'inmueble', 'Información del inmueble')
      returning id_seccion_viabilidad into v_seccion;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 1, 'tipo_inmueble', 'Tipo de inmueble', 'opcion_unica', true)
      returning id_pregunta_viabilidad into v_q_tipo_inmueble;
      insert into viabilidad_opciones (pregunta_id, orden, valor, etiqueta) values
        (v_q_tipo_inmueble, 1, 'residencial', 'Residencial'),
        (v_q_tipo_inmueble, 2, 'comercial', 'Comercial'),
        (v_q_tipo_inmueble, 3, 'industrial', 'Industrial');

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 2, 'area_techo_m2', 'Área de techo disponible (m²)', 'numero', true)
      returning id_pregunta_viabilidad into v_q_area_techo;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 3, 'tipo_techo', 'Tipo de techo', 'opcion_unica', true)
      returning id_pregunta_viabilidad into v_q_tipo_techo;
      insert into viabilidad_opciones (pregunta_id, orden, valor, etiqueta) values
        (v_q_tipo_techo, 1, 'losa_concreto', 'Losa de concreto'),
        (v_q_tipo_techo, 2, 'lamina_metalica', 'Lámina metálica'),
        (v_q_tipo_techo, 3, 'teja', 'Teja'),
        (v_q_tipo_techo, 4, 'terreno', 'Terreno');

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 4, 'area_terreno_m2', 'Área de terreno (m²)', 'numero', true)
      returning id_pregunta_viabilidad into v_q_area_terreno;
      insert into viabilidad_condiciones (pregunta_id, pregunta_origen_id, operador, valor, accion)
      values (v_q_area_terreno, v_q_tipo_techo, '=', 'terreno', 'mostrar');

      -- Sección 2: consumo y dimensionamiento
      insert into viabilidad_secciones (plantilla_id, orden, codigo, titulo)
      values (v_plantilla, 2, 'consumo', 'Consumo y dimensionamiento')
      returning id_seccion_viabilidad into v_seccion;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 1, 'consumo_mensual_kwh', 'Consumo mensual promedio (kWh)', 'numero', true)
      returning id_pregunta_viabilidad into v_q_consumo;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria, regla_evaluacion)
      values (v_seccion, 2, 'potencia_sistema_kw', 'Potencia del sistema (kW)', 'numero', true,
              jsonb_build_object(
                'cuando', jsonb_build_object('operador', '>=', 'valor', '700'),
                'efecto', 'validacion_especializada',
                'validacion_tipo', 'cfe',
                'mensaje', 'Sistema ≥0.7 MW requiere validación de interconexión CFE'))
      returning id_pregunta_viabilidad into v_q_potencia;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria, regla_evaluacion)
      values (v_seccion, 3, 'requiere_interconexion_cfe', '¿Requiere interconexión con CFE?', 'booleano', true,
              jsonb_build_object(
                'cuando', jsonb_build_object('operador', '=', 'valor', 'true'),
                'efecto', 'validacion_especializada',
                'validacion_tipo', 'cfe',
                'mensaje', 'Interconexión con CFE requiere revisión regulatoria'))
      returning id_pregunta_viabilidad into v_q_interconexion;

      -- Sección 3: protecciones y seguridad
      insert into viabilidad_secciones (plantilla_id, orden, codigo, titulo)
      values (v_plantilla, 3, 'seguridad', 'Protecciones y seguridad')
      returning id_seccion_viabilidad into v_seccion;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 1, 'tipo_proteccion_dc', 'Protección DC instalada', 'opcion_unica', true)
      returning id_pregunta_viabilidad into v_q_proteccion;
      insert into viabilidad_opciones (pregunta_id, orden, valor, etiqueta, regla) values
        (v_q_proteccion, 1, 'afci', 'AFCI / detección de arco',
          jsonb_build_object('efecto', 'validacion_especializada', 'validacion_tipo', 'electrico',
                             'mensaje', 'Verificar protección de arco DC')),
        (v_q_proteccion, 2, 'fusibles_dc', 'Fusibles DC', null),
        (v_q_proteccion, 3, 'ninguna', 'Ninguna',
          jsonb_build_object('efecto', 'no_apto', 'motivo', 'Sin protección DC'));

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria, regla_evaluacion)
      values (v_seccion, 2, 'acceso_mantenimiento', '¿Existe acceso seguro para mantenimiento?', 'booleano', true,
              jsonb_build_object(
                'cuando', jsonb_build_object('operador', '=', 'valor', 'false'),
                'efecto', 'accion_requerida',
                'descripcion_accion', 'Habilitar acceso seguro para mantenimiento',
                'obligatoria', true))
      returning id_pregunta_viabilidad into v_q_acceso;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 3, 'notas', 'Notas adicionales', 'texto', false);
    end if;
  end loop;
end $$;

do $$
declare
  v_empresa integer;
  v_servicio integer;
  v_plantilla integer;
  v_seccion integer;
begin
  select id_empresa into v_empresa from empresas where nombre = 'ESSE Solar' limit 1;
  if v_empresa is null then return; end if;

  for v_servicio in
    select id_servicio from servicios
    where empresa_id = v_empresa
      and tipo in ('Instalación Residencial', 'Instalación Comercial')
  loop
    select id_plantilla_viabilidad into v_plantilla
    from viabilidad_plantillas
    where empresa_id = v_empresa and servicio_id = v_servicio
      and tipo_etapa = 'ingenieria' and estado = 'activa'
    limit 1;

    if v_plantilla is null then
      insert into viabilidad_plantillas (empresa_id, servicio_id, tipo_etapa, version, nombre, estado)
      values (v_empresa, v_servicio, 'ingenieria', 1, 'Ingeniería Solar v1', 'activa')
      returning id_plantilla_viabilidad into v_plantilla;

      -- Sección 1: estructural
      insert into viabilidad_secciones (plantilla_id, orden, codigo, titulo)
      values (v_plantilla, 1, 'estructural', 'Revisión estructural')
      returning id_seccion_viabilidad into v_seccion;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria, regla_evaluacion)
      values (v_seccion, 1, 'soporta_carga', '¿La estructura soporta la carga del sistema?', 'booleano', true,
              jsonb_build_object(
                'cuando', jsonb_build_object('operador', '=', 'valor', 'false'),
                'efecto', 'no_apto',
                'motivo', 'La estructura no soporta la carga'));

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 2, 'memoria_calculo', 'Memoria de cálculo estructural', 'evidencia', true);

      -- Sección 2: eléctrica
      insert into viabilidad_secciones (plantilla_id, orden, codigo, titulo)
      values (v_plantilla, 2, 'electrico', 'Revisión eléctrica')
      returning id_seccion_viabilidad into v_seccion;

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria)
      values (v_seccion, 1, 'calibre_conductores_ok', '¿Los calibres de conductores son correctos?', 'booleano', true);

      insert into viabilidad_preguntas (seccion_id, orden, codigo, texto, tipo_respuesta, obligatoria, regla_evaluacion)
      values (v_seccion, 2, 'requiere_estudio_arco', '¿Requiere estudio de arco eléctrico?', 'booleano', true,
              jsonb_build_object(
                'cuando', jsonb_build_object('operador', '=', 'valor', 'true'),
                'efecto', 'validacion_especializada',
                'validacion_tipo', 'electrico',
                'mensaje', 'Estudio de arco eléctrico requerido'));
    end if;
  end loop;
end $$;
