"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Crown, 
  Zap, 
  UserPlus, 
  Briefcase,
  TrendingUp,
  Settings2,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

// Demo data for fallback
const FALLBACK_TEAMS = [
  { id: "team-1", name: "Equipo Alpha Operativo", leaderName: "Carlos Rivera", leaderId: "l1", memberCount: 4, status: "Activo" },
  { id: "team-2", name: "Cuadrilla Solar Sur", leaderName: "Andrea Soto", leaderId: "l2", memberCount: 3, status: "Disponible" },
];

export default function TeamPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newTeam, setNewTeam] = useState({
    name: "",
    leaderId: "",
    leaderName: "",
    memberCount: 1,
    status: "Disponible"
  });

  // Queries
  const teamsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "teams");
  }, [db]);

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: teams, isLoading: teamsLoading } = useCollection(teamsQuery);
  const { data: employees } = useCollection(employeesQuery);

  const displayTeams = useMemo(() => {
    const base = (teams && teams.length > 0) ? teams : FALLBACK_TEAMS;
    return base.filter(t => {
      const teamName = t.name || "Equipo sin nombre";
      return teamName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [teams, searchTerm]);

  const handleCreateTeam = async () => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db, "teams");
    const data = {
      ...newTeam,
      createdAt: serverTimestamp(),
    };

    addDoc(colRef, data)
      .then(() => {
        toast({ title: "Equipo Creado", description: `El equipo ${newTeam.name} ha sido registrado.` });
        setIsCreateDialogOpen(false);
        setNewTeam({ name: "", leaderId: "", leaderName: "", memberCount: 1, status: "Disponible" });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  const handleReassignLeader = async (teamId: string, newLeaderId: string) => {
    if (!db) return;
    const teamRef = doc(db, "teams", teamId);
    const leader = employees?.find(e => e.id === newLeaderId);
    const updateData = {
      leaderId: newLeaderId,
      leaderName: leader?.Emp_Nombre || leader?.nombre || "Técnico Zyra"
    };

    setDoc(teamRef, updateData, { merge: true })
      .then(() => {
        toast({ title: "Líder Reasignado", description: "El equipo ahora tiene un nuevo supervisor." });
        setIsReassignDialogOpen(false);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: teamRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleToggleStatus = (team: any) => {
    if (!db) return;
    const teamRef = doc(db, "teams", team.id);
    const newStatus = team.status === "Activo" ? "Disponible" : "Activo";
    const updateData = { status: newStatus };
    
    setDoc(teamRef, updateData, { merge: true })
      .then(() => {
        toast({ title: "Estado Actualizado", description: `El equipo ${team.name} ahora está ${newStatus.toLowerCase()}.` });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: teamRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!db) return;
    const teamRef = doc(db, "teams", teamId);
    
    deleteDoc(teamRef)
      .then(() => {
        toast({ title: "Equipo Disuelto", description: "La cuadrilla ha sido eliminada del sistema." });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: teamRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8 font-body">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(138,43,226,0.3)]">
              <UsersIcon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Mi Equipo Operativo</h2>
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest mt-1">Sincronizado con Central Zyra</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card border-white/5 overflow-hidden relative border-l-4 border-l-yellow-500">
              <div className="absolute top-4 right-4">
                <Crown className="h-5 w-5 text-yellow-500" />
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-20 w-20 border-4 border-white/5 ring-2 ring-accent">
                    <AvatarImage src={`https://picsum.photos/seed/leader/200`} />
                    <AvatarFallback>LD</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-white">Líder de Cuadrilla</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Supervisor de Obra</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 w-full text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Estado</p>
                    <p className="text-sm font-bold text-accent">EN OPERACIÓN</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/5 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-20 w-20 border-4 border-white/5 ring-2 ring-primary">
                    <AvatarImage src={`https://picsum.photos/seed/${profile?.nombre}/200`} />
                    <AvatarFallback>TU</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-white">{profile?.nombre}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Técnico Instalador</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 w-full text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Nivel</p>
                    <p className="text-sm font-bold text-primary">{profile?.nivel || 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-accent/10 border-accent/30 border shadow-lg overflow-hidden">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(138,43,226,0.6)]">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Desafío de Cuadrilla</h3>
                  <p className="text-muted-foreground mt-1 text-sm">Logren 5 días de racha colectiva para bono de materiales.</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Progreso Grupal</span>
                <div className="flex items-center gap-2">
                  {[1,1,1,0,0].map((dot, i) => (
                    <div key={i} className={cn("h-3 w-3 rounded-full", dot ? "bg-accent shadow-[0_0_10px_#8A2BE2]" : "bg-white/10")} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-4xl font-bold tracking-tight text-white font-headline flex items-center gap-3">
              <UsersIcon className="h-10 w-10 text-accent" /> Gestión de Equipos (EQ)
            </h2>
            <p className="text-muted-foreground">Supervisión de cuadrillas, asignación de líderes y estados operativos.</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-12 px-6">
                <Plus className="h-5 w-5" /> Nueva Cuadrilla (EQ)
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-accent text-2xl font-bold">Crear Unidad de Trabajo</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Defina el nombre del equipo y asigne un líder responsable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="text-xs uppercase font-bold text-muted-foreground">Nombre del Equipo</Label>
                  <Input 
                    id="teamName" 
                    placeholder="Ej: Cuadrilla Gamma" 
                    className="bg-white/5 border-white/10 h-12"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Líder Responsable</Label>
                  <Select onValueChange={(val) => {
                    const emp = employees?.find(e => e.id === val);
                    setNewTeam({
                      ...newTeam, 
                      leaderId: val, 
                      leaderName: emp?.Emp_Nombre || emp?.nombre || "Técnico Zyra"
                    });
                  }}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Seleccionar líder" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      {employees?.filter(e => e.rol !== 'admin').map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.Emp_Nombre || emp.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Miembros iniciales</Label>
                    <Input 
                      type="number" 
                      className="bg-white/5 border-white/10 h-12"
                      value={newTeam.memberCount}
                      onChange={(e) => setNewTeam({...newTeam, memberCount: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Estado Inicial</Label>
                    <Badge className="w-full h-12 justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20">DISPONIBLE</Badge>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold text-lg"
                  disabled={!newTeam.name || !newTeam.leaderId || loading}
                  onClick={handleCreateTeam}
                >
                  {loading ? "Registrando..." : "Confirmar Equipo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 bg-white/2 p-4 rounded-xl border border-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar equipos por nombre..." 
              className="pl-10 bg-white/5 border-white/5 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-accent text-white font-bold h-11 px-4">{displayTeams.length} Equipos</Badge>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {teamsLoading ? (
            <div className="col-span-full flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
            </div>
          ) : displayTeams.map((team) => (
            <Card key={team.id} className="bg-card border-white/10 hover:border-accent/40 transition-all group overflow-hidden shadow-2xl relative">
              <div className="absolute top-2 right-2">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="text-muted-foreground hover:text-red-500"
                   onClick={() => handleDeleteTeam(team.id)}
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-accent/20 text-accent group-hover:scale-110 transition-transform">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                  <Badge 
                    onClick={() => handleToggleStatus(team)}
                    className={cn(
                      "font-bold text-[10px] uppercase cursor-pointer hover:opacity-80 transition-opacity",
                      team.status === "Activo" ? "bg-primary text-background" : "bg-emerald-500 text-white"
                    )}
                  >
                    {team.status || "DISPONIBLE"}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-white mt-4 group-hover:text-accent transition-colors">
                  {team.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Crown className="h-3 w-3 text-yellow-500" /> Líder: {team.leaderName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Dotación</p>
                    <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                      {team.memberCount} <UserPlus className="h-3.5 w-3.5 text-accent" />
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Rendimiento</p>
                    <p className="text-lg font-bold text-emerald-500 flex items-center justify-center gap-1">
                      94% <TrendingUp className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-bold text-accent tracking-widest flex items-center gap-2">
                    <Briefcase className="h-3 w-3" /> Estado de Obra
                  </h4>
                  {team.status === "Activo" ? (
                    <div className="bg-white/2 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-white font-medium">Asignado a Proyecto Solar Norte</p>
                      <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-accent w-[45%]" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                      Sin proyectos asignados. Listo para despacho.
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="p-4 bg-white/2 border-t border-white/5 flex gap-2">
                <Button 
                  variant="ghost" 
                  className="flex-1 text-[10px] font-bold text-muted-foreground hover:text-white uppercase"
                  onClick={() => {
                    toast({ title: "Módulo en construcción", description: "El histórico detallado de cuadrilla estará disponible pronto." });
                  }}
                >
                  Detalles
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-[10px] font-bold border-accent/30 text-accent hover:bg-accent/10 uppercase"
                  onClick={() => {
                    setSelectedTeam(team);
                    setIsReassignDialogOpen(true);
                  }}
                >
                  Reasignar
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Modal para Reasignar Líder */}
        <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Reasignar Liderazgo
              </DialogTitle>
              <DialogDescription>
                Cambie al supervisor responsable del {selectedTeam?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Nuevo Líder Zyra</Label>
                <Select onValueChange={(val) => handleReassignLeader(selectedTeam.id, val)}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue placeholder="Seleccionar nuevo líder" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 text-white">
                    {employees?.filter(e => e.rol !== 'admin' && e.id !== selectedTeam?.leaderId).map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.Emp_Nombre || emp.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setIsReassignDialogOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
