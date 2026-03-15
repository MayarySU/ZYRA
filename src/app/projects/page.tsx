
"use client";

import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  ArrowRight, 
  Activity, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Package, 
  AlertCircle,
  Plus,
  Briefcase
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";

const ALL_PROJECTS = [
  {
    id: "1",
    nombre: "Residencial Las Palmas",
    cliente: "Inmobiliaria El Sol",
    estado: "ejecucion",
    descripcion: "Instalación de 45 paneles solares de 450W en área común.",
    ubicacion: "Av. Las Palmas 450, Santiago",
    progreso: 65,
    miembros: ["Operador Zyra", "Carlos Rivera"],
    imageUrl: "https://picsum.photos/seed/solar-pan/800/450",
    imageHint: "solar panels",
    materiales: [
      { id: "m1", nombre: "Paneles Jinko 450W", cantidad_esperada: 24 },
      { id: "m2", nombre: "Inversor SMA 5kW", cantidad_esperada: 1 },
      { id: "m3", nombre: "Kit Estructura Coplanar", cantidad_esperada: 1 }
    ]
  },
  {
    id: "2",
    nombre: "Bodega Logística Norte",
    cliente: "Logistix S.A.",
    estado: "validacion",
    descripcion: "Configuración de sistema de respaldo de energía con baterías Litio-Ion.",
    ubicacion: "Panamericana Norte Km 22, Colina",
    progreso: 92,
    miembros: ["Andrea Soto", "Carlos Rivera"],
    imageUrl: "https://picsum.photos/seed/solar-inv/800/450",
    imageHint: "solar inverter",
    materiales: [
      { id: "m4", nombre: "Batería BYD 5kWh", cantidad_esperada: 2 },
      { id: "m5", nombre: "Gabinete Exterior", cantidad_esperada: 1 }
    ]
  }
];

export default function ProjectsPage() {
  const { profile, user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    nombre: "",
    cliente: "",
    descripcion: "",
    ubicacion: "",
    imageUrl: "https://picsum.photos/seed/solar-default/800/450"
  });

  const [checklist, setChecklist] = useState({
    epp_completo: false,
    herramientas_listas: false,
    seguridad_area: false
  });

  const [materialesVerificados, setMaterialesVerificados] = useState<Record<string, boolean>>({});
  const [notasFaltantes, setNotasFaltantes] = useState<Record<string, string>>({});

  // Cargar proyectos de Firestore
  const projectsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "proyectos");
  }, [db]);

  const { data: firestoreProjects, loading: projectsLoading } = useCollection(projectsQuery);

  const displayProjects = useMemo(() => {
    // Si hay proyectos en Firestore, los usamos. Si no, usamos los de demo como fallback.
    const baseProjects = (firestoreProjects && firestoreProjects.length > 0) ? firestoreProjects : ALL_PROJECTS;
    
    if (isAdmin) return baseProjects;
    
    return baseProjects.filter((project: any) => 
      project.miembros?.includes(profile?.nombre) || 
      project.miembros?.includes("Operador Zyra") // Fallback para la demo
    );
  }, [firestoreProjects, isAdmin, profile?.nombre]);

  const handleToggleMaterial = (materialId: string) => {
    setMaterialesVerificados(prev => ({
      ...prev,
      [materialId]: !prev[materialId]
    }));
  };

  const handleNotaFaltante = (materialId: string, nota: string) => {
    setNotasFaltantes(prev => ({
      ...prev,
      [materialId]: nota
    }));
  };

  const isChecklistValid = (project: any) => {
    const safetyValid = checklist.epp_completo && checklist.herramientas_listas && checklist.seguridad_area;
    const materialesCount = project.materiales?.length || 0;
    const materialsValid = materialesCount === 0 || project.materiales?.every((m: any) => materialesVerificados[m.id]);
    return safetyValid && materialsValid;
  };

  const handleCreateProject = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "proyectos"), {
        ...newProject,
        estado: "ejecucion",
        progreso: 0,
        miembros: ["Operador Zyra"],
        fecha_creacion: new Date().toISOString(),
        materiales: [
          { id: "m-gen-1", nombre: "Kit de Herramientas Estándar", cantidad_esperada: 1 }
        ]
      });
      toast({ title: "¡Éxito!", description: "Proyecto creado correctamente." });
      setIsCreateDialogOpen(false);
      setNewProject({
        nombre: "",
        cliente: "",
        descripcion: "",
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
      const checklistRef = collection(db, "proyectos", project.id, "checklist_inicial");
      await addDoc(checklistRef, {
        ...checklist,
        foto_evidencia_inicio: "https://picsum.photos/seed/checklist/400/300",
        empleadoID: user.uid,
        fecha: new Date().toISOString()
      });

      const inventoryRef = collection(db, "historial_inventario");
      const materialesFinales = (project.materiales || []).map((m: any) => ({
        ...m,
        estado_verificacion: materialesVerificados[m.id],
        nota_faltante: notasFaltantes[m.id] || ""
      }));

      const faltantesCount = materialesFinales.filter((m: any) => !m.estado_verificacion).length;
      const mensaje = faltantesCount > 0 
        ? `Empleado ${profile?.nombre} salió a obra con faltantes registrados (${faltantesCount} ítems).`
        : `Empleado ${profile?.nombre} salió a obra con el 100% de materiales asignados.`;

      await addDoc(inventoryRef, {
        mensaje,
        empleadoID: user.uid,
        empleadoNombre: profile?.nombre,
        proyectoID: project.id,
        fecha: new Date().toISOString(),
        detalles_materiales: materialesFinales
      });

      const userRef = doc(db, "users", user.uid);
      const currentProjectStatus = profile?.projectStatus || {};
      
      await setDoc(userRef, {
        projectStatus: {
          ...currentProjectStatus,
          [project.id]: {
            checklist_completado: true,
            timestamp_inicio: new Date().toISOString()
          }
        }
      }, { merge: true });

      toast({
        title: "¡Jornada Iniciada!",
        description: "Inventario y seguridad validados satisfactoriamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la jornada."
      });
    } finally {
      setLoading(false);
    }
  };

  if (userLoading || projectsLoading) {
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
                ? "Administra, crea y asigna proyectos a tus equipos operativos." 
                : "Frentes de trabajo activos donde eres miembro del equipo."}
            </p>
          </div>
          
          {isAdmin ? (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                  <Plus className="h-4 w-4" /> Nuevo Proyecto
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-accent">Crear Nuevo Frente de Trabajo</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Define los parámetros básicos para iniciar un nuevo proyecto solar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Proyecto</Label>
                    <Input 
                      id="nombre" 
                      placeholder="Ej: Planta Solar Atacama" 
                      className="bg-white/5 border-white/10"
                      value={newProject.nombre}
                      onChange={(e) => setNewProject({...newProject, nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente</Label>
                    <Input 
                      id="cliente" 
                      placeholder="Ej: Minera Horizonte S.A." 
                      className="bg-white/5 border-white/10"
                      value={newProject.cliente}
                      onChange={(e) => setNewProject({...newProject, cliente: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ubicacion">Ubicación</Label>
                    <Input 
                      id="ubicacion" 
                      placeholder="Ciudad, Región" 
                      className="bg-white/5 border-white/10"
                      value={newProject.ubicacion}
                      onChange={(e) => setNewProject({...newProject, ubicacion: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea 
                      id="descripcion" 
                      placeholder="Breve resumen de la obra..." 
                      className="bg-white/5 border-white/10 h-24"
                      value={newProject.descripcion}
                      onChange={(e) => setNewProject({...newProject, descripcion: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    className="border-white/10 hover:bg-white/5"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white"
                    disabled={!newProject.nombre || !newProject.cliente || loading}
                    onClick={handleCreateProject}
                  >
                    {loading ? "Creando..." : "Crear Proyecto"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-4 text-sm font-bold w-fit">
              {displayProjects.length} ACTIVOS
            </Badge>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {displayProjects.map((project: any) => {
            const isCompletado = profile?.projectStatus?.[project.id]?.checklist_completado;

            return (
              <Card key={project.id} className="bg-card border-white/10 hover:border-accent/30 transition-all group overflow-hidden flex flex-col h-full shadow-lg">
                <div className="relative h-48 w-full overflow-hidden border-b border-white/10">
                  <Image
                    src={project.imageUrl || "https://picsum.photos/seed/solar-pan/800/450"}
                    alt={project.nombre}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <Badge className={cn(
                      "font-bold px-2 py-0.5 text-[10px]",
                      project.estado === 'ejecucion' ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-black'
                    )}>
                      {(project.estado || 'ejecucion').toUpperCase()}
                    </Badge>
                    {!isAdmin && isCompletado && (
                      <Badge className="bg-[#8A2BE2] text-white font-bold px-2 py-0.5 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ACTIVO
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-lg font-bold text-white group-hover:text-accent transition-colors">
                    {project.nombre}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{project.cliente}</p>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 text-accent shrink-0" />
                    <span className="truncate">{project.ubicacion}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-accent" /> {isAdmin ? "Estado de Obra" : "Tu Progreso"}</span>
                      <span className="text-white">{project.progreso || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${project.progreso || 0}%` }} />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Miembros:
                      </span>
                      <span className="text-white font-semibold">{(project.miembros || []).length} Miembros</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-4 border-t border-white/5 bg-white/2 mt-auto">
                  {isAdmin ? (
                    <div className="flex w-full gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold border-white/10 hover:bg-accent/10">
                        GESTIONAR EQUIPO
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold border-white/10 hover:bg-primary/10">
                        VER REPORTES
                      </Button>
                    </div>
                  ) : (
                    <Sheet onOpenChange={(open) => {
                      if (!open) {
                        setChecklist({ epp_completo: false, herramientas_listas: false, seguridad_area: false });
                        setMaterialesVerificados({});
                        setNotasFaltantes({});
                      }
                    }}>
                      <SheetTrigger asChild>
                        <button className="flex items-center gap-2 text-xs font-bold text-accent group-hover:translate-x-1 transition-transform uppercase tracking-widest w-full justify-between">
                          {isCompletado ? "Ver Hoja de Ruta" : "Validar Checklist & Salida"} <ArrowRight className="h-3 w-3" />
                        </button>
                      </SheetTrigger>
                      <SheetContent className="bg-card border-white/10 text-white sm:max-w-md w-full overflow-y-auto">
                        <SheetHeader className="mb-6">
                          <SheetTitle className="text-accent text-2xl font-bold">{project.nombre}</SheetTitle>
                          <SheetDescription className="text-muted-foreground">
                            {isCompletado ? "Jornada en curso. Gestión de materiales y tareas activa." : "Verificación de Materiales de Salida y Seguridad."}
                          </SheetDescription>
                        </SheetHeader>

                        {!isCompletado ? (
                          <div className="space-y-8">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                                <Package className="h-5 w-5 text-primary" /> Inventario de Salida
                              </h4>
                              <div className="space-y-4">
                                {(project.materiales || []).map((material: any) => (
                                  <div key={material.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
                                      <div className="space-y-1">
                                        <p className="text-xs font-bold text-white">{material.nombre}</p>
                                        <p className="text-[10px] text-muted-foreground">Cant. Esperada: {material.cantidad_esperada}</p>
                                      </div>
                                      <Switch 
                                        checked={!!materialesVerificados[material.id]}
                                        onCheckedChange={() => handleToggleMaterial(material.id)}
                                        className="data-[state=checked]:bg-primary"
                                      />
                                    </div>
                                    {!materialesVerificados[material.id] && (
                                      <div className="px-1 space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] text-orange-400 font-bold">
                                          <AlertCircle className="h-3 w-3" /> Reportar Faltante
                                        </div>
                                        <Input 
                                          placeholder="Ej: Solo llegaron 20 paneles..." 
                                          className="h-8 text-[10px] bg-white/5 border-orange-500/30"
                                          value={notasFaltantes[material.id] || ""}
                                          onChange={(e) => handleNotaFaltante(material.id, e.target.value)}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {(project.materiales || []).length === 0 && (
                                  <p className="text-xs text-muted-foreground italic">No hay materiales específicos asignados para verificar.</p>
                                )}
                              </div>
                            </div>

                            <div className="bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 p-5 rounded-xl space-y-4">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                                <ShieldCheck className="h-5 w-5 text-[#8A2BE2]" /> Seguridad Operativa
                              </h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold">EPP & Seguridad</p>
                                  <Switch 
                                    checked={checklist.epp_completo}
                                    onCheckedChange={(val) => setChecklist(prev => ({ ...prev, epp_completo: val }))}
                                    className="data-[state=checked]:bg-[#8A2BE2]"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold">Herramientas & Área</p>
                                  <Switch 
                                    checked={checklist.herramientas_listas}
                                    onCheckedChange={(val) => setChecklist(prev => ({ ...prev, herramientas_listas: val, seguridad_area: val }))}
                                    className="data-[state=checked]:bg-[#8A2BE2]"
                                  />
                                </div>
                              </div>
                            </div>

                            <Button 
                              className="w-full bg-[#8A2BE2] hover:bg-[#8A2BE2]/90 text-white font-bold h-12 shadow-lg"
                              disabled={!isChecklistValid(project) || loading}
                              onClick={() => handleStartDay(project)}
                            >
                              {loading ? "Registrando..." : "INICIAR JORNADA"}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-white uppercase">Salida Validada</p>
                                <p className="text-[10px] text-muted-foreground">Iniciada hoy a las {new Date(profile?.projectStatus?.[project.id]?.timestamp_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-4 pt-4 border-t border-white/5">
                              <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" /> Equipo en Obra
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(project.miembros || []).map((m: string, i: number) => (
                                  <Badge key={i} variant="outline" className="border-white/10 text-[10px]">{m}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
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
