"use client";

import { useState } from "react";
import DashboardLayout from "../../dashboard/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, ClipboardList, Package, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  usePlantillas,
  useMateriales,
  useServicios,
  useActualizarPlantilla,
  useCrearPlantilla,
  useEliminarPlantilla,
} from "@/hooks/queries";
import type { PlantillaConDetalle } from "@/lib/data";

type PlantillaItem = { material_id: number; cantidad_requerida: number };

export default function ChecklistsSettingsPage() {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = usePlantillas();
  const { data: materiales = [] } = useMateriales();
  const { data: servicios = [] } = useServicios();

  const actualizarPlantilla = useActualizarPlantilla();
  const crearPlantilla = useCrearPlantilla();
  const eliminarPlantilla = useEliminarPlantilla();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PlantillaConDetalle | null>(null);
  const [editItems, setEditItems] = useState<PlantillaItem[]>([]);
  const [newMaterialId, setNewMaterialId] = useState("");
  const [newMaterialQty, setNewMaterialQty] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ nombre: string; servicio_id: string }>({
    nombre: "",
    servicio_id: "none",
  });

  const openEdit = (template: PlantillaConDetalle) => {
    setEditingTemplate(template);
    setEditItems(
      (template.checklist_servicio_detalle ?? []).map((d) => ({
        material_id: d.material_id,
        cantidad_requerida: d.cantidad_requerida ?? 1,
      }))
    );
    setNewMaterialId("");
    setNewMaterialQty(1);
    setIsEditOpen(true);
  };

  const handleAddItem = () => {
    const matId = parseInt(newMaterialId);
    if (!matId || newMaterialQty <= 0) return;
    setEditItems((prev) => {
      const existing = prev.find((i) => i.material_id === matId);
      if (existing) {
        return prev.map((i) =>
          i.material_id === matId ? { ...i, cantidad_requerida: i.cantidad_requerida + newMaterialQty } : i
        );
      }
      return [...prev, { material_id: matId, cantidad_requerida: newMaterialQty }];
    });
    setNewMaterialId("");
    setNewMaterialQty(1);
  };

  const handleRemoveItem = (matId: number) => {
    setEditItems((prev) => prev.filter((i) => i.material_id !== matId));
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await actualizarPlantilla.mutateAsync({
        id: editingTemplate.id_checklist_servicio,
        items: editItems,
      });
      toast({ title: "Éxito", description: "Plantilla actualizada" });
      setIsEditOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la plantilla" });
    }
  };

  const handleCreateTemplate = async () => {
    if (!createForm.nombre.trim()) {
      toast({ variant: "destructive", title: "Error", description: "El nombre es obligatorio" });
      return;
    }
    try {
      await crearPlantilla.mutateAsync({
        nombre: createForm.nombre.trim(),
        servicio_id: createForm.servicio_id === "none" ? null : parseInt(createForm.servicio_id),
      });
      toast({ title: "Éxito", description: "Plantilla creada" });
      setIsCreateOpen(false);
      setCreateForm({ nombre: "", servicio_id: "none" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la plantilla" });
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await eliminarPlantilla.mutateAsync(id);
      toast({ title: "Éxito", description: "Plantilla eliminada" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la plantilla" });
    }
  };

  const materialName = (id: number) =>
    materiales.find((m) => m.id_material === id)?.nombre_material || `Material #${id}`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-accent" /> Plantillas de Checklist
            </h2>
            <p className="text-muted-foreground mt-1">Configura los materiales requeridos para cada tipo de servicio.</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nueva Plantilla</DialogTitle>
                <DialogDescription>Crea una plantilla de checklist para un tipo de servicio.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre</Label>
                  <Input
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    placeholder="Ej. Instalación Residencial"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Servicio</Label>
                  <Select
                    value={createForm.servicio_id}
                    onValueChange={(val) => setCreateForm({ ...createForm, servicio_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin servicio</SelectItem>
                      {servicios.map((s) => (
                        <SelectItem key={s.id_servicio} value={s.id_servicio.toString()}>
                          {s.tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={crearPlantilla.isPending || !createForm.nombre.trim()}
                  className="w-full bg-accent text-white font-bold"
                >
                  {crearPlantilla.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Crear Plantilla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground italic">Aún no hay plantillas registradas.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id_checklist_servicio} className="border-border bg-card hover:border-accent/30 transition-all">
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-start">
                    <span>{template.nombre}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => openEdit(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Deseas eliminar la plantilla {template.nombre}? Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTemplate(template.id_checklist_servicio)}
                              className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase">
                      <Package className="h-3 w-3" /> Materiales en plantilla:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(template.checklist_servicio_detalle || []).length > 0 ? (
                        (template.checklist_servicio_detalle || []).slice(0, 3).map((d) => (
                          <span
                            key={d.id_checklist_servicio_detalle}
                            className="px-2 py-1 bg-muted rounded text-[10px] font-medium border border-border"
                          >
                            {d.materiales?.nombre_material || materialName(d.material_id)} (x{d.cantidad_requerida})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin materiales</span>
                      )}
                      {(template.checklist_servicio_detalle || []).length > 3 && (
                        <span className="text-[10px] text-accent">
                          +{(template.checklist_servicio_detalle || []).length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-card border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Plantilla - {editingTemplate?.nombre}</DialogTitle>
              <DialogDescription>Define los materiales y cantidades requeridas.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Material</Label>
                  <Select value={newMaterialId} onValueChange={setNewMaterialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materiales.map((m) => (
                        <SelectItem key={m.id_material} value={m.id_material.toString()}>
                          {m.nombre_material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Cant.</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newMaterialQty}
                    onChange={(e) => setNewMaterialQty(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button onClick={handleAddItem} disabled={!newMaterialId} className="bg-accent text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {editItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Sin materiales. Agrega al menos uno.
                  </p>
                ) : (
                  editItems.map((item) => (
                    <div
                      key={item.material_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <span className="text-sm font-medium">
                        {materialName(item.material_id)}{" "}
                        <span className="text-accent font-bold">x{item.cantidad_requerida}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleRemoveItem(item.material_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleSaveTemplate}
                disabled={actualizarPlantilla.isPending}
                className="w-full bg-accent text-white font-bold"
              >
                {actualizarPlantilla.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
