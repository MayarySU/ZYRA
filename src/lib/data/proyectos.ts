import { db, unwrap, unwrapMaybe } from "@/lib/data/util";
import { rpcGenerarChecklist, type ResultadoGenerarChecklist } from "@/lib/data/rpc";
import type { Tablas, Vistas } from "@/lib/data/util";

export type Proyecto = Tablas["proyectos"]["Row"];
export type ProyectoVista = Vistas["v_proyectos"]["Row"];
export type Checklist = Tablas["checklists"]["Row"];
export type ChecklistDetalle = Tablas["checklist_detalle"]["Row"];
export type Avance = Tablas["avances"]["Row"];
export type Evidencia = Tablas["evidencias"]["Row"];
export type ProyectoMaterial = Tablas["proyecto_materiales"]["Row"];
export type ChecklistDetalleVista = Vistas["v_checklist_detalle"]["Row"];

export interface NuevoProyecto {
  nombre_proyecto: string;
  empresa_id?: number;
  cliente_id?: number | null;
  servicio_id?: number | null;
  equipo_id?: number | null;
  ubicacion?: string | null;
  imagen_url?: string | null;
  creado_por?: string | null;
}

const EMPRESA_ID_DEFECTO = 1;

export async function listarProyectos(): Promise<ProyectoVista[]> {
  return unwrap(
    await db().from("v_proyectos").select("*").order("creado_en", { ascending: false })
  );
}

export async function obtenerProyecto(id: number): Promise<ProyectoVista> {
  return unwrap(await db().from("v_proyectos").select("*").eq("id_proyecto", id).single());
}

export async function crearProyecto(
  input: NuevoProyecto
): Promise<{ proyecto: Proyecto; checklist: ResultadoGenerarChecklist | null }> {
  const proyecto = unwrap(
    await db()
      .from("proyectos")
      .insert({
        empresa_id: input.empresa_id ?? EMPRESA_ID_DEFECTO,
        cliente_id: input.cliente_id ?? null,
        servicio_id: input.servicio_id ?? null,
        equipo_id: input.equipo_id ?? null,
        nombre_proyecto: input.nombre_proyecto,
        ubicacion: input.ubicacion ?? null,
        imagen_url: input.imagen_url ?? null,
        creado_por: input.creado_por ?? null,
      })
      .select()
      .single()
  );

  let checklist: ResultadoGenerarChecklist | null = null;
  try {
    checklist = await rpcGenerarChecklist(proyecto.id_proyecto);
  } catch (e) {
    console.error("No se pudo generar el checklist automáticamente:", e);
  }
  return { proyecto, checklist };
}

export async function actualizarProyecto(
  id: number,
  patch: Tablas["proyectos"]["Update"]
): Promise<Proyecto> {
  return unwrap(await db().from("proyectos").update(patch).eq("id_proyecto", id).select().single());
}

export async function eliminarProyecto(id: number): Promise<void> {
  const res = await db().from("proyectos").delete().eq("id_proyecto", id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Checklist del proyecto
// ─────────────────────────────────────────────────────────────────────
export async function obtenerChecklist(proyectoId: number): Promise<Checklist | null> {
  return unwrapMaybe(
    await db().from("checklists").select("*").eq("proyecto_id", proyectoId).maybeSingle()
  );
}

export async function listarDetalleChecklist(checklistId: number): Promise<ChecklistDetalleVista[]> {
  return unwrap(
    await db()
      .from("v_checklist_detalle")
      .select("*")
      .eq("checklist_id", checklistId)
      .order("nombre_material")
  );
}

export async function actualizarDetalleChecklist(
  id: number,
  patch: Tablas["checklist_detalle"]["Update"]
): Promise<ChecklistDetalle> {
  return unwrap(
    await db().from("checklist_detalle").update(patch).eq("id_checklist_detalle", id).select().single()
  );
}

export async function listarProyectoMateriales(proyectoId: number): Promise<ProyectoMaterial[]> {
  return unwrap(
    await db().from("proyecto_materiales").select("*").eq("proyecto_id", proyectoId)
  );
}

// ─────────────────────────────────────────────────────────────────────
// Avances y evidencias
// ─────────────────────────────────────────────────────────────────────
export async function listarAvances(proyectoId: number): Promise<Avance[]> {
  return unwrap(
    await db()
      .from("avances")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .order("creado_en", { ascending: false })
  );
}

export async function listarEvidencias(proyectoId: number): Promise<Evidencia[]> {
  return unwrap(
    await db()
      .from("evidencias")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .eq("eliminado", false)
      .order("fecha", { ascending: false })
  );
}
