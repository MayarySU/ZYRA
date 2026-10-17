// =====================================================================
// ZYRA — scripts/db/smoke.mjs
// Prueba end-to-end del ciclo de vida de un proyecto usando las RPC y
// las políticas RLS reales (login como admin con la publishable key).
//
// Uso: node scripts/db/smoke.mjs
// Crea datos temporales y los elimina al final.
// =====================================================================
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, '..', '..');
dotenv.config({ path: join(raiz, '.env.local') });

const { Client } = pg;

const CORREO = process.env.SMOKE_ADMIN_EMAIL || 'admin@essesolar.com';
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'ZyraAdmin2026!';
const OP = () => crypto.randomUUID();

let ok = 0;
let fail = 0;
function check(nombre, cond, extra = '') {
  if (cond) {
    ok++;
    console.log(`  PASS ${nombre} ${extra}`);
  } else {
    fail++;
    console.log(`  FAIL ${nombre} ${extra}`);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(url, pub, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sesion, error: errLogin } = await supabase.auth.signInWithPassword({
    email: CORREO,
    password: PASSWORD,
  });
  if (errLogin) throw errLogin;
  console.log(`Login OK como ${sesion.user.email}\n`);

  // ── Preparación (como admin) ────────────────────────────────────────
  const { data: servicio } = await supabase
    .from('servicios').select('id_servicio, tipo').eq('tipo', 'Instalación Residencial').single();
  const { data: empresa } = await supabase.from('empresas').select('id_empresa').limit(1).single();
  const { data: adminUsr } = await supabase
    .from('usuarios').select('empleado_id').eq('id_usuario', sesion.user.id).single();

  const { data: equipo } = await supabase
    .from('equipos').insert({ empresa_id: empresa.id_empresa, nombre_equipo: 'Equipo Smoke ' + Date.now() })
    .select().single();
  await supabase.from('empleado_equipo').insert({ empleado_id: adminUsr.empleado_id, equipo_id: equipo.id_equipo, es_lider: true });

  const { data: cliente } = await supabase
    .from('clientes').insert({ empresa_id: empresa.id_empresa, nombre: 'Cliente Smoke ' + Date.now() })
    .select().single();

  const { data: proyecto, error: errProy } = await supabase
    .from('proyectos')
    .insert({
      empresa_id: empresa.id_empresa,
      cliente_id: cliente.id_cliente,
      servicio_id: servicio.id_servicio,
      equipo_id: equipo.id_equipo,
      nombre_proyecto: 'Proyecto Smoke ' + Date.now(),
      ubicacion: 'Managua',
      creado_por: sesion.user.id,
    })
    .select().single();
  if (errProy) throw errProy;
  const pid = proyecto.id_proyecto;
  console.log('Proyecto de prueba:', pid, '\n');

  const stockAntes = (await supabase.from('materiales').select('id_material, stock_disponible')).data;

  // ── 1. generar_checklist ────────────────────────────────────────────
  {
    const op = OP();
    const r1 = await supabase.rpc('generar_checklist', { p_proyecto_id: pid, p_operation_id: op });
    check('generar_checklist', !r1.error, r1.error?.message || '');
    const r2 = await supabase.rpc('generar_checklist', { p_proyecto_id: pid, p_operation_id: op });
    check('generar_checklist idempotente', !r2.error && r2.data.id_checklist === r1.data.id_checklist);
  }

  const { data: checklist } = await supabase
    .from('checklists').select('id_checklist, estado').eq('proyecto_id', pid).single();
  const { data: proyTrasGen } = await supabase.from('proyectos').select('estado').eq('id_proyecto', pid).single();
  check('estado tras generar => checklist_pendiente', proyTrasGen.estado === 'checklist_pendiente', proyTrasGen.estado);

  // ── 1b. Guardias de estado (Fase 5) ─────────────────────────────────
  {
    const r = await supabase.from('proyectos').update({ estado: 'finalizado' }).eq('id_proyecto', pid).select();
    check('update directo de estado bloqueado', !!r.error, r.error?.message || 'permitido!');
  }
  {
    const r = await supabase.rpc('avanzar_estado', { p_proyecto_id: pid, p_nuevo_estado: 'finalizado', p_operation_id: OP() });
    check('avanzar_estado => finalizado bloqueado', !!r.error, r.error?.message || 'permitido!');
  }
  {
    const r = await supabase.rpc('iniciar_proyecto', { p_proyecto_id: pid, p_operation_id: OP() });
    check('iniciar sin checklist completo bloqueado', !!r.error, r.error?.message || 'permitido!');
  }

  // ── 2. validar_checklist (incompleto) ───────────────────────────────
  {
    const r = await supabase.rpc('validar_checklist', { p_checklist_id: checklist.id_checklist, p_operation_id: OP() });
    check('validar_checklist incompleto', !r.error && r.data.estado === 'incompleto', JSON.stringify(r.data || r.error));
  }

  // ── 3. marcar checklist ─────────────────────────────────────────────
  {
    const { data: items } = await supabase
      .from('checklist_detalle').select('id_checklist_detalle, cantidad_requerida').eq('checklist_id', checklist.id_checklist);
    for (const it of items) {
      const { error } = await supabase
        .from('checklist_detalle')
        .update({ marcado: true, cantidad_cargada: it.cantidad_requerida, empleado_id: adminUsr.empleado_id })
        .eq('id_checklist_detalle', it.id_checklist_detalle);
      if (error) throw error;
    }
    check('marcar checklist_detalle', items.length > 0, `${items.length} items`);
  }

  // ── 4. validar_checklist (completo) ─────────────────────────────────
  {
    const r = await supabase.rpc('validar_checklist', { p_checklist_id: checklist.id_checklist, p_operation_id: OP() });
    check('validar_checklist completo', !r.error && r.data.estado === 'completo', JSON.stringify(r.data || r.error));
    const { data: p } = await supabase.from('proyectos').select('estado').eq('id_proyecto', pid).single();
    check('estado => listo_para_iniciar', p.estado === 'listo_para_iniciar', p.estado);
  }

  // ── 4b. No se puede iniciar saltando la RPC dedicada ────────────────
  {
    const r = await supabase.rpc('avanzar_estado', { p_proyecto_id: pid, p_nuevo_estado: 'en_proceso', p_operation_id: OP() });
    check('avanzar_estado => en_proceso bloqueado', !!r.error, r.error?.message || 'permitido!');
  }

  // ── 5. iniciar_proyecto (descuenta stock) ───────────────────────────
  {
    const r = await supabase.rpc('iniciar_proyecto', { p_proyecto_id: pid, p_operation_id: OP() });
    check('iniciar_proyecto', !r.error && r.data.estado === 'en_proceso', JSON.stringify(r.data || r.error));
    const stockDespues = (await supabase.from('materiales').select('id_material, stock_disponible')).data;
    const cambio = stockAntes.some((s) => stockDespues.find((d) => d.id_material === s.id_material).stock_disponible !== s.stock_disponible);
    check('stock descontado', cambio);
  }

  // ── 6. reportar_avance ──────────────────────────────────────────────
  let avanceId;
  {
    const op = OP();
    const r = await supabase.rpc('reportar_avance', { p_proyecto_id: pid, p_descripcion: 'Inicio de montaje', p_porcentaje: 40, p_operation_id: op });
    check('reportar_avance', !r.error, r.error?.message || '');
    avanceId = r.data?.id_avance;
    const r2 = await supabase.rpc('reportar_avance', { p_proyecto_id: pid, p_descripcion: 'Inicio de montaje', p_porcentaje: 40, p_operation_id: op });
    check('reportar_avance idempotente', r2.data?.id_avance === avanceId);
  }

  // ── 7. registrar_evidencia ──────────────────────────────────────────
  {
    const r = await supabase.rpc('registrar_evidencia', {
      p_proyecto_id: pid,
      p_object_key: `proyectos/${pid}/smoke.jpg`,
      p_descripcion: 'Foto de prueba',
      p_tipo: 'foto',
      p_content_type: 'image/jpeg',
      p_size_bytes: 12345,
      p_avance_id: avanceId,
      p_operation_id: OP(),
    });
    check('registrar_evidencia', !r.error, r.error?.message || '');
  }

  // ── 8. enviar_reporte ───────────────────────────────────────────────
  let reporteId;
  {
    const r = await supabase.rpc('enviar_reporte', { p_proyecto_id: pid, p_comentarios: 'Obra terminada', p_operation_id: OP() });
    check('enviar_reporte', !r.error && r.data.estado === 'pendiente_de_cierre', JSON.stringify(r.data || r.error));
    reporteId = r.data?.id_reporte;
  }

  // ── 9. finalizar antes de aprobar (debe fallar) ─────────────────────
  {
    const r = await supabase.rpc('finalizar_proyecto', { p_proyecto_id: pid, p_comentarios: 'x', p_operation_id: OP() });
    check('finalizar sin reporte aprobado => error', !!r.error, r.error?.message || 'no falló');
  }

  // ── 10. aprobar_reporte + finalizar_proyecto ────────────────────────
  {
    const rA = await supabase.rpc('aprobar_reporte', { p_reporte_id: reporteId, p_operation_id: OP() });
    check('aprobar_reporte', !rA.error, rA.error?.message || '');
    const op = OP();
    const rF = await supabase.rpc('finalizar_proyecto', { p_proyecto_id: pid, p_comentarios: 'Todo conforme', p_operation_id: op });
    check('finalizar_proyecto', !rF.error && rF.data.estado === 'finalizado', JSON.stringify(rF.data || rF.error));
    const rF2 = await supabase.rpc('finalizar_proyecto', { p_proyecto_id: pid, p_comentarios: 'Todo conforme', p_operation_id: op });
    check('finalizar_proyecto idempotente', !rF2.error && rF2.data.numero_reporte === rF.data.numero_reporte);
  }

  // ── 11. puntos otorgados ────────────────────────────────────────────
  {
    const { data: puntos } = await supabase.from('puntos_historial').select('*').eq('proyecto_id', pid);
    check('puntos otorgados al equipo', (puntos?.length ?? 0) > 0, `${puntos?.length} registros`);
  }

  // ── 12. RPC interna no accesible ────────────────────────────────────
  {
    const r = await supabase.rpc('_otorgar_puntos', { p_empleado_id: adminUsr.empleado_id, p_proyecto_id: pid, p_cantidad: 1, p_motivo: 'hack', p_tipo_evento: 'X' });
    check('_otorgar_puntos bloqueado', !!r.error, r.error?.message || 'accesible!');
  }

  // ── 13. Puntos no insertables directamente (RLS) ────────────────────
  {
    const r = await supabase
      .from('puntos_historial')
      .insert({ empleado_id: adminUsr.empleado_id, proyecto_id: pid, cantidad_puntos: 999, motivo: 'hack', tipo_evento: 'HACK' })
      .select();
    check('insert directo en puntos_historial bloqueado', !!r.error, r.error?.message || 'permitido!');
  }

  // ── 14. Sin sesión no se pueden ejecutar RPC protegidas ─────────────
  {
    const anon = createClient(url, pub, { auth: { autoRefreshToken: false, persistSession: false } });
    const r = await anon.rpc('finalizar_proyecto', { p_proyecto_id: pid, p_operation_id: OP() });
    check('RPC como anon bloqueada', !!r.error, r.error?.message || 'permitido!');
  }

  // ── 15. Evidencias: RLS impide lectura sin sesión ───────────────────
  {
    const anon = createClient(url, pub, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await anon.from('evidencias').select('id_evidencia').eq('proyecto_id', pid);
    check('anon no lee evidencias (RLS)', !error && (data?.length ?? 0) === 0, error?.message || `${data?.length ?? 0} filas`);
  }

  // ── 16. Viabilidad: aplicabilidad y compuerta fail-closed ───────────
  let pidV;
  {
    const { data: proyV, error: errProyV } = await supabase
      .from('proyectos')
      .insert({
        empresa_id: empresa.id_empresa,
        cliente_id: cliente.id_cliente,
        servicio_id: servicio.id_servicio,
        equipo_id: equipo.id_equipo,
        nombre_proyecto: 'Proyecto Vii ' + Date.now(),
        ubicacion: 'Managua',
        creado_por: sesion.user.id,
      })
      .select().single();
    if (errProyV) throw errProyV;
    pidV = proyV.id_proyecto;

    const { data: cfg } = await supabase
      .from('viabilidad_config_servicio').select('*').eq('servicio_id', servicio.id_servicio).maybeSingle();
    check('config viabilidad por defecto inactiva',
      cfg?.requiere_previabilidad === false && cfg?.requiere_ingenieria === false,
      JSON.stringify(cfg));

    const rAp = await supabase.rpc('establecer_aplicabilidad_viabilidad', {
      p_proyecto_id: pidV, p_requiere_previabilidad: true, p_requiere_ingenieria: false, p_operation_id: OP(),
    });
    check('establecer_aplicabilidad_viabilidad', !rAp.error && rAp.data.requiere_previabilidad === true,
      rAp.error?.message || JSON.stringify(rAp.data));

    const rBad = await supabase.rpc('establecer_aplicabilidad_viabilidad', {
      p_proyecto_id: pidV, p_requiere_previabilidad: false, p_requiere_ingenieria: true, p_operation_id: OP(),
    });
    check('ingenieria sin previabilidad bloqueada', !!rBad.error, rBad.error?.message || 'permitido!');

    await supabase.rpc('generar_checklist', { p_proyecto_id: pidV, p_operation_id: OP() });
    const { data: chkV } = await supabase
      .from('checklists').select('id_checklist').eq('proyecto_id', pidV).single();
    const { data: itemsV } = await supabase
      .from('checklist_detalle').select('id_checklist_detalle, cantidad_requerida').eq('checklist_id', chkV.id_checklist);
    for (const it of itemsV) {
      await supabase.from('checklist_detalle')
        .update({ marcado: true, cantidad_cargada: it.cantidad_requerida, empleado_id: adminUsr.empleado_id })
        .eq('id_checklist_detalle', it.id_checklist_detalle);
    }

    const rVal = await supabase.rpc('validar_checklist', { p_checklist_id: chkV.id_checklist, p_operation_id: OP() });
    check('validar_checklist completo bloqueado por compuerta', !!rVal.error, rVal.error?.message || 'permitido!');
    const { data: chkPost } = await supabase.from('checklists').select('estado').eq('id_checklist', chkV.id_checklist).single();
    check('checklist sigue incompleto (rollback)', chkPost.estado !== 'completo', chkPost.estado);

    const rIni = await supabase.rpc('iniciar_proyecto', { p_proyecto_id: pidV, p_operation_id: OP() });
    check('iniciar_proyecto bloqueado por compuerta', !!rIni.error, rIni.error?.message || 'permitido!');

    const rRev = await supabase.rpc('crear_revision_viabilidad', {
      p_proyecto_id: pidV, p_tipo_etapa: 'previabilidad', p_operation_id: OP(),
    });
    check('crear_revision_viabilidad (previabilidad)',
      !rRev.error && rRev.data.estado === 'borrador', rRev.error?.message || JSON.stringify(rRev.data));

    const rLock = await supabase.rpc('establecer_aplicabilidad_viabilidad', {
      p_proyecto_id: pidV, p_requiere_previabilidad: false, p_requiere_ingenieria: false, p_operation_id: OP(),
    });
    check('aplicabilidad bloqueada tras crear revisión', !!rLock.error, rLock.error?.message || 'permitido!');
  }

  // ── 17. Plantillas de viabilidad: gestión admin (borrador/publicación) ─
  let servicioPlantillaId;
  let plantillaV1;
  let plantillaV2;
  let seccionPlantillaId;
  {
    const { data: srv, error: errSrv } = await supabase
      .from('servicios')
      .insert({ empresa_id: empresa.id_empresa, tipo: `Smoke Plantillas ${Date.now()}` })
      .select('id_servicio').single();
    check('servicio dedicado para plantillas', !errSrv && !!srv, errSrv?.message || '');
    servicioPlantillaId = srv?.id_servicio;

    const rC = await supabase.rpc('crear_plantilla_viabilidad', {
      p_empresa_id: empresa.id_empresa, p_servicio_id: servicioPlantillaId,
      p_tipo_etapa: 'previabilidad', p_nombre: 'Smoke Plantilla', p_operation_id: OP(),
    });
    check('crear_plantilla_viabilidad => borrador',
      !rC.error && rC.data.estado === 'borrador', rC.error?.message || JSON.stringify(rC.data));
    plantillaV1 = rC.data?.id_plantilla_viabilidad;

    const rV = await supabase.rpc('validar_plantilla_viabilidad', { p_plantilla_id: plantillaV1 });
    check('validar plantilla vacía => inválida', !rV.error && rV.data.ok === false, JSON.stringify(rV.data));

    const rPub = await supabase.rpc('publicar_plantilla_viabilidad', { p_plantilla_id: plantillaV1, p_operation_id: OP() });
    check('publicar plantilla inválida bloqueada', !!rPub.error, rPub.error?.message || 'permitido!');
    const rAh = await supabase.rpc('archivar_plantilla_viabilidad', { p_plantilla_id: plantillaV1, p_operation_id: OP() });
    check('archivar plantilla no activa bloqueada', !!rAh.error, rAh.error?.message || 'permitido!');

    const { data: sec } = await supabase
      .from('viabilidad_secciones')
      .insert({ plantilla_id: plantillaV1, orden: 1, codigo: 's1', titulo: 'Sección Smoke' })
      .select('id_seccion_viabilidad').single();
    seccionPlantillaId = sec?.id_seccion_viabilidad;
    const { data: pre } = await supabase
      .from('viabilidad_preguntas')
      .insert({
        seccion_id: seccionPlantillaId, orden: 1, codigo: 'p1', texto: '¿Pregunta Smoke?',
        tipo_respuesta: 'opcion_unica', obligatoria: true,
      })
      .select('id_pregunta_viabilidad').single();
    const { error: errNoOpt } = await supabase
      .from('viabilidad_opciones')
      .insert({ pregunta_id: pre.id_pregunta_viabilidad, orden: 1, valor: 'x', etiqueta: '' });
    check('opción sin etiqueta insertada para validar', !errNoOpt, errNoOpt?.message || '');
    await supabase.from('viabilidad_opciones').update({ etiqueta: 'Opción Smoke' })
      .eq('pregunta_id', pre.id_pregunta_viabilidad);

    const rV2 = await supabase.rpc('validar_plantilla_viabilidad', { p_plantilla_id: plantillaV1 });
    check('validar plantilla completa => ok', !rV2.error && rV2.data.ok === true, JSON.stringify(rV2.data));

    const rPubOk = await supabase.rpc('publicar_plantilla_viabilidad', { p_plantilla_id: plantillaV1, p_operation_id: OP() });
    check('publicar plantilla válida => activa', !rPubOk.error && rPubOk.data.estado === 'activa',
      rPubOk.error?.message || JSON.stringify(rPubOk.data));

    const { error: errEdit } = await supabase
      .from('viabilidad_secciones').update({ titulo: 'Hack' }).eq('id_seccion_viabilidad', seccionPlantillaId);
    check('editar hijo de plantilla publicada bloqueado (BD)', !!errEdit, errEdit?.message || 'permitido!');

    const rClone = await supabase.rpc('crear_version_plantilla_viabilidad', { p_origen_id: plantillaV1, p_operation_id: OP() });
    check('crear_version_plantilla_viabilidad => borrador v2',
      !rClone.error && rClone.data.estado === 'borrador' && rClone.data.version === 2,
      rClone.error?.message || JSON.stringify(rClone.data));
    plantillaV2 = rClone.data?.id_plantilla_viabilidad;

    const { data: estructura } = await supabase
      .from('viabilidad_preguntas').select('id_pregunta_viabilidad')
      .eq('seccion_id', (await supabase.from('viabilidad_secciones')
        .select('id_seccion_viabilidad').eq('plantilla_id', plantillaV2).single()).data?.id_seccion_viabilidad);
    check('clone replica estructura', (estructura?.length ?? 0) === 1, `${estructura?.length ?? 0} preguntas`);

    const rPub2 = await supabase.rpc('publicar_plantilla_viabilidad', { p_plantilla_id: plantillaV2, p_operation_id: OP() });
    check('publicar v2 archiva v1', !rPub2.error && rPub2.data.archivadas === 1,
      rPub2.error?.message || JSON.stringify(rPub2.data));
    const { data: estados } = await supabase
      .from('viabilidad_plantillas').select('id_plantilla_viabilidad, estado')
      .in('id_plantilla_viabilidad', [plantillaV1, plantillaV2]);
    check('v1 archivada y v2 activa',
      estados?.find((e) => e.id_plantilla_viabilidad === plantillaV1)?.estado === 'archivada'
      && estados?.find((e) => e.id_plantilla_viabilidad === plantillaV2)?.estado === 'activa',
      JSON.stringify(estados));
  }

  // ── 18. Plantillas/RPC admin: roles no admin bloqueados ─────────────
  {
    const anon = createClient(url, pub, { auth: { autoRefreshToken: false, persistSession: false } });
    const r = await anon.rpc('crear_plantilla_viabilidad', {
      p_empresa_id: empresa.id_empresa, p_servicio_id: servicioPlantillaId,
      p_tipo_etapa: 'previabilidad', p_nombre: 'Smoke anon', p_operation_id: OP(),
    });
    check('crear_plantilla_viabilidad como anon bloqueada', !!r.error, r.error?.message || 'permitido!');
  }

  // ── Limpieza ────────────────────────────────────────────────────────
  await supabase.from('proyectos').delete().eq('id_proyecto', pid);
  if (pidV) await supabase.from('proyectos').delete().eq('id_proyecto', pidV);
  await supabase.from('clientes').delete().eq('id_cliente', cliente.id_cliente);
  await supabase.from('empleado_equipo').delete().eq('equipo_id', equipo.id_equipo);
  await supabase.from('equipos').delete().eq('id_equipo', equipo.id_equipo);

  // Restaurar stock consumido + limpiar plantillas/servicio (bypass RLS/trigger
  // como SQL directo: auth.uid() es null).
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  for (const s of stockAntes) {
    await client.query('update materiales set stock_disponible = $1 where id_material = $2', [s.stock_disponible, s.id_material]);
  }
  if (servicioPlantillaId) {
    await client.query('delete from viabilidad_plantillas where servicio_id = $1', [servicioPlantillaId]);
    await client.query('delete from servicios where id_servicio = $1', [servicioPlantillaId]);
  }
  await client.end();

  console.log(`\nResultado: ${ok} PASS, ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
