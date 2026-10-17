"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { useRevisionesViabilidad } from "@/hooks/queries/use-viabilidad";
import { EstadoRevisionBadge, ResultadoBadge } from "@/components/viabilidad/badges";
import type { TipoEtapaViabilidad } from "@/lib/data/rpc";

export interface HistorialProps {
  proyectoId: number;
  tipoEtapa: TipoEtapaViabilidad;
  currentId: number;
}

export function ViabilidadHistorial({ proyectoId, tipoEtapa, currentId }: HistorialProps) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { data, isLoading } = useRevisionesViabilidad(proyectoId);

  const revisiones = (data ?? [])
    .filter((r) => r.tipo_etapa === tipoEtapa)
    .sort((a, b) => b.numero_revision - a.numero_revision);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {tv.history_title}
      </h3>
      {isLoading && <p className="text-xs text-muted-foreground">{t.common.loading}</p>}
      {!isLoading && revisiones.length === 0 && (
        <p className="text-xs text-muted-foreground">{tv.history_empty}</p>
      )}
      <div className="space-y-2">
        {revisiones.map((r) => {
          const esActual = r.id_revision_viabilidad === currentId;
          return (
            <Card
              key={r.id_revision_viabilidad}
              className={esActual ? "border-primary/50 bg-primary/5" : "border-border bg-card"}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {tv.revision_number} {r.numero_revision}
                  </span>
                  <EstadoRevisionBadge estado={r.estado} />
                  <ResultadoBadge resultado={r.resultado_evaluacion} />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.actualizado_en).toLocaleDateString()}
                  </span>
                </div>
                {!esActual && (
                  <Link
                    href={`/viabilidad/${r.id_revision_viabilidad}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {tv.open}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
