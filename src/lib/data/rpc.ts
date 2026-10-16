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

// ── Viabilidad ───────────────────────────────────────────────────────
export type TipoEtapaViabilidad = "previabilidad" | "ingenieria";
export type ResultadoEvaluacionViabilidad =
  | "apto"
  | "apto_con_acciones"
  | "requiere_validacion"
  | "no_apto";
export type EfectoSenalViabilidad =
  | "no_apto"
  | "validacion_especializada"
  | "accion_requerida";
export type TipoValidacionViabilidad =
  | "estructural"
  | "electrico"
  | "legal"
  | "cfe"
  | "otro";

export interface SenalViabilidad {
  efecto: EfectoSenalViabilidad;
  pregunta?: string;
  motivo?: string;
  mensaje?: string;
  descripcion_accion?: string;
  validacion_tipo?: TipoValidacionViabilidad;
  obligatoria?: boolean;
  [k: string]: unknown;
}

export interface ResultadoAplicabilidadViabilidad {
  id_proyecto: number;
  requiere_previabilidad: boolean;
  requiere_ingenieria: boolean;
}
export interface ResultadoCrearRevisionViabilidad {
  id_revision_viabilidad: number;
  proyecto_id: number;
  tipo_etapa: TipoEtapaViabilidad;
  numero_revision: number;
  estado: string;
}
export interface ResultadoGuardarRespuestaViabilidad {
  id_revision_viabilidad: number;
  pregunta_id: number;
}
export interface ResultadoEntregarRevisionViabilidad {
  id_revision_viabilidad: number;
  estado: string;
  resultado_evaluacion: ResultadoEvaluacionViabilidad;
}
export interface ResultadoResolverViabilidad {
  revision_estado: string;
  id_accion_viabilidad?: number;
  id_validacion_viabilidad?: number;
  estado: string;
}
export interface ResultadoAnularRevisionViabilidad {
  id_revision_viabilidad: number;
  estado: string;
}
export interface ResultadoEvaluarViabilidad {
  resultado: ResultadoEvaluacionViabilidad;
  senales: SenalViabilidad[];
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

// ─────────────────────────────────────────────────────────────────────
// RPC de Viabilidad
// ─────────────────────────────────────────────────────────────────────
export async function rpcEstablecerAplicabilidadViabilidad(
  p_proyecto_id: number,
  p_requiere_previabilidad: boolean,
  p_requiere_ingenieria: boolean,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoAplicabilidadViabilidad> {
  return unwrap(
    await db().rpc("establecer_aplicabilidad_viabilidad", {
      p_proyecto_id,
      p_requiere_previabilidad,
      p_requiere_ingenieria,
      p_operation_id,
    })
  ) as unknown as ResultadoAplicabilidadViabilidad;
}

export async function rpcCrearRevisionViabilidad(
  p_proyecto_id: number,
  p_tipo_etapa: TipoEtapaViabilidad,
  p_asignado_empleado_id?: number | null,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoCrearRevisionViabilidad> {
  return unwrap(
    await db().rpc("crear_revision_viabilidad", {
      p_proyecto_id,
      p_tipo_etapa,
      p_asignado_empleado_id: p_asignado_empleado_id ?? undefined,
      p_operation_id,
    })
  ) as unknown as ResultadoCrearRevisionViabilidad;
}

export async function rpcGuardarRespuestaViabilidad(
  p_revision_id: number,
  p_pregunta_id: number,
  p_valor: unknown,
  p_version?: number | null,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoGuardarRespuestaViabilidad> {
  return unwrap(
    await db().rpc("guardar_respuesta_viabilidad", {
      p_revision_id,
      p_pregunta_id,
      p_valor: p_valor as never,
      p_version: p_version ?? undefined,
      p_operation_id,
    })
  ) as unknown as ResultadoGuardarRespuestaViabilidad;
}

export async function rpcEntregarRevisionViabilidad(
  p_revision_id: number,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoEntregarRevisionViabilidad> {
  return unwrap(
    await db().rpc("entregar_revision_viabilidad", {
      p_revision_id,
      p_operation_id,
    })
  ) as unknown as ResultadoEntregarRevisionViabilidad;
}

export async function rpcResolverAccionViabilidad(
  p_accion_id: number,
  p_estado: string,
  p_observaciones?: string | null,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoResolverViabilidad> {
  return unwrap(
    await db().rpc("resolver_accion_viabilidad", {
      p_accion_id,
      p_estado,
      p_observaciones: p_observaciones ?? undefined,
      p_operation_id,
    })
  ) as unknown as ResultadoResolverViabilidad;
}

export async function rpcResolverValidacionViabilidad(
  p_validacion_id: number,
  p_estado: "aprobada" | "rechazada",
  p_observaciones?: string | null,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoResolverViabilidad> {
  return unwrap(
    await db().rpc("resolver_validacion_viabilidad", {
      p_validacion_id,
      p_estado,
      p_observaciones: p_observaciones ?? undefined,
      p_operation_id,
    })
  ) as unknown as ResultadoResolverViabilidad;
}

export async function rpcAnularRevisionViabilidad(
  p_revision_id: number,
  p_motivo?: string | null,
  p_operation_id: string = nuevoOperationId()
): Promise<ResultadoAnularRevisionViabilidad> {
  return unwrap(
    await db().rpc("anular_revision_viabilidad", {
      p_revision_id,
      p_motivo: p_motivo ?? undefined,
      p_operation_id,
    })
  ) as unknown as ResultadoAnularRevisionViabilidad;
}

export async function rpcEvaluarViabilidad(
  p_revision_id: number
): Promise<ResultadoEvaluarViabilidad> {
  return unwrap(
    await db().rpc("evaluar_viabilidad", { p_revision_id })
  ) as unknown as ResultadoEvaluarViabilidad;
}
