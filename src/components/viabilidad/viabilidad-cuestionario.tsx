"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";
import { useToast } from "@/hooks/use-toast";
import {
  evidenciaRequerida,
  preguntaVisible,
  preguntaRequerida,
  respuestaActiva,
  type PreguntaViabilidadDetalle,
  type PlantillaViabilidadDetalle,
  type RevisionViabilidadDetalle,
  type TipoRespuestaViabilidad,
} from "@/lib/data/viabilidad";
import { useGuardarRespuestaViabilidad } from "@/hooks/queries/use-viabilidad";
import type { EvidenciaPendiente } from "@/lib/offline/db";
import { EvidenciaPanel } from "@/components/viabilidad/viabilidad-evidencia-panel";

function toText(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor;
  return String(valor);
}

function PreguntaInput({
  pregunta,
  valorActual,
  disabled,
  onCommit,
}: {
  pregunta: PreguntaViabilidadDetalle;
  valorActual: unknown;
  disabled: boolean;
  onCommit: (valor: unknown) => void;
}) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const tipo = pregunta.tipo_respuesta as TipoRespuestaViabilidad;
  const [draft, setDraft] = useState(() => toText(valorActual));

  const opciones = pregunta.viabilidad_opciones ?? [];

  if (tipo === "booleano") {
    const val = valorActual === true ? "true" : valorActual === false ? "false" : "";
    return (
      <RadioGroup
        value={val}
        onValueChange={(v) => onCommit(v === "true")}
        disabled={disabled}
        className="flex gap-4"
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="true" /> {tv.yes}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="false" /> {tv.no}
        </label>
      </RadioGroup>
    );
  }

  if (tipo === "opcion_unica") {
    return (
      <RadioGroup
        value={typeof valorActual === "string" ? valorActual : ""}
        onValueChange={(v) => onCommit(v)}
        disabled={disabled}
        className="space-y-2"
      >
        {opciones.map((o) => (
          <label key={o.id_opcion_viabilidad} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={o.valor} /> {o.etiqueta}
          </label>
        ))}
      </RadioGroup>
    );
  }

  if (tipo === "opcion_multiple") {
    const actuales = Array.isArray(valorActual) ? (valorActual as unknown[]).map(String) : [];
    const toggle = (v: string) => {
      const set = new Set(actuales);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      onCommit(Array.from(set));
    };
    return (
      <div className="space-y-2">
        {opciones.map((o) => (
          <label key={o.id_opcion_viabilidad} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={actuales.includes(o.valor)}
              disabled={disabled}
              onCheckedChange={() => toggle(o.valor)}
            />
            {o.etiqueta}
          </label>
        ))}
      </div>
    );
  }

  if (tipo === "texto") {
    return (
      <Textarea
        value={draft}
        disabled={disabled}
        placeholder={tv.text_placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== toText(valorActual)) onCommit(draft);
        }}
      />
    );
  }

  // numero / fecha
  return (
    <Input
      type={tipo === "fecha" ? "date" : "number"}
      value={draft}
      disabled={disabled}
      placeholder={tipo === "fecha" ? tv.date_placeholder : tv.number_placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === toText(valorActual)) return;
        if (draft === "") onCommit(null);
        else onCommit(tipo === "numero" ? Number(draft) : draft);
      }}
    />
  );
}

export interface CuestionarioProps {
  revision: RevisionViabilidadDetalle;
  plantilla: PlantillaViabilidadDetalle;
  canEdit: boolean;
  isAdmin: boolean;
  pendientes: EvidenciaPendiente[];
}

export function ViabilidadCuestionario({
  revision,
  plantilla,
  canEdit,
  isAdmin,
  pendientes,
}: CuestionarioProps) {
  const { t } = useI18n();
  const tv = t.viabilidad;
  const { toast } = useToast();
  const qc = useQueryClient();

  const guardar = useGuardarRespuestaViabilidad(revision.id_revision_viabilidad);

  const respuestasMap = useMemo(() => {
    const m = new Map<number, RevisionViabilidadDetalle["viabilidad_respuestas"][number]>();
    for (const r of revision.viabilidad_respuestas ?? []) m.set(r.pregunta_id, r);
    return m;
  }, [revision.viabilidad_respuestas]);

  const valorOrigen = (id: number) => respuestasMap.get(id)?.valor;

  const valorPorCodigo = (codigo: string): unknown => {
    for (const s of plantilla.viabilidad_secciones ?? []) {
      for (const p of s.viabilidad_preguntas ?? []) {
        if (p.codigo === codigo) return valorOrigen(p.id_pregunta_viabilidad);
      }
    }
    return undefined;
  };

  const guardarRespuesta = (preguntaId: number, valor: unknown) => {
    const version = respuestasMap.get(preguntaId)?.version ?? null;
    guardar.mutate(
      { preguntaId, valor, version },
      {
        onError: (e) =>
          toast({ variant: "destructive", title: tv.save_error, description: e.message }),
        onSuccess: (res) => {
          if (res?.encolada) toast({ title: tv.saved_offline });
        },
        onSettled: () => {
          qc.invalidateQueries({ queryKey: qk.viabilidadRevision(revision.id_revision_viabilidad) });
        },
      }
    );
  };

  const secciones = plantilla.viabilidad_secciones ?? [];

  // Progreso sobre preguntas visibles (excluye evidencia, que se cuenta aparte).
  let visibles = 0;
  let respondidas = 0;
  for (const s of secciones) {
    for (const p of s.viabilidad_preguntas ?? []) {
      if (!p.activa || !preguntaVisible(p, valorOrigen)) continue;
      visibles += 1;
      if (respuestaActiva(valorOrigen(p.id_pregunta_viabilidad), p.tipo_respuesta as TipoRespuestaViabilidad))
        respondidas += 1;
    }
  }

  const pct = visibles > 0 ? Math.round((respondidas / visibles) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 -mx-1 rounded-lg border border-border bg-background/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {tv.progress}: {respondidas}/{visibles} {tv.answered}
          </span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5" />
      </div>

      {secciones.map((s) => {
        const preguntas = (s.viabilidad_preguntas ?? []).filter(
          (p) => p.activa && preguntaVisible(p, valorOrigen)
        );
        if (preguntas.length === 0) return null;
        return (
          <Card key={s.id_seccion_viabilidad} className="border-border bg-card">
            <CardContent className="space-y-4 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {s.titulo}
              </h3>
              <div className="space-y-5">
                {preguntas.map((p) => {
                  const requerida = preguntaRequerida(
                    p,
                    p.obligatoria,
                    valorOrigen
                  );
                  const valor = valorOrigen(p.id_pregunta_viabilidad);
                  const activa = respuestaActiva(
                    valor,
                    p.tipo_respuesta as TipoRespuestaViabilidad
                  );
                  const tipo = p.tipo_respuesta as TipoRespuestaViabilidad;
                  const respuesta = respuestasMap.get(p.id_pregunta_viabilidad);

                  const respaldaEvidencia = tipo === "evidencia" || !!p.evidencia_tipo;
                  const requiereEvidencia =
                    tipo !== "evidencia" && evidenciaRequerida(p, valorPorCodigo);

                  const evidenciasDelServidor = (revision.viabilidad_evidencias ?? []).filter(
                    (e) => e.respuesta_id === respuesta?.id_respuesta_viabilidad
                  );
                  const pendientesPregunta = pendientes.filter(
                    (pe) => pe.preguntaId === p.id_pregunta_viabilidad
                  );
                  const tieneEvidencia =
                    evidenciasDelServidor.length + pendientesPregunta.length > 0;

                  return (
                    <div key={p.id_pregunta_viabilidad} className="space-y-2">
                      <div className="flex items-start gap-2">
                        {respaldaEvidencia ? (
                          tieneEvidencia ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )
                        ) : activa ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-foreground">
                            {p.texto}
                            {p.unidad && (
                              <span className="ml-1 text-muted-foreground">({p.unidad})</span>
                            )}
                            {requerida && <span className="ml-1 text-destructive">*</span>}
                          </Label>
                          {p.ayuda && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{p.ayuda}</p>
                          )}
                        </div>
                        {requerida && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {tv.question_required}
                          </Badge>
                        )}
                        {requiereEvidencia && !tieneEvidencia && (
                          <Badge variant="outline" className="shrink-0 text-[10px] text-destructive">
                            {tv.evidence_required_short}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 pl-6">
                        {tipo !== "evidencia" && (
                          <PreguntaInput
                            pregunta={p}
                            valorActual={valor}
                            disabled={!canEdit}
                            onCommit={(v) => guardarRespuesta(p.id_pregunta_viabilidad, v)}
                          />
                        )}
                        {respaldaEvidencia && (
                          <EvidenciaPanel
                            revisionId={revision.id_revision_viabilidad}
                            proyectoId={revision.proyecto_id}
                            enlace={{ preguntaId: p.id_pregunta_viabilidad }}
                            evidencias={evidenciasDelServidor}
                            pendientes={pendientesPregunta}
                            canAttach={canEdit}
                            isAdmin={isAdmin}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {guardar.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.common.loading}
        </div>
      )}
    </div>
  );
}
