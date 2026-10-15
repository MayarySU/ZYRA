"use client";

import { rpcRegistrarEvidencia } from "@/lib/data/rpc";

export type TipoEvidencia = "foto" | "documento" | "video";

function tipoDesdeMime(mime: string): TipoEvidencia {
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "documento";
  return "foto";
}

async function firmarSubida(
  proyectoId: number,
  file: File
): Promise<{ url: string; key: string }> {
  const res = await fetch("/api/upload/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proyectoId, fileName: file.name, contentType: file.type }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "No se pudo firmar la subida" }));
    throw new Error(error);
  }
  return res.json();
}

/**
 * Sube una evidencia directamente navegador → R2 (URL prefirmada) y registra
 * su metadata en PostgreSQL con `registrar_evidencia`. Devuelve el `object_key`.
 */
export async function subirEvidencia(input: {
  proyectoId: number;
  file: File;
  descripcion?: string;
  avanceId?: number;
}): Promise<string> {
  const { proyectoId, file, descripcion, avanceId } = input;
  const { url, key } = await firmarSubida(proyectoId, file);

  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("No se pudo subir la evidencia a R2");

  await rpcRegistrarEvidencia({
    proyectoId,
    objectKey: key,
    descripcion,
    tipo: tipoDesdeMime(file.type),
    contentType: file.type,
    sizeBytes: file.size,
    avanceId,
  });

  return key;
}

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
