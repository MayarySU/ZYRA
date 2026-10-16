"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/hooks/use-toast";
import { useEmpleados } from "@/hooks/queries/use-catalogos";
import {
  useResolverAccionViabilidad,
  useResolverValidacionViabilidad,
  useAsignarResponsableAccionViabilidad,
  useAsignarEspecialistaViabilidad,
} from "@/hooks/queries/use-viabilidad";
import type {
  RevisionViabilidadDetalle,
  ViabilidadAccion,
  ViabilidadValidacion,
} from "@/lib/data/viabilidad";
import type { EvidenciaPendiente } from "@/lib/offline/db";
import { EvidenciaPanel } from "@/components/viabilidad/viabilidad-evidencia-panel";
import { cn } from "@/lib/utils";

type Pendiente = { tipo: "accion" | "validacion"; id: number; estado: string } | null;

function EstadoAccionBadge({ estado }: { estado: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; className: string }> = {
    pendiente: { label: t.viabilidad.action_pendiente, className: "bg-slate-500/15 text-slate-600" },
    en_progreso: { label: t.viabilidad.action_en_progreso, className: "bg-blue-500/15 text-blue-600" },
    completada: { label: t.viabilidad.action_completada, className: "bg-emerald-500/15 text-emerald-600" },
    validada: { label: t.viabilidad.action_validada, className: "bg-emerald-600/15 text-emerald-700" },
    rechazada: { label: t.viabilidad.action_rechazada, className: "bg-red-500/15 text-red-600" },
  };
  const cfg = map[estado] ?? { label: estado, className: "" };
  return (
    <Badge variant="outline" className={cn("border-transparent text-[10px]", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function EstadoValidacionBadge({ estado }: { estado: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; className: string }> = {
    pendiente: { label: t.viabilidad.val_pendiente, className: "bg-slate-500/15 text-slate-600" },
    aprobada: { label: t.viabilidad.val_aprobada, className: "bg-emerald-500/15 text-emerald-600" },
    rechazada: { label: t.viabilidad.val_rechazada, className: "bg-red-500/15 text-red-600" },
  };
  const cfg = map[estado] ?? { label: estado, className: "" };
  return (
    <Badge variant="outline" className={cn("border-transparent text-[10px]", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

export interface ObligacionesProps {
  revision: RevisionViabilidadDetalle;
  isAdmin: boolean;
  meEmpleadoId: number | null;
  pendientes: EvidenciaPendiente[];
  /** Qué sección renderizar (por defecto, ambas). */
  seccion?: "acciones" | "validaciones" | "todas";
}

export function ViabilidadObligaciones({
  revision,
  isAdmin,
  meEmpleadoId,
  pendientes,
  seccion = "todas",
}: ObligacionesProps) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { toast } = useToast();
  const { data: empleados } = useEmpleados();

  const resolverAccion = useResolverAccionViabilidad();
  const resolverValidacion = useResolverValidacionViabilidad();
  const asignarResponsable = useAsignarResponsableAccionViabilidad(revision.id_revision_viabilidad);
  const asignarEspecialista = useAsignarEspecialistaViabilidad(revision.id_revision_viabilidad);

  const [pendiente, setPendiente] = useState<Pendiente>(null);
  const [obs, setObs] = useState("");

  const enResolucion = revision.estado === "evaluada";
  const nombre = (id: number | null) =>
    empleados?.find((e) => e.id_empleado === id)?.nombre ?? tv.unassigned;

  const abrir = (p: Pendiente) => {
    setPendiente(p);
    setObs("");
  };

  const confirmar = async () => {
    if (!pendiente) return;
    try {
      if (pendiente.tipo === "accion") {
        await resolverAccion.mutateAsync({
          accionId: pendiente.id,
          estado: pendiente.estado,
          observaciones: obs || null,
        });
      } else {
        await resolverValidacion.mutateAsync({
          validacionId: pendiente.id,
          estado: pendiente.estado as "aprobada" | "rechazada",
          observaciones: obs || null,
        });
      }
      toast({ title: tv.saved });
      setPendiente(null);
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const asignarResp = async (accionId: number, empleadoId: number) => {
    try {
      await asignarResponsable.mutateAsync({ accionId, empleadoId });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const asignarEsp = async (validacionId: number, empleadoId: number) => {
    try {
      await asignarEspecialista.mutateAsync({ validacionId, empleadoId });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: (e as Error).message });
    }
  };

  const acciones = revision.viabilidad_acciones ?? [];
  const validaciones = revision.viabilidad_validaciones ?? [];

  const dialogAbierto = pendiente != null;

  const mostrarAcciones = seccion === "acciones" || seccion === "todas";
  const mostrarValidaciones = seccion === "validaciones" || seccion === "todas";

  return (
    <div className="space-y-6">
      {/* ── Acciones correctivas ── */}
      {mostrarAcciones && (
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {tv.actions_title}
        </h3>
        {acciones.length === 0 && (
          <p className="text-xs text-muted-foreground">{tv.actions_empty}</p>
        )}
        {acciones.map((a: ViabilidadAccion) => {
          const soyResponsable = a.responsable_empleado_id === meEmpleadoId;
          const puedeEditar = enResolucion && (isAdmin || soyResponsable);
          const evidenciasAccion = (revision.viabilidad_evidencias ?? []).filter(
            (e) => e.accion_id === a.id_accion_viabilidad
          );
          const pendientesAccion = pendientes.filter((p) => p.accionId === a.id_accion_viabilidad);
          return (
            <Card key={a.id_accion_viabilidad} className="border-border bg-card">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{a.descripcion}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {tv.responsible}: {nombre(a.responsable_empleado_id)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.obligatoria && (
                      <Badge variant="outline" className="text-[10px]">
                        {tv.obligation}
                      </Badge>
                    )}
                    <EstadoAccionBadge estado={a.estado} />
                  </div>
                </div>

                {a.observaciones && (
                  <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                    {a.observaciones}
                  </p>
                )}

                {enResolucion && isAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{tv.assign}:</span>
                    <Select
                      value={a.responsable_empleado_id ? String(a.responsable_empleado_id) : ""}
                      onValueChange={(v) => asignarResp(a.id_accion_viabilidad, Number(v))}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <SelectValue placeholder={tv.unassigned} />
                      </SelectTrigger>
                      <SelectContent>
                        {(empleados ?? []).map((e) => (
                          <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>
                            {e.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <EvidenciaPanel
                  revisionId={revision.id_revision_viabilidad}
                  proyectoId={revision.proyecto_id}
                  enlace={{ accionId: a.id_accion_viabilidad }}
                  evidencias={evidenciasAccion}
                  pendientes={pendientesAccion}
                  canAttach={puedeEditar}
                  isAdmin={isAdmin}
                />

                {puedeEditar && !dialogAbierto && (
                  <div className="flex flex-wrap gap-2">
                    {a.estado !== "en_progreso" && a.estado !== "completada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrir({ tipo: "accion", id: a.id_accion_viabilidad, estado: "en_progreso" })}
                      >
                        {tv.action_en_progreso}
                      </Button>
                    )}
                    {a.estado !== "completada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrir({ tipo: "accion", id: a.id_accion_viabilidad, estado: "completada" })}
                      >
                        {tv.mark_completed}
                      </Button>
                    )}
                    {isAdmin && a.estado !== "validada" && (
                      <Button
                        size="sm"
                        onClick={() => abrir({ tipo: "accion", id: a.id_accion_viabilidad, estado: "validada" })}
                      >
                        {tv.mark_validated}
                      </Button>
                    )}
                    {isAdmin && a.estado !== "rechazada" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => abrir({ tipo: "accion", id: a.id_accion_viabilidad, estado: "rechazada" })}
                      >
                        {tv.mark_rejected}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
      )}

      {/* ── Validaciones de especialista ── */}
      {mostrarValidaciones && (
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {tv.validations_title}
        </h3>
        {validaciones.length === 0 && (
          <p className="text-xs text-muted-foreground">{tv.validations_empty}</p>
        )}
        {validaciones.map((v: ViabilidadValidacion) => {
          const soyEspecialista = v.especialista_empleado_id === meEmpleadoId;
          const puedeResolver = enResolucion && (isAdmin || soyEspecialista);
          const evidenciasVal = (revision.viabilidad_evidencias ?? []).filter(
            (e) => e.validacion_id === v.id_validacion_viabilidad
          );
          const pendientesVal = pendientes.filter((p) => p.validacionId === v.id_validacion_viabilidad);
          const tipoLabel = (tv as Record<string, string>)[`val_${v.tipo}`] ?? v.tipo;
          return (
            <Card key={v.id_validacion_viabilidad} className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span>{tipoLabel}</span>
                  <EstadoValidacionBadge estado={v.estado} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  {tv.specialist}: {nombre(v.especialista_empleado_id)}
                </p>

                {v.observaciones && (
                  <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                    {v.observaciones}
                  </p>
                )}

                {enResolucion && isAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{tv.assign}:</span>
                    <Select
                      value={v.especialista_empleado_id ? String(v.especialista_empleado_id) : ""}
                      onValueChange={(val) => asignarEsp(v.id_validacion_viabilidad, Number(val))}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <SelectValue placeholder={tv.unassigned} />
                      </SelectTrigger>
                      <SelectContent>
                        {(empleados ?? []).map((e) => (
                          <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>
                            {e.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <EvidenciaPanel
                  revisionId={revision.id_revision_viabilidad}
                  proyectoId={revision.proyecto_id}
                  enlace={{ validacionId: v.id_validacion_viabilidad }}
                  evidencias={evidenciasVal}
                  pendientes={pendientesVal}
                  canAttach={puedeResolver}
                  isAdmin={isAdmin}
                />

                {puedeResolver && !dialogAbierto && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => abrir({ tipo: "validacion", id: v.id_validacion_viabilidad, estado: "aprobada" })}
                    >
                      {tv.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => abrir({ tipo: "validacion", id: v.id_validacion_viabilidad, estado: "rechazada" })}
                    >
                      {tv.reject}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
      )}

      {/* ── Confirmación de resolución ── */}
      {dialogAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-sm">
                {pendiente!.tipo === "accion"
                  ? `${tv.actions_title} — ${(pendiente!.estado)}`
                  : `${tv.validations_title} — ${(pendiente!.estado)}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder={tv.observations}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPendiente(null)}>
                  {t.common.cancel}
                </Button>
                <Button
                  size="sm"
                  onClick={confirmar}
                  disabled={resolverAccion.isPending || resolverValidacion.isPending}
                >
                  {(resolverAccion.isPending || resolverValidacion.isPending) && (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  )}
                  {t.common.confirm}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
