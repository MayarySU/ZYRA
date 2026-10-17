-- =====================================================================
-- ZYRA — 0012_viabilidad_plantillas_admin.sql
-- Editor administrativo BÁSICO de plantillas de Viabilidad.
--
-- Principios:
--  * La BD es la autoridad. No se confía sólo en deshabilitar botones.
--  * Las plantillas versionadas son INMUTABLES una vez publicadas/archivadas.
--    Para modificarlas se crea una versión N+1 (borrador), se edita, se
--    valida y se publica; al publicar se archiva la versión activa anterior.
--  * La publicación es autoritativa en servidor: `publicar_plantilla_viabilidad`
--    valida la estructura y rechaza inconsistencias con mensajes útiles.
--  * `crear_version_plantilla_viabilidad` clona secciones/preguntas/opciones/
--    condiciones de forma atómica y segura.
--  * Las revisiones históricas siguen apuntando a su `plantilla_id` original
--    (la versión archivada), por lo que publicar N+1 no las altera.
--
-- Idempotente: se puede reaplicar sin efectos secundarios.
-- =====================================================================

-- ═════════════════════════════════════════════════════════════════════
-- 1) Nuevo estado de plantilla: 'borrador' (editable, no usada por el motor)
--    El motor sólo consume plantillas 'activa' (_viabilidad_plantilla_activa).
-- ═════════════════════════════════════════════════════════════════════
alter table viabilidad_plantillas drop constraint if exists chk_vpl_estado;
alter table viabilidad_plantillas add constraint chk_vpl_estado
  check (estado in ('borrador','activa','archivada'));
alter table viabilidad_plantillas alter column estado set default 'borrador';

-- ═════════════════════════════════════════════════════════════════════
-- 2) Guardas de inmutabilidad (servidor/BD)
--    Bypass explícito cuando:
--      - la sentencia proviene de SQL directo (auth.uid() null: migraciones,
--        seed, service_role sin `sub`), o
--      - la RPC de gestión activó `zyra.rpc_plantilla = 'on'` en la sesión.
-- ═════════════════════════════════════════════════════════════════════
create or replace function public._viabilidad_bypass_plantilla()
returns boolean language sql stable as $$
  select (auth.uid() is null)
      or (coalesce(current_setting('zyra.rpc_plantilla', true), 'off') = 'on');
$$;

create or replace function public._proteger_plantilla_viabilidad()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public._viabilidad_bypass_plantilla() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'INSERT' then
    if new.estado is distinct from 'borrador' then
      raise exception 'Las plantillas se crean en borrador y se publican mediante la RPC dedicada (estado intentado: %)', new.estado;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.estado is distinct from 'borrador' then
      raise exception 'La plantilla está % y es inmutable; cree una nueva versión', old.estado;
    end if;
    if new.estado is distinct from 'borrador' then
      raise exception 'El cambio de estado debe hacerse con las RPC de publicación/archivo';
    end if;
    return new;
  end if;

  -- DELETE
  if old.estado is distinct from 'borrador' then
    raise exception 'La plantilla está % y no puede eliminarse (sólo los borradores)', old.estado;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_vpl_protegida on public.viabilidad_plantillas;
create trigger trg_vpl_protegida
  before insert or update or delete on public.viabilidad_plantillas
  for each row execute function public._proteger_plantilla_viabilidad();

-- Hijos: inmutables cuando la plantilla no es borrador.
create or replace function public._proteger_estructura_plantilla_viabilidad()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plantilla integer;
  v_estado text;
begin
  if public._viabilidad_bypass_plantilla() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_table_name = 'viabilidad_secciones' then
    v_plantilla := coalesce(new.plantilla_id, old.plantilla_id);
  elsif tg_table_name = 'viabilidad_preguntas' then
    select plantilla_id into v_plantilla from viabilidad_secciones
     where id_seccion_viabilidad = coalesce(new.seccion_id, old.seccion_id);
  else -- viabilidad_opciones / viabilidad_condiciones
    select s.plantilla_id into v_plantilla
      from viabilidad_preguntas p
      join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
     where p.id_pregunta_viabilidad = coalesce(new.pregunta_id, old.pregunta_id);
  end if;

  -- Padre ya inexistente (borrado en cascada permitido): no bloquear.
  if v_plantilla is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select estado into v_estado from viabilidad_plantillas
   where id_plantilla_viabilidad = v_plantilla;

  if v_estado is distinct from 'borrador' then
    raise exception 'La estructura de una plantilla % es inmutable; cree una nueva versión', v_estado;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['viabilidad_secciones','viabilidad_preguntas',
                           'viabilidad_opciones','viabilidad_condiciones'] loop
    execute format('drop trigger if exists trg_%s_estructura on public.%I', t, t);
    execute format(
      'create trigger trg_%s_estructura before insert or update or delete on public.%I
         for each row execute function public._proteger_estructura_plantilla_viabilidad()', t, t);
  end loop;
end $$;

-- ═════════════════════════════════════════════════════════════════════
-- 3) Validación de plantilla (autoritativa, sin publicar)
--    Devuelve jsonb { ok: boolean, errores: [ {codigo, mensaje, ref?} ] }
-- ═════════════════════════════════════════════════════════════════════

-- 3.a Gramática de una regla de evaluación / regla de opción.
--     Reglas soportadas por la UI guiada. Cualquier forma distinta se marca
--     como edición técnica (no se simplifica en silencio).
create or replace function public._viabilidad_regla_error(p_regla jsonb)
returns text language plpgsql immutable as $$
declare
  v_efectos text[] := array['no_apto','validacion_especializada','accion_requerida'];
  v_valid  text[] := array['estructural','electrico','legal','cfe','otro'];
  v_ops    text[] := array['=','!=','in','not_in','>=','<=','>','<','contiene'];
  v_claves text[] := array['cuando','efecto','motivo','mensaje','descripcion_accion',
                           'validacion_tipo','obligatoria','pregunta'];
  v_efecto text;
  k text;
begin
  if p_regla is null then return null; end if;
  if jsonb_typeof(p_regla) <> 'object' then
    return 'La regla debe ser un objeto JSON';
  end if;

  -- Claves desconocidas => requiere edición técnica (no representable en la UI).
  for k in select jsonb_object_keys(p_regla) loop
    if not (k = any(v_claves)) then
      return format('La regla usa un campo no soportado por el editor ("%s"): requiere edición técnica', k);
    end if;
  end loop;

  v_efecto := p_regla->>'efecto';
  if v_efecto is null then
    return 'La regla no define "efecto"';
  end if;
  if not (v_efecto = any(v_efectos)) then
    return format('Efecto no soportado por el motor: "%s"', v_efecto);
  end if;

  if p_regla ? 'cuando' then
    if jsonb_typeof(p_regla->'cuando') <> 'object'
       or (p_regla->'cuando'->>'operador') is null
       or (p_regla->'cuando'->>'valor') is null then
      return 'La condición de la regla ("cuando") requiere "operador" y "valor"';
    end if;
    if not ((p_regla->'cuando'->>'operador') = any(v_ops)) then
      return format('Operador de condición no soportado: "%s"', p_regla->'cuando'->>'operador');
    end if;
  end if;

  if v_efecto = 'validacion_especializada' then
    if (p_regla->>'validacion_tipo') is null then
      return 'El efecto "validacion_especializada" requiere "validacion_tipo"';
    end if;
    if not ((p_regla->>'validacion_tipo') = any(v_valid)) then
      return format('Tipo de validación no soportado: "%s"', p_regla->>'validacion_tipo');
    end if;
  end if;

  if v_efecto = 'accion_requerida'
     and coalesce(p_regla->>'descripcion_accion', p_regla->>'mensaje') is null then
    return 'El efecto "accion_requerida" requiere "descripcion_accion" o "mensaje"';
  end if;

  return null;
end;
$$;

-- 3.b Detección de ciclos en las dependencias de condiciones (mostrar/ocultar/
--     requerir). El motor evalúa visibilidad por pregunta; un ciclo es una
--     estructura que el motor no puede resolver coherentemente.
create or replace function public._viabilidad_dependencias_ciclicas(p_plantilla_id integer)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive seed as (
    select c.pregunta_id as src, c.pregunta_origen_id as dst
    from viabilidad_condiciones c
    join viabilidad_preguntas p on p.id_pregunta_viabilidad = c.pregunta_id
    join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
    where s.plantilla_id = p_plantilla_id
  ),
  walk as (
    select src, dst, array[src, dst] as camino, (dst = src) as ciclo from seed
    union all
    select w.src, e.dst, w.camino || e.dst, (e.dst = any(w.camino))
    from walk w join seed e on e.src = w.dst
    where not w.ciclo
  )
  select exists(select 1 from walk where ciclo);
$$;

create or replace function public.validar_plantilla_viabilidad(p_plantilla_id integer)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_errores jsonb := '[]'::jsonb;
  v_plantilla record;
  v_secciones integer;
  v_preguntas integer;
  v_dup text;
  v_ciclo boolean;
  rec record;
  v_err text;
  v_val text;
begin
  select * into v_plantilla from viabilidad_plantillas
   where id_plantilla_viabilidad = p_plantilla_id;
  if not found then
    return jsonb_build_object('ok', false, 'errores',
      jsonb_build_array(jsonb_build_object('codigo','no_existe','mensaje','La plantilla no existe')));
  end if;

  if v_plantilla.tipo_etapa not in ('previabilidad','ingenieria') then
    v_errores := v_errores || jsonb_build_array(jsonb_build_object(
      'codigo','etapa_invalida','mensaje','La etapa de la plantilla es inválida'));
  end if;

  select count(*) into v_secciones from viabilidad_secciones where plantilla_id = p_plantilla_id;
  if v_secciones = 0 then
    v_errores := v_errores || jsonb_build_array(jsonb_build_object(
      'codigo','sin_secciones','mensaje','La plantilla no tiene secciones'));
  end if;

  -- Secciones: título obligatorio.
  for rec in select * from viabilidad_secciones where plantilla_id = p_plantilla_id loop
    if rec.titulo is null or btrim(rec.titulo) = '' then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','seccion_sin_titulo','ref', rec.id_seccion_viabilidad::text,
        'mensaje','Hay una sección sin título'));
    end if;
  end loop;

  select count(*) into v_preguntas
  from viabilidad_preguntas p
  join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
  where s.plantilla_id = p_plantilla_id and p.activa = true;
  if v_preguntas = 0 then
    v_errores := v_errores || jsonb_build_array(jsonb_build_object(
      'codigo','sin_preguntas','mensaje','La plantilla no tiene preguntas activas'));
  end if;

  -- Códigos duplicados (la BD sólo garantiza único por sección).
  select string_agg(codigo, ', ') into v_dup from (
    select p.codigo
    from viabilidad_preguntas p
    join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
    where s.plantilla_id = p_plantilla_id
    group by p.codigo
    having count(*) > 1
  ) d;
  if v_dup is not null then
    v_errores := v_errores || jsonb_build_array(jsonb_build_object(
      'codigo','codigo_duplicado','ref', v_dup,
      'mensaje', format('Códigos de pregunta duplicados en la plantilla: %s', v_dup)));
  end if;

  -- Preguntas: obligatorias/opciones/configuración/regla.
  for rec in
    select p.* from viabilidad_preguntas p
    join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
    where s.plantilla_id = p_plantilla_id
  loop
    if rec.codigo is null or btrim(rec.codigo) = '' then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','pregunta_sin_codigo','ref', rec.id_pregunta_viabilidad::text,
        'mensaje','Hay una pregunta sin código'));
    end if;
    if rec.texto is null or btrim(rec.texto) = '' then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','pregunta_sin_texto','ref', rec.codigo,
        'mensaje', format('La pregunta "%s" no tiene texto', coalesce(rec.codigo, rec.id_pregunta_viabilidad::text))));
    end if;
    if rec.tipo_respuesta not in
       ('booleano','opcion_unica','opcion_multiple','numero','texto','fecha','evidencia') then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','tipo_invalido','ref', rec.codigo,
        'mensaje', format('La pregunta "%s" usa un tipo de respuesta no soportado', rec.codigo)));
    end if;

    if rec.activa and rec.tipo_respuesta in ('opcion_unica','opcion_multiple')
       and not exists (select 1 from viabilidad_opciones o where o.pregunta_id = rec.id_pregunta_viabilidad) then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','sin_opciones','ref', rec.codigo,
        'mensaje', format('La pregunta "%s" es de opción y no tiene opciones', rec.codigo)));
    end if;

    if rec.regla_evaluacion is not null then
      v_err := public._viabilidad_regla_error(rec.regla_evaluacion);
      if v_err is not null then
        v_errores := v_errores || jsonb_build_array(jsonb_build_object(
          'codigo','regla_invalida','ref', rec.codigo,
          'mensaje', format('Regla de la pregunta "%s": %s', coalesce(rec.codigo, rec.id_pregunta_viabilidad::text), v_err)));
      end if;
    end if;
  end loop;

  -- Opciones: etiqueta/valor y regla.
  for rec in
    select o.* from viabilidad_opciones o
    join viabilidad_preguntas p on p.id_pregunta_viabilidad = o.pregunta_id
    join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
    where s.plantilla_id = p_plantilla_id
  loop
    if rec.valor is null or btrim(rec.valor) = '' or rec.etiqueta is null or btrim(rec.etiqueta) = '' then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','opcion_invalida','ref', rec.id_opcion_viabilidad::text,
        'mensaje','Hay una opción sin valor o sin etiqueta'));
    end if;
    if rec.regla is not null then
      v_err := public._viabilidad_regla_error(rec.regla);
      if v_err is not null then
        v_errores := v_errores || jsonb_build_array(jsonb_build_object(
          'codigo','regla_opcion_invalida','ref', rec.id_opcion_viabilidad::text,
          'mensaje', format('Regla de la opción "%s": %s', rec.etiqueta, v_err)));
      end if;
    end if;
  end loop;

  -- Condiciones: origen existente, sin auto-referencia, valores de opción válidos.
  for rec in
    select c.* from viabilidad_condiciones c
    join viabilidad_preguntas p on p.id_pregunta_viabilidad = c.pregunta_id
    join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
    where s.plantilla_id = p_plantilla_id
  loop
    if not exists (
      select 1 from viabilidad_preguntas p2
      join viabilidad_secciones s2 on s2.id_seccion_viabilidad = p2.seccion_id
      where p2.id_pregunta_viabilidad = rec.pregunta_origen_id
        and s2.plantilla_id = p_plantilla_id
    ) then
      v_errores := v_errores || jsonb_build_array(jsonb_build_object(
        'codigo','condicion_origen_inexistente','ref', rec.id_condicion_viabilidad::text,
        'mensaje','Una condición apunta a una pregunta origen fuera de la plantilla'));
    end if;

    -- Valores de opción referenciados (sólo si el origen es de opción).
    if (select p2.tipo_respuesta from viabilidad_preguntas p2
          where p2.id_pregunta_viabilidad = rec.pregunta_origen_id) in ('opcion_unica','opcion_multiple')
       and rec.operador in ('=','!=','contiene','in','not_in') then
      foreach v_val in array string_to_array(coalesce(rec.valor,''), ',') loop
        if btrim(v_val) <> '' and not exists (
          select 1 from viabilidad_opciones o
           where o.pregunta_id = rec.pregunta_origen_id and o.valor = btrim(v_val)
        ) then
          v_errores := v_errores || jsonb_build_array(jsonb_build_object(
            'codigo','condicion_valor_inexistente','ref', rec.id_condicion_viabilidad::text,
            'mensaje', format('La condición referencia la opción inexistente "%s"', btrim(v_val))));
        end if;
      end loop;
    end if;
  end loop;

  -- Ciclos de dependencia.
  select public._viabilidad_dependencias_ciclicas(p_plantilla_id) into v_ciclo;
  if v_ciclo then
    v_errores := v_errores || jsonb_build_array(jsonb_build_object(
      'codigo','dependencias_ciclicas',
      'mensaje','Existen dependencias circulares entre condiciones que el motor no puede resolver'));
  end if;

  return jsonb_build_object(
    'ok', jsonb_array_length(v_errores) = 0,
    'errores', v_errores
  );
end;
$$;

-- ═════════════════════════════════════════════════════════════════════
-- 4) RPC de gestión de plantillas (sólo admin)
-- ═════════════════════════════════════════════════════════════════════
create or replace function public.crear_plantilla_viabilidad(
  p_empresa_id integer,
  p_servicio_id integer,
  p_tipo_etapa text,
  p_nombre text,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_version integer;
  v_id integer;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede gestionar plantillas'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;
  if p_tipo_etapa not in ('previabilidad','ingenieria') then
    raise exception 'Etapa inválida: %', p_tipo_etapa;
  end if;
  if p_nombre is null or btrim(p_nombre) = '' then
    raise exception 'El nombre de la plantilla es obligatorio';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from viabilidad_plantillas
  where empresa_id = p_empresa_id
    and servicio_id is not distinct from p_servicio_id
    and tipo_etapa = p_tipo_etapa;

  perform set_config('zyra.rpc_plantilla', 'on', true);

  insert into viabilidad_plantillas(empresa_id, servicio_id, tipo_etapa, version, nombre, estado, creado_por)
  values (p_empresa_id, p_servicio_id, p_tipo_etapa, v_version, btrim(p_nombre), 'borrador', auth.uid())
  returning id_plantilla_viabilidad into v_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'crear_plantilla_viabilidad', 'viabilidad_plantillas',
          v_id::text, jsonb_build_object('servicio_id', p_servicio_id, 'tipo_etapa', p_tipo_etapa, 'version', v_version));

  v_cached := jsonb_build_object('id_plantilla_viabilidad', v_id, 'version', v_version, 'estado', 'borrador');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'crear_plantilla_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.crear_version_plantilla_viabilidad(
  p_origen_id integer,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_origen record;
  v_version integer;
  v_id integer;
  rec record;
  v_new integer;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede gestionar plantillas'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_origen from viabilidad_plantillas
   where id_plantilla_viabilidad = p_origen_id;
  if not found then raise exception 'La plantilla % no existe', p_origen_id; end if;

  perform set_config('zyra.rpc_plantilla', 'on', true);

  select coalesce(max(version), 0) + 1 into v_version
  from viabilidad_plantillas
  where empresa_id = v_origen.empresa_id
    and servicio_id is not distinct from v_origen.servicio_id
    and tipo_etapa = v_origen.tipo_etapa;

  insert into viabilidad_plantillas(empresa_id, servicio_id, tipo_etapa, version, nombre, estado, creado_por)
  values (v_origen.empresa_id, v_origen.servicio_id, v_origen.tipo_etapa, v_version,
          v_origen.nombre, 'borrador', auth.uid())
  returning id_plantilla_viabilidad into v_id;

  -- Secciones + mapa de ids.
  drop table if exists _vpl_map_sec;
  drop table if exists _vpl_map_preg;
  create temporary table _vpl_map_sec(old integer primary key, new integer) on commit drop;
  create temporary table _vpl_map_preg(old integer primary key, new integer) on commit drop;

  for rec in select * from viabilidad_secciones where plantilla_id = p_origen_id order by orden, id_seccion_viabilidad loop
    insert into viabilidad_secciones(plantilla_id, orden, codigo, titulo, descripcion)
    values (v_id, rec.orden, rec.codigo, rec.titulo, rec.descripcion)
    returning id_seccion_viabilidad into v_new;
    insert into _vpl_map_sec(old, new) values (rec.id_seccion_viabilidad, v_new);
  end loop;

  for rec in
    select p.* from viabilidad_preguntas p
    join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
    where s.plantilla_id = p_origen_id
    order by p.orden, p.id_pregunta_viabilidad
  loop
    insert into viabilidad_preguntas(seccion_id, orden, codigo, texto, ayuda, tipo_respuesta,
                                     obligatoria, regla_evaluacion, activa)
    values ((select new from _vpl_map_sec where old = rec.seccion_id),
            rec.orden, rec.codigo, rec.texto, rec.ayuda, rec.tipo_respuesta,
            rec.obligatoria, rec.regla_evaluacion, rec.activa)
    returning id_pregunta_viabilidad into v_new;
    insert into _vpl_map_preg(old, new) values (rec.id_pregunta_viabilidad, v_new);

    insert into viabilidad_opciones(pregunta_id, orden, valor, etiqueta, regla)
    select v_new, o.orden, o.valor, o.etiqueta, o.regla
    from viabilidad_opciones o where o.pregunta_id = rec.id_pregunta_viabilidad;
  end loop;

  insert into viabilidad_condiciones(pregunta_id, pregunta_origen_id, operador, valor, accion)
  select (select new from _vpl_map_preg where old = c.pregunta_id),
         (select new from _vpl_map_preg where old = c.pregunta_origen_id),
         c.operador, c.valor, c.accion
  from viabilidad_condiciones c
  join viabilidad_preguntas p on p.id_pregunta_viabilidad = c.pregunta_id
  join viabilidad_secciones s on s.id_seccion_viabilidad = p.seccion_id
  where s.plantilla_id = p_origen_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'crear_version_plantilla_viabilidad', 'viabilidad_plantillas',
          v_id::text, jsonb_build_object('origen_id', p_origen_id, 'version', v_version));

  v_cached := jsonb_build_object('id_plantilla_viabilidad', v_id, 'origen_id', p_origen_id,
                                 'version', v_version, 'estado', 'borrador');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'crear_version_plantilla_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.publicar_plantilla_viabilidad(
  p_plantilla_id integer,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_plantilla record;
  v_val jsonb;
  v_msg text;
  v_archivadas integer;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede publicar plantillas'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_plantilla from viabilidad_plantillas
   where id_plantilla_viabilidad = p_plantilla_id;
  if not found then raise exception 'La plantilla % no existe', p_plantilla_id; end if;
  if v_plantilla.estado <> 'borrador' then
    raise exception 'Solo pueden publicarse borradores (estado actual: %)', v_plantilla.estado;
  end if;

  v_val := public.validar_plantilla_viabilidad(p_plantilla_id);
  if not (v_val->>'ok')::boolean then
    select string_agg('- ' || (e->>'mensaje'), e'\n' order by ord)
      into v_msg
      from jsonb_array_elements(v_val->'errores') with ordinality as t(e, ord);
    raise exception 'La plantilla no puede publicarse:%', e'\n' || coalesce(v_msg, 'estructura inválida');
  end if;

  perform set_config('zyra.rpc_plantilla', 'on', true);

  -- Archiva la versión activa anterior de la misma clave (empresa/servicio/etapa).
  update viabilidad_plantillas
     set estado = 'archivada'
   where empresa_id = v_plantilla.empresa_id
     and servicio_id is not distinct from v_plantilla.servicio_id
     and tipo_etapa = v_plantilla.tipo_etapa
     and estado = 'activa'
     and id_plantilla_viabilidad <> p_plantilla_id;
  get diagnostics v_archivadas = row_count;

  update viabilidad_plantillas
     set estado = 'activa'
   where id_plantilla_viabilidad = p_plantilla_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'publicar_plantilla_viabilidad', 'viabilidad_plantillas',
          p_plantilla_id::text,
          jsonb_build_object('version', v_plantilla.version, 'archivadas', v_archivadas));

  v_cached := jsonb_build_object('id_plantilla_viabilidad', p_plantilla_id,
                                 'version', v_plantilla.version, 'estado', 'activa',
                                 'archivadas', v_archivadas);
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'publicar_plantilla_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

create or replace function public.archivar_plantilla_viabilidad(
  p_plantilla_id integer,
  p_operation_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cached jsonb;
  v_plantilla record;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede archivar plantillas'; end if;
  if p_operation_id is not null then
    v_cached := public._idempotente_leer(p_operation_id);
    if v_cached is not null then return v_cached; end if;
  end if;

  select * into v_plantilla from viabilidad_plantillas
   where id_plantilla_viabilidad = p_plantilla_id;
  if not found then raise exception 'La plantilla % no existe', p_plantilla_id; end if;
  if v_plantilla.estado <> 'activa' then
    raise exception 'Solo puede archivarse una versión activa (estado actual: %)', v_plantilla.estado;
  end if;

  perform set_config('zyra.rpc_plantilla', 'on', true);

  update viabilidad_plantillas
     set estado = 'archivada'
   where id_plantilla_viabilidad = p_plantilla_id;

  insert into audit_log(usuario_id, empleado_id, accion, entidad, entidad_id, valores_nuevos)
  values (auth.uid(), public.mi_empleado_id(), 'archivar_plantilla_viabilidad', 'viabilidad_plantillas',
          p_plantilla_id::text, jsonb_build_object('version', v_plantilla.version));

  v_cached := jsonb_build_object('id_plantilla_viabilidad', p_plantilla_id,
                                 'version', v_plantilla.version, 'estado', 'archivada');
  if p_operation_id is not null then
    perform public._idempotente_guardar(p_operation_id, 'archivar_plantilla_viabilidad', v_cached);
  end if;
  return v_cached;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════
-- 5) Permisos
-- ═════════════════════════════════════════════════════════════════════
revoke all on function public._viabilidad_bypass_plantilla() from public, anon, authenticated;
revoke all on function public._proteger_plantilla_viabilidad() from public, anon, authenticated;
revoke all on function public._proteger_estructura_plantilla_viabilidad() from public, anon, authenticated;
revoke all on function public._viabilidad_regla_error(jsonb) from public, anon, authenticated;
revoke all on function public._viabilidad_dependencias_ciclicas(integer) from public, anon, authenticated;

revoke all on function public.validar_plantilla_viabilidad(integer) from public, anon;
revoke all on function public.crear_plantilla_viabilidad(integer, integer, text, text, uuid) from public, anon;
revoke all on function public.crear_version_plantilla_viabilidad(integer, uuid) from public, anon;
revoke all on function public.publicar_plantilla_viabilidad(integer, uuid) from public, anon;
revoke all on function public.archivar_plantilla_viabilidad(integer, uuid) from public, anon;

grant execute on function public.validar_plantilla_viabilidad(integer) to authenticated, service_role;
grant execute on function public.crear_plantilla_viabilidad(integer, integer, text, text, uuid) to authenticated, service_role;
grant execute on function public.crear_version_plantilla_viabilidad(integer, uuid) to authenticated, service_role;
grant execute on function public.publicar_plantilla_viabilidad(integer, uuid) to authenticated, service_role;
grant execute on function public.archivar_plantilla_viabilidad(integer, uuid) to authenticated, service_role;
