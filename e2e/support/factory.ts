import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { DATABASE_URL, R2 } from "./env";
import type { StockRow } from "./state";

const { Client } = pg;

// ─────────────────────────────────────────────────────────────────────
// Conexión directa a PostgreSQL (para limpieza determinista y snapshot).
// ─────────────────────────────────────────────────────────────────────
async function withPg<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// ─────────────────────────────────────────────────────────────────────
// Catálogos base
// ─────────────────────────────────────────────────────────────────────
export async function getEmpresaId(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("empresas")
    .select("id_empresa")
    .order("id_empresa")
    .limit(1)
    .single();
  if (error || !data) throw new Error(`No hay empresa: ${error?.message ?? "vacío"}`);
  return data.id_empresa as number;
}

export async function getServicioId(admin: SupabaseClient, tipo: string): Promise<number> {
  const { data, error } = await admin
    .from("servicios")
    .select("id_servicio")
    .eq("tipo", tipo)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No existe el servicio "${tipo}" (¿falta el seed?)`);
  return data.id_servicio as number;
}

export async function getRolId(admin: SupabaseClient, nombreRol: string): Promise<number> {
  const { data, error } = await admin
    .from("roles")
    .select("id_rol")
    .eq("nombre_rol", nombreRol)
    .single();
  if (error || !data) throw new Error(`No existe el rol "${nombreRol}" (¿falta el seed?)`);
  return data.id_rol as number;
}

// ─────────────────────────────────────────────────────────────────────
// Usuario técnico de prueba
// ─────────────────────────────────────────────────────────────────────
export interface Technician {
  userId: string;
  empleadoId: number;
}

export async function ensureTechnician(
  admin: SupabaseClient,
  email: string,
  password: string,
  nombre: string
): Promise<Technician> {
  // 1) Usuario de Auth (reutilízalo si ya existe).
  let userId: string | undefined;
  const creado = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (creado.error) {
    const { data } = await admin.auth.admin.listUsers();
    const existing = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw new Error(`No se pudo crear ni encontrar el usuario ${email}: ${creado.error.message}`);
    userId = existing.id;
    // Asegura la contraseña esperada.
    await admin.auth.admin.updateUserById(existing.id, { password });
  } else {
    userId = creado.data.user?.id;
  }
  if (!userId) throw new Error("Usuario técnico sin id");

  const empresaId = await getEmpresaId(admin);
  const rolId = await getRolId(admin, "tecnico");

  // 2) Empleado (reutiliza si ya existe con ese correo).
  const { data: existente } = await admin
    .from("empleados")
    .select("id_empleado")
    .eq("correo", email)
    .maybeSingle();

  let empleadoId: number;
  if (existente) {
    empleadoId = existente.id_empleado as number;
    await admin.from("empleados").update({ nombre }).eq("id_empleado", empleadoId);
  } else {
    const { data, error } = await admin
      .from("empleados")
      .insert({ empresa_id: empresaId, nombre, correo: email })
      .select("id_empleado")
      .single();
    if (error || !data) throw new Error(`No se pudo crear el empleado: ${error?.message}`);
    empleadoId = data.id_empleado as number;
  }

  // 3) Usuario de la app.
  await admin.from("usuarios").upsert(
    { id_usuario: userId, empleado_id: empleadoId, rol_id: rolId, username: email, activo: true },
    { onConflict: "id_usuario" }
  );

  return { userId, empleadoId };
}

// ─────────────────────────────────────────────────────────────────────
// Stock (se descuenta al iniciar proyectos; se restaura al limpiar).
// ─────────────────────────────────────────────────────────────────────
export async function snapshotStock(admin: SupabaseClient): Promise<StockRow[]> {
  const { data, error } = await admin.from("materiales").select("id_material, stock_disponible");
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id_material: m.id_material as number,
    stock_disponible: m.stock_disponible as number,
  }));
}

export async function restoreStock(stock: StockRow[]): Promise<void> {
  if (stock.length === 0) return;
  await withPg(async (client) => {
    for (const s of stock) {
      await client.query("update materiales set stock_disponible = $1 where id_material = $2", [
        s.stock_disponible,
        s.id_material,
      ]);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────
// Fábrica de datos de dominio (usa un cliente admin autenticado).
// ─────────────────────────────────────────────────────────────────────
export async function createCliente(
  admin: SupabaseClient,
  empresaId: number,
  nombre: string
): Promise<number> {
  const { data, error } = await admin
    .from("clientes")
    .insert({ empresa_id: empresaId, nombre, correo: `e2e-${crypto.randomUUID().slice(0, 8)}@zyra.test`, telefono: "0000000000", direccion: "Dirección E2E" })
    .select("id_cliente")
    .single();
  if (error || !data) throw new Error(`No se pudo crear el cliente: ${error?.message}`);
  return data.id_cliente as number;
}

export async function createEquipo(
  admin: SupabaseClient,
  empresaId: number,
  nombre: string
): Promise<number> {
  const { data, error } = await admin
    .from("equipos")
    .insert({ empresa_id: empresaId, nombre_equipo: nombre })
    .select("id_equipo")
    .single();
  if (error || !data) throw new Error(`No se pudo crear el equipo: ${error?.message}`);
  return data.id_equipo as number;
}

export async function addEquipoMember(
  admin: SupabaseClient,
  equipoId: number,
  empleadoId: number,
  esLider = false
): Promise<void> {
  const { error } = await admin
    .from("empleado_equipo")
    .insert({ empleado_id: empleadoId, equipo_id: equipoId, es_lider: esLider, cargo: esLider ? "Líder" : null });
  if (error) throw new Error(`No se pudo añadir el miembro: ${error.message}`);
}

export interface ProyectoFixture {
  id: number;
  nombre: string;
}

export async function createProyecto(
  admin: SupabaseClient,
  input: {
    empresaId: number;
    clienteId: number | null;
    servicioId: number | null;
    equipoId: number | null;
    nombre: string;
    ubicacion?: string;
    creadoPor?: string | null;
  }
): Promise<ProyectoFixture> {
  const { data, error } = await admin
    .from("proyectos")
    .insert({
      empresa_id: input.empresaId,
      cliente_id: input.clienteId,
      servicio_id: input.servicioId,
      equipo_id: input.equipoId,
      nombre_proyecto: input.nombre,
      ubicacion: input.ubicacion ?? "Ubicación E2E",
      creado_por: input.creadoPor ?? null,
    })
    .select("id_proyecto")
    .single();
  if (error || !data) throw new Error(`No se pudo crear el proyecto: ${error?.message}`);
  return { id: data.id_proyecto as number, nombre: input.nombre };
}

// ─────────────────────────────────────────────────────────────────────
// RPC (ciclo de vida). `admin` debe estar autenticado (RLS real).
// ─────────────────────────────────────────────────────────────────────
export function op(): string {
  return crypto.randomUUID();
}

export async function generarChecklist(admin: SupabaseClient, proyectoId: number, operationId = op()) {
  const { data, error } = await admin.rpc("generar_checklist", { p_proyecto_id: proyectoId, p_operation_id: operationId });
  if (error) throw new Error(`generar_checklist: ${error.message}`);
  return data as { id_checklist: number; proyecto_id: number };
}

export async function marcarChecklistCompleto(
  admin: SupabaseClient,
  checklistId: number,
  empleadoId: number
): Promise<void> {
  const { data: items, error } = await admin
    .from("checklist_detalle")
    .select("id_checklist_detalle, cantidad_requerida")
    .eq("checklist_id", checklistId);
  if (error) throw new Error(error.message);
  for (const it of items ?? []) {
    const { error: e } = await admin
      .from("checklist_detalle")
      .update({ marcado: true, cantidad_cargada: it.cantidad_requerida, empleado_id: empleadoId })
      .eq("id_checklist_detalle", it.id_checklist_detalle);
    if (e) throw new Error(e.message);
  }
}

export async function validarChecklist(admin: SupabaseClient, checklistId: number, operationId = op()) {
  const { data, error } = await admin.rpc("validar_checklist", { p_checklist_id: checklistId, p_operation_id: operationId });
  if (error) throw new Error(`validar_checklist: ${error.message}`);
  return data;
}

export async function iniciarProyecto(admin: SupabaseClient, proyectoId: number, operationId = op()) {
  const { data, error } = await admin.rpc("iniciar_proyecto", { p_proyecto_id: proyectoId, p_operation_id: operationId });
  if (error) throw new Error(`iniciar_proyecto: ${error.message}`);
  return data;
}

export async function reportarAvance(
  admin: SupabaseClient,
  proyectoId: number,
  descripcion: string,
  porcentaje?: number,
  operationId = op()
) {
  const { data, error } = await admin.rpc("reportar_avance", {
    p_proyecto_id: proyectoId,
    p_descripcion: descripcion,
    p_porcentaje: porcentaje,
    p_operation_id: operationId,
  });
  if (error) throw new Error(`reportar_avance: ${error.message}`);
  return data;
}

export async function enviarReporte(admin: SupabaseClient, proyectoId: number, comentarios?: string, operationId = op()) {
  const { data, error } = await admin.rpc("enviar_reporte", {
    p_proyecto_id: proyectoId,
    p_comentarios: comentarios,
    p_operation_id: operationId,
  });
  if (error) throw new Error(`enviar_reporte: ${error.message}`);
  return data;
}

export async function aprobarReporte(admin: SupabaseClient, reporteId: number, operationId = op()) {
  const { data, error } = await admin.rpc("aprobar_reporte", { p_reporte_id: reporteId, p_operation_id: operationId });
  if (error) throw new Error(`aprobar_reporte: ${error.message}`);
  return data;
}

export async function finalizarProyecto(admin: SupabaseClient, proyectoId: number, comentarios?: string, operationId = op()) {
  const { data, error } = await admin.rpc("finalizar_proyecto", {
    p_proyecto_id: proyectoId,
    p_comentarios: comentarios,
    p_operation_id: operationId,
  });
  if (error) throw new Error(`finalizar_proyecto: ${error.message}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// Limpieza total de los datos de prueba (por prefijo único).
// ─────────────────────────────────────────────────────────────────────
export async function deleteR2Objects(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey },
  });
  let eliminados = 0;
  for (const key of keys) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: R2.bucketName, Key: key }));
      eliminados++;
    } catch {
      // Ignora objetos ya inexistentes.
    }
  }
  return eliminados;
}

export interface CleanupResult {
  proyectos: number;
  clientes: number;
  equipos: number;
  empleados: number;
  objetosR2: number;
}

/**
 * Borra todo lo creado por la ejecución E2E:
 * - Proyectos cuyo nombre empieza por `prefix` (arrastra checklist, avances,
 *   evidencias y reportes por ON DELETE CASCADE).
 * - Clientes y equipos con ese prefijo.
 * - Empleado/usuario técnico de prueba.
 * - Objetos de evidencia en R2 (recogidos antes de borrar las filas).
 */
export async function cleanupByPrefix(
  prefix: string,
  techEmail: string,
  techUserId: string
): Promise<CleanupResult> {
  const result: CleanupResult = { proyectos: 0, clientes: 0, equipos: 0, empleados: 0, objetosR2: 0 };

  // 1) Recoge las claves de objeto de R2 de las evidencias de esos proyectos.
  const keys = await withPg(async (client) => {
    const r = await client.query<{ object_key: string }>(
      `select e.object_key from evidencias e
         join proyectos p on p.id_proyecto = e.proyecto_id
        where p.nombre_proyecto like $1`,
      [`${prefix}%`]
    );
    return r.rows.map((row) => row.object_key);
  });
  result.objetosR2 = await deleteR2Objects(keys);

  // 2) Borra en orden dentro de una transacción.
  await withPg(async (client) => {
    await client.query("begin");
    try {
      const p = await client.query(
        "delete from proyectos where nombre_proyecto like $1",
        [`${prefix}%`]
      );
      result.proyectos = p.rowCount ?? 0;

      const c = await client.query("delete from clientes where nombre like $1", [`${prefix}%`]);
      result.clientes = c.rowCount ?? 0;

      const eq = await client.query("delete from equipos where nombre_equipo like $1", [`${prefix}%`]);
      result.equipos = eq.rowCount ?? 0;

      // El usuario de Auth (cascade usuarios). Se borra primero para liberar FK.
      if (techUserId) {
        await client.query("delete from auth.users where id = $1", [techUserId]);
      }
      const em = await client.query("delete from empleados where correo = $1", [techEmail]);
      result.empleados = em.rowCount ?? 0;

      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  });

  return result;
}
