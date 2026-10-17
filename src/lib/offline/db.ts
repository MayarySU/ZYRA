import Dexie, { type Table } from "dexie";

export interface KvEntry {
  key: string;
  value: string;
  updatedAt: number;
}

/**
 * Evidencia pendiente de subir (foto/doc/video capturada sin conexión).
 * El blob se guarda tal cual en IndexedDB y se sube a R2 al reconectar.
 */
export interface EvidenciaPendiente {
  id: string;
  proyectoId: number;
  descripcion?: string;
  avanceId?: number;
  /** Enlace opcional a una revisión de viabilidad (v4). */
  revisionId?: number;
  /** Pregunta del cuestionario a la que se ancla (tipo `evidencia`). */
  preguntaId?: number;
  /** Destino de viabilidad alternativo (resolución de acción/validación). */
  accionId?: number;
  /** Destino de viabilidad alternativo (validación de especialista). */
  validacionId?: number;
  fileName: string;
  contentType: string;
  blob: Blob;
  createdAt: number;
  intentos: number;
  ultimoError?: string;
}

/**
 * Estado de una operación del outbox.
 * - `pendiente`: esperando drenado (online).
 * - `conflicto`: edición concurrente real (versión obsoleta). Requiere decisión
 *   del usuario; nunca se resuelve sobrescribiendo.
 * - `error_negocio`: el motor rechazó la operación (p.ej. faltan obligatorias,
 *   estado no válido). No es un conflicto de concurrencia: se reintentará
 *   cuando el usuario corrija el dato que lo causó.
 */
export type OutboxEstado = "pendiente" | "conflicto" | "error_negocio";

/**
 * Entrada de la cola de operaciones (outbox). Es la fuente de verdad de las
 * mutaciones hechas sin conexión: el ejecutor (`lib/offline/outbox.ts`) la
 * procesa en orden al arrancar la app y al reconectar, ejecutando el handler
 * del `kind` correspondiente. Solo se borra tras un éxito confirmado.
 */
export interface OutboxEntry {
  /** Idempotency key: coincide con el `operation_id` de la RPC. */
  id: string;
  /** Orden determinista de procesamiento (asignado al encolar). */
  seq: number;
  kind: string;
  /** Payload serializable específico del `kind`. */
  datos: unknown;
  /** Versión (p.ej. `actualizado_en`) capturada al encolar, para detectar conflictos. */
  version?: string;
  /** Clave de coalescencia: dos operaciones pendientes con la misma clave se fusionan. */
  clave: string;
  estado: OutboxEstado;
  createdAt: number;
  intentos: number;
  ultimoError?: string;
}

/**
 * Base de datos offline (IndexedDB vía Dexie).
 * - `kv`: persister de TanStack Query (caché de queries + mutaciones pausadas).
 * - `evidencias_pendientes`: blobs de evidencias capturadas offline.
 * - `outbox`: cola de operaciones offline procesada por el ejecutor explícito.
 */
class ZyraOfflineDB extends Dexie {
  kv!: Table<KvEntry, string>;
  evidencias_pendientes!: Table<EvidenciaPendiente, string>;
  outbox!: Table<OutboxEntry, string>;

  constructor() {
    super("zyra-offline");
    this.version(1).stores({ kv: "key" });
    // v2: outbox de evidencias y operaciones.
    this.version(2).stores({
      kv: "key",
      evidencias_pendientes: "id, proyectoId, createdAt",
      outbox: "id, kind, createdAt",
    });
    // v3: outbox con orden determinista, coalescencia y estado explícito.
    this.version(3).stores({
      kv: "key",
      evidencias_pendientes: "id, proyectoId, createdAt",
      outbox: "id, seq, kind, clave, estado, createdAt",
    });
    // v4: evidencias enlazables a una revisión de viabilidad.
    this.version(4).stores({
      kv: "key",
      evidencias_pendientes: "id, proyectoId, revisionId, createdAt",
      outbox: "id, seq, kind, clave, estado, createdAt",
    });
  }
}

let instance: ZyraOfflineDB | null = null;

export function getOfflineDB(): ZyraOfflineDB {
  if (typeof window === "undefined") {
    throw new Error("La base de datos offline solo está disponible en el navegador");
  }
  if (!instance) {
    instance = new ZyraOfflineDB();
  }
  return instance;
}
