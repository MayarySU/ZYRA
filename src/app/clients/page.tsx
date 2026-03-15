
"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore";
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
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const { profile, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [newClient, setNewClient] = useState({
    Cl_Nombre: "",
    Cl_RazonSocial: "",
    Cl_Correo: "",
    Cl_Direccion: "",
    Cl_Telefono: ""
  });

  // Query de clientes
  const clientsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "clientes");
  }, [db]);

  const { data: clients, isLoading: clientsLoading } = useCollection(clientsQuery);

  // Query de proyectos vinculados al cliente seleccionado
  const clientProjectsQuery = useMemoFirebase(() => {
    if (!db || !selectedClient) return null;
    return query(collection(db, "proyectos"), where("clientId", "==", selectedClient.id));
  }, [db, selectedClient]);

  const { data: clientProjects, isLoading: projectsLoading } = useCollection(clientProjectsQuery);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => 
      c.Cl_Nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.Cl_RazonSocial?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const handleCreateClient = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "clientes"), {
        ...newClient,
        createdAt: serverTimestamp(),
      });
      toast({ title: t.common.success, description: t.projects.create_success });
      setIsCreateDialogOpen(false);
      setNewClient({
        Cl_Nombre: "",
        Cl_RazonSocial: "",
        Cl_Correo: "",
        Cl_Direccion: "",
        Cl_Telefono: ""
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: "Error al registrar cliente" });
    } finally {
      setLoading(false);
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
              <Building2 className="h-8 w-8 text-accent" /> {t.clients.title}
            </h2>
            <p className="text-muted-foreground">{t.clients.subtitle}</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> {t.clients.register}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-accent">{t.clients.register}</DialogTitle>
                <DialogDescription>
                  Completa los datos fiscales y de contacto del nuevo cliente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">{t.clients.name}</Label>
                    <Input 
                      id="name" 
                      placeholder="ZYRA..." 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.Cl_Nombre}
                      onChange={(e) => setNewClient({...newClient, Cl_Nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal" className="text-xs uppercase font-bold text-muted-foreground">{t.clients.legal}</Label>
                    <Input 
                      id="legal" 
                      placeholder="..." 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.Cl_RazonSocial}
                      onChange={(e) => setNewClient({...newClient, Cl_RazonSocial: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t.clients.email}</Label>
                    <Input 
                      type="email"
                      placeholder="email@company.com" 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.Cl_Correo}
                      onChange={(e) => setNewClient({...newClient, Cl_Correo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t.clients.phone}</Label>
                    <Input 
                      placeholder="+..." 
                      className="bg-muted/50 border-border text-foreground"
                      value={newClient.Cl_Telefono}
                      onChange={(e) => setNewClient({...newClient, Cl_Telefono: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.clients.address}</Label>
                  <Input 
                    placeholder="..." 
                    className="bg-muted/50 border-border text-foreground"
                    value={newClient.Cl_Direccion}
                    onChange={(e) => setNewClient({...newClient, Cl_Direccion: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold"
                  disabled={!newClient.Cl_Nombre || loading}
                  onClick={handleCreateClient}
                >
                  {loading ? t.common.loading : t.common.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-2xl overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-lg font-bold">{t.clients.catalog}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t.common.search} 
                  className="pl-10 h-9 text-xs bg-background border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clientsLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : filteredClients.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.name}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.legal}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.email}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.address}</TableHead>
                    <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/20 transition-colors border-border">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{client.Cl_Nombre}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t.common.id}: {client.id.substring(0,8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground italic">
                          {client.Cl_RazonSocial || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-foreground">
                            <Mail className="h-3 w-3 text-accent" /> {client.Cl_Correo || "-"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" /> {client.Cl_Telefono || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-accent" /> {client.Cl_Direccion || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-accent hover:bg-accent/10 font-bold text-[10px] gap-2"
                          onClick={() => handleViewProjects(client)}
                        >
                          {t.clients.view_projects} <ChevronRight className="h-3 w-3" />
                        </Button>
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
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">{t.common.no_results}</h3>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Proyectos por Cliente */}
        <Dialog open={isProjectsDialogOpen} onOpenChange={setIsProjectsDialogOpen}>
          <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Briefcase className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">Proyectos de Propiedad</DialogTitle>
                  <DialogDescription className="text-accent font-bold text-xs uppercase tracking-widest">
                    {selectedClient?.Cl_Nombre}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-6">
              {projectsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Sincronizando expediente...</p>
                </div>
              ) : clientProjects && clientProjects.length > 0 ? (
                <div className="grid gap-4">
                  {clientProjects.map((project) => (
                    <div 
                      key={project.id} 
                      className="group p-4 rounded-2xl bg-muted/20 border border-border hover:border-accent/40 transition-all flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            {project.Pry_Nombre_Proyecto}
                            <Badge variant="outline" className="text-[8px] font-black uppercase border-accent/30 text-accent h-4">
                              {project.serviceType === 'Mantenimiento' ? <Wrench className="h-2 w-2 mr-1" /> : <Zap className="h-2 w-2 mr-1" />}
                              {project.serviceType}
                            </Badge>
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
                            <MapPin className="h-3 w-3 text-accent" />
                            <span className="truncate max-w-[250px]">{project.ubicacion}</span>
                          </div>
                        </div>
                        <Badge 
                          className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                            project.Pry_Estado === 'Finalizado' ? 'bg-emerald-500' : 'bg-yellow-500'
                          )}
                        >
                          {project.Pry_Estado || 'PENDIENTE'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          <span>Progreso de Obra</span>
                          <span className="text-accent">{project.progreso || 0}%</span>
                        </div>
                        <Progress value={project.progreso || 0} className="h-1.5" />
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
