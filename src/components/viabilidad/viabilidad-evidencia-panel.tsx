"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, ExternalLink, Trash2, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/hooks/use-toast";
import { urlEvidencia } from "@/lib/evidencias-client";
import type { EvidenciaPendiente } from "@/lib/offline/db";
import {
  useAdjuntarEvidenciaViabilidad,
  useDesvincularEvidenciaViabilidad,
} from "@/hooks/queries/use-viabilidad";
import type { EvidenciaRevisionVista } from "@/lib/data/viabilidad";
import { cn } from "@/lib/utils";

/** Destino concreto (pregunta/acción/validación) al que se asocian las evidencias. */
export interface DestinoEvidencia {
  preguntaId?: number;
  accionId?: number;
  validacionId?: number;
}

export interface EvidenciaPanelProps {
  revisionId: number;
  proyectoId: number;
  /** Enlace concreto al que se asocian las evidencias. */
  enlace: DestinoEvidencia;
  /** Evidencias del servidor que pertenecen a este destino. */
  evidencias: EvidenciaRevisionVista[];
  /** Evidencias en cola offline que pertenecen a este destino. */
  pendientes: EvidenciaPendiente[];
  canAttach: boolean;
  isAdmin: boolean;
  className?: string;
}

export function EvidenciaPanel({
  revisionId,
  proyectoId,
  enlace,
  evidencias,
  pendientes,
  canAttach,
  isAdmin,
  className,
}: EvidenciaPanelProps) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);

  const adjuntar = useAdjuntarEvidenciaViabilidad(revisionId);
  const desvincular = useDesvincularEvidenciaViabilidad();

  const abrir = async (objectKey: string) => {
    const url = await urlEvidencia(objectKey);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast({ variant: "destructive", title: tv.no_permission });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setCargando(true);
    try {
      const res = await adjuntar.mutateAsync({
        proyectoId,
        file,
        descripcion: file.name,
        preguntaId: enlace.preguntaId,
        accionId: enlace.accionId,
        validacionId: enlace.validacionId,
      });
      if (res.encolada) toast({ title: tv.saved_offline });
    } catch (e) {
      toast({ variant: "destructive", title: tv.upload_error, description: (e as Error).message });
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const quitar = async (id: number) => {
    try {
      await desvincular.mutateAsync(id);
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const vacio = evidencias.length === 0 && pendientes.length === 0;

  return (
    <div className={cn("space-y-2", className)}>
      {vacio && <p className="text-xs text-muted-foreground">{tv.evidences_empty}</p>}

      <ul className="space-y-1.5">
        {evidencias.map((ev) => (
          <li
            key={ev.id_viabilidad_evidencia}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5"
          >
            <span className="truncate text-xs text-foreground">
              {ev.evidencias?.descripcion || ev.evidencias?.object_key || "—"}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => ev.evidencias?.object_key && abrir(ev.evidencias.object_key)}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> {tv.evidence_open}
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  onClick={() => quitar(ev.id_viabilidad_evidencia)}
                  disabled={desvincular.isPending}
                  aria-label={t.common.delete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </li>
        ))}

        {pendientes.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5"
          >
            <span className="truncate text-xs text-amber-600">{p.fileName}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-600">
              <CloudUpload className="h-3 w-3" /> {tv.evidence_pending}
            </span>
          </li>
        ))}
      </ul>

      {canAttach && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={cargando || adjuntar.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {cargando || adjuntar.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="mr-1 h-3.5 w-3.5" />
            )}
            {tv.add_evidence}
          </Button>
        </>
      )}
    </div>
  );
}
