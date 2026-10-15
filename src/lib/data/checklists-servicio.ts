import { db } from "@/lib/data/util";
import type { Tablas } from "@/lib/data/util";

export type ChecklistServicio = Tablas["checklist_servicio"]["Row"];
export type ChecklistServicioDetalle = Tablas["checklist_servicio_detalle"]["Row"];

export interface PlantillaDetalleItem {
  id_checklist_servicio_detalle: number;
  material_id: number;
  cantidad_requerida: number;
  materiales: { nombre_material: string; unidad: string | null } | null;
}
export interface PlantillaConDetalle extends ChecklistServicio {
  checklist_servicio_detalle: PlantillaDetalleItem[];
  servicios: { tipo: string } | null;
}

export async function listarPlantillas(): Promise<PlantillaConDetalle[]> {
  return (await db()
    .from("checklist_servicio")
    .select(
      "*, servicios(tipo), checklist_servicio_detalle(id_checklist_servicio_detalle, material_id, cantidad_requerida, materiales(nombre_material, unidad))"
    )
    .order("id_checklist_servicio")
    .returns<PlantillaConDetalle[]>()) as unknown as PlantillaConDetalle[];
}

/** Reemplaza los materiales de una plantilla (delete + insert). */
export async function actualizarPlantillaMateriales(
  checklistServicioId: number,
  items: { material_id: number; cantidad_requerida: number }[]
): Promise<void> {
  const del = await db()
    .from("checklist_servicio_detalle")
    .delete()
    .eq("checklist_servicio_id", checklistServicioId);
  if (del.error) throw new Error(del.error.message);

  if (items.length === 0) return;

  const ins = await db()
    .from("checklist_servicio_detalle")
    .insert(
      items.map((i) => ({
        checklist_servicio_id: checklistServicioId,
        material_id: i.material_id,
        cantidad_requerida: i.cantidad_requerida,
      }))
    );
  if (ins.error) throw new Error(ins.error.message);
}
