
"use client";

import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Plus,
  Sparkles,
  Camera,
  Loader2,
  FileText
} from "lucide-react";
import Image from "next/image";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { doc, setDoc, collection, addDoc, query, where, serverTimestamp } from "firebase/firestore";
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
  DialogDescription, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { aiReportDraftingAssistant } from "@/ai/flows/ai-report-drafting-assistant-flow";

const FALLBACK_PROJECTS = [
  {
    id: "demo-1",
    Pry_Nombre_Proyecto: "Residencial Las Palmas",
    Cl_ID: "Inmobiliaria El Sol",
    Pry_Estado: "EnProceso",
    ubicacion: "Av. Las Palmas 450, Santiago",
    progreso: 65,
    Eq_ID: "Equipo Alpha",
    imageUrl: "https://picsum.photos/seed/solar-pan/800/450",
  }
];

export default function ProjectsPage() {
  const { profile, user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    Pry_Nombre_Proyecto: "",
    Cl_ID: "",
    Srv_ID: "Instalación",
    Eq_ID: "",
    ubicacion: "",
    imageUrl: "https://picsum.photos/seed/solar-default/800/450"
  });

  // Report submission state
  const [reportContent, setReportContent] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Checklist states
  const [checklist, setChecklist] = useState({
    epp_completo: false,
    herramientas_listas: false,
    seguridad_area: false
  });

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) {
      return collection(db, "proyectos");
    }
    if (profile.teamId) {
      return query(collection(db, "proyectos"), where("assignedTeamId", "==", profile.teamId));
    }
    return null;
  }, [db, isAdmin, profile]);

  const teamsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, "teams");
  }, [db, isAdmin]);

  const { data: firestoreProjects, isLoading: projectsLoading } = useCollection(projectsQuery);
  const { data: teams } = useCollection(teamsQuery);

  const displayProjects = useMemo(() => {
    return (firestoreProjects && firestoreProjects.length > 0) ? firestoreProjects : (isAdmin ? [] : FALLBACK_PROJECTS);
  }, [firestoreProjects, isAdmin]);

  const handleCreateProject = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "proyectos"), {
        ...newProject,
        Pry_Estado: "Pendiente",
        progreso: 0,
        assignedTeamId: newProject.Eq_ID,
        fecha_creacion: new Date().toISOString(),
      });
      toast({ title: "¡Éxito!", description: "Proyecto creado correctamente." });
      setIsCreateDialogOpen(false);
      setNewProject({
        Pry_Nombre_Proyecto: "",
        Cl_ID: "",
        Srv_ID: "Instalación",
        Eq_ID: "",
        ubicacion: "",
        imageUrl: "https://picsum.photos/seed/solar-default/800/450"
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el proyecto." });
    } finally {
      setLoading(false);
    }
  };

  const handleStartDay = async (project: any) => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        projectStatus: {
          ...profile?.projectStatus,
          [project.id]: {
            checklist_completado: true,
            timestamp_inicio: new Date().toISOString(),
            en_curso: true
          }
        }
      }, { merge: true });

      toast({ title: "Jornada Iniciada", description: "Protocolo de seguridad validado." });
      setIsSheetOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Error al iniciar jornada." });
    } finally {
      setLoading(false);
    }
  };

  const handleFinishDayAndReport = async (project: any) => {
    if (!user || !db || !profile) return;
    if (!reportContent) {
      toast({ variant: "destructive", title: "Reporte requerido", description: "Describe las tareas antes de finalizar." });
      return;
    }

    setLoading(true);
    try {
      // 1. Create the Report
      await addDoc(collection(db, "reports"), {
        projectId: project.id,
        projectName: project.Pry_Nombre_Proyecto,
        content: reportContent,
        authorName: profile.nombre || "Técnico Zyra",
        employeeId: user.uid,
        assignedTeamId: profile.teamId || "sin-equipo",
        status: "Pendiente",
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
        imageUrl: project.imageUrl || "https://picsum.photos/seed/report-final/800/600"
      });

      // 2. Update User Project Status
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        projectStatus: {
          ...profile?.projectStatus,
          [project.id]: {
            checklist_completado: false,
            en_curso: false,
            ultimo_reporte: new Date().toISOString()
          }
        },
        puntos: (profile?.puntos || 0) + 50 // Reward for reporting
      }, { merge: true });

      toast({ title: "Reporte Enviado", description: "Has finalizado tu jornada con éxito. +50 pts." });
      setIsSheetOpen(false);
      setReportContent("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar el reporte." });
    } finally {
      setLoading(false);
    }
  };

  const handleAiDraft = async (projectName: string) => {
    if (!reportContent) {
      toast({ title: "Notas requeridas", description: "Escribe algunas notas básicas para que la IA pueda ayudarte." });
      return;
    }

    setIsAiDrafting(true);
    try {
      const result = await aiReportDraftingAssistant({
        reportNotes: reportContent,
        projectName: projectName,
        employeeName: profile?.nombre || "Técnico"
      });

      setReportContent(result.draftedReportDescription);
      toast({ title: "Asistente AI", description: "Reporte estructurado profesionalmente." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error AI", description: "No se pudo conectar con el asistente." });
    } finally {
      setIsAiDrafting(false);
    }
  };

  if (isUserLoading || (isAdmin && projectsLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {isAdmin ? "Gestión de Proyectos" : "Proyectos Asignados"}
            </h2>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Panel de administración para la creación y asignación de obras." 
                : "Gestiona tus jornadas y envía reportes al finalizar."}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                  <Plus className="h-4 w-4" /> Nuevo Proyecto
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-accent">Nuevo Frente de Trabajo (PRY)</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Complete los campos según el diccionario de datos para el seguimiento operativo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Nombre del Proyecto</Label>
                    <Input 
                      id="name" 
                      placeholder="Ej: Instalación Fotovoltaica Pyme" 
                      className="bg-white/5 border-white/10"
                      value={newProject.Pry_Nombre_Proyecto}
                      onChange={(e) => setNewProject({...newProject, Pry_Nombre_Proyecto: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Cliente (CL)</Label>
                      <Input 
                        placeholder="Nombre cliente" 
                        className="bg-white/5 border-white/10"
                        value={newProject.Cl_ID}
                        onChange={(e) => setNewProject({...newProject, Cl_ID: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Equipo (EQ)</Label>
                      <Select onValueChange={(val) => setNewProject({...newProject, Eq_ID: val})}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue placeholder="Asignar" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          {teams?.map((team) => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Ubicación Operativa</Label>
                    <Input 
                      placeholder="Ciudad, Sector" 
                      className="bg-white/5 border-white/10"
                      value={newProject.ubicacion}
                      onChange={(e) => setNewProject({...newProject, ubicacion: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white w-full"
                    disabled={!newProject.Pry_Nombre_Proyecto || !newProject.Cl_ID || loading}
                    onClick={handleCreateProject}
                  >
                    {loading ? "Creando..." : "Registrar Proyecto"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {displayProjects.map((project: any) => {
            const isEnCurso = profile?.projectStatus?.[project.id]?.en_curso;
            const statusColor = project.Pry_Estado === 'EnProceso' ? 'bg-emerald-500' : project.Pry_Estado === 'Finalizado' ? 'bg-primary' : 'bg-yellow-500';

            return (
              <Card key={project.id} className="bg-card border-white/10 hover:border-accent/30 transition-all group overflow-hidden flex flex-col h-full shadow-lg">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={project.imageUrl || "https://picsum.photos/seed/solar-pan/800/450"}
                    alt={project.Pry_Nombre_Proyecto}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <Badge className={cn("font-bold px-2 py-0.5 text-[10px] text-white", statusColor)}>
                      {(project.Pry_Estado || 'PENDIENTE').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-lg font-bold text-white group-hover:text-accent transition-colors">
                    {project.Pry_Nombre_Proyecto}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{project.Cl_ID}</p>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 text-accent shrink-0" />
                    <span className="truncate">{project.ubicacion}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-accent" /> Avance</span>
                      <span className="text-white">{project.progreso || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${project.progreso || 0}%` }} />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-white/5 mt-auto">
                  {isAdmin ? (
                    <div className="flex w-full gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold border-white/10 hover:bg-accent/10">EQUIPO</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold border-white/10 hover:bg-primary/10">REPORTES</Button>
                    </div>
                  ) : (
                    <Sheet onOpenChange={(open) => {
                      setIsSheetOpen(open);
                      if (!open) setReportContent("");
                    }}>
                      <SheetTrigger asChild>
                        <button className={cn(
                          "flex items-center gap-2 text-xs font-bold group-hover:translate-x-1 transition-transform uppercase tracking-widest w-full justify-between",
                          isEnCurso ? "text-emerald-500" : "text-accent"
                        )}>
                          {isEnCurso ? "Finalizar y Reportar" : "Iniciar Jornada"} <ArrowRight className="h-3 w-3" />
                        </button>
                      </SheetTrigger>
                      <SheetContent className="bg-card border-white/10 text-white sm:max-w-md w-full overflow-y-auto">
                        <SheetHeader className="mb-6">
                          <SheetTitle className="text-accent text-2xl font-bold">{project.Pry_Nombre_Proyecto}</SheetTitle>
                          <SheetDescription className="text-muted-foreground">
                            {isEnCurso ? "Completa el reporte diario para finalizar tu jornada." : "Protocolo de verificación de seguridad y materiales."}
                          </SheetDescription>
                        </SheetHeader>
                        
                        <div className="space-y-8">
                          {!isEnCurso ? (
                            <>
                              <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                                  <ShieldCheck className="h-5 w-5 text-[#8A2BE2]" /> Protocolo de Seguridad
                                </h4>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold">EPP Completo</p>
                                    <Switch checked={checklist.epp_completo} onCheckedChange={(v) => setChecklist({...checklist, epp_completo: v})} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold">Área Segura</p>
                                    <Switch checked={checklist.seguridad_area} onCheckedChange={(v) => setChecklist({...checklist, seguridad_area: v})} />
                                  </div>
                                </div>
                              </div>
                              <Button 
                                className="w-full bg-[#8A2BE2] hover:bg-[#8A2BE2]/90 text-white font-bold h-12"
                                disabled={!checklist.epp_completo || !checklist.seguridad_area || loading}
                                onClick={() => handleStartDay(project)}
                              >
                                {loading ? "Validando..." : "INICIAR JORNADA"}
                              </Button>
                            </>
                          ) : (
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Descripción de Tareas</Label>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-[10px] text-accent font-bold gap-1 hover:bg-accent/10"
                                    onClick={() => handleAiDraft(project.Pry_Nombre_Proyecto)}
                                    disabled={isAiDrafting}
                                  >
                                    {isAiDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    ASISTENTE AI
                                  </Button>
                                </div>
                                <Textarea 
                                  placeholder="Escribe tus notas del día aquí..." 
                                  className="bg-white/5 border-white/10 min-h-[150px] text-sm"
                                  value={reportContent}
                                  onChange={(e) => setReportContent(e.target.value)}
                                />
                                
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Evidencia Fotográfica</Label>
                                  <div className="aspect-video w-full rounded-lg bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent/40 transition-colors cursor-pointer">
                                    <Camera className="h-8 w-8" />
                                    <span className="text-xs">Subir evidencia de obra</span>
                                  </div>
                                </div>
                              </div>

                              <Button 
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12"
                                disabled={!reportContent || loading}
                                onClick={() => handleFinishDayAndReport(project)}
                              >
                                {loading ? "Procesando..." : "FINALIZAR Y ENVIAR REPORTE"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
