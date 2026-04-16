"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where } from "firebase/firestore";
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
  Trash2, 
  Wrench,
  UserCheck,
  Settings2,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useI18n } from "@/components/providers/i18n-provider";

export default function TeamPage() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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

  const [editTeamData, setEditTeamData] = useState<any>(null);

  const teamsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) {
      return collection(db, "teams");
    }
    return query(collection(db, "teams"), where("members", "array-contains", user.uid));
  }, [db, isAdmin, user]);

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Permitimos a todos los usuarios ver la lista básica para resolver nombres de compañeros
    return collection(db, "users");
  }, [db, user]);

  const { data: teams, isLoading: teamsLoading } = useCollection(teamsQuery);
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery);

  // Filtrar empleados que tengan un nombre válido y no sean admins
  const validEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => (emp.nombre || emp.Emp_Nombre) && emp.rol !== 'admin');
  }, [employees]);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter(t => 
      (t.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);

  const handleCreateTeam = async () => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db, "teams");
    const data = {
      ...newTeam,
      leaderName: newTeam.leaderId ? newTeam.leaderName : "",
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(colRef, data);
      toast({ title: t.common.success, description: t.projects.create_success });
      setIsCreateDialogOpen(false);
      setNewTeam({ name: "", leaderId: "", leaderName: "", members: [], type: "Instalación", status: "Disponible" });
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMember = (empId: string) => {
    setNewTeam(prev => {
      const isRemoving = prev.members.includes(empId);
      const newMembers = isRemoving
        ? prev.members.filter(id => id !== empId)
        : [...prev.members, empId];
      
      // Validation: If removing the current leader, clear the leader fields
      const shouldClearLeader = isRemoving && empId === prev.leaderId;
      
      return {
        ...prev,
        members: newMembers,
        leaderId: shouldClearLeader ? "" : prev.leaderId,
        leaderName: shouldClearLeader ? "" : prev.leaderName
      };
    });
  };

  const openEditDialog = (team: any) => {
    setSelectedTeam(team);
    setEditTeamData({
      name: team.name || "",
      leaderId: team.leaderId || "",
      leaderName: team.leaderName || "",
      members: team.members || [],
      type: team.type || "Instalación",
      status: team.status || "Disponible"
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleEditMember = (empId: string) => {
    setEditTeamData((prev: any) => {
      const isRemoving = prev.members.includes(empId);
      const newMembers = isRemoving
        ? prev.members.filter((id: string) => id !== empId)
        : [...prev.members, empId];

      // Validation: If removing the current leader, clear the leader fields
      const shouldClearLeader = isRemoving && empId === prev.leaderId;

      return {
        ...prev,
        members: newMembers,
        leaderId: shouldClearLeader ? "" : prev.leaderId,
        leaderName: shouldClearLeader ? "" : prev.leaderName
      };
    });
  };

  const handleUpdateTeam = async () => {
    if (!db || !selectedTeam || !editTeamData) return;
    setLoading(true);
    
    const teamRef = doc(db, "teams", selectedTeam.id);
    const leader = validEmployees?.find(e => e.id === editTeamData.leaderId);
    
    const updateData = {
      ...editTeamData,
      leaderName: editTeamData.leaderId 
        ? ((leader?.nombre || leader?.Emp_Nombre) || editTeamData.leaderName)
        : ""
    };

    try {
      await setDoc(teamRef, updateData, { merge: true });
      toast({ title: t.common.success });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: teamRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 font-body px-2 sm:px-4 md:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 md:gap-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white font-headline flex items-center justify-center md:justify-start gap-2 md:gap-3">
              <UsersIcon className="h-8 w-8 md:h-10 md:w-10 text-accent" /> {isAdmin ? t.teams.title_admin : t.teams.title_op}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {isAdmin ? t.teams.subtitle_admin : t.teams.subtitle_op}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-11 md:h-12 px-4 md:px-6 w-full md:w-auto">
                  <Plus className="h-5 w-5" /> {t.teams.new_team}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-white/10 text-white sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-accent">{t.teams.new_team}</DialogTitle>
                  <DialogDescription>{t.teams.subtitle_admin}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 py-2 md:py-4">
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.team_name}</Label>
                      <Input 
                        placeholder="..." 
                        className="bg-white/5 border-white/10 h-10"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.team_type}</Label>
                      <Select value={newTeam.type} onValueChange={(val: any) => setNewTeam({...newTeam, type: val})}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="Instalación">{t.teams.installation}</SelectItem>
                          <SelectItem value="Mantenimiento">{t.teams.maintenance}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Select value={newTeam.leaderId} onValueChange={(val) => {
                        const emp = validEmployees?.find(e => e.id === val);
                        setNewTeam({ ...newTeam, leaderId: val, leaderName: (emp?.nombre || emp?.Emp_Nombre) || "Técnico Zyra" });
                      }} disabled={newTeam.members.length === 0}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-10">
                          <SelectValue placeholder={newTeam.members.length === 0 ? "Primero agrega integrantes" : "Selecciona un líder"} />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          {validEmployees
                            .filter(emp => newTeam.members.includes(emp.id))
                            .map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.nombre || emp.Emp_Nombre}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5 md:space-y-2 flex flex-col">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.members}</Label>
                    <ScrollArea className="bg-white/5 border border-white/10 rounded-lg p-2 md:p-3 h-[200px] md:max-h-[220px]">
                      <div className="divide-y divide-white/5">
                        {validEmployees.map(emp => (
                          <div key={emp.id} className="flex items-center space-x-3 py-2.5">
                            <Checkbox id={`emp-${emp.id}`} checked={newTeam.members.includes(emp.id)} onCheckedChange={() => handleToggleMember(emp.id)} />
                            <label htmlFor={`emp-${emp.id}`} className="text-sm font-medium text-white/80 cursor-pointer">{emp.nombre || emp.Emp_Nombre}</label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold" 
                    disabled={!newTeam.name || (newTeam.members.length > 0 && !newTeam.leaderId) || loading} 
                    onClick={handleCreateTeam}
                  >
                    {loading ? t.common.loading : t.common.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {teamsLoading ? (
            <div className="col-span-full flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div></div>
          ) : filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <Card key={team.id} className="bg-card border-white/10 hover:border-accent/40 transition-all group overflow-hidden shadow-2xl relative">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-accent/20 text-accent">
                      {team.type === 'Mantenimiento' ? <Wrench className="h-6 w-6" /> : <UsersIcon className="h-6 w-6" />}
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/30">{team.status || "DISPONIBLE"}</Badge>
                  </div>
                  <CardTitle className="text-lg md:text-xl font-bold text-white mt-3 md:mt-4">{team.name}</CardTitle>
                  <p className="text-[10px] text-accent font-bold uppercase tracking-widest">{team.type || "Instalación"}</p>
                  {team.leaderId && employees?.some(e => e.id === team.leaderId) && team.members?.includes(team.leaderId) ? (
                    <CardDescription className="text-muted-foreground flex items-center gap-2 text-xs mt-1 md:mt-0">
                      <Crown className="h-3 w-3 text-yellow-500 shrink-0" /> 
                      <span className="truncate">{t.teams.leader}: {team.leaderName}</span>
                    </CardDescription>
                  ) : (
                    <div className="h-4" /> // Spacing if no leader
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t.teams.members}</p>
                    <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
                      {team.members?.filter((id: string) => employees?.some(e => e.id === id)).length || 0} 
                      <UserCheck className="h-4 w-4 text-accent" />
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-black text-accent tracking-[0.2em] ml-1 mb-3">
                      {t?.teams?.members || "Integrantes"}
                    </p>
                    {Array.isArray(team?.members) && team.members.map((memberId: any) => {
                      if (!memberId) return null;
                      
                      const employeesList = Array.isArray(employees) ? employees : [];
                      const member = employeesList.find(e => e.id === memberId);
                      
                      // If it's still loading, show a subtle hint, otherwise only show if member is found
                      if (!member) {
                        if (employeesLoading) {
                          return (
                            <div key={memberId.toString()} className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 animate-pulse mb-2">
                              <div className="h-8 w-8 rounded-xl bg-white/10" />
                              <div className="h-3 w-24 bg-white/10 rounded" />
                            </div>
                          );
                        }
                        return null; // Skip if not found and not loading
                      }
                      
                      const memberName = member.nombre || member.Emp_Nombre || member.email || "Técnico";
                      
                      return (
                        <div key={memberId.toString()} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group/member hover:bg-accent/10 transition-all shadow-sm mb-2">
                          <div className="flex items-center gap-3 truncate">
                            <div className="h-8 w-8 rounded-xl bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent border border-accent/30 group-hover/member:scale-110 transition-transform">
                              {memberName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-white group-hover/member:text-accent transition-colors truncate">
                              {memberName}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover/member:text-accent group-hover/member:translate-x-1 transition-all" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                {isAdmin && (
                  <div className="p-3 md:p-4 bg-white/2 border-t border-white/5">
                    <Button variant="outline" className="w-full text-xs md:text-[10px] h-10 md:h-9 font-bold border-accent/30 text-accent uppercase" onClick={() => openEditDialog(team)}>
                      Gestionar Equipo
                    </Button>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <UsersIcon className="h-10 w-10 text-muted-foreground mb-6" />
              <h3 className="text-xl font-bold text-white uppercase tracking-tighter">{t.common.no_results}</h3>
            </div>
          )}
        </div>

        {/* Edit Team Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-white/10 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Gestionar Equipo - {selectedTeam?.name}
              </DialogTitle>
              <DialogDescription>Edita los detalles del equipo, añade/elimina integrantes o cambia el líder.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 py-2 md:py-4">
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.team_name}</Label>
                  <Input 
                    value={editTeamData?.name || ""} 
                    onChange={(e) => setEditTeamData({...editTeamData, name: e.target.value})}
                    className="bg-white/5 border-white/10 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.team_type}</Label>
                  <Select value={editTeamData?.type} onValueChange={(val: any) => setEditTeamData({...editTeamData, type: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      <SelectItem value="Instalación">{t.teams.installation}</SelectItem>
                      <SelectItem value="Mantenimiento">{t.teams.maintenance}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.leader}</Label>
                  <Select 
                    value={editTeamData?.leaderId} 
                    onValueChange={(val) => setEditTeamData({...editTeamData, leaderId: val})}
                    disabled={editTeamData?.members.length === 0}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-10">
                      <SelectValue placeholder={editTeamData?.members.length === 0 ? "Primero agrega integrantes" : "Selecciona un líder"} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      {validEmployees
                        .filter(emp => editTeamData?.members.includes(emp.id))
                        .map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.nombre || emp.Emp_Nombre}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-2 flex flex-col mt-2 md:mt-0">
                <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.members}</Label>
                <ScrollArea className="bg-white/5 border border-white/10 rounded-lg p-2 md:p-3 h-[200px] md:max-h-[220px]">
                  <div className="divide-y divide-white/5">
                    {validEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center space-x-3 py-2.5">
                        <Checkbox 
                          id={`edit-emp-${emp.id}`} 
                          checked={editTeamData?.members.includes(emp.id)} 
                          onCheckedChange={() => handleToggleEditMember(emp.id)} 
                        />
                        <label htmlFor={`edit-emp-${emp.id}`} className="text-sm font-medium text-white/80 cursor-pointer">{emp.nombre || emp.Emp_Nombre}</label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button 
                className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold" 
                onClick={handleUpdateTeam}
                disabled={loading || !editTeamData?.name || (editTeamData?.members?.length > 0 && !editTeamData?.leaderId)}
              >
                {loading ? t.common.loading : t.common.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
