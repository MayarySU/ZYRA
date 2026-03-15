"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
import { Building2, Plus, Search, Mail, Phone, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";

export default function ClientsPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newClient, setNewClient] = useState({
    Cl_Nombre: "",
    Cl_RazonSocial: "",
    Cl_Correo: "",
    Cl_Direccion: "",
    Cl_Telefono: ""
  });

  const clientsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "clientes");
  }, [db]);

  const { data: clients, isLoading: clientsLoading } = useCollection(clientsQuery);

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
      toast({ variant: "destructive", title: t.common.error, description: "Error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Building2 className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t.common.error}</h2>
          <p className="text-muted-foreground max-w-md">
            {t.employees.subtitle}
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
            <DialogContent className="bg-card border-white/10 text-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-accent">{t.clients.register}</DialogTitle>
                <CardDescription>
                  {t.clients.subtitle}
                </CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">{t.clients.name}</Label>
                    <Input 
                      id="name" 
                      placeholder="ZYRA..." 
                      className="bg-white/5 border-white/10"
                      value={newClient.Cl_Nombre}
                      onChange={(e) => setNewClient({...newClient, Cl_Nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal" className="text-xs uppercase font-bold text-muted-foreground">{t.clients.legal}</Label>
                    <Input 
                      id="legal" 
                      placeholder="..." 
                      className="bg-white/5 border-white/10"
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
                      className="bg-white/5 border-white/10"
                      value={newClient.Cl_Correo}
                      onChange={(e) => setNewClient({...newClient, Cl_Correo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t.clients.phone}</Label>
                    <Input 
                      placeholder="+..." 
                      className="bg-white/5 border-white/10"
                      value={newClient.Cl_Telefono}
                      onChange={(e) => setNewClient({...newClient, Cl_Telefono: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.clients.address}</Label>
                  <Input 
                    placeholder="..." 
                    className="bg-white/5 border-white/10"
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

        <Card className="bg-card border-white/5 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-bold">{t.clients.catalog}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t.common.search} 
                  className="pl-10 bg-white/5 border-white/5 text-xs h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clientsLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
              </div>
            ) : filteredClients.length > 0 ? (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.name}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.legal}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.email}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.clients.address}</TableHead>
                    <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{client.Cl_Nombre}</p>
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
                          <div className="flex items-center gap-2 text-xs text-white">
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
                        <Button variant="ghost" size="sm" className="text-accent hover:bg-accent/10 font-bold text-[10px]">
                          {t.clients.view_projects}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">{t.common.no_results}</h3>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
