import { db, unwrap } from "@/lib/data/util";
import type { Tablas } from "@/lib/data/util";

export type Reporte = Tablas["reportes"]["Row"];

export interface ReporteConProyecto extends Reporte {
  proyectos: { nombre_proyecto: string | null; equipo_id: number | null } | null;
  empleados: { nombre: string | null } | null;
}

export async function listarReportes(): Promise<ReporteConProyecto[]> {
  return unwrap(
    await db()
      .from("reportes")
      .select("*, proyectos(nombre_proyecto, equipo_id), empleados(nombre)")
      .order("fecha_reporte", { ascending: false })
  ) as ReporteConProyecto[];
}

export async function listarReportesDeProyecto(proyectoId: number): Promise<Reporte[]> {
  return unwrap(
    await db()
      .from("reportes")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .order("fecha_reporte", { ascending: false })
  );
}

export async function listarReportesDeEquipo(equipoId: number): Promise<ReporteConProyecto[]> {
  return unwrap(
    await db()
      .from("reportes")
      .select("*, proyectos(nombre_proyecto, equipo_id), empleados(nombre)")
      .eq("equipo_id", equipoId)
      .order("fecha_reporte", { ascending: false })
  ) as ReporteConProyecto[];
}
