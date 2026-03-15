"use client";

import DashboardLayout from "../dashboard/layout";
import { useUser } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Activity, Users } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Datos de proyectos con lógica de miembros del equipo
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
  }
];

export default function ProjectsPage() {
  const { profile } = useUser();

  // Lógica de Acceso: El empleado solo puede ver proyectos donde esté asignado
  const myProjects = ALL_PROJECTS.filter(project => 
    project.miembros.includes(profile?.nombre)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-body">
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
        <div className="grid gap-6 md:grid-cols-2">
          {myProjects.map((project) => (
            <Card key={project.id} className="bg-card border-white/10 hover:border-accent/30 transition-all group overflow-hidden flex flex-col">
              <div className="relative h-56 w-full overflow-hidden border-b border-white/10">
                <Image
                  src={project.imageUrl}
                  alt={project.nombre}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  data-ai-hint={project.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <Badge className={cn(
                    "font-bold px-3 py-1",
                    project.estado === 'ejecucion' ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-black'
                  )}>
                    {project.estado.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-4">
                <div>
                  <CardTitle className="text-xl mb-1 text-white group-hover:text-accent transition-colors">
                    {project.nombre}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{project.cliente}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.descripcion}
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-accent" />
                    {project.ubicacion}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <Activity className="h-3 w-3 text-accent" />
                        Avance
                      </span>
                      <span className="font-bold text-white">{project.progreso}%</span>
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
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="flex items-center gap-2 text-xs font-bold text-accent group-hover:translate-x-1 transition-transform uppercase tracking-widest">
                      Ver Hoja de Ruta <ArrowRight className="h-3 w-3" />
                    </button>
                  </SheetTrigger>
                  <SheetContent className="bg-card border-white/10 text-white">
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-accent text-2xl font-bold">{project.nombre}</SheetTitle>
                      <SheetDescription className="text-muted-foreground">
                        Hoja de ruta y tareas operativas asignadas.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" /> Equipo de Trabajo
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {project.miembros.map((m, i) => (
                            <Badge key={i} variant="outline" className="border-white/10 text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Tareas Pendientes</h4>
                        <div className="space-y-3">
                          {[
                            "Verificar torque de anclajes",
                            "Muestreo de voltaje en strings",
                            "Limpieza de residuos post-instalación"
                          ].map((tarea, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                              <div className="h-4 w-4 rounded-sm border border-accent/50" />
                              <span className="text-xs text-muted-foreground">{tarea}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="h-20 w-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <Activity className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-white">Sin proyectos asignados</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Actualmente no eres miembro de ningún equipo operativo activo. Contacta a tu administrador para la asignación.
          </p>
        </div>
      )}
    </div>
  );
}
