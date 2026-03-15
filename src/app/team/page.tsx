"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
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
  Settings2
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

  const handleCreateTeam = async () => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db, "teams");
    const data = {
      ...newTeam,
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
    setNewTeam(prev => ({
      ...prev,
      members: prev.members.includes(empId)
        ? prev.members.filter(id => id !== empId)
        : [...prev.members, empId]
    }));
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
    setEditTeamData((prev: any) => ({
      ...prev,
      members: prev.members.includes(empId)
        ? prev.members.filter((id: string) => id !== empId)
        : [...prev.members, empId]
    }));
  };

  const handleUpdateTeam = async () => {
    if (!db || !selectedTeam || !editTeamData) return;
    setLoading(true);
    
    const teamRef = doc(db, "teams", selectedTeam.id);
    const leader = employees?.find(e => e.id === editTeamData.leaderId);
    
    const updateData = {
      ...editTeamData,
      leaderName: leader?.nombre || editTeamData.leaderName
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
      <div className="max-w-7xl mx-auto space-y-8 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-4xl font-bold tracking-tight text-white font-headline flex items-center gap-3">
              <UsersIcon className="h-10 w-10 text-accent" /> {isAdmin ? t.teams.title_admin : t.teams.title_op}
            </h2>
            <p className="text-muted-foreground">
              {isAdmin ? t.teams.subtitle_admin : t.teams.subtitle_op}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-12 px-6">
                  <Plus className="h-5 w-5" /> {t.teams.new_team}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-accent">{t.teams.new_team}</DialogTitle>
                  <DialogDescription>{t.teams.subtitle_admin}</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
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
                      <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.leader}</Label>
                      <Select value={newTeam.leaderId} onValueChange={(val) => {
                        const emp = employees?.find(e => e.id === val);
                        setNewTeam({ ...newTeam, leaderId: val, leaderName: emp?.nombre || "Técnico Zyra" });
                      }}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          {employees?.filter(e => e.rol !== 'admin').map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col h-full">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.members}</Label>
                    <ScrollArea className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 h-[200px]">
                      <div className="space-y-3">
                        {employees?.filter(e => e.rol !== 'admin').map(emp => (
                          <div key={emp.id} className="flex items-center space-x-3">
                            <Checkbox id={`emp-${emp.id}`} checked={newTeam.members.includes(emp.id)} onCheckedChange={() => handleToggleMember(emp.id)} />
                            <label htmlFor={`emp-${emp.id}`} className="text-sm font-medium text-white/80 cursor-pointer">{emp.nombre}</label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold" disabled={!newTeam.name || loading} onClick={handleCreateTeam}>
                    {loading ? t.common.loading : t.common.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                  </div>
                  <CardTitle className="text-xl font-bold text-white mt-4">{team.name}</CardTitle>
                  <p className="text-[10px] text-accent font-bold uppercase tracking-widest">{team.type || "Instalación"}</p>
                  <CardDescription className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Crown className="h-3 w-3 text-yellow-500" /> {t.teams.leader}: {team.leaderName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t.teams.members}</p>
                    <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
                      {team.members?.length || 0} <UserCheck className="h-4 w-4 text-accent" />
                    </p>
                  </div>
                </CardContent>
                {isAdmin && (
                  <div className="p-4 bg-white/2 border-t border-white/5">
                    <Button variant="outline" className="w-full text-[10px] font-bold border-accent/30 text-accent uppercase" onClick={() => openEditDialog(team)}>
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
          <DialogContent className="bg-card border-white/10 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Gestionar Equipo - {selectedTeam?.name}
              </DialogTitle>
              <DialogDescription>Edita los detalles del equipo, añade/elimina integrantes o cambia el líder.</DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
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
                  <Select value={editTeamData?.leaderId} onValueChange={(val) => setEditTeamData({...editTeamData, leaderId: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      {employees?.filter(e => e.rol !== 'admin').map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 flex flex-col h-full">
                <Label className="text-xs uppercase font-bold text-muted-foreground">{t.teams.members}</Label>
                <ScrollArea className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 h-[200px]">
                  <div className="space-y-3">
                    {employees?.filter(e => e.rol !== 'admin').map(emp => (
                      <div key={emp.id} className="flex items-center space-x-3">
                        <Checkbox 
                          id={`edit-emp-${emp.id}`} 
                          checked={editTeamData?.members.includes(emp.id)} 
                          onCheckedChange={() => handleToggleEditMember(emp.id)} 
                        />
                        <label htmlFor={`edit-emp-${emp.id}`} className="text-sm font-medium text-white/80 cursor-pointer">{emp.nombre}</label>
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
                disabled={loading}
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
