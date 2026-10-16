"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { flushEvidenciasPendientes, contarEvidenciasPendientes } from "@/lib/evidencias-client";
import { contarOperacionesPendientes, procesarOutbox } from "@/lib/offline/outbox";

interface SyncContextType {
  isOnline: boolean;
  /** Nº de operaciones pendientes (outbox + evidencias en cola). */
  pending: number;
  /** Fuerza el vaciado de la cola (outbox + mutaciones pausadas + evidencias). */
  syncQueue: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

/**
 * Sincronización offline-first:
 * - Observa la conectividad.
 * - Al reconectar: reanuda las mutaciones pausadas de TanStack Query y vacía
 *   la cola de evidencias en Dexie, luego invalida la caché para reconciliar.
 * - Expone el número de operaciones pendientes para mostrar en la UI.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = React.useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [pending, setPending] = React.useState(0);

  const refreshPending = useCallback(async () => {
    const evidencias = await contarEvidenciasPendientes();
    const outbox = await contarOperacionesPendientes();
    const mutaciones = queryClient
      .getMutationCache()
      .getAll()
      .filter((m) => m.state.isPaused).length;
    setPending(evidencias + outbox + mutaciones);
  }, [queryClient]);

  const syncQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    // 1) Drena el outbox Dexie (operaciones guardadas sin conexión, en orden).
    //    Un fallo no debe impedir el resto del ciclo.
    try {
      await procesarOutbox();
    } catch {
      // Ignora: la operación queda pendiente y se reintenta en el próximo ciclo.
    }
    // 2) Reanuda las RPC que quedaran en pausa (idempotentes por operation_id).
    try {
      await queryClient.resumePausedMutations();
    } catch {
      // Ignora: la mutación queda en estado de error y se reintenta al reusar.
    }
    // 3) Sube las evidencias capturadas offline.
    try {
      await flushEvidenciasPendientes();
    } catch {
      // Ignora: se reintentará en el próximo ciclo online.
    }
    // 4) Reconcilia con el servidor (fuente de verdad).
    await queryClient.invalidateQueries().catch(() => {});
    await refreshPending();
  }, [queryClient, refreshPending]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Al montar: reintenta pendientes y refleja el estado.
    void refreshPending();
    if (typeof navigator === "undefined" || navigator.onLine) {
      void syncQueue();
    }

    const unsub = queryClient.getMutationCache().subscribe(() => {
      void refreshPending();
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsub();
    };
  }, [syncQueue, refreshPending, queryClient]);

  return (
    <SyncContext.Provider value={{ isOnline, pending, syncQueue }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
};
