"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useSync } from "@/components/providers/sync-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Indicador de conectividad y operaciones pendientes de sincronizar. */
export function SyncStatus() {
  const { isOnline, pending } = useSync();

  if (isOnline && pending === 0) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-bold",
        isOnline ? "border-amber-500 text-amber-500" : "border-red-500 text-red-500"
      )}
    >
      {isOnline ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <CloudOff className="h-3 w-3" />
      )}
      {isOnline
        ? `Sincronizando (${pending})`
        : pending > 0
          ? `Sin conexión · ${pending} pend.`
          : "Sin conexión"}
    </Badge>
  );
}
