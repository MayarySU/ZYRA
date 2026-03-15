"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
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
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
  X
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
  const [editingTemplate, setEditingTemplate] = useState<{ type: string; items: any[] } | null>(null);

  const [newMaterial, setNewMaterial] = useState({
    Mat_Nombre: "",
    Mat_Stock_Disponible: 0,
  });

  const materialsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "materiales");
  }, [db]);

  const { data: materials, isLoading: materialsLoading } = useCollection(materialsQuery);

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    return materials.filter(m => 
      m.Mat_Nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
      .finally(() => setLoading(false));
  };

  const handleDeleteMaterial = (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, "materiales", id))
      .then(() => toast({ title: t.common.success, description: t.common.success }));
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Package className="h-12 w-12 text-destructive" />
          <h2 className="text-2xl font-bold text-white">{t.common.error}</h2>
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
            <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
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
            <DialogContent className="bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-accent">{t.materials.new_item}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.materials.catalog}</Label>
                  <Input 
                    placeholder="..." 
                    className="bg-white/5 border-white/10"
                    value={newMaterial.Mat_Nombre}
                    onChange={(e) => setNewMaterial({...newMaterial, Mat_Nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.materials.stock}</Label>
                  <Input 
                    type="number" 
                    className="bg-white/5 border-white/10"
                    value={newMaterial.Mat_Stock_Disponible}
                    onChange={(e) => setNewMaterial({...newMaterial, Mat_Stock_Disponible: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold" disabled={!newMaterial.Mat_Nombre || loading} onClick={handleCreateMaterial}>
                  {loading ? t.common.loading : t.common.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="bg-white/5 border-white/10 p-1">
            <TabsTrigger value="inventory" className="gap-2"><Package className="h-4 w-4" /> {t.materials.general_catalog}</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><Settings2 className="h-4 w-4" /> {t.materials.templates}</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-6">
            <Card className="bg-card border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg font-bold">{t.materials.general_catalog}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t.common.search} className="pl-10 bg-white/5 border-white/10 text-xs h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {materialsLoading ? (
                  <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>
                ) : filteredMaterials.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5">
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.materials.new_item}</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.materials.stock}</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.common.status}</TableHead>
                        <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">{t.common.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterials.map((mat) => (
                        <TableRow key={mat.id} className="border-white/5 hover:bg-white/2">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center"><Package className="h-5 w-5 text-accent" /></div>
                              <div><p className="text-sm font-bold text-white">{mat.Mat_Nombre}</p></div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-lg font-mono font-bold text-white">{mat.Mat_Stock_Disponible}</span></TableCell>
                          <TableCell>
                            {mat.Mat_Stock_Disponible < 10 ? (
                              <Badge className="bg-red-500/10 text-red-500">{t.materials.critical}</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-500">{t.materials.optimal}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteMaterial(mat.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center"><h3 className="text-lg font-bold text-white uppercase">{t.common.no_results}</h3></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-white/5">
                <CardHeader>
                  <div className="flex items-center justify-between"><Zap className="h-6 w-6 text-accent" /></div>
                  <CardTitle className="text-white mt-4">{t.materials.template_install}</CardTitle>
                </CardHeader>
                <CardContent><Button variant="outline" className="w-full font-bold">{t.materials.edit_chs}</Button></CardContent>
              </Card>
              <Card className="bg-card border-white/5">
                <CardHeader>
                  <div className="flex items-center justify-between"><Wrench className="h-6 w-6 text-primary" /></div>
                  <CardTitle className="text-white mt-4">{t.materials.template_maint}</CardTitle>
                </CardHeader>
                <CardContent><Button variant="outline" className="w-full font-bold">{t.materials.edit_chs}</Button></CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
