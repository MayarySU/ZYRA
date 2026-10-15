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
  fileName: string;
  contentType: string;
  blob: Blob;
  createdAt: number;
  intentos: number;
  ultimoError?: string;
}

/**
 * Entrada de la cola de operaciones (outbox). Se usa como respaldo lógico
 * para reintentos idempotentes; la cola de mutaciones de TanStack Query
 * (persistida en `kv`) es la que ejecuta las RPC.
 */
export interface OutboxEntry {
  id: string;
  kind: string;
  payload: string;
  createdAt: number;
  intentos: number;
}

/**
 * Base de datos offline (IndexedDB vía Dexie).
 * - `kv`: persister de TanStack Query (caché de queries + mutaciones pausadas).
 * - `evidencias_pendientes`: blobs de evidencias capturadas offline.
 * - `outbox`: cola lógica de operaciones para reintentos idempotentes.
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
