
"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
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
  ClipboardCheck,
  Zap,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MaterialsPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Inventario states
  const [newMaterial, setNewMaterial] = useState({
    Mat_Nombre: "",
    Mat_Stock_Disponible: 0,
  });

  // Queries
  const materialsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "materiales");
  }, [db]);

  const { data: materials, loading: materialsLoading } = useCollection(materialsQuery);

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    return materials.filter(m => 
      m.Mat_Nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  const handleCreateMaterial = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "materiales"), {
        ...newMaterial,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Material registrado", description: "Se añadió al catálogo de inventario." });
      setIsCreateDialogOpen(false);
      setNewMaterial({ Mat_Nombre: "", Mat_Stock_Disponible: 0 });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el material." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "materiales", id));
      toast({ title: "Eliminado", description: "Material removido del catálogo." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Package className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-muted-foreground max-w-md">
            Solo el personal administrativo tiene permisos para gestionar el inventario y las plantillas de obra.
          </p>
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
              <Package className="h-8 w-8 text-accent" /> Inventario y Materiales (MAT)
            </h2>
            <p className="text-muted-foreground">Configuración de insumos críticos y plantillas de servicio.</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> Nuevo Insumo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-accent">Registrar en Catálogo (MAT)</DialogTitle>
                <CardDescription>
                  Defina el nombre y stock base del material para proyectos fotovoltaicos.
                </CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Nombre del Material</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Panel Jinko 450W Monocristalino" 
                    className="bg-white/5 border-white/10"
                    value={newMaterial.Mat_Nombre}
                    onChange={(e) => setNewMaterial({...newMaterial, Mat_Nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Stock Inicial Disponible</Label>
                  <Input 
                    type="number"
                    placeholder="0" 
                    className="bg-white/5 border-white/10"
                    value={newMaterial.Mat_Stock_Disponible}
                    onChange={(e) => setNewMaterial({...newMaterial, Mat_Stock_Disponible: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold"
                  disabled={!newMaterial.Mat_Nombre || loading}
                  onClick={handleCreateMaterial}
                >
                  {loading ? "Registrando..." : "Guardar en Catálogo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="bg-white/5 border-white/10 p-1">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
              <Package className="h-4 w-4" /> Catálogo General
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-background gap-2">
              <Settings2 className="h-4 w-4" /> Plantillas por Obra
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-6">
            <Card className="bg-card border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg font-bold">Existencias en Bodega</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar material..." 
                      className="pl-10 bg-white/5 border-white/5 text-xs h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {materialsLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
                  </div>
                ) : filteredMaterials.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Insumo</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Stock Disponible</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Estado</TableHead>
                        <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterials.map((mat) => (
                        <TableRow key={mat.id} className="border-white/5 hover:bg-white/2 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Package className="h-5 w-5 text-accent" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{mat.Mat_Nombre}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">ID: {mat.id.substring(0,8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-mono font-bold text-white">
                              {mat.Mat_Stock_Disponible} <span className="text-[10px] text-muted-foreground uppercase">unid</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            {mat.Mat_Stock_Disponible < 10 ? (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                                <AlertTriangle className="h-3 w-3" /> CRÍTICO
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">ÓPTIMO</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteMaterial(mat.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Sin materiales registrados</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                      Registre materiales para comenzar a crear plantillas de servicio.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Instalación Template */}
              <Card className="bg-card border-white/5 hover:border-accent/20 transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <Zap className="h-6 w-6 text-accent" />
                    </div>
                    <Badge className="bg-accent/10 text-accent uppercase text-[10px]">Estandarizado</Badge>
                  </div>
                  <CardTitle className="text-white mt-4">Plantilla: Instalación Solar</CardTitle>
                  <CardDescription>Lista base de materiales requeridos para nuevas obras fotovoltaicas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-white/5 bg-white/2 rounded-lg border border-white/5 overflow-hidden">
                    {[
                      { name: "Paneles Fotovoltaicos", qty: 24 },
                      { name: "Inversor Híbrido", qty: 1 },
                      { name: "Estructura de Aluminio", qty: 4 },
                      { name: "Cable Solar 6mm", qty: 100 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3">
                        <span className="text-xs text-white">{item.name}</span>
                        <span className="text-xs font-bold text-accent">{item.qty} unid</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full border-white/10 text-xs font-bold hover:bg-accent/10">
                    EDITAR CONFIGURACIÓN (CHS)
                  </Button>
                </CardContent>
              </Card>

              {/* Mantenimiento Template */}
              <Card className="bg-card border-white/5 hover:border-primary/20 transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Wrench className="h-6 w-6 text-primary" />
                    </div>
                    <Badge className="bg-primary/10 text-primary uppercase text-[10px]">Estandarizado</Badge>
                  </div>
                  <CardTitle className="text-white mt-4">Plantilla: Mantenimiento Preventivo</CardTitle>
                  <CardDescription>Kit de insumos necesarios para limpiezas y revisiones técnicas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-white/5 bg-white/2 rounded-lg border border-white/5 overflow-hidden">
                    {[
                      { name: "Líquido Limpiador Dieléctrico", qty: 2 },
                      { name: "Terminales MC4", qty: 10 },
                      { name: "Fusibles de Protección", qty: 5 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3">
                        <span className="text-xs text-white">{item.name}</span>
                        <span className="text-xs font-bold text-primary">{item.qty} unid</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full border-white/10 text-xs font-bold hover:bg-primary/10">
                    EDITAR CONFIGURACIÓN (CHS)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
