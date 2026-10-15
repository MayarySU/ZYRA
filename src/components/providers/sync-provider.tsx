"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";

interface SyncContextType {
  isOnline: boolean;
  syncQueue: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

/**
 * Detección de conectividad. La cola offline real (outbox en Dexie) y su
 * vaciado se implementan en la fase offline-first; por ahora `syncQueue`
 * es un marcador que se completa cuando la capa de sincronización exista.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  const syncQueue = useCallback(async () => {
    // No-op hasta la fase offline-first (Dexie outbox).
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  return (
    <SyncContext.Provider value={{ isOnline, syncQueue }}>{children}</SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
};
