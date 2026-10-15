import { db, nuevoOperationId, unwrap } from "@/lib/data/util";

// ─────────────────────────────────────────────────────────────────────
// Tipos de resultado de las RPC
// ─────────────────────────────────────────────────────────────────────
export interface ResultadoGenerarChecklist {
  id_checklist: number;
  proyecto_id: number;
}
export interface ResultadoValidarChecklist {
  id_checklist: number;
  estado: "completo" | "incompleto";
  marcados: number;
  total: number;
}
export interface ResultadoProyecto {
  id_proyecto: number;
  estado: string;
  ya_finalizado?: boolean;
  numero_reporte?: string;
  id_reporte_final?: number;
  puntos?: { empleado_id: number; puntos: number }[];
}
export interface ResultadoAvance {
  id_avance: number;
  proyecto_id: number;
  porcentaje: number | null;
}
export interface ResultadoEvidencia {
  id_evidencia: string;
  proyecto_id: number;
  object_key: string;
}
export interface ResultadoReporte {
  id_reporte: number;
  estado: string;
}

// ─────────────────────────────────────────────────────────────────────
// RPC
// ─────────────────────────────────────────────────────────────────────
export async function rpcGenerarChecklist(
  p_proyecto_id: number,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoGenerarChecklist> {
  return unwrap(
    await db().rpc("generar_checklist", { p_proyecto_id, p_operation_id })
  ) as unknown as ResultadoGenerarChecklist;
}

export async function rpcValidarChecklist(
  p_checklist_id: number,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoValidarChecklist> {
  return unwrap(
    await db().rpc("validar_checklist", { p_checklist_id, p_operation_id })
  ) as unknown as ResultadoValidarChecklist;
}

export async function rpcIniciarProyecto(
  p_proyecto_id: number,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoProyecto> {
  return unwrap(
    await db().rpc("iniciar_proyecto", { p_proyecto_id, p_operation_id })
  ) as unknown as ResultadoProyecto;
}

export async function rpcReportarAvance(
  p_proyecto_id: number,
  p_descripcion: string,
  p_porcentaje?: number,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoAvance> {
  return unwrap(
    await db().rpc("reportar_avance", {
      p_proyecto_id,
      p_descripcion,
      p_porcentaje,
      p_operation_id,
    })
  ) as unknown as ResultadoAvance;
}

export async function rpcRegistrarEvidencia(input: {
  proyectoId: number;
  objectKey: string;
  descripcion?: string;
  tipo?: "foto" | "documento" | "video";
  contentType?: string;
  sizeBytes?: number;
  avanceId?: number;
  operationId?: string;
}): Promise<ResultadoEvidencia> {
  return unwrap(
    await db().rpc("registrar_evidencia", {
      p_proyecto_id: input.proyectoId,
      p_object_key: input.objectKey,
      p_descripcion: input.descripcion,
      p_tipo: input.tipo ?? "foto",
      p_content_type: input.contentType,
      p_size_bytes: input.sizeBytes,
      p_avance_id: input.avanceId,
      p_operation_id: input.operationId ?? nuevoOperationId(),
    })
  ) as unknown as ResultadoEvidencia;
}

export async function rpcEnviarReporte(
  p_proyecto_id: number,
  p_comentarios?: string,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoReporte> {
  return unwrap(
    await db().rpc("enviar_reporte", {
      p_proyecto_id,
      p_comentarios,
      p_operation_id,
    })
  ) as unknown as ResultadoReporte;
}

export async function rpcAprobarReporte(
  p_reporte_id: number,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoReporte> {
  return unwrap(
    await db().rpc("aprobar_reporte", { p_reporte_id, p_operation_id })
  ) as unknown as ResultadoReporte;
}

export async function rpcRechazarReporte(
  p_reporte_id: number,
  p_motivo?: string,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoReporte> {
  return unwrap(
    await db().rpc("rechazar_reporte", {
      p_reporte_id,
      p_motivo,
      p_operation_id,
    })
  ) as unknown as ResultadoReporte;
}

export async function rpcAvanzarEstado(
  p_proyecto_id: number,
  p_nuevo_estado: string,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoProyecto> {
  return unwrap(
    await db().rpc("avanzar_estado", {
      p_proyecto_id,
      p_nuevo_estado,
      p_operation_id,
    })
  ) as unknown as ResultadoProyecto;
}

export async function rpcFinalizarProyecto(
  p_proyecto_id: number,
  p_comentarios?: string,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoProyecto> {
  return unwrap(
    await db().rpc("finalizar_proyecto", {
      p_proyecto_id,
      p_comentarios,
      p_operation_id,
    })
  ) as unknown as ResultadoProyecto;
}
