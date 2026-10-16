"use client";

import { getOfflineDB, type EvidenciaPendiente } from "@/lib/offline/db";

/**
 * Cola offline de evidencias: guarda el blob en IndexedDB para subirlo a R2
 * cuando vuelva la conexión. Las fotos capturadas sin red no se pierden al
 * cerrar la app (persisten en IndexedDB).
 */
export async function encolarEvidencia(input: {
  proyectoId: number;
  file: File;
  descripcion?: string;
  avanceId?: number;
  revisionId?: number;
  preguntaId?: number;
  accionId?: number;
  validacionId?: number;
}): Promise<string> {
  const id = crypto.randomUUID();
  await getOfflineDB().evidencias_pendientes.put({
    id,
    proyectoId: input.proyectoId,
    descripcion: input.descripcion,
    avanceId: input.avanceId,
    revisionId: input.revisionId,
    preguntaId: input.preguntaId,
    accionId: input.accionId,
    validacionId: input.validacionId,
    fileName: input.file.name,
    contentType: input.file.type,
    blob: input.file,
    createdAt: Date.now(),
    intentos: 0,
  });
  return id;
}

export async function listarEvidenciasPendientes(): Promise<EvidenciaPendiente[]> {
  return getOfflineDB().evidencias_pendientes.orderBy("createdAt").toArray();
}

/** Evidencias capturadas sin conexión para una revisión de viabilidad. */
export async function listarEvidenciasPendientesRevision(
  revisionId: number
): Promise<EvidenciaPendiente[]> {
  return getOfflineDB()
    .evidencias_pendientes.where("revisionId")
    .equals(revisionId)
    .toArray();
}

export async function contarEvidenciasPendientes(): Promise<number> {
  try {
    return await getOfflineDB().evidencias_pendientes.count();
  } catch {
    return 0;
  }
}

export async function registrarIntentoFallido(id: string, error: string): Promise<void> {
  const db = getOfflineDB();
  const row = await db.evidencias_pendientes.get(id);
  if (!row) return;
  await db.evidencias_pendientes.update(id, {
    intentos: row.intentos + 1,
    ultimoError: error,
  });
}

export async function eliminarEvidenciaPendiente(id: string): Promise<void> {
  await getOfflineDB().evidencias_pendientes.delete(id);
}
