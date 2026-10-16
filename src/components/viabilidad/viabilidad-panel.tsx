"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Plus, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useRevisionesViabilidad,
  usePlantillasViabilidad,
  useEstablecerAplicabilidadViabilidad,
  useCrearRevisionViabilidad,
  useAnularRevisionViabilidad,
} from "@/hooks/queries/use-viabilidad";
import type { ProyectoVista } from "@/lib/data/proyectos";
import type { TipoEtapaViabilidad } from "@/lib/data/rpc";
import type { RevisionViabilidadResumen } from "@/lib/data/viabilidad";

const ETAPAS: TipoEtapaViabilidad[] = ["previabilidad", "ingenieria"];
const OPEN_STATES = ["borrador", "en_progreso", "evaluada"];

export function ViabilidadPanel({ proyecto }: { proyecto: ProyectoVista }) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { toast } = useToast();

  const pid = proyecto.id_proyecto as number;

  const { data: revisiones = [], isLoading: loadingRev } = useRevisionesViabilidad(pid);
  const { data: plantillas = [], isLoading: loadingPlantillas } = usePlantillasViabilidad();

  const establecer = useEstablecerAplicabilidadViabilidad(pid);
  const crear = useCrearRevisionViabilidad(pid);
  const anular = useAnularRevisionViabilidad(pid);

  const servicioId = proyecto.servicio_id ?? null;
  const reqPrev = proyecto.requiere_previabilidad ?? false;
  const reqIng = proyecto.requiere_ingenieria ?? false;

  const [prev, setPrev] = useState(reqPrev);
  const [ing, setIng] = useState(reqIng);

  useEffect(() => {
    setPrev(reqPrev);
    setIng(reqIng);
  }, [pid, reqPrev, reqIng]);

  const hayRevisiones = revisiones.length > 0;
  const dirty = prev !== reqPrev || ing !== reqIng;

  const plantillaActiva = (etapa: TipoEtapaViabilidad) =>
    plantillas.find(
      (p) => p.estado === "activa" && p.tipo_etapa === etapa && (p.servicio_id ?? null) === servicioId
    ) ?? null;

  const revisionesDeEtapa = (etapa: TipoEtapaViabilidad) =>
    revisiones.filter((r) => r.tipo_etapa === etapa);

  const ultima = (etapa: TipoEtapaViabilidad): RevisionViabilidadResumen | null =>
    revisionesDeEtapa(etapa)[0] ?? null;

  const abierta = (etapa: TipoEtapaViabilidad) =>
    revisionesDeEtapa(etapa).find((r) => OPEN_STATES.includes(r.estado)) ?? null;

  const etapaApta = (etapa: TipoEtapaViabilidad) =>
    revisionesDeEtapa(etapa).some((r) => r.estado === "finalizada" && r.resultado_final === "apto");

  const requerida = (etapa: TipoEtapaViabilidad) => (etapa === "previabilidad" ? reqPrev : reqIng);

  const requiereAlgo = reqPrev || reqIng;
  const gateOk = requiereAlgo && ETAPAS.filter(requerida).every(etapaApta);

  const puedeCrear = (etapa: TipoEtapaViabilidad) => {
    if (abierta(etapa)) return false;
    if (!plantillaActiva(etapa)) return false;
    if (etapa === "ingenieria" && !etapaApta("previabilidad")) return false;
    return true;
  };

  const guardarAplicabilidad = async () => {
    try {
      await establecer.mutateAsync({ requierePreviabilidad: prev, requiereIngenieria: ing });
      toast({ title: t.common.success });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const crearRevision = async (etapa: TipoEtapaViabilidad) => {
    try {
      await crear.mutateAsync({ tipoEtapa: etapa });
      toast({ title: t.common.success });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const anularRevision = async (revisionId: number) => {
    try {
      await anular.mutateAsync({ revisionId });
      toast({ title: t.common.success });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const estadoLabel = (estado: string) => {
    const map: Record<string, string> = {
      borrador: tv.state_borrador,
      en_progreso: tv.state_en_progreso,
      evaluada: tv.state_evaluada,
      finalizada: tv.state_finalizada,
      anulada: tv.state_anulada,
    };
    return map[estado] ?? estado;
  };

  const resultadoLabel = (r: RevisionViabilidadResumen) => {
    if (r.resultado_final === "apto") return tv.result_apto;
    if (r.resultado_final === "no_apto") return tv.result_no_apto;
    const map: Record<string, string> = {
      apto: tv.result_apto,
      apto_con_acciones: tv.result_apto_con_acciones,
      requiere_validacion: tv.result_requiere_validacion,
      no_apto: tv.result_no_apto,
    };
    return r.resultado_evaluacion ? map[r.resultado_evaluacion] ?? r.resultado_evaluacion : "";
  };

  if (loadingRev || loadingPlantillas) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" /> {tv.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{tv.subtitle}</p>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">{tv.applicability}</Label>
          <div className="flex items-center justify-between">
            <span className="text-sm">{tv.requires_previabilidad}</span>
            <Switch
              checked={prev}
              disabled={hayRevisiones || establecer.isPending}
              onCheckedChange={(v) => {
                setPrev(v);
                if (!v) setIng(false);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{tv.requires_ingenieria}</span>
            <Switch
              checked={ing}
              disabled={hayRevisiones || establecer.isPending}
              onCheckedChange={(v) => {
                setIng(v);
                if (v) setPrev(true);
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">{tv.requires_ingenieria_hint}</p>
          {hayRevisiones ? (
            <p className="text-[10px] text-amber-500">{tv.applicability_locked}</p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!dirty || establecer.isPending}
              onClick={guardarAplicabilidad}
            >
              {establecer.isPending ? "..." : tv.save_applicability}
            </Button>
          )}
        </div>

        <div
          className={cn(
            "flex items-start gap-2 rounded-lg p-3 text-xs font-medium",
            !requiereAlgo
              ? "bg-muted/40 text-muted-foreground"
              : gateOk
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600"
          )}
        >
          {requiereAlgo && (gateOk ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />)}
          <span>{!requiereAlgo ? tv.gate_not_required : gateOk ? tv.gate_ready : tv.gate_pending}</span>
        </div>

        {ETAPAS.filter(requerida).map((etapa) => {
          const r = ultima(etapa);
          const abiertaEtapa = abierta(etapa);
          const tienePlantilla = !!plantillaActiva(etapa);
          const apta = etapaApta(etapa);
          const bloqueoIng = etapa === "ingenieria" && !etapaApta("previabilidad");
          return (
            <div key={etapa} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">
                  {etapa === "previabilidad" ? tv.stage_previabilidad : tv.stage_ingenieria}
                </span>
                {apta ? (
                  <Badge className="bg-emerald-500 text-white">{tv.stage_ready}</Badge>
                ) : (
                  <Badge variant="secondary">{tv.stage_pending}</Badge>
                )}
              </div>
              {!tienePlantilla && <p className="text-[10px] text-red-500">{tv.no_plantilla}</p>}
              {r ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="outline">{estadoLabel(r.estado)}</Badge>
                  {resultadoLabel(r) && <span>· {resultadoLabel(r)}</span>}
                  {r.numero_revision ? <span>· #{r.numero_revision}</span> : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{tv.no_revision}</p>
              )}
              {abiertaEtapa && (
                <p className="text-[10px] text-muted-foreground">{tv.blocked_open}</p>
              )}
              {bloqueoIng && <p className="text-[10px] text-amber-500">{tv.blocked_ingenieria}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={!puedeCrear(etapa) || crear.isPending}
                  onClick={() => crearRevision(etapa)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> {tv.create_revision}
                </Button>
                {abiertaEtapa && (abiertaEtapa.estado === "borrador" || abiertaEtapa.estado === "en_progreso") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={anular.isPending}
                    onClick={() => anularRevision(abiertaEtapa.id_revision_viabilidad)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" /> {tv.anular}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
