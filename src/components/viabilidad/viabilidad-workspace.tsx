"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/components/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useSync } from "@/components/providers/sync-provider";
import {
  useRevisionViabilidad,
  usePlantillaViabilidad,
  useEvidenciasPendientesRevision,
  useEntregarRevisionViabilidad,
  useAnularRevisionViabilidad,
} from "@/hooks/queries/use-viabilidad";
import { preguntaRequerida, preguntaVisible } from "@/lib/data/viabilidad";
import { EstadoRevisionBadge, ResultadoBadge } from "@/components/viabilidad/badges";
import { ViabilidadCuestionario } from "@/components/viabilidad/viabilidad-cuestionario";
import { ViabilidadObligaciones } from "@/components/viabilidad/viabilidad-obligaciones";
import { ViabilidadHistorial } from "@/components/viabilidad/viabilidad-historial";
import { ViabilidadCola } from "@/components/viabilidad/viabilidad-cola";
import { EvidenciaPanel } from "@/components/viabilidad/viabilidad-evidencia-panel";

export interface WorkspaceProps {
  revisionId: number;
  initialTab?: string;
}

export function ViabilidadWorkspace({ revisionId, initialTab }: WorkspaceProps) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { toast } = useToast();
  const { profile } = useAuth();
  const { isOnline, syncQueue } = useSync();

  const isAdmin = profile?.rol === "admin";
  const meEmpleadoId = profile?.empleadoId ?? null;

  const { data: revision, isLoading } = useRevisionViabilidad(revisionId);
  const { data: plantilla } = usePlantillaViabilidad(revision?.plantilla_id ?? null);
  const { data: pendientesData } = useEvidenciasPendientesRevision(revisionId);

  const entregar = useEntregarRevisionViabilidad(revisionId);
  const anular = useAnularRevisionViabilidad(revision?.proyecto_id ?? 0);

  const [confirmEntrega, setConfirmEntrega] = useState(false);

  const pendientes = useMemo(() => pendientesData ?? [], [pendientesData]);

  const respuestasMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of revision?.viabilidad_respuestas ?? []) m.set(r.pregunta_id, r.id_respuesta_viabilidad);
    return m;
  }, [revision?.viabilidad_respuestas]);

  // Pre-chequeo de evidencias requeridas antes de entregar.
  const evidenciasFaltantes = useMemo(() => {
    if (!plantilla || !revision) return [] as string[];
    const faltan: string[] = [];
    const valorOrigen = (id: number) =>
      revision.viabilidad_respuestas?.find((r) => r.pregunta_id === id)?.valor;
    for (const s of plantilla.viabilidad_secciones ?? []) {
      for (const p of s.viabilidad_preguntas ?? []) {
        if (!p.activa) continue;
        if (p.tipo_respuesta !== "evidencia") continue;
        if (!preguntaVisible(p, valorOrigen)) continue;
        if (!preguntaRequerida(p, p.obligatoria, valorOrigen)) continue;
        const respuestaId = respuestasMap.get(p.id_pregunta_viabilidad);
        const tiene =
          (revision.viabilidad_evidencias ?? []).some((e) => e.respuesta_id === respuestaId) ||
          pendientes.some((pe) => pe.preguntaId === p.id_pregunta_viabilidad);
        if (!tiene) faltan.push(p.texto);
      }
    }
    return faltan;
  }, [plantilla, revision, respuestasMap, pendientes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!revision) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{tv.no_permission}</p>
        <Link href="/viabilidad" className="text-sm text-primary hover:underline">
          {tv.back_to_hub}
        </Link>
      </div>
    );
  }

  const abierta = revision.estado === "borrador" || revision.estado === "en_progreso";
  const soyAsignado = revision.asignado_empleado_id === meEmpleadoId;
  const canEditCuestionario = abierta && (isAdmin || soyAsignado);

  const puedeEntregar = canEditCuestionario && evidenciasFaltantes.length === 0;

  const onEntregar = async () => {
    setConfirmEntrega(false);
    try {
      const res = await entregar.mutateAsync();
      toast({
        title: res.encolada ? tv.submitted_offline : tv.submitted_ok,
      });
      if (!res.encolada && isOnline) void syncQueue();
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const onAnular = async () => {
    try {
      await anular.mutateAsync({ revisionId, motivo: null });
      toast({ title: tv.anular });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const tabDefault = initialTab && ["cuestionario", "acciones", "validaciones", "evidencias", "historial"].includes(initialTab)
    ? initialTab
    : "cuestionario";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/viabilidad"
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {tv.back_to_hub}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {revision.proyectos?.nombre_proyecto ?? tv.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                {revision.tipo_etapa === "previabilidad" ? tv.stage_previabilidad : tv.stage_ingenieria}
              </Badge>
              {revision.viabilidad_plantillas && (
                <span>
                  {revision.viabilidad_plantillas.nombre} v{revision.viabilidad_plantillas.version}
                </span>
              )}
              <span>
                {tv.revision_number} {revision.numero_revision}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoRevisionBadge estado={revision.estado} />
            <ResultadoBadge resultado={revision.resultado_evaluacion} />
          </div>
        </div>
      </div>

      {/* Banners */}
      {!isOnline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-amber-700">
            <WifiOff className="h-4 w-4" /> {tv.offline_banner}
          </CardContent>
        </Card>
      )}
      {!abierta && revision.estado !== "evaluada" && (
        <Card className="border-border bg-muted/40">
          <CardContent className="p-3 text-xs text-muted-foreground">{tv.read_only}</CardContent>
        </Card>
      )}

      <ViabilidadCola revisionId={revisionId} />

      {/* Acciones de cabecera */}
      {(canEditCuestionario || (isAdmin && abierta)) && (
        <div className="flex flex-wrap items-center gap-2">
          {canEditCuestionario && (
            <Button
              size="sm"
              onClick={() => setConfirmEntrega(true)}
              disabled={!puedeEntregar || entregar.isPending}
            >
              {entregar.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              {tv.submit_review}
            </Button>
          )}
          {isAdmin && abierta && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={onAnular}
              disabled={anular.isPending}
            >
              <XCircle className="mr-1 h-4 w-4" /> {tv.anular}
            </Button>
          )}
          {evidenciasFaltantes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {tv.evidence_required}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={tabDefault} className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="cuestionario">{tv.tab_questionnaire}</TabsTrigger>
          <TabsTrigger value="acciones">{tv.tab_actions}</TabsTrigger>
          <TabsTrigger value="validaciones">{tv.tab_validations}</TabsTrigger>
          <TabsTrigger value="evidencias">{tv.tab_evidences}</TabsTrigger>
          <TabsTrigger value="historial">{tv.tab_history}</TabsTrigger>
        </TabsList>

        <TabsContent value="cuestionario" className="mt-4">
          {plantilla ? (
            <ViabilidadCuestionario
              revision={revision}
              plantilla={plantilla}
              canEdit={canEditCuestionario}
              isAdmin={isAdmin}
              pendientes={pendientes}
            />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </TabsContent>

        <TabsContent value="acciones" className="mt-4">
          <ViabilidadObligaciones
            revision={revision}
            isAdmin={isAdmin}
            meEmpleadoId={meEmpleadoId}
            pendientes={pendientes}
            seccion="acciones"
          />
        </TabsContent>

        <TabsContent value="validaciones" className="mt-4">
          <ViabilidadObligaciones
            revision={revision}
            isAdmin={isAdmin}
            meEmpleadoId={meEmpleadoId}
            pendientes={pendientes}
            seccion="validaciones"
          />
        </TabsContent>

        <TabsContent value="evidencias" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {tv.evidences_title}
              </h3>
              <EvidenciaPanel
                revisionId={revision.id_revision_viabilidad}
                proyectoId={revision.proyecto_id}
                enlace={{}}
                evidencias={revision.viabilidad_evidencias ?? []}
                pendientes={pendientes}
                canAttach={isAdmin && revision.estado !== "finalizada" && revision.estado !== "anulada"}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <ViabilidadHistorial
            proyectoId={revision.proyecto_id}
            tipoEtapa={revision.tipo_etapa as "previabilidad" | "ingenieria"}
            currentId={revision.id_revision_viabilidad}
          />
        </TabsContent>
      </Tabs>

      {/* Confirmación de entrega */}
      {confirmEntrega && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold">{tv.submit_confirm_title}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{tv.submit_confirm_desc}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmEntrega(false)}>
                  {t.common.cancel}
                </Button>
                <Button size="sm" onClick={onEntregar} disabled={entregar.isPending}>
                  {entregar.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  {tv.submit_review}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
