"use client";

import {
  contarEvidenciasPendientes,
  eliminarEvidenciaPendiente,
  encolarEvidencia,
  listarEvidenciasPendientes,
  registrarIntentoFallido,
} from "@/lib/offline/evidencias-queue";

export type TipoEvidencia = "foto" | "documento" | "video";

export interface SubidaEvidenciaResultado {
  objectKey: string | null;
  encolada: boolean;
}

function sinConexion(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Sube una evidencia vía el servidor (`/api/upload/object`). El servidor
 * escribe el objeto en R2 (evita el CORS del navegador) y registra la
 * metadata con `registrar_evidencia` (idempotente por operation_id).
 */
async function subirEvidenciaOnline(input: {
  proyectoId: number;
  file: File;
  descripcion?: string;
  avanceId?: number;
  operationId?: string;
}): Promise<string> {
  const { proyectoId, file, descripcion, avanceId, operationId } = input;

  const form = new FormData();
  form.append("file", file);
  form.append("proyectoId", String(proyectoId));
  if (descripcion) form.append("descripcion", descripcion);
  if (avanceId != null) form.append("avanceId", String(avanceId));
  if (operationId) form.append("operationId", operationId);

  const res = await fetch("/api/upload/object", { method: "POST", body: form });
  if (!res.ok) {
    const { error } = await res
      .json()
      .catch(() => ({ error: "No se pudo subir la evidencia" }));
    throw new Error(error);
  }
  const { key } = (await res.json()) as { key: string };
  return key;
}

/**
 * Sube una evidencia. Si no hay conexión (o falla por red), la encola en
 * IndexedDB (`evidencias_pendientes`) para reintentarla al reconectar.
 * Los errores de validación (MIME/permiso) NO se encolan: se propagan.
 */
export async function subirEvidencia(input: {
  proyectoId: number;
  file: File;
  descripcion?: string;
  avanceId?: number;
}): Promise<SubidaEvidenciaResultado> {
  if (sinConexion()) {
    const id = await encolarEvidencia(input);
    return { objectKey: null, encolada: !!id };
  }
  try {
    const key = await subirEvidenciaOnline(input);
    return { objectKey: key, encolada: false };
  } catch (e) {
    const esRed = e instanceof TypeError || sinConexion();
    if (esRed) {
      const id = await encolarEvidencia(input);
      return { objectKey: null, encolada: !!id };
    }
    throw e;
  }
}

/** Vacía la cola de evidencias pendientes (se llama al reconectar). */
export async function flushEvidenciasPendientes(): Promise<{ ok: number; fail: number }> {
  if (sinConexion()) return { ok: 0, fail: 0 };
  const pendientes = await listarEvidenciasPendientes();
  let ok = 0;
  let fail = 0;
  for (const p of pendientes) {
    try {
      const file = new File([p.blob], p.fileName, { type: p.contentType });
      await subirEvidenciaOnline({
        proyectoId: p.proyectoId,
        file,
        descripcion: p.descripcion,
        avanceId: p.avanceId,
        operationId: p.id,
      });
      await eliminarEvidenciaPendiente(p.id);
      ok++;
    } catch (e) {
      await registrarIntentoFallido(p.id, (e as Error).message);
      fail++;
    }
  }
  return { ok, fail };
}

export { contarEvidenciasPendientes };

/** URL prefirmada temporal de lectura (solo si el usuario puede ver la evidencia). */
export async function urlEvidencia(objectKey: string): Promise<string | null> {
  const res = await fetch("/api/upload/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: objectKey }),
  });
  if (!res.ok) return null;
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** Eliminación segura (solo admin): borrado lógico + borrado del objeto en R2. */
export async function eliminarEvidencia(evidenciaId: string): Promise<void> {
  const res = await fetch("/api/upload/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidenciaId }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "No se pudo eliminar la evidencia" }));
    throw new Error(error);
  }
}
