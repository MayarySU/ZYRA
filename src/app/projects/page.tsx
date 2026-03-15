"use client";

import DashboardLayout from "../dashboard/layout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Activity, ImageIcon } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const PROJECTS = [
  {
    id: "1",
    nombre: "Residencial Las Palmas",
    cliente: "Inmobiliaria El Sol",
    estado: "ejecucion",
    descripcion: "Instalación de 45 paneles solares de 450W en área común.",
    ubicacion: "Av. Las Palmas 450, Santiago",
    progreso: 65,
    imageUrl: PlaceHolderImages.find(img => img.id === "evidencia-paneles")?.imageUrl,
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
    imageUrl: PlaceHolderImages.find(img => img.id === "evidencia-inversores")?.imageUrl,
    imageHint: "solar inverter"
  }
];

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">Proyectos Activos</h2>
            <p className="text-muted-foreground">Estado y ubicación de los frentes de trabajo asignados.</p>
          </div>
          <Badge className="bg-accent/20 text-accent border-accent/30 py-1 px-4 text-sm font-bold">
            2 PROYECTOS
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <Card key={project.id} className="bg-card border-white/5 hover:border-accent/30 transition-all group overflow-hidden flex flex-col">
              {project.imageUrl && (
                <div className="relative h-48 w-full overflow-hidden border-b border-white/5">
                  <Image
                    src={project.imageUrl}
                    alt={project.nombre}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    data-ai-hint={project.imageHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <Badge className={
                      project.estado === 'ejecucion' ? 'bg-primary text-primary-foreground' : 'bg-yellow-500 text-black'
                    }>
                      {project.estado.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-1 text-white group-hover:text-accent transition-colors">
                      {project.nombre}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{project.cliente}</p>
                  </div>
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
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3 text-accent" />
                        Progreso Operativo
                      </span>
                      <span className="font-bold text-white">{project.progreso}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${project.progreso}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-white/5 bg-white/2 mt-auto">
                <button className="flex items-center gap-2 text-xs font-bold text-accent group-hover:translate-x-1 transition-transform">
                  VER DETALLES COMPLETOS <ArrowRight className="h-3 w-3" />
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
