"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Trash2,
  Wrench,
  UserCheck,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function TeamPage() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [newTeam, setNewTeam] = useState<{
    name: string;
    leaderId: string;
    leaderName: string;
    members: string[];
    type: "Instalación" | "Mantenimiento";
    status: "Activo" | "Disponible";
  }>({
    name: "",
    leaderId: "",
    leaderName: "",
    members: [],
    type: "Instalación",
    status: "Disponible"
  });

  const teamsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) {
      return collection(db, "teams");
    }
    // Consulta dinámica: Solo equipos donde el empleado es miembro
    return query(collection(db, "teams"), where("members", "array-contains", user.uid));
  }, [db, isAdmin, user]);

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, "users");
  }, [db, isAdmin]);

  const { data: teams, isLoading: teamsLoading } = useCollection(teamsQuery);
  const { data: employees } = useCollection(employeesQuery);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter(t => 
      (t.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);

  const handleCreateTeam = () => {
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
        setNewTeam({ name: "", leaderId: "", leaderName: "", members: [], type: "Instalación", status: "Disponible" });
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

  const handleToggleMember = (empId: string) => {
    setNewTeam(prev => {
      const isMember = prev.members.includes(empId);
      if (isMember) {
        return { ...prev, members: prev.members.filter(id => id !== empId) };
      } else {
        return { ...prev, members: [...prev.members, empId] };
      }
    });
  };

  const handleReassignLeader = (teamId: string, newLeaderId: string) => {
    if (!db) return;
    const teamRef = doc(db, "teams", teamId);
    const leader = employees?.find(e => e.id === newLeaderId);
    const updateData = {
      leaderId: newLeaderId,
      leaderName: leader?.nombre || "Técnico Zyra"
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-4xl font-bold tracking-tight text-white font-headline flex items-center gap-3">
              <UsersIcon className="h-10 w-10 text-accent" /> {isAdmin ? "Gestión de Equipos (EQ)" : "Mis Equipos Operativos"}
            </h2>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Configuración de cuadrillas especializadas y miembros." 
                : "Equipos de trabajo a los que has sido asignado por administración."}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-12 px-6">
                  <Plus className="h-5 w-5" /> Nueva Cuadrilla (EQ)
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-accent text-2xl font-bold">Configurar Equipo de Trabajo</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Nombre, tipo de servicio e integrantes de la nueva cuadrilla.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamName" className="text-xs uppercase font-bold text-muted-foreground">Nombre del Equipo</Label>
                      <Input 
                        id="teamName" 
                        placeholder="Ej: Cuadrilla Alpha" 
                        className="bg-white/5 border-white/10 h-10"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Tipo de Equipo</Label>
                      <Select value={newTeam.type} onValueChange={(val: any) => setNewTeam({...newTeam, type: val})}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-10">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="Instalación">Instalación Fotovoltaica</SelectItem>
                          <SelectItem value="Mantenimiento">Mantenimiento Preventivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Líder del Equipo</Label>
                      <Select value={newTeam.leaderId} onValueChange={(val) => {
                        const emp = employees?.find(e => e.id === val);
                        setNewTeam({
                          ...newTeam, 
                          leaderId: val, 
                          leaderName: emp?.nombre || "Técnico Zyra"
                        });
                      }}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-10">
                          <SelectValue placeholder="Seleccionar líder" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          {employees?.filter(e => e.rol !== 'admin').map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col h-full">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Integrantes del Equipo</Label>
                    <ScrollArea className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 h-[200px]">
                      <div className="space-y-3">
                        {employees?.filter(e => e.rol !== 'admin').map(emp => (
                          <div key={emp.id} className="flex items-center space-x-3 group">
                            <Checkbox 
                              id={`emp-${emp.id}`} 
                              checked={newTeam.members.includes(emp.id)}
                              onCheckedChange={() => handleToggleMember(emp.id)}
                              className="border-white/20 data-[state=checked]:bg-accent"
                            />
                            <label 
                              htmlFor={`emp-${emp.id}`}
                              className="text-sm font-medium text-white/80 group-hover:text-white cursor-pointer select-none"
                            >
                              {emp.nombre}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold text-lg"
                    disabled={!newTeam.name || !newTeam.leaderId || newTeam.members.length === 0 || loading}
                    onClick={handleCreateTeam}
                  >
                    {loading ? "Registrando..." : "Confirmar Equipo (EQ)"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex items-center gap-4 bg-white/2 p-4 rounded-xl border border-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar cuadrilla por nombre..." 
              className="pl-10 bg-white/5 border-white/5 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge className="bg-accent text-white font-bold h-11 px-4">{filteredTeams.length} Equipos</Badge>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {teamsLoading ? (
            <div className="col-span-full flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
            </div>
          ) : filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <Card key={team.id} className="bg-card border-white/10 hover:border-accent/40 transition-all group overflow-hidden shadow-2xl relative">
                {isAdmin && (
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
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-accent/20 text-accent group-hover:scale-110 transition-transform">
                      {team.type === 'Mantenimiento' ? <Wrench className="h-6 w-6" /> : <UsersIcon className="h-6 w-6" />}
                    </div>
                    <Badge 
                      onClick={() => isAdmin && handleToggleStatus(team)}
                      className={cn(
                        "font-bold text-[10px] uppercase",
                        isAdmin && "cursor-pointer hover:opacity-80 transition-opacity",
                        team.status === "Activo" ? "bg-primary text-background" : "bg-emerald-500 text-white"
                      )}
                    >
                      {team.status || "DISPONIBLE"}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-white mt-4 group-hover:text-accent transition-colors">
                    {team.name}
                  </CardTitle>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest">{team.type || "Instalación"}</p>
                    <CardDescription className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Crown className="h-3 w-3 text-yellow-500" /> Líder: {team.leaderName}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Integrantes de Cuadrilla</p>
                    <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
                      {team.members?.length || 0} <UserCheck className="h-4 w-4 text-accent" />
                    </p>
                  </div>
                </CardContent>
                {isAdmin && (
                  <div className="p-4 bg-white/2 border-t border-white/5 flex gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-[10px] font-bold border-accent/30 text-accent hover:bg-accent/10 uppercase"
                      onClick={() => {
                        setSelectedTeam(team);
                        setIsReassignDialogOpen(true);
                      }}
                    >
                      Gestionar Líder
                    </Button>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                <UsersIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Sin equipos asignados</h3>
              <p className="text-muted-foreground mt-2 max-w-xs">
                {isAdmin 
                  ? "Aún no has creado ninguna cuadrilla de trabajo." 
                  : "No perteneces a ningún equipo operativo actualmente."}
              </p>
            </div>
          )}
        </div>

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
                      <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
