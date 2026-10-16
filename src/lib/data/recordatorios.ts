import { db, unwrap } from "@/lib/data/util";
import type { Tablas } from "@/lib/data/util";

export type Recordatorio = Tablas["recordatorios"]["Row"];
export type RecordatorioDestinatario = Tablas["recordatorio_destinatarios"]["Row"];
export type Usuario = Tablas["usuarios"]["Row"];

export interface RecordatorioConDestinatarios extends Recordatorio {
  recordatorio_destinatarios: {
    empleado_id: number;
    leido: boolean;
    empleados: { nombre: string | null; correo: string | null } | null;
  }[];
}

export async function listarRecordatorios(): Promise<RecordatorioConDestinatarios[]> {
  return unwrap(
    await db()
      .from("recordatorios")
      .select("*, recordatorio_destinatarios(empleado_id, leido, empleados(nombre, correo))")
      .order("creado_en", { ascending: false })
  ) as RecordatorioConDestinatarios[];
}

export async function crearRecordatorio(input: {
  empresa_id?: number;
  titulo: string;
  descripcion?: string | null;
  fecha?: string | null;
  hora?: string | null;
  creado_por?: string | null;
  destinatarios?: number[];
}): Promise<Recordatorio> {
  const recordatorio = unwrap(
    await db()
      .from("recordatorios")
      .insert({
        empresa_id: input.empresa_id ?? 1,
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        fecha: input.fecha ?? null,
        hora: input.hora ?? null,
        creado_por: input.creado_por ?? null,
      })
      .select()
      .single()
  );

  if (input.destinatarios && input.destinatarios.length > 0) {
    const ins = await db()
      .from("recordatorio_destinatarios")
      .insert(
        input.destinatarios.map((empleado_id) => ({
          recordatorio_id: recordatorio.id_recordatorio,
          empleado_id,
        }))
      );
    if (ins.error) throw new Error(ins.error.message);
  }

  return recordatorio;
}

export async function marcarRecordatorioLeido(
  recordatorio_id: number,
  empleado_id: number
): Promise<void> {
  const res = await db()
    .from("recordatorio_destinatarios")
    .update({ leido: true, leido_en: new Date().toISOString() })
    .eq("recordatorio_id", recordatorio_id)
    .eq("empleado_id", empleado_id);
  if (res.error) throw new Error(res.error.message);
}

export async function eliminarRecordatorio(id: number): Promise<void> {
  const res = await db().from("recordatorios").delete().eq("id_recordatorio", id);
  if (res.error) throw new Error(res.error.message);
}

export async function listarUsuarios(): Promise<Usuario[]> {
  return unwrap(await db().from("usuarios").select("*"));
}
