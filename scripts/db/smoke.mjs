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

  // ── Limpieza ────────────────────────────────────────────────────────
  await supabase.from('proyectos').delete().eq('id_proyecto', pid);
  await supabase.from('clientes').delete().eq('id_cliente', cliente.id_cliente);
  await supabase.from('empleado_equipo').delete().eq('equipo_id', equipo.id_equipo);
  await supabase.from('equipos').delete().eq('id_equipo', equipo.id_equipo);

  // Restaurar stock consumido
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  for (const s of stockAntes) {
    await client.query('update materiales set stock_disponible = $1 where id_material = $2', [s.stock_disponible, s.id_material]);
  }
  await client.end();

  console.log(`\nResultado: ${ok} PASS, ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
