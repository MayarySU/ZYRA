"use client";

import DashboardLayout from "../dashboard/layout";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Camera,
  Loader2,
  Users,
  ClipboardList,
  Building2,
  Trash2,
  Settings2,
  CheckCircle2,
  Search
} from "lucide-react";
import Image from "next/image";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/components/providers/i18n-provider";
import { useRouter } from "next/navigation";
import {
  useProyectos,
  useCrearProyecto,
  useEliminarProyecto,
  useActualizarProyecto,
  useEquipos,
  useClientes,
  useServicios,
  useReportes,
  useChecklist,
  useDetalleChecklist,
  useActualizarDetalleChecklist,
  useIniciarProyecto,
  useEnviarReporte,
  useFinalizarProyecto,
  useAvanzarEstado,
} from "@/hooks/queries";
import type { ProyectoVista } from "@/lib/data/proyectos";
import type { ChecklistDetalleVista } from "@/lib/data/proyectos";
import { subirEvidencia as subirEvidenciaR2 } from "@/lib/evidencias-client";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";

// Estados canónicos (español snake_case) → etiqueta de UI usada por la tarjeta.
type DisplayStatus = "Pendiente" | "EnProceso" | "EnRevision" | "Finalizado" | "Rechazado" | "Cancelado";

function displayFromEstado(estado: string | null): DisplayStatus {
  switch (estado) {
    case "en_proceso":
      return "EnProceso";
    case "pendiente_de_cierre":
      return "EnRevision";
    case "finalizado":
      return "Finalizado";
    case "rechazado":
      return "Rechazado";
    case "cancelado":
      return "Cancelado";
    default:
      return "Pendiente";
  }
}

const PRE_START_STATES = ["borrador", "preparacion", "checklist_pendiente", "listo_para_iniciar"];

// Acciones de estado permitidas desde la UI del admin. Las transiciones
// críticas (iniciar, enviar a revisión, finalizar) se ejecutan con su RPC
// dedicada; el resto usa avanzar_estado. Nunca se escribe estado directo.
function accionesDesdeEstado(estado: string): { value: string; label: string }[] {
  const base = [{ value: "sin_cambio", label: "Sin cambios" }];
  switch (estado) {
    case "borrador":
      return [...base, { value: "preparacion", label: "Pasar a preparación" }, { value: "cancelado", label: "Cancelar" }];
    case "preparacion":
      return [...base, { value: "checklist_pendiente", label: "Pasar a checklist" }, { value: "borrador", label: "Volver a borrador" }, { value: "cancelado", label: "Cancelar" }];
    case "checklist_pendiente":
      return [...base, { value: "listo_para_iniciar", label: "Marcar listo para iniciar" }, { value: "preparacion", label: "Volver a preparación" }, { value: "cancelado", label: "Cancelar" }];
    case "listo_para_iniciar":
      return [...base, { value: "iniciar", label: "Iniciar proyecto" }, { value: "checklist_pendiente", label: "Volver a checklist" }, { value: "cancelado", label: "Cancelar" }];
    case "en_proceso":
      return [...base, { value: "enviar_reporte", label: "Enviar a revisión" }, { value: "cancelado", label: "Cancelar" }];
    case "pendiente_de_cierre":
      return [...base, { value: "finalizar", label: "Aprobar y finalizar" }, { value: "en_proceso", label: "Reabrir" }, { value: "cancelado", label: "Cancelar" }];
    case "rechazado":
      return [...base, { value: "en_proceso", label: "Reabrir" }, { value: "cancelado", label: "Cancelar" }];
    default:
      return base;
  }
}

interface ClienteJson {
  nombre?: string;
  direccion?: string;
}

export default function ProjectsPage() {
  const { profile, user, loading: isUserLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === "admin";

  const { data: proyectos = [], isLoading: loadingProjects } = useProyectos();
  const { data: equipos = [] } = useEquipos();
  const { data: clientes = [] } = useClientes();
  const { data: servicios = [] } = useServicios();
  const { data: reportes = [] } = useReportes();

  const crearProyecto = useCrearProyecto();
  const actualizarProyecto = useActualizarProyecto();
  const eliminarProyecto = useEliminarProyecto();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProyectoVista | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- Admin Project Management State ---
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [managedProject, setManagedProject] = useState<ProyectoVista | null>(null);
  const [managedAccion, setManagedAccion] = useState("sin_cambio");
  const [managedTeamId, setManagedTeamId] = useState("no-team");
  const [managedUbicacion, setManagedUbicacion] = useState("");
  const [savingManage, setSavingManage] = useState(false);

  // Hooks de ciclo de vida ligados al proyecto gestionado (RPC, no update directo).
  const iniciarManaged = useIniciarProyecto(managedProject?.id_proyecto ?? 0);
  const enviarManaged = useEnviarReporte(managedProject?.id_proyecto ?? 0);
  const finalizarManaged = useFinalizarProyecto(managedProject?.id_proyecto ?? 0);
  const avanzarManaged = useAvanzarEstado(managedProject?.id_proyecto ?? 0);

  const [newProject, setNewProject] = useState({
    nombreProyecto: "",
    clientId: "",
    serviceType: servicios[0]?.tipo || "Instalación",
    assignedTeamId: "no-team",
    addressType: "client" as "client" | "custom",
    customAddress: "",
    imageUrl: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2070&auto=format&fit=crop"
  });

  const isApiLoading = loadingProjects;

  const filteredProjects = useMemo(() => {
    return proyectos.filter((p) => {
      const clienteJson = (p.cliente as ClienteJson | null) || null;
      const matchesSearch =
        searchTerm === "" ||
        (p.nombre_proyecto || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        clienteJson?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const isStatusMatch = statusFilter === "all" || displayFromEstado(p.estado) === statusFilter;

      // Filtro de seguridad: Operativos solo ven sus proyectos
      let isTeamMatch = true;
      if (!isAdmin && profile?.empleadoId) {
        const equipo = equipos.find((e) => e.id_equipo === p.equipo_id);
        isTeamMatch = equipo?.empleado_equipo?.some((m) => m.empleado_id === profile.empleadoId) ?? false;
      }

      return matchesSearch && isStatusMatch && isTeamMatch;
    });
  }, [proyectos, searchTerm, statusFilter, isAdmin, profile, equipos]);

  // --- Handlers ---
  const handleCreateProject = async () => {
    if (!isAdmin || !user) return;
    try {
      const cliente = clientes.find((c) => c.id_cliente.toString() === newProject.clientId);
      const servicio = servicios.find((s) => s.tipo === newProject.serviceType);
      const ubicacion =
        newProject.addressType === "client" ? cliente?.direccion || "" : newProject.customAddress;

      await crearProyecto.mutateAsync({
        nombre_proyecto: newProject.nombreProyecto,
        cliente_id: newProject.clientId ? parseInt(newProject.clientId, 10) : null,
        servicio_id: servicio?.id_servicio ?? null,
        equipo_id: newProject.assignedTeamId === "no-team" ? null : parseInt(newProject.assignedTeamId, 10),
        ubicacion,
        imagen_url: newProject.imageUrl,
      });

      toast({ title: t.common.success, description: "Proyecto creado y checklist generado." });
      setIsCreateDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!isAdmin || !user) return;
    try {
      await eliminarProyecto.mutateAsync(projectId);
      toast({ title: t.common.success, description: t.common.delete });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  };

  const openManageDialog = (project: ProyectoVista) => {
    setManagedProject(project);
    setManagedAccion("sin_cambio");
    setManagedTeamId(project.equipo_id?.toString() || "no-team");
    setManagedUbicacion(project.ubicacion || "");
    setIsManageDialogOpen(true);
  };

  const handleSaveManagement = async () => {
    if (!user || !managedProject) return;
    setSavingManage(true);
    try {
      // Campos editables no críticos (permitidos por RLS para admin).
      await actualizarProyecto.mutateAsync({
        id: managedProject.id_proyecto!,
        patch: {
          equipo_id: managedTeamId === "no-team" ? null : parseInt(managedTeamId, 10),
          ubicacion: managedUbicacion || null,
        },
      });
      // Cambio de estado exclusivamente por RPC.
      if (managedAccion === "iniciar") {
        await iniciarManaged.mutateAsync();
      } else if (managedAccion === "enviar_reporte") {
        await enviarManaged.mutateAsync("Envío manual desde gestión (admin)");
      } else if (managedAccion === "finalizar") {
        await finalizarManaged.mutateAsync();
      } else if (managedAccion !== "sin_cambio") {
        await avanzarManaged.mutateAsync(managedAccion);
      }
      toast({ title: t.common.success });
      setIsManageDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSavingManage(false);
    }
  };

  if (isUserLoading || isApiLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{isAdmin ? t.projects.title_admin : t.projects.title_op}</h2>
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild><Button className="bg-accent text-white font-bold"><Plus className="h-4 w-4 mr-2" /> {t.projects.new_project}</Button></DialogTrigger>
              <DialogContent className="sm:max-w-xl bg-card border-border">
                <DialogHeader><DialogTitle>{t.projects.new_project}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground uppercase">NOMBRE</Label><Input value={newProject.nombreProyecto} onChange={(e) => setNewProject({ ...newProject, nombreProyecto: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground uppercase">CLIENTE</Label><Select value={newProject.clientId} onValueChange={(val) => setNewProject({ ...newProject, clientId: val })}><SelectTrigger><SelectValue placeholder="Selecciona Cliente" /></SelectTrigger><SelectContent>{clientes.map(c => <SelectItem key={c.id_cliente} value={c.id_cliente.toString()}>{c.nombre}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground uppercase">SERVICIO</Label><Select value={newProject.serviceType} onValueChange={(val) => setNewProject({ ...newProject, serviceType: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{servicios.length > 0 ? servicios.map(s => <SelectItem key={s.id_servicio} value={s.tipo}>{s.tipo}</SelectItem>) : (<><SelectItem value="Instalación">Instalación</SelectItem><SelectItem value="Mantenimiento">Mantenimiento</SelectItem></>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground uppercase">EQUIPO (EQ)</Label><Select value={newProject.assignedTeamId} onValueChange={(val) => setNewProject({ ...newProject, assignedTeamId: val })}><SelectTrigger><SelectValue placeholder="SIN EQUIPO ASIGNADO" /></SelectTrigger><SelectContent><SelectItem value="no-team">SIN EQUIPO ASIGNADO</SelectItem>{equipos.map(t => <SelectItem key={t.id_equipo} value={t.id_equipo.toString()}>{t.nombre_equipo}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">DIRECCIÓN DE OBRA</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={newProject.addressType === "client" ? "default" : "outline"}
                        className={newProject.addressType === "client" ? "bg-accent text-white" : "border-border text-muted-foreground"}
                        onClick={() => setNewProject({ ...newProject, addressType: "client" })}
                      >
                        Del Cliente
                      </Button>
                      <Button
                        variant={newProject.addressType === "custom" ? "default" : "outline"}
                        className={newProject.addressType === "custom" ? "bg-accent text-white" : "border-border text-muted-foreground"}
                        onClick={() => setNewProject({ ...newProject, addressType: "custom" })}
                      >
                        Personalizada
                      </Button>
                    </div>
                    {newProject.addressType === "client" ? (
                      <Input
                        disabled
                        placeholder="Selecciona un cliente para autocompletar"
                        value={newProject.clientId ? clientes.find((c) => c.id_cliente.toString() === newProject.clientId)?.direccion || "Sin dirección registrada" : ""}
                        className="bg-card/50"
                      />
                    ) : (
                      <Input
                        placeholder="Escribe la dirección exacta"
                        value={newProject.customAddress}
                        onChange={(e) => setNewProject({ ...newProject, customAddress: e.target.value })}
                      />
                    )}
                  </div>
                </div>
                <DialogFooter><Button className="w-full bg-accent text-white" onClick={handleCreateProject} disabled={crearProyecto.isPending}>{t.common.create}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="EnProceso">En Proceso</SelectItem><SelectItem value="EnRevision">Revisión</SelectItem><SelectItem value="Finalizado">Finalizado</SelectItem></SelectContent></Select>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const displayStatus = displayFromEstado(project.estado);
            const progressValue = displayStatus === "Finalizado" ? 100 : project.progreso || 0;
            const assignedTeam = equipos.find((e) => e.id_equipo === project.equipo_id);
            const clienteJson = (project.cliente as ClienteJson | null) || null;

            return (
              <Card key={project.id_proyecto} className="bg-card border-border overflow-hidden flex flex-col">
                <div className="h-32 relative">
                  <Image src={project.imagen_url || "https://picsum.photos/seed/solar/800/450"} alt="" fill className="object-cover opacity-80" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    {displayStatus === "Finalizado" && (
                      <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold tracking-wider">FINALIZADO</Badge>
                    )}
                    {isAdmin && (
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteProject(project.id_proyecto!)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg font-bold truncate">{project.nombre_proyecto}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.ubicacion}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {clienteJson?.nombre}</div>
                  <div className="text-xs text-accent font-bold flex items-center gap-1"><Users className="h-3 w-3" /> {assignedTeam?.nombre_equipo || "Sin Equipo"}</div>
                  {isAdmin && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {reportes.filter((r) => r.proyecto_id === project.id_proyecto).length} reportes</div>
                  )}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="text-foreground">{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-1.5 rounded-full" />
                  </div>
                </CardContent>
                <CardFooter className="p-0 border-t border-border">
                  {isAdmin ? (
                    <div className="grid grid-cols-2 w-full">
                      <Button variant="ghost" className="h-10 rounded-none border-r" onClick={() => openManageDialog(project)}><Settings2 className="h-4 w-4 mr-2" /> Gestionar</Button>
                      <Button variant="ghost" className="h-10 rounded-none" onClick={() => router.push(`/reports?projectId=${project.id_proyecto}`)}><ClipboardList className="h-4 w-4 mr-2" /> Reportes</Button>
                    </div>
                  ) : displayStatus === "Finalizado" ? (
                    <div className="w-full h-12 flex items-center justify-center gap-2 bg-muted/40 text-muted-foreground text-sm font-bold border-t border-border">
                      <CheckCircle2 className="h-4 w-4" /> Proyecto Cerrado
                    </div>
                  ) : displayStatus === "EnRevision" ? (
                    <Button disabled className="w-full h-10 rounded-none bg-yellow-600/50 text-white cursor-not-allowed">En Revisión</Button>
                  ) : (
                    <Sheet
                      open={isSheetOpen && selectedProject?.id_proyecto === project.id_proyecto}
                      onOpenChange={(o) => {
                        setIsSheetOpen(o);
                        if (o) setSelectedProject(project);
                      }}
                    >
                      <SheetTrigger asChild>
                        <Button className={cn("w-full h-10 rounded-none text-white",
                          displayStatus === "Rechazado" ? "bg-red-500" :
                            (displayStatus === "EnProceso" ? "bg-emerald-600" : "bg-accent")
                        )}>
                          {displayStatus === "Rechazado" ? "Corregir Reporte" :
                            (displayStatus === "EnProceso" ? "Reportar Avance" : "Iniciar Día")}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto w-full bg-card p-0">
                        {selectedProject?.id_proyecto === project.id_proyecto && (
                          <OperatorSheetBody
                            project={project}
                            estado={project.estado || "preparacion"}
                            onClose={() => setIsSheetOpen(false)}
                          />
                        )}
                      </SheetContent>
                    </Sheet>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader><DialogTitle>{managedProject?.nombre_proyecto}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">Acción sobre el estado</Label><Select value={managedAccion} onValueChange={setManagedAccion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{accionesDesdeEstado(managedProject?.estado || "preparacion").map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">Equipo</Label><Select value={managedTeamId} onValueChange={setManagedTeamId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no-team">Sin Equipo</SelectItem>{equipos.map(t => <SelectItem key={t.id_equipo} value={t.id_equipo.toString()}>{t.nombre_equipo}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">📍 Dirección de Obra</Label><Input placeholder="Ej. Av. Principal 123, Colonia..." value={managedUbicacion} onChange={(e) => setManagedUbicacion(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleSaveManagement} disabled={savingManage} className="w-full bg-accent text-white font-bold">{savingManage ? "Guardando..." : "Guardar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hoja de reporte/jornada del operador (usa hooks de checklist y RPC)
// ─────────────────────────────────────────────────────────────────────
function OperatorSheetBody({
  project,
  estado,
  onClose,
}: {
  project: ProyectoVista;
  estado: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { t } = useI18n();

  const pid = project.id_proyecto as number;
  const { data: checklist } = useChecklist(pid);
  const checklistId = checklist?.id_checklist ?? null;
  const { data: detalle = [] } = useDetalleChecklist(checklistId);

  const qc = useQueryClient();
  const actualizarDetalle = useActualizarDetalleChecklist();
  const iniciar = useIniciarProyecto(pid);
  const enviar = useEnviarReporte(pid);

  const esPreInicio = PRE_START_STATES.includes(estado);
  const esRechazado = estado === "rechazado";

  const [reportContent, setReportContent] = useState("");
  const [reportPhotos, setReportPhotos] = useState<{ name: string; dataUrl: string; file: File }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const materiales = detalle.map((d) => ({
    id: d.id_checklist_detalle as number,
    name: d.nombre_material || "Material",
    quantity: d.cantidad_requerida || 1,
    done: d.marcado ?? false,
    takenQuantity: d.cantidad_cargada ?? d.cantidad_requerida ?? 0,
  }));

  const accesoValido =
    materiales.length === 0 ||
    (materiales.every((m) => m.done) && materiales.every((m) => (m.takenQuantity || 0) >= m.quantity));

  // Actualización optimista: el checklist responde al instante y, si no hay
  // red, la mutación queda en cola (se sincroniza al reconectar sin duplicar).
  const optimizarDetalle = (id: number, patch: Partial<ChecklistDetalleVista>) => {
    qc.setQueryData<ChecklistDetalleVista[]>(qk.detalleChecklist(checklistId ?? 0), (old) =>
      old?.map((d) => (d.id_checklist_detalle === id ? { ...d, ...patch } : d))
    );
  };

  const toggleMaterial = (idx: number) => {
    const mat = materiales[idx];
    if (!mat) return;
    const nuevoDone = !mat.done;
    const patch = {
      marcado: nuevoDone,
      cantidad_cargada: nuevoDone ? mat.takenQuantity || mat.quantity : 0,
    };
    optimizarDetalle(mat.id, patch);
    actualizarDetalle.mutate(
      { id: mat.id, patch },
      { onError: (e) => toast({ variant: "destructive", title: "Error", description: e.message }) }
    );
  };

  const updateQuantity = (idx: number, qty: number) => {
    const mat = materiales[idx];
    if (!mat) return;
    const patch = { cantidad_cargada: qty, marcado: qty >= mat.quantity };
    optimizarDetalle(mat.id, patch);
    actualizarDetalle.mutate(
      { id: mat.id, patch },
      { onError: (e) => toast({ variant: "destructive", title: "Error", description: e.message }) }
    );
  };

  const handleStartDay = () => {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    iniciar.mutate(undefined, {
      onSuccess: () => {
        toast({ title: t.projects.day_started });
        onClose();
      },
      onError: (e) =>
        toast({ variant: "destructive", title: "Error al iniciar jornada", description: e.message }),
    });
    if (offline) {
      toast({ title: "Sin conexión", description: "La jornada se iniciará al reconectar." });
      onClose();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.src = ev.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.3);
          setReportPhotos((prev) => [...prev, { name: file.name, dataUrl, file }]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFinishDayAndReport = async () => {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    // Las evidencias se suben o se encolan (nunca bloquean sin conexión).
    for (const photo of reportPhotos) {
      await subirEvidenciaR2({
        proyectoId: pid,
        file: photo.file,
        descripcion: reportContent || photo.name,
      }).catch((e) => console.warn("Evidencia no subida:", e));
    }
    enviar.mutate(reportContent || "Avance diario", {
      onSuccess: () => {
        toast({ title: t.common.success });
        onClose();
      },
      onError: (e) =>
        toast({ variant: "destructive", title: "Error al enviar reporte", description: e.message }),
    });
    if (offline) {
      toast({ title: "Sin conexión", description: "El reporte se enviará al reconectar." });
      onClose();
    }
  };

  const isLoading = iniciar.isPending || enviar.isPending;

  return (
    <div className="max-w-xl mx-auto pb-10">
      <SheetHeader className="p-6 border-b bg-muted/20"><SheetTitle>Reportar - {project.nombre_proyecto}</SheetTitle></SheetHeader>
      <div className="p-6 space-y-6">
        {esPreInicio ? (
          <div className="space-y-6">
            <Label className="text-xs font-bold uppercase text-emerald-500">1. Lista de Materiales</Label>
            <div className="grid gap-2">
              {materiales.length > 0 ? materiales.map((mat, idx) => {
                const isShort = (mat.takenQuantity || 0) < mat.quantity;
                return (
                  <div key={mat.id} className={cn("flex flex-col p-3 rounded-lg border", isShort ? "bg-red-500/10 border-red-500/30" : "bg-muted/30")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={mat.done && !isShort} onCheckedChange={() => !isShort && toggleMaterial(idx)} disabled={isShort} />
                        <div className="text-sm font-bold">{mat.name} <span className="text-[10px] text-muted-foreground block">Req: {mat.quantity}</span></div>
                      </div>
                      <Input type="number" className={cn("w-16 h-8 text-center", isShort && "border-red-500 text-red-500")} value={mat.takenQuantity === undefined ? 0 : mat.takenQuantity} onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 0)} />
                    </div>
                    {isShort && <span className="text-[10px] font-bold text-red-500 mt-2">La cantidad no puede ser menor a {mat.quantity}</span>}
                  </div>
                );
              }) : <p className="text-center text-muted-foreground py-4">No hay materiales.</p>}
            </div>
            <Button
              onClick={handleStartDay}
              className="w-full h-12 bg-accent text-white font-bold"
              disabled={isLoading || !accesoValido}
            >
              {isLoading ? "Iniciando..." : "CONFIRMAR E INICIAR JORNADA"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-accent">Evidencia Fotográfica</Label>
              <div className="flex gap-2 flex-wrap">
                {reportPhotos.map((p, i) => <div key={i} className="w-20 h-20 relative rounded-lg overflow-hidden border"><Image src={p.dataUrl} fill alt="" className="object-cover" /></div>)}
                <button onClick={() => photoInputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/10"><Camera className="h-6 w-6 text-muted-foreground" /></button>
              </div>
              <input type="file" ref={photoInputRef} className="hidden" multiple onChange={handlePhotoUpload} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-accent">Observaciones</Label>
              <Textarea value={reportContent} onChange={(e) => setReportContent(e.target.value)} placeholder="Notas de hoy..." />
            </div>
            <Button
              onClick={handleFinishDayAndReport}
              disabled={isLoading}
              className={cn("w-full h-12 text-white font-bold", esRechazado ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600")}
            >
              {isLoading ? "Enviando..." : (esRechazado ? "REENVIAR REPORTE Y TERMINAR" : "ENVIAR REPORTE Y TERMINAR")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
