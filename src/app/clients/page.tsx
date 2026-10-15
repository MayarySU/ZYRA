
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
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Loader2, 
  Briefcase,
  ExternalLink,
  ChevronRight,
  Zap,
  Wrench,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useClientes, useCrearCliente, useEliminarCliente, useProyectos } from "@/hooks/queries";

export default function ClientsPage() {
  const { user, profile, loading: userLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const { data: clients = [], isLoading } = useClientes();
  const { data: proyectos = [] } = useProyectos();
  const crear = useCrearCliente();
  const eliminar = useEliminarCliente();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [newClient, setNewClient] = useState({
    nombre: "",
    razon_social: "",
    correo: "",
    direccion: "",
    telefono: ""
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const selectedProjects = useMemo(() => {
    if (!selectedClient) return [];
    return proyectos.filter(p => p.cliente_id === selectedClient.id_cliente);
  }, [proyectos, selectedClient]);

  const handleCreateClient = async () => {
    if (!isAdmin || !user) return;
    
    // Validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newClient.correo || !emailRegex.test(newClient.correo)) {
      toast({ variant: "destructive", title: "Error", description: "Formato de correo electrónico inválido" });
      return;
    }

    if (!newClient.telefono || !/^\d+$/.test(newClient.telefono)) {
      toast({ variant: "destructive", title: "Error", description: "El teléfono debe ser numérico" });
      return;
    }

    try {
      await crear.mutateAsync({
        nombre: newClient.nombre,
        razon_social: newClient.razon_social,
        correo: newClient.correo,
        direccion: newClient.direccion,
        telefono: newClient.telefono,
        empresa_id: 1
      });
      toast({ title: t.common.success, description: "Cliente registrado exitosamente" });
      setIsCreateDialogOpen(false);
      setNewClient({
        nombre: "",
        razon_social: "",
        correo: "",
        direccion: "",
        telefono: ""
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: "Error al registrar cliente" });
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    if (!isAdmin || !user) return;
    try {
      await eliminar.mutateAsync(clientId);
      toast({ title: t.common.success, description: "Cliente eliminado correctamente." });
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: "Error al eliminar el cliente." });
    }
  };

  const handleViewProjects = (client: any) => {
    setSelectedClient(client);
    setIsProjectsDialogOpen(true);
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
            <Building2 className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t.common.error}</h2>
          <p className="text-muted-foreground max-w-md">
            No tienes permisos para gestionar el catálogo de clientes.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body text-foreground">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-8 w-8 text-accent" /> Clientes (CL)
            </h2>
            <p className="text-muted-foreground">Gestión de razones sociales y contactos operativos.</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> Registrar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-lg bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-accent">Registrar Cliente</DialogTitle>
                <DialogDescription>
                  Completa los datos fiscales y de contacto del nuevo cliente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Nombre Comercial</Label>
                    <Input 
                      id="name" 
                      placeholder="Nombre..." 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.nombre}
                      onChange={(e) => setNewClient({...newClient, nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal" className="text-xs uppercase font-bold text-muted-foreground">Razón Social</Label>
                    <Input 
                      id="legal" 
                      placeholder="S.A. de C.V." 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.razon_social}
                      onChange={(e) => setNewClient({...newClient, razon_social: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Correo electrónico</Label>
                    <Input 
                      type="email"
                      placeholder="email@empresa.com" 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.correo}
                      onChange={(e) => setNewClient({...newClient, correo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Teléfono</Label>
                    <Input 
                      placeholder="10 dígitos" 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.telefono}
                      onChange={(e) => setNewClient({...newClient, telefono: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Dirección Fiscal / Obra</Label>
                  <Input 
                    placeholder="Calle, No, Colonia..." 
                    className="bg-muted/50 border-border text-foreground"
                    value={newClient.direccion}
                    onChange={(e) => setNewClient({...newClient, direccion: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold"
                  disabled={!newClient.nombre || crear.isPending}
                  onClick={handleCreateClient}
                >
                  {crear.isPending ? "Cargando..." : "Guardar Cliente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-2xl overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-foreground text-lg font-bold">Catálogo de Clientes</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-10 h-9 text-xs bg-background border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : filteredClients.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Nombre Comercial</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Razón Social</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Correo electrónico</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Dirección Fiscal / Obra</TableHead>
                    <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id_cliente} className="hover:bg-muted/20 transition-colors border-border">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{client.nombre}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground italic">
                          {client.razon_social || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-foreground">
                            <Mail className="h-3 w-3 text-accent" /> {client.correo || "-"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" /> {client.telefono || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-accent" /> {client.direccion || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-accent hover:bg-accent/10 font-bold text-[10px] gap-2"
                            onClick={() => handleViewProjects(client)}
                          >
                            VER PROYECTOS <ChevronRight className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Eliminar permanentemente al cliente {client.nombre}?
                                  <span className="block mt-2 font-bold text-destructive">
                                    ¡Advertencia! No hay vuelta atrás. Todos los proyectos vinculados a este cliente también se eliminarán del sistema de inmediato.
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-muted">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteClient(client.id_cliente)}
                                  className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">Sin resultados</h3>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Proyectos por Cliente */}
        <Dialog open={isProjectsDialogOpen} onOpenChange={setIsProjectsDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl bg-card border-border max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Briefcase className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">Proyectos de Propiedad</DialogTitle>
                  <DialogDescription className="text-accent font-bold text-xs uppercase tracking-widest">
                    {selectedClient?.nombre}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-6">
              {selectedProjects.length > 0 ? (
                <div className="grid gap-4">
                  {selectedProjects.map((project) => (
                    <div 
                      key={project.id_proyecto} 
                      className="group p-4 rounded-2xl bg-muted/20 border border-border hover:border-accent/40 transition-all flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            {project.nombre_proyecto}
                            <Badge variant="outline" className="text-[8px] font-black uppercase border-accent/30 text-accent h-4">
                              {project.estado}
                            </Badge>
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
                            <MapPin className="h-3 w-3 text-accent" />
                            <span className="truncate max-w-[250px]">{project.ubicacion || "Sin dirección"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <ExternalLink className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Sin obras registradas</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">Este cliente aún no tiene proyectos de propiedad asignados en el sistema.</p>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold" onClick={() => setIsProjectsDialogOpen(false)}>
                CERRAR EXPEDIENTE
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
