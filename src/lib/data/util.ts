import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type Tablas = Database["public"]["Tables"];
export type Vistas = Database["public"]["Views"];

/** Cliente Supabase para el navegador (RLS aplicado). */
export function db() {
  return getSupabaseBrowserClient();
}

/** Lanza un Error legible si la respuesta de Supabase trae error. */
export function unwrap<R extends { data: unknown; error: { message: string } | null }>(
  res: R
): NonNullable<R["data"]> {
  if (res.error) {
    throw new Error(res.error.message);
  }
  if (res.data === null || res.data === undefined) {
    throw new Error("Respuesta vacía de la base de datos");
  }
  return res.data as NonNullable<R["data"]>;
}

/** Igual que `unwrap` pero admite `null` (para `maybeSingle`). */
export function unwrapMaybe<R extends { data: unknown; error: { message: string } | null }>(
  res: R
): R["data"] {
  if (res.error) {
    throw new Error(res.error.message);
  }
  return res.data;
}

/** UUID para idempotencia de operaciones (outbox / reintentos). */
export function nuevoOperationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
