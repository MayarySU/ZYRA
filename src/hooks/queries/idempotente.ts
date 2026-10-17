"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { nuevoOperationId } from "@/lib/data/util";
import { encolarOperacion, type OutboxKind } from "@/lib/offline/outbox";

/** Descriptor para desviar la mutación al outbox Dexie cuando no hay conexión. */
export interface DescriptorOutbox<TVars> {
  kind: OutboxKind;
  describir: (vars: TVars) => { datos: unknown; version?: string; clave: string };
}

/**
 * Envuelve `useMutation` generando un `operation_id` (idempotency key) ÚNICO
 * por invocación del usuario. Las variables (y su operation_id) se conservan
 * a través de los reintentos, de modo que un reenvío tras reconectar NO
 * duplica la operación en el servidor.
 *
 * Si se pasa un `descriptor` y no hay conexión, la mutación NO se ejecuta ni
 * se pausa en TanStack: se encola en el outbox Dexie (`lib/offline/outbox.ts`)
 * con el mismo `operation_id`, de modo que sobrevive a una recarga y la
 * sincroniza el ejecutor al reconectar (idempotente en el servidor).
 */
export function useIdempotente<TData, TVars = void>(
  fn: (vars: TVars, opId: string) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, { vars: TVars; opId: string }>, "mutationFn">,
  descriptor?: DescriptorOutbox<TVars>
) {
  const m = useMutation<TData, Error, { vars: TVars; opId: string }>({
    mutationFn: ({ vars, opId }) => fn(vars, opId),
    ...options,
  });

  const desviarSiOffline = (vars: TVars, opId: string): boolean => {
    if (!descriptor) return false;
    if (typeof navigator === "undefined" || navigator.onLine) return false;
    const d = descriptor.describir(vars);
    void encolarOperacion({
      id: opId,
      kind: descriptor.kind,
      datos: d.datos,
      version: d.version,
      clave: d.clave,
    });
    return true;
  };

  return {
    ...m,
    mutate: (vars?: TVars, opts?: Parameters<typeof m.mutate>[1]) => {
      const opId = nuevoOperationId();
      if (desviarSiOffline(vars as TVars, opId)) return;
      m.mutate({ vars: vars as TVars, opId }, opts);
    },
    mutateAsync: (vars?: TVars, opts?: Parameters<typeof m.mutateAsync>[1]) => {
      const opId = nuevoOperationId();
      if (desviarSiOffline(vars as TVars, opId)) {
        return Promise.resolve(undefined as unknown as TData);
      }
      return m.mutateAsync({ vars: vars as TVars, opId }, opts);
    },
  };
}
