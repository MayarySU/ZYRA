import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { getOfflineDB } from "@/lib/offline/db";

const CACHE_KEY = "zyra-query-cache";

/**
 * Persister de TanStack Query respaldado por IndexedDB (Dexie).
 * Guarda el estado hidratado del QueryClient, incluidas las mutaciones que
 * quedaron pausadas por falta de conexión, para reintentarlas al reconectar.
 */
export const dexiePersister: Persister = {
  async persistClient(client: PersistedClient) {
    await getOfflineDB().kv.put({
      key: CACHE_KEY,
      value: JSON.stringify(client),
      updatedAt: Date.now(),
    });
  },
  async restoreClient() {
    const row = await getOfflineDB().kv.get(CACHE_KEY);
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  async removeClient() {
    await getOfflineDB().kv.delete(CACHE_KEY);
  },
};
