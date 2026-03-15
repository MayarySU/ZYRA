"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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
  AlertTriangle,
  Zap,
  Wrench,
  Save,
  X,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";

export default function MaterialsPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // States for Template Editing
  const [editingTemplateType, setEditingTemplateType] = useState<string | null>(null);
  const [tempItems, setTempItems] = useState<any[]>([]);
  const [newItemText, setNewItemText] = useState("");

  const [newMaterial, setNewMaterial] = useState({
    Mat_Nombre: "",
    Mat_Stock_Disponible: 0,
  });

  // Queries
  const materialsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "materiales");
  }, [db]);

  const checklistsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "checklist_servicio");
  }, [db]);

  const { data: materials, isLoading: materialsLoading } = useCollection(materialsQuery);
  const { data: checklists } = useCollection(checklistsQuery);

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    return materials.filter(m => {
      const name = typeof m.Mat_Nombre === 'object' ? (m.Mat_Nombre?.name || "") : (m.Mat_Nombre || "");
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [materials, searchTerm]);

  const handleCreateMaterial = () => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db, "materiales");
    const data = { ...newMaterial, createdAt: serverTimestamp() };

    addDoc(colRef, data)
      .then(() => {
        toast({ title: t.common.success, description: t.common.success });
        setIsCreateDialogOpen(false);
        setNewMaterial({ Mat_Nombre: "", Mat_Stock_Disponible: 0 });
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleDeleteMaterial = (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, "materiales", id))
      .then(() => toast({ title: t.common.success, description: t.common.delete }))
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `materiales/${id}`,
          operation: 'delete'
        }));
      });
  };

  // Template Management Logic
  const openEditTemplate = (type: string) => {
    setEditingTemplateType(type);
    const existing = checklists?.find(c => c.id === type);
    setTempItems(existing?.items || []);
    setNewItemText("");
    setIsEditDialogOpen(true);
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setTempItems([...tempItems, newItemText.trim()]);
    setNewItemText("");
  };

  const handleRemoveItem = (index: number) => {
    setTempItems(tempItems.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async () => {
    if (!db || !editingTemplateType) return;
    setSavingTemplate(true);
    const docRef = doc(db, "checklist_servicio", editingTemplateType);
    const data = { items: tempItems, updatedAt: serverTimestamp() };

    try {
      await setDoc(docRef, data, { merge: true });
      toast({ title: t.common.success, description: t.common.save });
      setIsEditDialogOpen(false);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data
      }));
    } finally {
      setSavingTemplate(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Package className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t.common.error}</h2>
          <p className="text-muted-foreground max-w-md">{t.employees.subtitle}</p>
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
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-accent">{t.materials.new_item}</DialogTitle>
                <DialogDescription>Añade un nuevo recurso al catálogo general.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.materials.catalog}</Label>
                  <Input 
                    placeholder="Ej: Cable Solar 6mm..." 
                    className="bg-muted/50 border-border"
                    value={newMaterial.Mat_Nombre}
                    onChange={(e) => setNewMaterial({...newMaterial, Mat_Nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.materials.stock}</Label>
                  <Input 
                    type="number" 
                    className="bg-muted/50 border-border"
                    value={newMaterial.Mat_Stock_Disponible}
                    onChange={(e) => setNewMaterial({...newMaterial, Mat_Stock_Disponible: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold" disabled={!newMaterial.Mat_Nombre || loading} onClick={handleCreateMaterial}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground text-lg font-bold">{t.materials.general_catalog}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t.common.search} className="pl-10 bg-background border-border text-xs h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {materialsLoading ? (
                  <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : filteredMaterials.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.materials.new_item}</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.materials.stock}</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.common.status}</TableHead>
                        <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">{t.common.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterials.map((mat) => {
                        const materialName = typeof mat.Mat_Nombre === 'object' ? (mat.Mat_Nombre?.name || "Material sin nombre") : (mat.Mat_Nombre || "Material sin nombre");
                        return (
                          <TableRow key={mat.id} className="border-border hover:bg-muted/10 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center"><Package className="h-5 w-5 text-accent" /></div>
                                <div><p className="text-sm font-bold text-foreground">{materialName}</p></div>
                              </div>
                            </TableCell>
                            <TableCell><span className="text-lg font-mono font-bold text-foreground">{mat.Mat_Stock_Disponible}</span></TableCell>
                            <TableCell>
                              {mat.Mat_Stock_Disponible < 10 ? (
                                <Badge className="bg-red-500/10 text-red-500 border-none font-bold uppercase text-[9px]">{t.materials.critical}</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold uppercase text-[9px]">{t.materials.optimal}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMaterial(mat.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
              {/* Instalación Template */}
              <Card className="bg-card border-border group hover:border-accent/50 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                      <Zap className="h-8 w-8" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/30">Config CHS</Badge>
                  </div>
                  <CardTitle className="text-foreground mt-4 text-xl">{t.materials.template_install}</CardTitle>
                  <CardDescription>Protocolo de tareas para proyectos de obra nueva.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full font-bold uppercase text-[11px] tracking-widest gap-2 h-12"
                    variant="outline"
                    onClick={() => openEditTemplate("Instalación")}
                  >
                    <Settings2 className="h-4 w-4" />
                    {t.materials.edit_chs}
                  </Button>
                </CardContent>
              </Card>

              {/* Mantenimiento Template */}
              <Card className="bg-card border-border group hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Wrench className="h-8 w-8" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">Config CHS</Badge>
                  </div>
                  <CardTitle className="text-foreground mt-4 text-xl">{t.materials.template_maint}</CardTitle>
                  <CardDescription>Protocolo de limpieza y revisión de sistemas existentes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full font-bold uppercase text-[11px] tracking-widest gap-2 h-12"
                    variant="outline"
                    onClick={() => openEditTemplate("Mantenimiento")}
                  >
                    <Settings2 className="h-4 w-4" />
                    {t.materials.edit_chs}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> 
                {editingTemplateType === "Instalación" ? t.materials.template_install : t.materials.template_maint}
              </DialogTitle>
              <DialogDescription>
                Define la lista de tareas obligatorias para este tipo de servicio.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Nueva tarea del checklist..." 
                  className="h-10 bg-muted/50 border-border"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <Button size="icon" className="bg-accent hover:bg-accent/90 shrink-0" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tareas Actuales</Label>
                <ScrollArea className="h-[250px] border border-border rounded-xl p-3 bg-muted/10">
                  {tempItems.length > 0 ? (
                    <div className="space-y-2">
                      {tempItems.map((item, idx) => {
                        const labelText = typeof item === 'object' ? (item.name || "Tarea sin nombre") : (item || "Tarea sin nombre");
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg group">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-4 w-4 text-accent/50" />
                              <span className="text-xs text-foreground font-medium">{labelText}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveItem(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                      <CheckCircle2 className="h-8 w-8 mb-2" />
                      <p className="text-[10px] uppercase font-bold">Sin tareas configuradas</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="w-full border-border" onClick={() => setIsEditDialogOpen(false)}>{t.common.cancel}</Button>
              <Button 
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-10 gap-2"
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
              >
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t.common.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
