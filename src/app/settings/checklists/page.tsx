"use client";

import { useState } from "react";
import DashboardLayout from "../../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Save, 
  Wrench, 
  Zap, 
  Loader2, 
  ChevronRight,
  Settings2,
  CheckCircle2,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

export default function ChecklistSettingsPage() {
  const { profile, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newItemName, setNewItemName] = useState("");

  const checklistsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, "checklist_servicio");
  }, [db, isAdmin]);

  const { data: templates, isLoading: templatesLoading } = useCollection(checklistsQuery);

  const handleCreateTemplate = async () => {
    if (!db || !newTemplateName) return;
    setSaving(true);
    try {
      const templateId = newTemplateName.trim();
      await setDoc(doc(db, "checklist_servicio", templateId), {
        id: templateId,
        items: [],
        createdAt: serverTimestamp()
      });
      toast({ title: t.common.success, description: "Plantilla creada" });
      setNewTemplateName("");
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error, description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const addItemToTemplate = () => {
    if (!newItemName || !editingTemplate) return;
    const updatedItems = [...(editingTemplate.items || []), newItemName.trim()];
    setEditingTemplate({ ...editingTemplate, items: updatedItems });
    setNewItemName("");
  };

  const removeItemFromTemplate = (index: number) => {
    if (!editingTemplate) return;
    const updatedItems = editingTemplate.items.filter((_: any, i: number) => i !== index);
    setEditingTemplate({ ...editingTemplate, items: updatedItems });
  };

  const handleSaveTemplate = async () => {
    if (!db || !editingTemplate) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "checklist_servicio", editingTemplate.id), {
        items: editingTemplate.items,
        updatedAt: serverTimestamp()
      });
      toast({ title: t.common.success, description: "Plantilla guardada" });
      setEditingTemplate(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error, description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "checklist_servicio", id));
      toast({ title: t.common.success, description: "Plantilla eliminada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error });
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Settings2 className="h-12 w-12 text-destructive opacity-20 mb-4" />
          <h2 className="text-xl font-bold">Acceso Denegado</h2>
          <p className="text-muted-foreground">Solo administradores pueden gestionar las plantillas.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-accent" /> Gestión de Checklists
            </h2>
            <p className="text-muted-foreground">Administra las listas de tareas para los diferentes servicios.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Nombre de nueva plantilla..." 
              className="w-64 bg-background border-border"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
            <Button 
              className="bg-accent hover:bg-accent/90 text-white font-bold gap-2"
              onClick={handleCreateTemplate}
              disabled={!newTemplateName || saving}
            >
              <Plus className="h-4 w-4" /> Crear
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Templates List */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2 px-2">
              <Layers className="h-3 w-3" /> Plantillas Disponibles
            </h3>
            <div className="space-y-3">
              {templatesLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent opacity-20" /></div>
              ) : templates && templates.length > 0 ? (
                templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={cn(
                      "cursor-pointer group hover:border-accent/50 transition-all shadow-md overflow-hidden",
                      editingTemplate?.id === template.id ? "border-accent ring-1 ring-accent" : "border-border"
                    )}
                    onClick={() => setEditingTemplate(template)}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50 border border-border group-hover:bg-accent/10 transition-colors">
                          {template.id.toLowerCase().includes('mant') ? <Wrench className="h-4 w-4 text-accent" /> : <Zap className="h-4 w-4 text-accent" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{template.id}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">{template.items?.length || 0} tareas</p>
                        </div>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", editingTemplate?.id === template.id && "rotate-90 text-accent")} />
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No hay plantillas creadas</p>
                </div>
              )}
            </div>
          </div>

          {/* Editor Area */}
          <div className="lg:col-span-2">
            {editingTemplate ? (
              <Card className="border-border shadow-2xl h-full flex flex-col">
                <CardHeader className="border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-foreground">{editingTemplate.id}</CardTitle>
                      <CardDescription>Editando lista de verificación de servicio</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTemplate(editingTemplate.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </Button>
                      <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold" onClick={handleSaveTemplate} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Guardar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 space-y-6">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nueva tarea para el técnico..." 
                      className="flex-1 bg-background"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addItemToTemplate()}
                    />
                    <Button variant="secondary" onClick={addItemToTemplate} disabled={!newItemName}>
                      Agregar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Lista de Tareas</Label>
                    <div className="space-y-2">
                      {editingTemplate.items && editingTemplate.items.length > 0 ? (
                        editingTemplate.items.map((item: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-muted/20 border border-border/50 rounded-xl group hover:border-accent/30 transition-colors">
                            <CheckCircle2 className="h-4 w-4 text-accent/40" />
                            <span className="text-sm flex-1 text-foreground">{item}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeItemFromTemplate(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 bg-muted/5 rounded-2xl border border-dashed border-border/50">
                          <ClipboardList className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4" />
                          <p className="text-xs text-muted-foreground">Esta plantilla no tiene tareas todavía</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t border-border p-4 text-right">
                  <p className="text-[10px] text-muted-foreground font-medium italic">
                    * Los cambios serán visibles la próxima vez que se cree un proyecto con este tipo de servicio.
                  </p>
                </CardFooter>
              </Card>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-muted/5 border-2 border-dashed border-border rounded-3xl p-12 text-center">
                <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                  <Layers className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-foreground uppercase tracking-widest mb-2">Selecciona una plantilla</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Haz clic en una plantilla de la izquierda para editar sus tareas o crea una nueva arriba.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
