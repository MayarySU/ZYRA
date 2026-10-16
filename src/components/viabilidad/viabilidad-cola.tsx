"use client";

import { AlertTriangle, RotateCw, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/components/providers/sync-provider";
import { useOperacionesViabilidadAtascadas } from "@/hooks/queries/use-viabilidad";
import { reintentarOperacion, descartarOperacion } from "@/lib/offline/outbox";

export interface ColaProps {
  revisionId: number;
}

const KIND_LABEL: Record<string, string> = {
  "viabilidad-respuesta": "Respuesta",
  "viabilidad-entregar": "Entrega",
};

export function ViabilidadCola({ revisionId }: ColaProps) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { toast } = useToast();
  const qc = useQueryClient();
  const { syncQueue } = useSync();
  const { data, refetch } = useOperacionesViabilidadAtascadas(revisionId);

  const ops = data ?? [];
  if (ops.length === 0) return null;

  const invalidar = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["viabilidad"] });
  };

  const retry = async (id: string) => {
    await reintentarOperacion(id);
    invalidar();
    try {
      await syncQueue();
    } catch {
      // el ejecutor reintentará en el próximo ciclo
    }
    toast({ title: tv.queue_retry });
  };

  const discard = async (id: string) => {
    await descartarOperacion(id);
    invalidar();
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-700">{tv.queue_title}</h3>
        </div>
        <ul className="space-y-2">
          {ops.map((op) => {
            const conflicto = op.estado === "conflicto";
            return (
              <li
                key={op.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-background/60 px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        conflicto
                          ? "border-red-500/40 text-[10px] text-red-600"
                          : "border-amber-500/40 text-[10px] text-amber-700"
                      }
                    >
                      {conflicto ? tv.queue_conflict : tv.queue_business}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">
                      {KIND_LABEL[op.kind] ?? op.kind}
                    </span>
                  </div>
                  {op.ultimoError && (
                    <span className="text-[11px] text-muted-foreground">{op.ultimoError}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7" onClick={() => retry(op.id)}>
                    <RotateCw className="mr-1 h-3.5 w-3.5" /> {tv.queue_retry}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-destructive"
                    onClick={() => discard(op.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> {tv.queue_discard}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
