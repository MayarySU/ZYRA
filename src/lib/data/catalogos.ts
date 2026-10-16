import { db, unwrap, unwrapMaybe } from "@/lib/data/util";
import type { Tablas } from "@/lib/data/util";

export type Cliente = Tablas["clientes"]["Row"];
export type Servicio = Tablas["servicios"]["Row"];
export type Material = Tablas["materiales"]["Row"];
export type Equipo = Tablas["equipos"]["Row"];
export type Empleado = Tablas["empleados"]["Row"];
export type Rol = Tablas["roles"]["Row"];
export type Empresa = Tablas["empresas"]["Row"];

const EMPRESA_ID_DEFECTO = 1;

// ─────────────────────────────────────────────────────────────────────
// Empresa / roles
// ─────────────────────────────────────────────────────────────────────
export async function obtenerEmpresa(): Promise<Empresa | null> {
  return unwrapMaybe(
    await db().from("empresas").select("*").order("id_empresa").limit(1).maybeSingle()
  );
}

export async function listarRoles(): Promise<Rol[]> {
  return unwrap(await db().from("roles").select("*").order("id_rol"));
}

// ─────────────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────────────
export async function listarClientes(): Promise<Cliente[]> {
  return unwrap(await db().from("clientes").select("*").order("nombre"));
}

export async function crearCliente(input: Tablas["clientes"]["Insert"]): Promise<Cliente> {
  return unwrap(await db().from("clientes").insert(input).select().single());
}

export async function actualizarCliente(
  id: number,
  patch: Tablas["clientes"]["Update"]
): Promise<Cliente> {
  return unwrap(await db().from("clientes").update(patch).eq("id_cliente", id).select().single());
}

export async function eliminarCliente(id: number): Promise<void> {
  const res = await db().from("clientes").delete().eq("id_cliente", id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Servicios
// ─────────────────────────────────────────────────────────────────────
export async function listarServicios(): Promise<Servicio[]> {
  return unwrap(await db().from("servicios").select("*").order("id_servicio"));
}

export async function crearServicio(input: {
  tipo: string;
  descripcion?: string | null;
  empresa_id?: number;
}): Promise<Servicio> {
  return unwrap(
    await db()
      .from("servicios")
      .insert({ empresa_id: input.empresa_id ?? EMPRESA_ID_DEFECTO, tipo: input.tipo, descripcion: input.descripcion ?? null })
      .select()
      .single()
  );
}

export async function actualizarServicio(
  id: number,
  patch: Tablas["servicios"]["Update"]
): Promise<Servicio> {
  return unwrap(await db().from("servicios").update(patch).eq("id_servicio", id).select().single());
}

export async function eliminarServicio(id: number): Promise<void> {
  const res = await db().from("servicios").delete().eq("id_servicio", id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Materiales
// ─────────────────────────────────────────────────────────────────────
export async function listarMateriales(): Promise<Material[]> {
  return unwrap(await db().from("materiales").select("*").order("nombre_material"));
}

export async function crearMaterial(input: {
  nombre_material: string;
  unidad?: string | null;
  stock_disponible?: number;
  empresa_id?: number;
}): Promise<Material> {
  return unwrap(
    await db()
      .from("materiales")
      .insert({
        empresa_id: input.empresa_id ?? EMPRESA_ID_DEFECTO,
        nombre_material: input.nombre_material,
        unidad: input.unidad ?? null,
        stock_disponible: input.stock_disponible ?? 0,
      })
      .select()
      .single()
  );
}

export async function actualizarMaterial(
  id: number,
  patch: Tablas["materiales"]["Update"]
): Promise<Material> {
  return unwrap(await db().from("materiales").update(patch).eq("id_material", id).select().single());
}

export async function eliminarMaterial(id: number): Promise<void> {
  const res = await db().from("materiales").delete().eq("id_material", id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Equipos (con miembros)
// ─────────────────────────────────────────────────────────────────────
export interface MiembroEquipo {
  empleado_id: number;
  cargo: string | null;
  es_lider: boolean;
  empleados: {
    nombre: string;
    correo: string | null;
    telefono: string | null;
  } | null;
}
export interface EquipoConMiembros extends Equipo {
  empleado_equipo: MiembroEquipo[];
}

export async function listarEquipos(): Promise<EquipoConMiembros[]> {
  return unwrap(
    await db()
      .from("equipos")
      .select(
        "*, empleado_equipo(empleado_id, cargo, es_lider, empleados(nombre, correo, telefono))"
      )
      .order("nombre_equipo")
  ) as EquipoConMiembros[];
}

export async function crearEquipo(input: {
  nombre_equipo: string;
  empresa_id?: number;
}): Promise<Equipo> {
  return unwrap(
    await db()
      .from("equipos")
      .insert({ empresa_id: input.empresa_id ?? EMPRESA_ID_DEFECTO, nombre_equipo: input.nombre_equipo })
      .select()
      .single()
  );
}

export async function actualizarEquipo(
  id: number,
  patch: Tablas["equipos"]["Update"]
): Promise<Equipo> {
  return unwrap(await db().from("equipos").update(patch).eq("id_equipo", id).select().single());
}

export async function eliminarEquipo(id: number): Promise<void> {
  const res = await db().from("equipos").delete().eq("id_equipo", id);
  if (res.error) throw new Error(res.error.message);
}

export async function agregarMiembroEquipo(input: {
  empleado_id: number;
  equipo_id: number;
  cargo?: string | null;
  es_lider?: boolean;
}): Promise<void> {
  const res = await db()
    .from("empleado_equipo")
    .upsert(
      {
        empleado_id: input.empleado_id,
        equipo_id: input.equipo_id,
        cargo: input.cargo ?? null,
        es_lider: input.es_lider ?? false,
      },
      { onConflict: "empleado_id,equipo_id" }
    );
  if (res.error) throw new Error(res.error.message);
}

export async function quitarMiembroEquipo(empleado_id: number, equipo_id: number): Promise<void> {
  const res = await db()
    .from("empleado_equipo")
    .delete()
    .eq("empleado_id", empleado_id)
    .eq("equipo_id", equipo_id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Empleados
// ─────────────────────────────────────────────────────────────────────
export async function listarEmpleados(): Promise<Empleado[]> {
  return unwrap(await db().from("empleados").select("*").order("nombre"));
}

export async function crearEmpleado(input: {
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  empresa_id?: number;
}): Promise<Empleado> {
  return unwrap(
    await db()
      .from("empleados")
      .insert({
        empresa_id: input.empresa_id ?? EMPRESA_ID_DEFECTO,
        nombre: input.nombre,
        correo: input.correo ?? null,
        telefono: input.telefono ?? null,
      })
      .select()
      .single()
  );
}

export async function actualizarEmpleado(
  id: number,
  patch: Tablas["empleados"]["Update"]
): Promise<Empleado> {
  return unwrap(await db().from("empleados").update(patch).eq("id_empleado", id).select().single());
}

export async function eliminarEmpleado(id: number): Promise<void> {
  const res = await db().from("empleados").delete().eq("id_empleado", id);
  if (res.error) throw new Error(res.error.message);
}
