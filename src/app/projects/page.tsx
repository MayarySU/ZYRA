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
  Plus
} from "lucide-react";
import Image from "next/image";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    Pry_Nombre_Proyecto: "",
    Cl_ID: "",
    Srv_ID: "Instalación",
    Eq_ID: "",
    ubicacion: "",
    imageUrl: "https://picsum.photos/seed/solar-default/800/450"
  });

  // Checklist states
  const [checklist, setChecklist] = useState({
    epp_completo: false,
    herramientas_listas: false,
    seguridad_area: false
  });

  const projectsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "proyectos");
  }, [db]);

  const { data: firestoreProjects, isLoading: projectsLoading } = useCollection(projectsQuery);

  const displayProjects = useMemo(() => {
    const baseProjects = (firestoreProjects && firestoreProjects.length > 0) ? firestoreProjects : FALLBACK_PROJECTS;
    if (isAdmin) return baseProjects;
    return baseProjects.filter((p: any) => p.Eq_ID === "Equipo Alpha" || p.miembros?.includes(profile?.nombre));
  }, [firestoreProjects, isAdmin, profile?.nombre]);

  const handleCreateProject = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "proyectos"), {
        ...newProject,
        Pry_Estado: "Pendiente",
        progreso: 0,
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
            timestamp_inicio: new Date().toISOString()
          }
        }
      }, { merge: true });

      toast({ title: "Jornada Iniciada", description: "Protocolo de seguridad validado." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Error al iniciar jornada." });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || projectsLoading) {
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
                : "Frentes de trabajo activos donde eres miembro del equipo."}
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
                      <Select onValueChange={(val) => setNewProject({...newProject, Cl_ID: val})}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="cl-1">Inmobiliaria El Sol</SelectItem>
                          <SelectItem value="cl-2">Logistix S.A.</SelectItem>
                          <SelectItem value="cl-3">Minera Horizonte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Equipo (EQ)</Label>
                      <Select onValueChange={(val) => setNewProject({...newProject, Eq_ID: val})}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue placeholder="Asignar" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="eq-1">Equipo Alpha</SelectItem>
                          <SelectItem value="eq-2">Equipo Gamma</SelectItem>
                          <SelectItem value="eq-3">Mantenimiento Norte</SelectItem>
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
            const isCompletado = profile?.projectStatus?.[project.id]?.checklist_completado;
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
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold border-white/10 hover:bg-accent/10">GESTIONAR EQUIPO</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold border-white/10 hover:bg-primary/10">REPORTES</Button>
                    </div>
                  ) : (
                    <Sheet>
                      <SheetTrigger asChild>
                        <button className="flex items-center gap-2 text-xs font-bold text-accent group-hover:translate-x-1 transition-transform uppercase tracking-widest w-full justify-between">
                          {isCompletado ? "Ver Hoja de Ruta" : "Validar Salida"} <ArrowRight className="h-3 w-3" />
                        </button>
                      </SheetTrigger>
                      <SheetContent className="bg-card border-white/10 text-white sm:max-w-md w-full overflow-y-auto">
                        <SheetHeader className="mb-6">
                          <SheetTitle className="text-accent text-2xl font-bold">{project.Pry_Nombre_Proyecto}</SheetTitle>
                          <SheetDescription className="text-muted-foreground">
                            Protocolo de verificación de seguridad y materiales.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-8">
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
