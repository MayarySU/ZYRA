"use client";

import { getOfflineDB, type OutboxEntry } from "@/lib/offline/db";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { db, type Tablas } from "@/lib/data/util";
import * as py from "@/lib/data/proyectos";
import * as rpc from "@/lib/data/rpc";

/**
 * Outbox offline-first basado en Dexie.
 *
 * Cada mutación hecha sin conexión se encola aquí como una operación
 * serializable `{ kind, datos }`. Al arrancar la app y al recuperar la
 * conexión, `procesarOutbox()` recorre la cola EN ORDEN y ejecuta el handler
 * del `kind`, usando el `id` de la entrada como `operation_id` (idempotencia
 * en el servidor). Solo se elimina la entrada tras un éxito confirmado.
 *
 * Tolerancias:
 * - Recarga del navegador / cierre y reapertura de la PWA: la cola vive en
 *   IndexedDB, no en memoria.
 * - Pérdida de conexión durante el vaciado: se detiene y se reintenta luego.
 * - Operación ya aplicada: el `operation_id` la hace idempotente.
 * - Conflicto de versión: se marca `estado: "conflicto"` y no se sobrescribe.
 */

export type OutboxKind =
  | "checklist-detalle"
  | "validar-checklist"
  | "iniciar-proyecto"
  | "enviar-reporte"
  | "viabilidad-respuesta"
  | "viabilidad-entregar";

/**
 * Error de concurrencia real (versión obsoleta): la operación se marca como
 * `conflicto` y NO se sobrescribe; exige decisión explícita del usuario.
 */
export class ConflictoOutbox extends Error {}

/**
 * Señal del motor de negocio (p.ej. faltan obligatorias, estado inválido):
 * NO es un conflicto de concurrencia. La operación se marca `error_negocio`
 * y se reintentará cuando el usuario corrija la causa.
 */
export class ErrorNegocioOutbox extends Error {}

export interface ResultadoProcesar {
  ok: number;
  conflictos: number;
  fallos: number;
  /** Operaciones rechazadas por el motor de negocio (reintentables tras corregir). */
  negocios: number;
}

export interface NuevaOperacion {
  /** Idempotency key (se usa como `operation_id` en la RPC). */
  id: string;
  kind: OutboxKind;
  datos: unknown;
  version?: string;
  clave: string;
}

// ─────────────────────────────────────────────────────────────────────
// Encolado serializado: garantiza un `seq` determinista por orden de llamada.
// ─────────────────────────────────────────────────────────────────────
let cadenaEncolado: Promise<unknown> = Promise.resolve();

export function encolarOperacion(op: NuevaOperacion): Promise<void> {
  const tarea = cadenaEncolado.then(() => insertarOperacion(op));
  cadenaEncolado = tarea.catch(() => {});
  return tarea;
}

async function insertarOperacion(op: NuevaOperacion): Promise<void> {
  const store = getOfflineDB().outbox;
  // Coalescencia: si ya hay una pendiente para el mismo objetivo, se
  // actualiza su payload conservando `seq` y `version` originales (así el
  // mismo usuario que edita dos veces offline no provoca un conflicto consigo
  // mismo).
  const existente = await store.where("clave").equals(op.clave).first();
  if (existente) {
    if (existente.estado === "pendiente") {
      await store.update(existente.id, {
        datos: op.datos,
        intentos: 0,
        ultimoError: undefined,
      });
      return;
    }
    // Un intento nuevo del usuario deja sin efecto la entrada que el motor
    // rechazó (sigue sin aplicarse en el servidor). Los `conflicto` se
    // conservan: la concurrencia solo se resuelve de forma explícita.
    if (existente.estado === "error_negocio") {
      await store.update(existente.id, {
        datos: op.datos,
        estado: "pendiente",
        intentos: 0,
        ultimoError: undefined,
      });
      return;
    }
  }
  const ultimo = await store.orderBy("seq").last();
  await store.put({
    id: op.id,
    seq: (ultimo?.seq ?? 0) + 1,
    kind: op.kind,
    datos: op.datos,
    version: op.version,
    clave: op.clave,
    estado: "pendiente",
    createdAt: Date.now(),
    intentos: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Lectura / mantenimiento
// ─────────────────────────────────────────────────────────────────────
export async function listarOperacionesPendientes(): Promise<OutboxEntry[]> {
  const todas = await getOfflineDB().outbox.orderBy("seq").toArray();
  return todas.filter((e) => e.estado === "pendiente");
}

export async function contarOperacionesPendientes(): Promise<number> {
  try {
    return await getOfflineDB().outbox.where("estado").equals("pendiente").count();
  } catch {
    return 0;
  }
}

export async function eliminarOperacion(id: string): Promise<void> {
  await getOfflineDB().outbox.delete(id);
}

export async function registrarIntentoFallido(id: string, error: string): Promise<void> {
  const store = getOfflineDB().outbox;
  const row = await store.get(id);
  if (!row) return;
  await store.update(id, { intentos: row.intentos + 1, ultimoError: error });
}

export async function marcarConflicto(id: string, motivo: string): Promise<void> {
  const store = getOfflineDB().outbox;
  const row = await store.get(id);
  if (!row) return;
  await store.update(id, {
    estado: "conflicto",
    intentos: row.intentos + 1,
    ultimoError: motivo,
  });
}

export async function marcarErrorNegocio(id: string, motivo: string): Promise<void> {
  const store = getOfflineDB().outbox;
  const row = await store.get(id);
  if (!row) return;
  await store.update(id, {
    estado: "error_negocio",
    intentos: row.intentos + 1,
    ultimoError: motivo,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Operaciones que exigen atención del usuario (conflicto o error de negocio)
// ─────────────────────────────────────────────────────────────────────
export async function listarOperacionesAtascadas(): Promise<OutboxEntry[]> {
  const todas = await getOfflineDB().outbox.orderBy("seq").toArray();
  return todas.filter((e) => e.estado === "conflicto" || e.estado === "error_negocio");
}

/** Vuelve a encolar una operación detenida para reintentarla. */
export async function reintentarOperacion(id: string): Promise<void> {
  await getOfflineDB().outbox.update(id, {
    estado: "pendiente",
    intentos: 0,
    ultimoError: undefined,
  });
}

/** Descarta una operación detenida (no se aplicó en el servidor). */
export async function descartarOperacion(id: string): Promise<void> {
  await getOfflineDB().outbox.delete(id);
}

// ─────────────────────────────────────────────────────────────────────
// Viabilidad: encolado y orden de drenado
// ─────────────────────────────────────────────────────────────────────
/**
 * Encola la respuesta de una pregunta. Además reordena cualquier entrega de
 * la misma revisión para que se ejecute DESPUÉS de las respuestas: el
 * vaciado del outbox ocurre antes que el de evidencias, así que la entrega
 * debe ver las respuestas ya aplicadas.
 */
export async function encolarRespuestaViabilidad(datos: {
  revisionId: number;
  preguntaId: number;
  valor: unknown;
  version: number | null;
}): Promise<void> {
  await encolarOperacion({
    id: crypto.randomUUID(),
    kind: "viabilidad-respuesta",
    datos,
    clave: `viabilidad-respuesta:${datos.revisionId}:${datos.preguntaId}`,
  });
  await reordenarEntregaViabilidad(datos.revisionId);
}

/** Hace que la entrega de la revisión se procese tras la última respuesta encolada. */
async function reordenarEntregaViabilidad(revisionId: number): Promise<void> {
  const store = getOfflineDB().outbox;
  const claveEntrega = `viabilidad-entregar:${revisionId}`;
  const entrega = await store.where("clave").equals(claveEntrega).first();
  if (!entrega) return;
  // Un conflicto de entrega solo se levanta de forma explícita: no lo tocamos.
  if (entrega.estado === "conflicto") return;
  const ultimo = await store.orderBy("seq").last();
  await store.update(entrega.id, {
    seq: (ultimo?.seq ?? 0) + 1,
    estado: "pendiente",
    intentos: 0,
    ultimoError: undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Handlers por `kind`
// ─────────────────────────────────────────────────────────────────────
type Handler = (entry: OutboxEntry) => Promise<void>;

/** Traduce los errores de una RPC de viabilidad a los tipos del outbox. */
async function clasificarViabilidad(promesa: Promise<unknown>): Promise<void> {
  try {
    await promesa;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    if (/^CONFLICTO/.test(mensaje)) throw new ConflictoOutbox(mensaje);
    if (esErrorDeRed(e)) throw e;
    throw new ErrorNegocioOutbox(mensaje);
  }
}

const handlers: Record<OutboxKind, Handler> = {
  "checklist-detalle": async (entry) => {
    const { id, patch } = entry.datos as {
      id: number;
      patch: Tablas["checklist_detalle"]["Update"];
    };
    // Control de versión optimista: si la fila cambió en el servidor desde que
    // se encoló la operación, no la sobrescribimos.
    if (entry.version) {
      const { data, error } = await db()
        .from("checklist_detalle")
        .select("actualizado_en")
        .eq("id_checklist_detalle", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new ConflictoOutbox("El registro del checklist ya no existe");
      if (data.actualizado_en !== entry.version) {
        throw new ConflictoOutbox("El checklist fue modificado en otro dispositivo");
      }
    }
    await py.actualizarDetalleChecklist(id, patch);
  },

  "validar-checklist": async (entry) => {
    const { checklistId } = entry.datos as { checklistId: number };
    await rpc.rpcValidarChecklist(checklistId, entry.id);
  },

  "iniciar-proyecto": async (entry) => {
    const { proyectoId } = entry.datos as { proyectoId: number };
    await rpc.rpcIniciarProyecto(proyectoId, entry.id);
  },

  "enviar-reporte": async (entry) => {
    const { proyectoId, comentarios } = entry.datos as {
      proyectoId: number;
      comentarios?: string;
    };
    await rpc.rpcEnviarReporte(proyectoId, comentarios, entry.id);
  },

  "viabilidad-respuesta": async (entry) => {
    const { revisionId, preguntaId, valor, version } = entry.datos as {
      revisionId: number;
      preguntaId: number;
      valor: unknown;
      version: number | null;
    };
    await clasificarViabilidad(
      rpc.rpcGuardarRespuestaViabilidad(revisionId, preguntaId, valor, version, entry.id)
    );
  },

  "viabilidad-entregar": async (entry) => {
    const { revisionId } = entry.datos as { revisionId: number };
    await clasificarViabilidad(rpc.rpcEntregarRevisionViabilidad(revisionId, entry.id));
  },
};

// ─────────────────────────────────────────────────────────────────────
// Ejecutor
// ─────────────────────────────────────────────────────────────────────
let enProceso: Promise<ResultadoProcesar> | null = null;

/** Procesa la cola una sola vez (reentrante). */
export function procesarOutbox(): Promise<ResultadoProcesar> {
  if (enProceso) return enProceso;
  enProceso = ejecutar().finally(() => {
    enProceso = null;
  });
  return enProceso;
}

async function ejecutar(): Promise<ResultadoProcesar> {
  const resultado: ResultadoProcesar = { ok: 0, conflictos: 0, fallos: 0, negocios: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return resultado;

  // Sin sesión no se procesa (RLS rechazaría por no autorizado): la cola se
  // conserva y se drena tras el login.
  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession();
  if (!session) return resultado;

  for (const entry of await listarOperacionesPendientes()) {
    const handler = handlers[entry.kind as OutboxKind];
    if (!handler) {
      await marcarConflicto(entry.id, `Tipo de operación desconocido: ${entry.kind}`);
      resultado.conflictos++;
      continue;
    }
    try {
      await handler(entry);
      await eliminarOperacion(entry.id);
      resultado.ok++;
    } catch (e) {
      if (e instanceof ConflictoOutbox) {
        await marcarConflicto(entry.id, e.message);
        resultado.conflictos++;
        continue;
      }
      if (e instanceof ErrorNegocioOutbox) {
        await marcarErrorNegocio(entry.id, e.message);
        resultado.negocios++;
        continue;
      }
      if (esErrorDeRed(e)) {
        // Falla transitoria: conserva el orden, reintenta en el próximo ciclo.
        await registrarIntentoFallido(entry.id, (e as Error).message);
        resultado.fallos++;
        break;
      }
      // Error de negocio (p.ej. estado inválido): conflicto, no reintentable.
      await marcarConflicto(entry.id, (e as Error).message);
      resultado.conflictos++;
    }
  }
  return resultado;
}

function esErrorDeRed(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return /failed to fetch|network ?error|load failed|fetch failed|timed? ?out|temporarily unavailable|econn|socket|connection|sin conexi|no hay conexi|offline|jwt|token expired|invalid token|not authorized|no autorizado/.test(
    m
  );
}
