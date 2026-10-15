
"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useAuth } from "@/providers/auth-provider";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Plus, 
  Search, 
  Settings2, 
  Trash2, 
  Zap,
  Wrench,
  Save,
  X,
  Loader2,
  PlusCircle,
  Edit2,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMateriales,
  useCrearMaterial,
  useActualizarMaterial,
  useEliminarMaterial,
  usePlantillas,
  useActualizarPlantilla,
} from "@/hooks/queries";
import type { PlantillaConDetalle } from "@/lib/data/checklists-servicio";

export default function MaterialsPage() {
  const { user, profile, loading: userLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const { data: materiales = [], isLoading } = useMateriales();
  const { data: checklists = [] } = usePlantillas();
  const crear = useCrearMaterial();
  const actualizar = useActualizarMaterial();
  const eliminar = useEliminarMaterial();
  const actualizarPlantilla = useActualizarPlantilla();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Update Stock
  const [isUpdateStockOpen, setIsUpdateStockOpen] = useState(false);
  const [stockToUpdate, setStockToUpdate] = useState<{ id: number, name: string, current: number, added: number } | null>(null);

  // States for Template Editing
  const [editingChecklist, setEditingChecklist] = useState<PlantillaConDetalle | null>(null);
  const [tempMaterials, setTempMaterials] = useState<{ ID_Material: number, Nombre_Material: string, Cantidad_Requerida: number }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [newMaterialSelected, setNewMaterialSelected] = useState("");
  const [newMaterialQuantity, setNewMaterialQuantity] = useState(1);

  const [newMaterial, setNewMaterial] = useState({
    nombre_material: "",
    unidad: "",
    stock_disponible: 0,
  });

  const filteredMaterials = useMemo(() => {
    return materiales.filter(m => 
      m.nombre_material?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materiales, searchTerm]);

  const handleCreateMaterial = async () => {
    if (!newMaterial.nombre_material || !user) return;
    try {
      await crear.mutateAsync({
        nombre_material: newMaterial.nombre_material,
        unidad: newMaterial.unidad,
        stock_disponible: newMaterial.stock_disponible,
      });
      toast({ title: t.common.success, description: "Material agregado al catálogo" });
      setIsCreateDialogOpen(false);
      setNewMaterial({ nombre_material: "", unidad: "", stock_disponible: 0 });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el material" });
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!user) return;
    try {
      await eliminar.mutateAsync(id);
      toast({ title: "Éxito", description: "Material eliminado" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar" });
    }
  };

  const handleUpdateStock = async () => {
    if (!stockToUpdate || !user) return;
    try {
      const newTotal = stockToUpdate.current + stockToUpdate.added;
      await actualizar.mutateAsync({ id: stockToUpdate.id, patch: { stock_disponible: newTotal } });
      toast({ title: t.common.success, description: "Stock actualizado correctamente" });
      setIsUpdateStockOpen(false);
      setStockToUpdate(null);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el stock" });
    }
  };

  // Template Management Logic
  const openEditTemplate = (checklist: PlantillaConDetalle) => {
    setEditingChecklist(checklist);
    const mapped = checklist.checklist_servicio_detalle?.map((d) => ({
      ID_Material: d.material_id,
      Nombre_Material: d.materiales?.nombre_material || "Material",
      Cantidad_Requerida: d.cantidad_requerida || 1
    })) || [];
    setTempMaterials(mapped);
    setIsEditDialogOpen(true);
  };

  const handleAddTempMaterial = () => {
    if (!newMaterialSelected || newMaterialQuantity <= 0) return;
    const materialData = materiales.find(m => m.id_material === parseInt(newMaterialSelected));
    if (!materialData) return;

    const existingIdx = tempMaterials.findIndex(m => m.ID_Material === materialData.id_material);
    if (existingIdx >= 0) {
      const updated = [...tempMaterials];
      updated[existingIdx].Cantidad_Requerida += newMaterialQuantity;
      setTempMaterials(updated);
    } else {
      setTempMaterials([...tempMaterials, { 
        ID_Material: materialData.id_material, 
        Nombre_Material: materialData.nombre_material, 
        Cantidad_Requerida: newMaterialQuantity 
      }]);
    }
    setNewMaterialSelected("");
    setNewMaterialQuantity(1);
  };

  const handleSaveTemplate = async () => {
    if (!editingChecklist || !user) return;
    setIsSubmitting(true);
    try {
      // Auto-añadir el material seleccionado si el usuario olvidó darle al botón "+"
      const finalMaterials = tempMaterials.map(m => ({
        material_id: m.ID_Material,
        cantidad_requerida: m.Cantidad_Requerida
      }));

      if (newMaterialSelected) {
        const matId = parseInt(newMaterialSelected);
        if (!finalMaterials.some(m => m.material_id === matId)) {
          finalMaterials.push({
            material_id: matId,
            cantidad_requerida: newMaterialQuantity
          });
        }
      }

      await actualizarPlantilla.mutateAsync({
        id: editingChecklist.id_checklist_servicio,
        items: finalMaterials,
      });

      toast({ title: t.common.success, description: "Plantilla actualizada" });
      setIsEditDialogOpen(false);
      setNewMaterialSelected(""); // Limpiar seleccion
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la plantilla" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Package className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t.common.error}</h2>
          <p className="text-muted-foreground max-w-md">No tienes permisos para gestionar materiales.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="h-8 w-8 text-accent" /> {t.materials.title}
            </h2>
            <p className="text-muted-foreground">{t.materials.subtitle}</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> {t.materials.new_item}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-accent">{t.materials.new_item}</DialogTitle>
                <DialogDescription>Añade un nuevo recurso al catálogo general.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Nombre del Insumo</Label>
                  <Input 
                    placeholder="Ej: Cable Solar 6mm..." 
                    className="bg-muted/50 border-border"
                    value={newMaterial.nombre_material}
                    onChange={(e) => setNewMaterial({...newMaterial, nombre_material: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.materials.stock}</Label>
                  <Input 
                    type="number" 
                    className="bg-muted/50 border-border"
                    value={newMaterial.stock_disponible}
                    onChange={(e) => setNewMaterial({...newMaterial, stock_disponible: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold" 
                  disabled={!newMaterial.nombre_material || crear.isPending} 
                  onClick={handleCreateMaterial}
                >
                  {crear.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="bg-muted p-1 mb-8 h-12 w-full max-w-lg">
            <TabsTrigger 
              value="inventory" 
              className="flex-1 h-10 gap-2 text-xs font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Package className="h-4 w-4" /> {t.materials.general_catalog}
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="flex-1 h-10 gap-2 text-xs font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Settings2 className="h-4 w-4" /> {t.materials.templates}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-0">
            <Card className="bg-card border-border shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-foreground text-lg font-bold">{t.materials.general_catalog}</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t.common.search} className="pl-10 bg-background border-border text-xs h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : filteredMaterials.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Concepto / Insumo</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.materials.stock}</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.common.status}</TableHead>
                        <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">{t.common.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterials.map((mat) => (
                        <TableRow key={mat.id_material} className="border-border hover:bg-muted/10 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center"><Package className="h-5 w-5 text-accent" /></div>
                              <div>
                                <p className="text-sm font-bold text-foreground">{mat.nombre_material}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">ID SQL: {mat.id_material}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-lg font-mono font-bold text-foreground">{mat.stock_disponible}</span></TableCell>
                          <TableCell>
                            {mat.stock_disponible < 10 ? (
                              <Badge className="bg-red-500/10 text-red-500 border-none font-bold uppercase text-[9px]">{t.materials.critical}</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold uppercase text-[9px]">{t.materials.optimal}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-accent mr-1" 
                              onClick={() => {
                                setStockToUpdate({ id: mat.id_material, name: mat.nombre_material, current: mat.stock_disponible, added: 0 });
                                setIsUpdateStockOpen(true);
                              }}
                              title="Aumentar Stock"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMaterial(mat.id_material)} title="Eliminar Material">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">{t.common.no_results}</h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              {checklists.map((check) => (
                <Card key={check.id_checklist_servicio} className="bg-card border-border group hover:border-accent/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                        {check.servicios?.tipo === 'Mantenimiento' ? <Wrench className="h-8 w-8" /> : <Zap className="h-8 w-8" />}
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/30">PLANTILLA</Badge>
                    </div>
                    <CardTitle className="text-foreground mt-4 text-xl">{check.nombre}</CardTitle>
                    <CardDescription>{check.servicios?.tipo ? `Servicio: ${check.servicios.tipo}` : "Configuración de materiales requeridos"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full font-bold uppercase text-[11px] tracking-widest gap-2 h-12"
                      variant="outline"
                      onClick={() => openEditTemplate(check)}
                    >
                      <Settings2 className="h-4 w-4" />
                      Gestionar Recursos
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> 
                {editingChecklist?.nombre}
              </DialogTitle>
              <DialogDescription>
                Define la lista y cantidad de los materiales necesarios para este tipo de proyecto.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select value={newMaterialSelected} onValueChange={setNewMaterialSelected}>
                    <SelectTrigger className="flex-1 h-10 bg-muted/50 border-border text-xs">
                      <SelectValue placeholder="Seleccionar material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materiales.map(m => (
                        <SelectItem key={m.id_material} value={m.id_material.toString()}>{m.nombre_material}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    className="w-16 h-10 bg-muted/50 border-border text-xs" 
                    value={newMaterialQuantity} 
                    onChange={(e) => setNewMaterialQuantity(parseInt(e.target.value) || 0)} 
                  />
                  <Button size="icon" className="bg-accent hover:bg-accent/90 shrink-0" onClick={handleAddTempMaterial} disabled={!newMaterialSelected}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <ScrollArea className="h-[250px] border border-border rounded-xl p-3 bg-muted/10">
                    {tempMaterials.length > 0 ? (
                      <div className="space-y-2">
                        {tempMaterials.map((mat, idx) => (
                          <div key={idx} className="flex flex-col p-1.5 bg-muted/20 border border-border/50 rounded-xl group transition-all">
                            {editingIndex === idx ? (
                              <div className="flex items-center gap-2 p-1.5 bg-card rounded-lg border border-accent/30 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-[10px] font-black text-accent ml-2 flex-1 truncate">{mat.Nombre_Material}</span>
                                <Input 
                                  type="number" 
                                  value={editQuantity} 
                                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                  className="w-16 h-8 text-xs bg-muted/50 border-accent/20 focus-visible:ring-accent"
                                />
                                <div className="flex gap-1">
                                  <Button 
                                    size="icon" 
                                    className="h-8 w-8 bg-accent hover:bg-accent/90 text-white rounded-lg shadow-lg shadow-accent/20"
                                    onClick={() => {
                                      const updated = [...tempMaterials];
                                      updated[idx].Cantidad_Requerida = editQuantity;
                                      setTempMaterials(updated);
                                      setEditingIndex(null);
                                    }}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost"
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                    onClick={() => setEditingIndex(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-1.5 hover:bg-muted/30 rounded-lg transition-colors">
                                <div className="flex items-center gap-3 ml-1">
                                  <div className="p-1.5 rounded-lg bg-accent/5">
                                    <Package className="h-3.5 w-3.5 text-accent" />
                                  </div>
                                  <span className="text-xs text-foreground font-bold truncate max-w-[150px]">{mat.Nombre_Material}</span>
                                </div>
                                <div className="flex gap-1 items-center">
                                  <Badge variant="secondary" className="text-[9px] font-black bg-muted/50 text-muted-foreground border-none">
                                    Cant: {mat.Cantidad_Requerida}
                                  </Badge>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-muted-foreground hover:text-accent hover:bg-accent/10"
                                      onClick={() => {
                                        setEditingIndex(idx);
                                        setEditQuantity(mat.Cantidad_Requerida);
                                      }}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setTempMaterials(tempMaterials.filter((_, i) => i !== idx))}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 opacity-30">
                        <Package className="h-8 w-8 mb-2" />
                        <p className="text-[10px] uppercase font-bold">Sin materiales</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4">
              <Button variant="outline" className="w-[120px]" onClick={() => setIsEditDialogOpen(false)}>{t.common.cancel}</Button>
              <Button 
                className="w-[120px] bg-accent hover:bg-accent/90 text-white font-bold h-10 gap-2"
                onClick={handleSaveTemplate}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t.common.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Stock Dialog */}
        <Dialog open={isUpdateStockOpen} onOpenChange={setIsUpdateStockOpen}>
          <DialogContent className="w-[95vw] max-w-sm bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <PlusCircle className="h-5 w-5" /> Aumentar Stock
              </DialogTitle>
              <DialogDescription>
                Añade unidades al inventario de <span className="font-bold text-foreground">{stockToUpdate?.name}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground">Stock actual:</span>
                <span className="text-xl font-bold font-mono">{stockToUpdate?.current}</span>
              </div>
              <div className="space-y-2">
                <Label>Cantidad a añadir</Label>
                <Input 
                  type="number" 
                  className="text-lg font-mono bg-muted/50" 
                  value={stockToUpdate?.added || ""} 
                  onChange={(e) => setStockToUpdate(prev => prev ? {...prev, added: parseInt(e.target.value) || 0} : null)}
                  autoFocus
                />
              </div>
              {stockToUpdate && stockToUpdate.added > 0 && (
                <div className="flex justify-between items-center p-3 bg-accent/10 rounded-xl border border-accent/20">
                  <span className="text-sm font-bold text-accent">Nuevo stock total:</span>
                  <span className="text-xl font-bold font-mono text-accent">{stockToUpdate.current + stockToUpdate.added}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateStockOpen(false)}>{t.common.cancel}</Button>
              <Button 
                className="bg-accent hover:bg-accent/90 text-white font-bold" 
                onClick={handleUpdateStock}
                disabled={!stockToUpdate?.added || stockToUpdate.added <= 0 || actualizar.isPending}
              >
                {actualizar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
