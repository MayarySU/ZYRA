"use client";

import * as React from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { dexiePersister } from "@/lib/offline/persister";

const CACHE_BUSTER = "v1";
const MAX_AGE = 24 * 60 * 60 * 1000; // 24h

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Offline-first: servimos la caché y refrescamos al recuperar red/foco.
        networkMode: "offlineFirst",
        staleTime: 60 * 1000,
        gcTime: MAX_AGE,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Red por defecto ('online'): las mutaciones sin conexión quedan
        // en pausa y se reintentan al reconectar (cola outbox persistida).
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Servidor: siempre un cliente nuevo.
    return makeQueryClient();
  }
  // Navegador: reutilizar el mismo cliente entre renders.
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Al recuperar conexión, reintenta las mutaciones que quedaron en pausa.
  React.useEffect(() => {
    const onOnline = () => {
      void queryClient.resumePausedMutations();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: dexiePersister,
        maxAge: MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === "success",
          // Persistimos únicamente las mutaciones pausadas (offline).
          shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
