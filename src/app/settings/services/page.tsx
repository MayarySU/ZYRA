"use client";

import { useState } from "react";
import DashboardLayout from "../../dashboard/layout";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2, 
  Briefcase, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useServicios, useCrearServicio, useEliminarServicio, useEmpresa } from "@/hooks/queries";
import type { Servicio } from "@/lib/data";

export default function ServicesManagementPage() {
  const { toast } = useToast();
  const { data: services = [], isLoading } = useServicios();
  const { data: empresa } = useEmpresa();
  const crearServicio = useCrearServicio();
  const eliminarServicio = useEliminarServicio();
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({ tipo: "", descripcion: "" });

  const handleAddService = async () => {
    if (!newService.tipo) {
      toast({ variant: "destructive", title: "Error", description: "El nombre del servicio es obligatorio" });
      return;
    }

    try {
      await crearServicio.mutateAsync({ tipo: newService.tipo, descripcion: newService.descripcion || null });
      toast({ title: "Éxito", description: "Servicio creado correctamente" });
      setNewService({ tipo: "", descripcion: "" });
      setIsAdding(false);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el servicio" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este tipo de servicio?")) return;
    try {
      await eliminarServicio.mutateAsync(id);
      toast({ title: "Eliminado", description: "El servicio ha sido eliminado" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el servicio" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-xl">
                <Briefcase className="h-8 w-8 text-accent" />
              </div>
              Tipos de Servicio
            </h2>
            <p className="text-muted-foreground">Administra los tipos de trabajo que realiza tu empresa.</p>
          </div>
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-11 px-6 shadow-lg shadow-accent/20 transition-all"
          >
            {isAdding ? <Settings2 className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
            {isAdding ? "Ver Lista" : "Nuevo Servicio"}
          </Button>
        </div>

        {isAdding ? (
          /* Formulario para nuevo servicio */
          <Card className="border-border shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <CardTitle className="text-xl">Crear Nuevo Tipo de Servicio</CardTitle>
              <CardDescription>Define un nuevo tipo de actividad técnica.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del Servicio</Label>
                  <Input 
                    placeholder="Ej: Mantenimiento Preventivo" 
                    value={newService.tipo}
                    onChange={(e) => setNewService({ ...newService, tipo: e.target.value })}
                    className="h-12 border-border focus:border-accent bg-muted/10 transition-all"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</Label>
                  <Textarea 
                    placeholder="Describe en qué consiste este servicio..." 
                    value={newService.descripcion}
                    onChange={(e) => setNewService({ ...newService, descripcion: e.target.value })}
                    className="min-h-[120px] border-border focus:border-accent bg-muted/10 transition-all"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/50 bg-muted/30 flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
              <Button onClick={handleAddService} disabled={crearServicio.isPending} className="bg-accent text-white font-bold px-8">
                {crearServicio.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar Servicio
              </Button>
            </CardFooter>
          </Card>
        ) : (
          /* Lista de servicios */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-500">
            {isLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="text-muted-foreground font-medium animate-pulse">Cargando tus servicios...</p>
              </div>
            ) : services.length > 0 ? (
              services.map((service: Servicio) => (
                <Card key={service.id_servicio} className="group border-border hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 transition-all duration-300 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-accent/5 rounded-lg group-hover:bg-accent/10 transition-colors">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(service.id_servicio)}
                        disabled={eliminarServicio.isPending}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg mt-3 text-foreground group-hover:text-accent transition-colors">
                      {service.tipo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4.5rem]">
                      {service.descripcion || "Sin descripción disponible."}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 flex items-center gap-2">
                    <div className="px-2 py-1 bg-muted rounded text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      ID: {service.id_servicio}
                    </div>
                    <div className="px-2 py-1 bg-accent/5 rounded text-[10px] font-bold text-accent uppercase tracking-tight">
                      {empresa?.nombre || "Empresa 1"}
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full border-2 border-dashed border-border rounded-3xl p-16 flex flex-col items-center text-center space-y-4">
                <div className="bg-muted p-4 rounded-full">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">No hay servicios</h3>
                  <p className="text-muted-foreground max-w-xs">Aún no has creado ningún tipo de servicio. ¡Crea el primero ahora!</p>
                </div>
                <Button onClick={() => setIsAdding(true)} variant="outline" className="mt-4 border-accent text-accent font-bold hover:bg-accent hover:text-white transition-all">
                  Comenzar a Crear
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
