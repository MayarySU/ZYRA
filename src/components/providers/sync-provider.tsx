"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { flushEvidenciasPendientes, contarEvidenciasPendientes } from "@/lib/evidencias-client";

interface SyncContextType {
  isOnline: boolean;
  /** Nº de operaciones pendientes (mutaciones pausadas + evidencias en cola). */
  pending: number;
  /** Fuerza el vaciado de la cola (mutaciones pausadas + evidencias). */
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
    const mutaciones = queryClient
      .getMutationCache()
      .getAll()
      .filter((m) => m.state.isPaused).length;
    setPending(evidencias + mutaciones);
  }, [queryClient]);

  const syncQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    // 1) Reanuda las RPC que quedaron en pausa (idempotentes por operation_id).
    await queryClient.resumePausedMutations();
    // 2) Sube las evidencias capturadas offline.
    await flushEvidenciasPendientes();
    // 3) Reconcilia con el servidor (fuente de verdad).
    await queryClient.invalidateQueries();
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
