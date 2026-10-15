import Dexie, { type Table } from "dexie";

export interface KvEntry {
  key: string;
  value: string;
  updatedAt: number;
}

/**
 * Base de datos offline (IndexedDB vía Dexie).
 * - `kv`: almacenamiento clave/valor usado por el persister de TanStack Query
 *   (caché de queries + mutaciones pausadas pendientes de sincronizar).
 */
class ZyraOfflineDB extends Dexie {
  kv!: Table<KvEntry, string>;

  constructor() {
    super("zyra-offline");
    this.version(1).stores({ kv: "key" });
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
