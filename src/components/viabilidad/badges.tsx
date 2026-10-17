"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

const ESTADO_STYLES: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  evaluada: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  finalizada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  anulada: "bg-muted text-muted-foreground border-border line-through",
};

const RESULTADO_STYLES: Record<string, string> = {
  apto: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  apto_con_acciones: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  requiere_validacion: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  no_apto: "bg-red-500/10 text-red-600 border-red-500/30",
};

export function EstadoRevisionBadge({
  estado,
  className,
}: {
  estado: string;
  className?: string;
}) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const labels: Record<string, string> = {
    borrador: tv.state_borrador,
    en_progreso: tv.state_en_progreso,
    evaluada: tv.state_evaluada,
    finalizada: tv.state_finalizada,
    anulada: tv.state_anulada,
  };
  return (
    <Badge variant="outline" className={cn(ESTADO_STYLES[estado], className)}>
      {labels[estado] ?? estado}
    </Badge>
  );
}

const PLANTILLA_ESTADO_STYLES: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground border-border",
  activa: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  archivada: "bg-muted text-muted-foreground border-border",
};

export function PlantillaEstadoBadge({
  estado,
  className,
}: {
  estado: string;
  className?: string;
}) {
  const { t } = useI18n();
  const tv = t.viabilidad.plantillasAdmin;
  const labels: Record<string, string> = {
    borrador: tv.estado_borrador,
    activa: tv.estado_activa,
    archivada: tv.estado_archivada,
  };
  return (
    <Badge
      variant="outline"
      className={cn(PLANTILLA_ESTADO_STYLES[estado], className)}
    >
      {labels[estado] ?? estado}
    </Badge>
  );
}

export function ResultadoBadge({
  resultado,
  className,
}: {
  resultado: string | null | undefined;
  className?: string;
}) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  if (!resultado) return null;
  const labels: Record<string, string> = {
    apto: tv.result_apto,
    apto_con_acciones: tv.result_apto_con_acciones,
    requiere_validacion: tv.result_requiere_validacion,
    no_apto: tv.result_no_apto,
  };
  return (
    <Badge variant="outline" className={cn(RESULTADO_STYLES[resultado], className)}>
      {labels[resultado] ?? resultado}
    </Badge>
  );
}
