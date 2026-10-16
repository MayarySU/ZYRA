"use client";

import DashboardLayout from "../dashboard/layout";
import { useMemo } from "react";
import {
  Loader2,
  ShieldCheck,
  ClipboardCheck,
  History,
  ChevronRight,
  CalendarClock,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  useRevisionesAsignadas,
  useValidacionesAsignadas,
  useHistorialRevisiones,
  useRevisionesTodas,
  useValidacionesTodas,
} from "@/hooks/queries/use-viabilidad";
import { EstadoRevisionBadge, ResultadoBadge } from "@/components/viabilidad/badges";
import type {
  RevisionViabilidadHub,
  ValidacionViabilidadHub,
} from "@/lib/data/viabilidad";

const OPEN_STATES = ["borrador", "en_progreso", "evaluada"];

function etapaLabel(
  tipo: string,
  tv: { stage_previabilidad: string; stage_ingenieria: string }
): string {
  return tipo === "ingenieria" ? tv.stage_ingenieria : tv.stage_previabilidad;
}

function Fecha({ iso }: { iso: string | null }) {
  if (!iso) return null;
  const d = new Date(iso);
  return <>{d.toLocaleDateString()}</>;
}

function RevisionRow({ r }: { r: RevisionViabilidadHub }) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  return (
    <a
      href={`/viabilidad/${r.id_revision_viabilidad}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/5"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {r.proyectos?.nombre_proyecto ?? `#${r.proyecto_id}`}
          </span>
          <span className="text-[10px] text-muted-foreground">#{r.numero_revision}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{etapaLabel(r.tipo_etapa, tv)}</span>
          {r.viabilidad_plantillas ? <span>· {r.viabilidad_plantillas.nombre}</span> : null}
          {r.actualizado_en ? (
            <span className="inline-flex items-center gap-1">
              · <CalendarClock className="h-3 w-3" /> <Fecha iso={r.actualizado_en} />
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <EstadoRevisionBadge estado={r.estado} />
        <ResultadoBadge resultado={r.resultado_final ?? r.resultado_evaluacion} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </a>
  );
}

function ValidacionRow({ v }: { v: ValidacionViabilidadHub }) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const rev = v.viabilidad_revisiones;
  const tipoLabel: Record<string, string> = {
    estructural: tv.val_estructural,
    electrico: tv.val_electrico,
    legal: tv.val_legal,
    cfe: tv.val_cfe,
    otro: tv.val_otro,
  };
  const estadoLabel: Record<string, string> = {
    pendiente: tv.val_pendiente,
    aprobada: tv.val_aprobada,
    rechazada: tv.val_rechazada,
  };
  return (
    <a
      href={`/viabilidad/${v.revision_id}?tab=validaciones`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/5"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {rev?.proyectos?.nombre_proyecto ?? `#${v.revision_id}`}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {etapaLabel(rev?.tipo_etapa ?? "", tv)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{tipoLabel[v.tipo] ?? v.tipo}</span>
          <span>· {t.viabilidad.specialist}: {v.especialista_empleado_id ?? t.viabilidad.unassigned}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{estadoLabel[v.estado] ?? v.estado}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </a>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function Lista({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export default function ViabilidadPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const tv = t.viabilidad;
  const isAdmin = profile?.rol === "admin";
  const empleadoId = profile?.empleadoId ?? null;

  const asignadas = useRevisionesAsignadas(isAdmin ? null : empleadoId);
  const todas = useRevisionesTodas();
  const validacionesAsignadas = useValidacionesAsignadas(isAdmin ? null : empleadoId);
  const validacionesTodas = useValidacionesTodas();
  const historial = useHistorialRevisiones();

  const revisiones: RevisionViabilidadHub[] = useMemo(() => {
    const data = isAdmin ? todas.data : asignadas.data;
    return (data ?? []).filter((r) => OPEN_STATES.includes(r.estado));
  }, [isAdmin, todas.data, asignadas.data]);

  const validaciones: ValidacionViabilidadHub[] = useMemo(() => {
    const data = isAdmin ? validacionesTodas.data : validacionesAsignadas.data;
    return data ?? [];
  }, [isAdmin, validacionesTodas.data, validacionesAsignadas.data]);

  const cargando =
    (isAdmin ? todas.isLoading : asignadas.isLoading) ||
    (isAdmin ? validacionesTodas.isLoading : validacionesAsignadas.isLoading) ||
    historial.isLoading;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
            <ShieldCheck className="h-6 w-6 text-accent" /> {tv.title}
          </h1>
          <p className="text-sm text-muted-foreground">{tv.hub_subtitle}</p>
        </header>

        {cargando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <Tabs defaultValue="revisiones" className="w-full">
            <TabsList>
              <TabsTrigger value="revisiones" className="gap-2">
                <ClipboardCheck className="h-4 w-4" /> {tv.tab_my_reviews}
              </TabsTrigger>
              <TabsTrigger value="validaciones" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> {tv.tab_my_validations}
              </TabsTrigger>
              <TabsTrigger value="historial" className="gap-2">
                <History className="h-4 w-4" /> {tv.tab_history}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revisiones" className="mt-4">
              {revisiones.length === 0 ? (
                <EmptyState icon={ClipboardCheck} text={tv.hub_empty_reviews} />
              ) : (
                <Lista>
                  {revisiones.map((r) => (
                    <RevisionRow key={r.id_revision_viabilidad} r={r} />
                  ))}
                </Lista>
              )}
            </TabsContent>

            <TabsContent value="validaciones" className="mt-4">
              {validaciones.length === 0 ? (
                <EmptyState icon={ShieldCheck} text={tv.hub_empty_validations} />
              ) : (
                <Lista>
                  {validaciones.map((v) => (
                    <ValidacionRow key={v.id_validacion_viabilidad} v={v} />
                  ))}
                </Lista>
              )}
            </TabsContent>

            <TabsContent value="historial" className="mt-4">
              {(historial.data ?? []).length === 0 ? (
                <EmptyState icon={History} text={tv.hub_empty_history} />
              ) : (
                <Lista>
                  {(historial.data ?? []).map((r) => (
                    <RevisionRow key={r.id_revision_viabilidad} r={r} />
                  ))}
                </Lista>
              )}
            </TabsContent>
          </Tabs>
        )}

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {tv.subtitle}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
