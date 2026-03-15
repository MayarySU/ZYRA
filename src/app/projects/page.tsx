
"use client";

import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Activity, Users, ShieldCheck, Camera, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const ALL_PROJECTS = [
  {
    id: "1",
    nombre: "Residencial Las Palmas",
    cliente: "Inmobiliaria El Sol",
    estado: "ejecucion",
    descripcion: "Instalación de 45 paneles solares de 450W en área común.",
    ubicacion: "Av. Las Palmas 450, Santiago",
    progreso: 65,
    miembros: ["Operador Zyra (Demo)", "Carlos Rivera"],
    imageUrl: PlaceHolderImages.find(img => img.id === "evidencia-paneles")?.imageUrl || "https://picsum.photos/seed/solar-pan/800/450",
    imageHint: "solar panels"
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
    imageUrl: PlaceHolderImages.find(img => img.id === "evidencia-inversores")?.imageUrl || "https://picsum.photos/seed/solar-inv/800/450",
    imageHint: "solar inverter"
  },
  {
    id: "3",
    nombre: "Parque Industrial Sur",
    cliente: "EcoLogistics",
    estado: "ejecucion",
    descripcion: "Mantenimiento preventivo de transformadores y celdas de media tensión.",
    ubicacion: "Ruta 5 Sur, San Bernardo",
    progreso: 40,
    miembros: ["Operador Zyra (Demo)", "Miguel Ángel"],
    imageUrl: PlaceHolderImages.find(img => img.id === "evidencia-falla")?.imageUrl || "https://picsum.photos/seed/solar-fail/800/450",
    imageHint: "electrical cables"
  }
];

export default function ProjectsPage() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [checklist, setChecklist] = useState({
    epp_completo: false,
    herramientas_listas: false,
    seguridad_area: false
  });
  const [loading, setLoading] = useState(false);

  const myProjects = ALL_PROJECTS.filter(project => 
    project.miembros.includes(profile?.nombre)
  );

  const canStartDay = checklist.epp_completo && checklist.herramientas_listas && checklist.seguridad_area;

  const handleStartDay = async (projectId: string) => {
    if (!user || !db) return;
    setLoading(true);
    try {
      // 1. Guardar el checklist en la subcolección del proyecto
      const checklistRef = collection(db, "proyectos", projectId, "checklist_inicial");
      await addDoc(checklistRef, {
        ...checklist,
        foto_evidencia_inicio: "https://picsum.photos/seed/checklist/400/300",
        empleadoID: user.uid,
        fecha: new Date().toISOString()
      });

      // 2. Actualizar el estado del usuario para este proyecto
      const userRef = doc(db, "users", user.uid);
      const currentProjectStatus = profile?.projectStatus || {};
      
      await setDoc(userRef, {
        projectStatus: {
          ...currentProjectStatus,
          [projectId]: {
            checklist_completado: true,
            timestamp_inicio: new Date().toISOString()
          }
        }
      }, { merge: true });

      toast({
        title: "¡Jornada Iniciada!",
        description: "El checklist ha sido validado satisfactoriamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo iniciar la jornada."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">Proyectos Asignados</h2>
            <p className="text-muted-foreground">Frentes de trabajo donde eres miembro activo del equipo.</p>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-4 text-sm font-bold w-fit">
            {myProjects.length} {myProjects.length === 1 ? 'PROYECTO' : 'PROYECTOS'}
          </Badge>
        </div>

        {myProjects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {myProjects.map((project) => {
              const isCompletado = profile?.projectStatus?.[project.id]?.checklist_completado;

              return (
                <Card key={project.id} className="bg-card border-white/10 hover:border-accent/30 transition-all group overflow-hidden flex flex-col h-full shadow-lg">
                  <div className="relative h-48 w-full overflow-hidden border-b border-white/10">
                    <Image
                      src={project.imageUrl}
                      alt={project.nombre}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      data-ai-hint={project.imageHint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <Badge className={cn(
                        "font-bold px-2 py-0.5 text-[10px]",
                        project.estado === 'ejecucion' ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-black'
                      )}>
                        {project.estado.toUpperCase()}
                      </Badge>
                      {isCompletado && (
                        <Badge className="bg-[#8A2BE2] text-white font-bold px-2 py-0.5 text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> ACTIVO
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-3 pt-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-white group-hover:text-accent transition-colors line-clamp-1">
                        {project.nombre}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{project.cliente}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {project.descripcion}
                    </p>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-accent shrink-0" />
                        <span className="truncate">{project.ubicacion}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-accent" />
                            Progreso
                          </span>
                          <span className="text-white">{project.progreso}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${project.progreso}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 border-t border-white/5 bg-white/2 mt-auto">
                    <Sheet onOpenChange={(open) => !open && setChecklist({ epp_completo: false, herramientas_listas: false, seguridad_area: false })}>
                      <SheetTrigger asChild>
                        <button className="flex items-center gap-2 text-xs font-bold text-accent group-hover:translate-x-1 transition-transform uppercase tracking-widest w-full justify-between">
                          {isCompletado ? "Ver Hoja de Ruta" : "Validar Checklist Inicial"} <ArrowRight className="h-3 w-3" />
                        </button>
                      </SheetTrigger>
                      <SheetContent className="bg-card border-white/10 text-white sm:max-w-md w-full overflow-y-auto">
                        <SheetHeader className="mb-6">
                          <SheetTitle className="text-accent text-2xl font-bold">{project.nombre}</SheetTitle>
                          <SheetDescription className="text-muted-foreground">
                            {isCompletado ? "Gestión operativa y tareas." : "Completa la validación de seguridad para comenzar."}
                          </SheetDescription>
                        </SheetHeader>

                        {!isCompletado ? (
                          <div className="space-y-8">
                            <div className="bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 p-6 rounded-2xl space-y-6">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                                <ShieldCheck className="h-5 w-5 text-[#8A2BE2]" /> Protocolo de Seguridad
                              </h4>
                              
                              <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold">EPP Completo</p>
                                    <p className="text-[10px] text-muted-foreground">Casco, guantes, zapatos y arnés.</p>
                                  </div>
                                  <Switch 
                                    checked={checklist.epp_completo}
                                    onCheckedChange={(val) => setChecklist(prev => ({ ...prev, epp_completo: val }))}
                                    className="data-[state=checked]:bg-[#8A2BE2]"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold">Herramientas Listas</p>
                                    <p className="text-[10px] text-muted-foreground">Kit de herramientas verificado.</p>
                                  </div>
                                  <Switch 
                                    checked={checklist.herramientas_listas}
                                    onCheckedChange={(val) => setChecklist(prev => ({ ...prev, herramientas_listas: val }))}
                                    className="data-[state=checked]:bg-[#8A2BE2]"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold">Área Segura</p>
                                    <p className="text-[10px] text-muted-foreground">Perímetro delimitado y seguro.</p>
                                  </div>
                                  <Switch 
                                    checked={checklist.seguridad_area}
                                    onCheckedChange={(val) => setChecklist(prev => ({ ...prev, seguridad_area: val }))}
                                    className="data-[state=checked]:bg-[#8A2BE2]"
                                  />
                                </div>
                              </div>

                              <div className="pt-4 border-t border-white/10">
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Evidencia Visual</p>
                                <div className="h-40 w-full rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                  <Camera className="h-8 w-8 text-muted-foreground group-hover:text-[#8A2BE2] transition-colors" />
                                  <span className="text-[10px] font-bold text-muted-foreground">Tomar Foto de Inicio</span>
                                </div>
                              </div>
                            </div>

                            <Button 
                              className="w-full bg-[#8A2BE2] hover:bg-[#8A2BE2]/90 text-white font-bold h-12 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!canStartDay || loading}
                              onClick={() => handleStartDay(project.id)}
                            >
                              {loading ? "Procesando..." : "INICIAR JORNADA"}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              <div>
                                <p className="text-sm font-bold text-white uppercase">Jornada Activa</p>
                                <p className="text-[10px] text-muted-foreground">Iniciada hoy a las {new Date(profile?.projectStatus?.[project.id]?.timestamp_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                                <Users className="h-4 w-4 text-primary" /> Miembros del Equipo
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {project.miembros.map((m, i) => (
                                  <Badge key={i} variant="outline" className="border-white/10 text-[10px] py-1">
                                    {m}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                              <h4 className="text-sm font-bold text-white uppercase tracking-widest">Hitos Pendientes</h4>
                              <div className="space-y-3">
                                {[
                                  "Verificación de seguridad en altura",
                                  "Pruebas de aislamiento DC",
                                  "Protocolo de entrega parcial"
                                ].map((tarea, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div className="h-4 w-4 rounded-sm border border-accent/50 shrink-0" />
                                    <span className="text-xs text-muted-foreground">{tarea}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 shadow-inner">
              <Activity className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-white">Sin proyectos activos</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              No tienes asignaciones pendientes en este momento. Consulta con tu supervisor para nuevos frentes de trabajo.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
