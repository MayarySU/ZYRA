"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  Archive,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { PlantillaEstadoBadge } from "@/components/viabilidad/badges";
import { ReglaEditor } from "./regla-editor";
import {
  ACCIONES_CONDICION,
  OPERADORES_CONDICION,
  TIPOS_RESPUESTA,
  esEditable,
} from "./plantillas-utils";
import {
  usePlantillaViabilidad,
  useActualizarPlantillaViabilidad,
  useCrearVersionPlantillaViabilidad,
  useValidarPlantillaViabilidad,
  usePublicarPlantillaViabilidad,
  useArchivarPlantillaViabilidad,
  useCrearSeccionViabilidad,
  useActualizarSeccionViabilidad,
  useEliminarSeccionViabilidad,
  useCrearPreguntaViabilidad,
  useActualizarPreguntaViabilidad,
  useEliminarPreguntaViabilidad,
  useCrearOpcionViabilidad,
  useActualizarOpcionViabilidad,
  useEliminarOpcionViabilidad,
  useCrearCondicionViabilidad,
  useEliminarCondicionViabilidad,
} from "@/hooks/queries/use-viabilidad";
import type {
  SeccionViabilidadDetalle,
  PreguntaViabilidadDetalle,
  ViabilidadOpcion,
  ViabilidadCondicion,
  TipoRespuestaViabilidad,
} from "@/lib/data/viabilidad";
import type { Tablas } from "@/lib/data/util";
import type { ResultadoValidarPlantilla } from "@/lib/data/rpc";

interface SecForm {
  id?: number;
  titulo: string;
  descripcion: string;
  codigo: string;
}
interface PregForm {
  id?: number;
  seccionId: number;
  codigo: string;
  texto: string;
  ayuda: string;
  tipo: TipoRespuestaViabilidad;
  obligatoria: boolean;
  activa: boolean;
  regla: unknown;
}
interface OpcForm {
  id?: number;
  preguntaId: number;
  valor: string;
  etiqueta: string;
  regla: unknown;
}
interface CondForm {
  preguntaId: number;
  origenId: number | null;
  operador: string;
  valor: string;
  accion: string;
}

function mover<T>(items: T[], index: number, dir: -1 | 1): T[] | null {
  const j = index + dir;
  if (j < 0 || j >= items.length) return null;
  const copia = items.slice();
  const tmp = copia[index];
  copia[index] = copia[j];
  copia[j] = tmp;
  return copia;
}

export function PlantillaEditor({ plantillaId }: { plantillaId: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;

  const { data: plantilla, isLoading, error } = usePlantillaViabilidad(plantillaId);

  const actualizarPlantilla = useActualizarPlantillaViabilidad();
  const crearVersion = useCrearVersionPlantillaViabilidad();
  const validar = useValidarPlantillaViabilidad();
  const publicar = usePublicarPlantillaViabilidad();
  const archivar = useArchivarPlantillaViabilidad();

  const crearSeccion = useCrearSeccionViabilidad(plantillaId);
  const actualizarSeccion = useActualizarSeccionViabilidad(plantillaId);
  const eliminarSeccion = useEliminarSeccionViabilidad(plantillaId);
  const crearPregunta = useCrearPreguntaViabilidad(plantillaId);
  const actualizarPregunta = useActualizarPreguntaViabilidad(plantillaId);
  const eliminarPregunta = useEliminarPreguntaViabilidad(plantillaId);
  const crearOpcion = useCrearOpcionViabilidad(plantillaId);
  const actualizarOpcion = useActualizarOpcionViabilidad(plantillaId);
  const eliminarOpcion = useEliminarOpcionViabilidad(plantillaId);
  const crearCondicion = useCrearCondicionViabilidad(plantillaId);
  const eliminarCondicion = useEliminarCondicionViabilidad(plantillaId);

  const [secForm, setSecForm] = useState<SecForm | null>(null);
  const [pregForm, setPregForm] = useState<PregForm | null>(null);
  const [opcForm, setOpcForm] = useState<OpcForm | null>(null);
  const [condForm, setCondForm] = useState<CondForm | null>(null);
  const [editableNombre, setEditableNombre] = useState<string | null>(null);
  const [errores, setErrores] = useState<ResultadoValidarPlantilla | null>(null);

  const secciones = useMemo(
    () => plantilla?.viabilidad_secciones ?? [],
    [plantilla]
  );
  const editable = plantilla ? esEditable(plantilla.estado) : false;

  const todasPreguntas = useMemo(
    () => secciones.flatMap((s) => s.viabilidad_preguntas),
    [secciones]
  );
  const todasCondiciones = useMemo(
    () => todasPreguntas.flatMap((p) => p.condiciones ?? []),
    [todasPreguntas]
  );

  function opcionEnUso(op: ViabilidadOpcion): boolean {
    return todasCondiciones.some(
      (c) =>
        c.pregunta_origen_id === op.pregunta_id &&
        (c.valor ?? "")
          .split(",")
          .map((x) => x.trim())
          .includes(op.valor)
    );
  }

  function preguntaReferenciada(p: PreguntaViabilidadDetalle): boolean {
    return todasCondiciones.some((c) => c.pregunta_origen_id === p.id_pregunta_viabilidad);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !plantilla) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {ta.title}
      </div>
    );
  }

  const servicioTipo =
    (plantilla as unknown as { servicios?: { tipo?: string } | null }).servicios?.tipo ??
    `#${plantilla.servicio_id}`;
  const etapaLabel =
    plantilla.tipo_etapa === "previabilidad"
      ? t.viabilidad.stage_previabilidad
      : t.viabilidad.stage_ingenieria;

  async function guardarSeccion() {
    if (!secForm) return;
    if (!secForm.titulo.trim()) return;
    try {
      if (secForm.id) {
        await actualizarSeccion.mutateAsync({
          id: secForm.id,
          patch: {
            titulo: secForm.titulo,
            descripcion: secForm.descripcion || null,
            codigo: secForm.codigo || null,
          },
        });
      } else {
        const orden = secciones.length + 1;
        await crearSeccion.mutateAsync({
          plantilla_id: plantillaId,
          orden,
          titulo: secForm.titulo,
          descripcion: secForm.descripcion || null,
          codigo: secForm.codigo || null,
        });
      }
      setSecForm(null);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function guardarPregunta() {
    if (!pregForm) return;
    if (!pregForm.codigo.trim() || !pregForm.texto.trim()) return;
    try {
      if (pregForm.id) {
        await actualizarPregunta.mutateAsync({
          id: pregForm.id,
          patch: {
            codigo: pregForm.codigo,
            texto: pregForm.texto,
            ayuda: pregForm.ayuda || null,
            tipo_respuesta: pregForm.tipo,
            obligatoria: pregForm.obligatoria,
            activa: pregForm.activa,
            regla_evaluacion:
              pregForm.regla as Tablas["viabilidad_preguntas"]["Update"]["regla_evaluacion"],
          },
        });
      } else {
        const seccion = secciones.find(
          (s) => s.id_seccion_viabilidad === pregForm.seccionId
        );
        const orden = (seccion?.viabilidad_preguntas.length ?? 0) + 1;
        await crearPregunta.mutateAsync({
          seccion_id: pregForm.seccionId,
          orden,
          codigo: pregForm.codigo,
          texto: pregForm.texto,
          ayuda: pregForm.ayuda || null,
          tipo_respuesta: pregForm.tipo,
          obligatoria: pregForm.obligatoria,
          activa: pregForm.activa,
          regla_evaluacion:
            pregForm.regla as Tablas["viabilidad_preguntas"]["Insert"]["regla_evaluacion"],
        });
      }
      setPregForm(null);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function guardarOpcion() {
    if (!opcForm) return;
    if (!opcForm.valor.trim() || !opcForm.etiqueta.trim()) return;
    try {
      if (opcForm.id) {
        await actualizarOpcion.mutateAsync({
          id: opcForm.id,
          patch: {
            valor: opcForm.valor,
            etiqueta: opcForm.etiqueta,
            regla:
              opcForm.regla as Tablas["viabilidad_opciones"]["Update"]["regla"],
          },
        });
      } else {
        const pregunta = todasPreguntas.find(
          (p) => p.id_pregunta_viabilidad === opcForm.preguntaId
        );
        const orden = (pregunta?.viabilidad_opciones.length ?? 0) + 1;
        await crearOpcion.mutateAsync({
          pregunta_id: opcForm.preguntaId,
          orden,
          valor: opcForm.valor,
          etiqueta: opcForm.etiqueta,
          regla: opcForm.regla as Tablas["viabilidad_opciones"]["Insert"]["regla"],
        });
      }
      setOpcForm(null);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function guardarCondicion() {
    if (!condForm || condForm.origenId == null) return;
    try {
      await crearCondicion.mutateAsync({
        pregunta_id: condForm.preguntaId,
        pregunta_origen_id: condForm.origenId,
        operador: condForm.operador,
        valor: condForm.valor || null,
        accion: condForm.accion,
      });
      setCondForm(null);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function accionValidar(): Promise<boolean> {
    try {
      const res = await validar.mutateAsync(plantillaId);
      setErrores(res);
      if (res.ok) toast({ title: ta.validate_ok });
      else toast({ variant: "destructive", title: ta.validate_failed });
      return res.ok;
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
      return false;
    }
  }

  async function accionPublicar() {
    try {
      await publicar.mutateAsync(plantillaId);
      setErrores(null);
      toast({ title: ta.publish_ok });
    } catch (e) {
      const msg = String((e as Error).message);
      toast({ variant: "destructive", title: ta.validate_failed, description: msg });
      const res = await validar.mutateAsync(plantillaId).catch(() => null);
      if (res) setErrores(res);
    }
  }

  async function accionArchivar() {
    try {
      await archivar.mutateAsync(plantillaId);
      toast({ title: ta.archive_ok });
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function accionCrearVersion() {
    try {
      const res = await crearVersion.mutateAsync(plantillaId);
      toast({ title: ta.clone_ok });
      router.push(`/settings/viabilidad/plantillas/${res.id_plantilla_viabilidad}`);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function accionRenombrar() {
    if (editableNombre == null) return;
    try {
      await actualizarPlantilla.mutateAsync({
        id: plantillaId,
        patch: { nombre: editableNombre },
      });
      setEditableNombre(null);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  function eliminarSeccionSegura(id: number) {
    if (!confirm(ta.delete_section + "?")) return;
    eliminarSeccion.mutate(id, {
      onError: (e) => toast({ variant: "destructive", title: String(e.message) }),
    });
  }
  function eliminarPreguntaSegura(p: PreguntaViabilidadDetalle) {
    if (preguntaReferenciada(p)) {
      toast({ variant: "destructive", title: ta.dependency_blocked });
      return;
    }
    if (!confirm(ta.delete_question + "?")) return;
    eliminarPregunta.mutate(p.id_pregunta_viabilidad, {
      onError: (e) => toast({ variant: "destructive", title: String(e.message) }),
    });
  }
  function eliminarOpcionSegura(op: ViabilidadOpcion) {
    if (opcionEnUso(op)) {
      toast({ variant: "destructive", title: ta.option_in_use });
      return;
    }
    eliminarOpcion.mutate(op.id_opcion_viabilidad, {
      onError: (e) => toast({ variant: "destructive", title: String(e.message) }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings/viabilidad/plantillas">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {ta.back_to_list}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>
                {editableNombre != null ? (
                  <span className="flex items-center gap-2">
                    <Input
                      value={editableNombre}
                      onChange={(e) => setEditableNombre(e.target.value)}
                      className="h-8 w-64"
                    />
                    <Button size="sm" onClick={accionRenombrar}>
                      {ta.save_name}
                    </Button>
                  </span>
                ) : (
                  plantilla.nombre
                )}
              </CardTitle>
              <PlantillaEstadoBadge estado={plantilla.estado} />
              <span className="text-sm text-muted-foreground">
                {servicioTipo} Â· {etapaLabel} Â· {ta.version} {plantilla.version}
              </span>
            </div>
            {!editable && (
              <p className="text-sm text-amber-600">
                {plantilla.estado === "archivada"
                  ? ta.readonly_archived
                  : ta.readonly_published}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editable && (
              <Button variant="outline" size="sm" onClick={() => setEditableNombre(plantilla.nombre)}>
                <Pencil className="mr-1 h-4 w-4" />
                {ta.rename}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={accionValidar}>
              {ta.validate}
            </Button>
            <Button variant="outline" size="sm" onClick={accionCrearVersion}>
              <Copy className="mr-1 h-4 w-4" />
              {ta.create_version}
            </Button>
            {editable && (
              <Button size="sm" onClick={accionPublicar}>
                <Send className="mr-1 h-4 w-4" />
                {ta.publish}
              </Button>
            )}
            {plantilla.estado === "activa" && (
              <Button variant="outline" size="sm" onClick={accionArchivar}>
                <Archive className="mr-1 h-4 w-4" />
                {ta.archive}
              </Button>
            )}
          </div>
        </CardHeader>

        {errores && !errores.ok && (
          <CardContent>
            <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-600">
                <XCircle className="h-4 w-4" />
                {ta.validation_errors_title}
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-red-600">
                {errores.errores.map((e, i) => (
                  <li key={i}>
                    {e.ref ? `[${e.ref}] ` : ""}
                    {e.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        )}
        {errores?.ok && (
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {ta.validate_ok}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ta.sections}</h2>
        {editable && (
          <Button
            size="sm"
            onClick={() =>
              setSecForm({ titulo: "", descripcion: "", codigo: "" })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            {ta.add_section}
          </Button>
        )}
      </div>

      {secciones.length === 0 && (
        <p className="text-sm text-muted-foreground">{ta.sections_empty}</p>
      )}

      {secciones.map((seccion, i) => (
        <SeccionCard
          key={seccion.id_seccion_viabilidad}
          seccion={seccion}
          editable={editable}
          onMove={(dir) => {
            const nuevas = mover(secciones, i, dir);
            if (!nuevas) return;
            nuevas.forEach((s, idx) => {
              if (s.orden !== idx + 1)
                actualizarSeccion.mutate({
                  id: s.id_seccion_viabilidad,
                  patch: { orden: idx + 1 },
                });
            });
          }}
          onEdit={() =>
            setSecForm({
              id: seccion.id_seccion_viabilidad,
              titulo: seccion.titulo,
              descripcion: seccion.descripcion ?? "",
              codigo: seccion.codigo ?? "",
            })
          }
          onDelete={() => eliminarSeccionSegura(seccion.id_seccion_viabilidad)}
          onAddPregunta={() =>
            setPregForm({
              seccionId: seccion.id_seccion_viabilidad,
              codigo: "",
              texto: "",
              ayuda: "",
              tipo: "booleano",
              obligatoria: false,
              activa: true,
              regla: null,
            })
          }
          onEditPregunta={(p) =>
            setPregForm({
              id: p.id_pregunta_viabilidad,
              seccionId: seccion.id_seccion_viabilidad,
              codigo: p.codigo,
              texto: p.texto,
              ayuda: p.ayuda ?? "",
              tipo: p.tipo_respuesta as TipoRespuestaViabilidad,
              obligatoria: p.obligatoria,
              activa: p.activa,
              regla: p.regla_evaluacion ?? null,
            })
          }
          onDeletePregunta={eliminarPreguntaSegura}
          onMovePregunta={(pIdx, dir) => {
            const nuevas = mover(seccion.viabilidad_preguntas, pIdx, dir);
            if (!nuevas) return;
            nuevas.forEach((p, idx) => {
              if (p.orden !== idx + 1)
                actualizarPregunta.mutate({
                  id: p.id_pregunta_viabilidad,
                  patch: { orden: idx + 1 },
                });
            });
          }}
          onAddOpcion={(p) =>
            setOpcForm({ preguntaId: p.id_pregunta_viabilidad, valor: "", etiqueta: "", regla: null })
          }
          onEditOpcion={(p, op) =>
            setOpcForm({
              id: op.id_opcion_viabilidad,
              preguntaId: p.id_pregunta_viabilidad,
              valor: op.valor,
              etiqueta: op.etiqueta,
              regla: op.regla ?? null,
            })
          }
          onDeleteOpcion={eliminarOpcionSegura}
          onAddCondicion={(p) => {
            const candidatas = todasPreguntas.filter(
              (x) => x.id_pregunta_viabilidad !== p.id_pregunta_viabilidad
            );
            if (candidatas.length === 0) {
              toast({ variant: "destructive", title: ta.condition_no_source });
              return;
            }
            setCondForm({
              preguntaId: p.id_pregunta_viabilidad,
              origenId: candidatas[0].id_pregunta_viabilidad,
              operador: "=",
              valor: "",
              accion: "mostrar",
            });
          }}
          onDeleteCondicion={(c) =>
            eliminarCondicion.mutate(c.id_condicion_viabilidad, {
              onError: (e) => toast({ variant: "destructive", title: String(e.message) }),
            })
          }
          todasPreguntas={todasPreguntas}
        />
      ))}

      {/* Dialog secciÃ³n */}
      <Dialog open={secForm != null} onOpenChange={(o) => !o && setSecForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{secForm?.id ? ta.edit_section : ta.add_section}</DialogTitle>
          </DialogHeader>
          {secForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{ta.section_title}</Label>
                <Input
                  value={secForm.titulo}
                  onChange={(e) => setSecForm({ ...secForm, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{ta.section_description}</Label>
                <Textarea
                  value={secForm.descripcion}
                  onChange={(e) =>
                    setSecForm({ ...secForm, descripcion: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{ta.section_code}</Label>
                <Input
                  value={secForm.codigo}
                  onChange={(e) => setSecForm({ ...secForm, codigo: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecForm(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={guardarSeccion} disabled={!secForm?.titulo.trim()}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pregunta */}
      <Dialog open={pregForm != null} onOpenChange={(o) => !o && setPregForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pregForm?.id ? ta.edit_question : ta.add_question}</DialogTitle>
          </DialogHeader>
          {pregForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{ta.question_code}</Label>
                  <Input
                    value={pregForm.codigo}
                    onChange={(e) => setPregForm({ ...pregForm, codigo: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{ta.question_type}</Label>
                  <Select
                    value={pregForm.tipo}
                    onValueChange={(v) =>
                      setPregForm({ ...pregForm, tipo: v as TipoRespuestaViabilidad })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RESPUESTA.map((tp) => (
                        <SelectItem key={tp} value={tp}>
                          {tipoLabel(ta, tp)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{ta.question_text}</Label>
                <Textarea
                  value={pregForm.texto}
                  onChange={(e) => setPregForm({ ...pregForm, texto: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{ta.question_help}</Label>
                <Input
                  value={pregForm.ayuda}
                  onChange={(e) => setPregForm({ ...pregForm, ayuda: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pregForm.obligatoria}
                    onCheckedChange={(v) => setPregForm({ ...pregForm, obligatoria: v })}
                  />
                  <Label>{ta.question_required}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pregForm.activa}
                    onCheckedChange={(v) => setPregForm({ ...pregForm, activa: v })}
                  />
                  <Label>{ta.question_active}</Label>
                </div>
              </div>
              <Separator />
              <ReglaEditor
                kind="pregunta"
                value={pregForm.regla}
                onChange={(v) => setPregForm({ ...pregForm, regla: v })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPregForm(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={guardarPregunta}
              disabled={!pregForm?.codigo.trim() || !pregForm?.texto.trim()}
            >
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog opciÃ³n */}
      <Dialog open={opcForm != null} onOpenChange={(o) => !o && setOpcForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{opcForm?.id ? ta.edit_option : ta.add_option}</DialogTitle>
          </DialogHeader>
          {opcForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{ta.option_value}</Label>
                  <Input
                    value={opcForm.valor}
                    onChange={(e) => setOpcForm({ ...opcForm, valor: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{ta.option_label}</Label>
                  <Input
                    value={opcForm.etiqueta}
                    onChange={(e) => setOpcForm({ ...opcForm, etiqueta: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <ReglaEditor
                kind="opcion"
                value={opcForm.regla}
                onChange={(v) => setOpcForm({ ...opcForm, regla: v })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpcForm(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={guardarOpcion}
              disabled={!opcForm?.valor.trim() || !opcForm?.etiqueta.trim()}
            >
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog condiciÃ³n */}
      <CondicionDialog
        form={condForm}
        setForm={setCondForm}
        preguntas={todasPreguntas}
        onSave={guardarCondicion}
      />
    </div>
  );
}

function tipoLabel(
  ta: Record<string, string>,
  tipo: TipoRespuestaViabilidad
): string {
  const map: Record<TipoRespuestaViabilidad, string> = {
    booleano: ta.type_booleano,
    opcion_unica: ta.type_opcion_unica,
    opcion_multiple: ta.type_opcion_multiple,
    numero: ta.type_numero,
    texto: ta.type_texto,
    fecha: ta.type_fecha,
    evidencia: ta.type_evidencia,
  };
  return map[tipo];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SecciÃ³n + preguntas
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SeccionCard({
  seccion,
  editable,
  todasPreguntas,
  onMove,
  onEdit,
  onDelete,
  onAddPregunta,
  onEditPregunta,
  onDeletePregunta,
  onMovePregunta,
  onAddOpcion,
  onEditOpcion,
  onDeleteOpcion,
  onAddCondicion,
  onDeleteCondicion,
}: {
  seccion: SeccionViabilidadDetalle;
  editable: boolean;
  todasPreguntas: PreguntaViabilidadDetalle[];
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPregunta: () => void;
  onEditPregunta: (p: PreguntaViabilidadDetalle) => void;
  onDeletePregunta: (p: PreguntaViabilidadDetalle) => void;
  onMovePregunta: (idx: number, dir: -1 | 1) => void;
  onAddOpcion: (p: PreguntaViabilidadDetalle) => void;
  onEditOpcion: (p: PreguntaViabilidadDetalle, op: ViabilidadOpcion) => void;
  onDeleteOpcion: (op: ViabilidadOpcion) => void;
  onAddCondicion: (p: PreguntaViabilidadDetalle) => void;
  onDeleteCondicion: (c: ViabilidadCondicion) => void;
}) {
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{seccion.titulo}</CardTitle>
          {seccion.descripcion && (
            <p className="text-sm text-muted-foreground">{seccion.descripcion}</p>
          )}
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onMove(-1)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onMove(1)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t.common.edit} onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t.common.delete} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {seccion.viabilidad_preguntas.length === 0 && (
          <p className="text-sm text-muted-foreground">{ta.questions_empty}</p>
        )}
        {seccion.viabilidad_preguntas.map((p, idx) => (
          <PreguntaCard
            key={p.id_pregunta_viabilidad}
            pregunta={p}
            editable={editable}
            todasPreguntas={todasPreguntas}
            onMove={(dir) => onMovePregunta(idx, dir)}
            onEdit={() => onEditPregunta(p)}
            onDelete={() => onDeletePregunta(p)}
            onAddOpcion={() => onAddOpcion(p)}
            onEditOpcion={(op) => onEditOpcion(p, op)}
            onDeleteOpcion={onDeleteOpcion}
            onAddCondicion={() => onAddCondicion(p)}
            onDeleteCondicion={onDeleteCondicion}
          />
        ))}
        {editable && (
          <Button variant="outline" size="sm" onClick={onAddPregunta}>
            <Plus className="mr-1 h-4 w-4" />
            {ta.add_question}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PreguntaCard({
  pregunta,
  editable,
  todasPreguntas,
  onMove,
  onEdit,
  onDelete,
  onAddOpcion,
  onEditOpcion,
  onDeleteOpcion,
  onAddCondicion,
  onDeleteCondicion,
}: {
  pregunta: PreguntaViabilidadDetalle;
  editable: boolean;
  todasPreguntas: PreguntaViabilidadDetalle[];
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddOpcion: () => void;
  onEditOpcion: (op: ViabilidadOpcion) => void;
  onDeleteOpcion: (op: ViabilidadOpcion) => void;
  onAddCondicion: () => void;
  onDeleteCondicion: (c: ViabilidadCondicion) => void;
}) {
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;
  const esOpcion =
    pregunta.tipo_respuesta === "opcion_unica" ||
    pregunta.tipo_respuesta === "opcion_multiple";

  function nombrePregunta(id: number): string {
    return todasPreguntas.find((x) => x.id_pregunta_viabilidad === id)?.codigo ?? `#${id}`;
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{pregunta.codigo}</span>
            <span className="text-sm font-medium">{pregunta.texto}</span>
            {pregunta.obligatoria && (
              <span className="text-xs text-amber-600">*</span>
            )}
            {!pregunta.activa && (
              <span className="text-xs text-muted-foreground">(inactiva)</span>
            )}
          </div>
          {pregunta.ayuda && (
            <p className="text-xs text-muted-foreground">{pregunta.ayuda}</p>
          )}
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onMove(-1)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onMove(1)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t.common.edit} onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t.common.delete} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )}
      </div>

      {esOpcion && (
        <div className="mt-3 space-y-2 pl-2">
          <p className="text-xs font-medium text-muted-foreground">{ta.options}</p>
          {pregunta.viabilidad_opciones.length === 0 && (
            <p className="text-xs text-muted-foreground">{ta.options_empty}</p>
          )}
          {pregunta.viabilidad_opciones.map((op) => (
            <div
              key={op.id_opcion_viabilidad}
              className="flex items-center justify-between gap-2 rounded border px-2 py-1"
            >
              <span className="text-xs">
                <span className="font-mono text-muted-foreground">{op.valor}</span> Â·{" "}
                {op.etiqueta}
                {op.regla != null && (
                  <span className="ml-2 rounded bg-amber-500/10 px-1 text-amber-600">
                    {ta.rule_title}
                  </span>
                )}
              </span>
              {editable && (
                <span className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label={t.common.edit} onClick={() => onEditOpcion(op)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={t.common.delete} onClick={() => onDeleteOpcion(op)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </span>
              )}
            </div>
          ))}
          {editable && (
            <Button variant="outline" size="sm" onClick={onAddOpcion}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {ta.add_option}
            </Button>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2 pl-2">
        <p className="text-xs font-medium text-muted-foreground">{ta.conditions}</p>
        {(pregunta.condiciones ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">{ta.conditions_empty}</p>
        )}
        {(pregunta.condiciones ?? []).map((c) => (
          <div
            key={c.id_condicion_viabilidad}
            className="flex items-center justify-between gap-2 rounded border px-2 py-1"
          >
            <span className="text-xs">
              {nombrePregunta(c.pregunta_origen_id)} {c.operador} {c.valor} â†’{" "}
              {actionLabel(ta, c.accion)}
            </span>
            {editable && (
              <Button variant="ghost" size="icon" aria-label={t.common.delete} onClick={() => onDeleteCondicion(c)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            )}
          </div>
        ))}
        {editable && (
          <Button variant="outline" size="sm" onClick={onAddCondicion}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {ta.add_condition}
          </Button>
        )}
      </div>
    </div>
  );
}

function CondicionDialog({
  form,
  setForm,
  preguntas,
  onSave,
}: {
  form: CondForm | null;
  setForm: (f: CondForm | null) => void;
  preguntas: PreguntaViabilidadDetalle[];
  onSave: () => void;
}) {
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;

  const candidatas = preguntas.filter(
    (x) => form != null && x.id_pregunta_viabilidad !== form.preguntaId
  );
  const origen = candidatas.find((x) => x.id_pregunta_viabilidad === form?.origenId);
  const origenEsOpcion =
    origen != null &&
    (origen.tipo_respuesta === "opcion_unica" ||
      origen.tipo_respuesta === "opcion_multiple");

  return (
    <Dialog open={form != null} onOpenChange={(o) => !o && setForm(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ta.add_condition}</DialogTitle>
        </DialogHeader>
        {form && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{ta.condition_source}</Label>
              <Select
                value={String(form.origenId ?? "")}
                onValueChange={(v) => setForm({ ...form, origenId: Number(v), valor: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {candidatas.map((p) => (
                    <SelectItem
                      key={p.id_pregunta_viabilidad}
                      value={String(p.id_pregunta_viabilidad)}
                    >
                      {p.codigo} â€” {p.texto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{ta.condition_operator}</Label>
                <Select
                  value={form.operador}
                  onValueChange={(v) => setForm({ ...form, operador: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERADORES_CONDICION.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{ta.condition_value}</Label>
                {origenEsOpcion ? (
                  <Select
                    value={form.valor}
                    onValueChange={(v) => setForm({ ...form, valor: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={ta.condition_needs_option} />
                    </SelectTrigger>
                    <SelectContent>
                      {origen!.viabilidad_opciones.map((op) => (
                        <SelectItem key={op.id_opcion_viabilidad} value={op.valor}>
                          {op.etiqueta} ({op.valor})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{ta.condition_action}</Label>
              <Select
                value={form.accion}
                onValueChange={(v) => setForm({ ...form, accion: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCIONES_CONDICION.map((a) => (
                    <SelectItem key={a} value={a}>
                      {actionLabel(ta, a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setForm(null)}>
            {t.common.cancel}
          </Button>
          <Button onClick={onSave} disabled={form?.origenId == null}>
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function actionLabel(ta: Record<string, string>, accion: string): string {
  const map: Record<string, string> = {
    mostrar: ta.action_mostrar,
    ocultar: ta.action_ocultar,
    requerir: ta.action_requerir,
  };
  return map[accion] ?? accion;
}
