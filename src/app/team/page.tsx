
"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "../dashboard/layout";
import { useAuth } from "@/providers/auth-provider";
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
  ChevronRight,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";
import { equiposAPI, empleadosAPI } from "@/lib/api-client";

export default function TeamPage() {
  const { user, profile, loading: userLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTeam, setNewTeam] = useState({
    Nombre_Equipo: "",
    integrantes: [] as number[],
    ID_Lider: null as number | null,
  });

  const [editTeamData, setEditTeamData] = useState<any>({
    Nombre_Equipo: "",
    integrantes: [],
    ID_Lider: null
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [teamsData, employeesData] = await Promise.all([
        equiposAPI.getAll(),
        empleadosAPI.getAll()
      ]);
      let filteredTeams = Array.isArray(teamsData) ? teamsData : [];
      if (!isAdmin && profile?.empleadoId) {
        filteredTeams = filteredTeams.filter((team: any) => 
          team.empleados?.some((rel: any) => rel.ID_Empleado === profile.empleadoId)
        );
      }
      setTeams(filteredTeams);

      setEmployees(Array.isArray(employeesData) ? employeesData.filter(e => 
        !e.Nombre.toLowerCase().includes('admin') && 
        e.usuario?.rol?.Nombre_Rol !== 'admin'
      ) : []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de equipos" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && profile) {
      loadData();
    }
  }, [userLoading, profile]);

  const filteredTeams = useMemo(() => {
    return teams.filter(t =>
      (t.Nombre_Equipo || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);

  const handleCreateTeam = async () => {
    if (!newTeam.Nombre_Equipo || !user) return;
    setIsSubmitting(true);
    try {
      await equiposAPI.create({
        Nombre_Equipo: newTeam.Nombre_Equipo,
        integrantes: newTeam.integrantes,
        ID_Lider: newTeam.ID_Lider
      });
      toast({ title: t.common.success, description: "Equipo creado correctamente" });
      setIsCreateDialogOpen(false);
      setNewTeam({ Nombre_Equipo: "", integrantes: [], ID_Lider: null });
      loadData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !editTeamData || !user) return;
    setIsSubmitting(true);
    try {
      await equiposAPI.update(selectedTeam.ID_Equipo, {
        Nombre_Equipo: editTeamData.Nombre_Equipo,
        integrantes: editTeamData.integrantes,
        ID_Lider: editTeamData.ID_Lider
      });
      toast({ title: t.common.success });
      setIsEditDialogOpen(false);
      loadData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await equiposAPI.delete(id);
      toast({ title: t.common.success, description: "Equipo eliminado correctamente" });
      loadData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (empId: number, isEdit = false) => {
    if (isEdit) {
      setEditTeamData((prev: any) => ({
        ...prev,
        integrantes: prev.integrantes.includes(empId)
          ? prev.integrantes.filter((id: number) => id !== empId)
          : [...prev.integrantes, empId]
      }));
    } else {
      setNewTeam(prev => ({
        ...prev,
        integrantes: prev.integrantes.includes(empId)
          ? prev.integrantes.filter(id => id !== empId)
          : [...prev.integrantes, empId]
      }));
    }
  };

  if (userLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 font-body px-2 sm:px-4 md:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 md:gap-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white font-headline flex items-center justify-center md:justify-start gap-2 md:gap-3">
              <UsersIcon className="h-8 w-8 md:h-10 md:w-10 text-accent" /> {isAdmin ? "Gestión de Equipos (EQ)" : "Mis Equipos"}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Configuración de cuadrillas especializadas y miembros.
            </p>
          </div>

          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-11 md:h-12 px-4 md:px-6 w-full md:w-auto">
                  <Plus className="h-5 w-5" /> Nuevo Equipo
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border text-foreground sm:max-w-3xl p-0 overflow-hidden rounded-3xl">
                <div className="p-8 border-b border-white/5 flex items-center gap-4 bg-white/5">
                  <div className="p-3 rounded-2xl bg-accent/10">
                    <Plus className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">Crear Equipo Nuevo</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                      Asigna un nombre, tipo de equipo y selecciona a los integrantes.
                    </DialogDescription>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 h-full">
                  {/* Left Column: Form */}
                  <div className="md:col-span-5 p-8 space-y-8 border-r border-white/5">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Nombre del Equipo</Label>
                        <Input
                          placeholder="Ej. Cuadrilla Alfa"
                          className="bg-white/5 border-white/5 h-12 rounded-xl focus:ring-accent/50 focus:border-accent"
                          value={newTeam.Nombre_Equipo}
                          onChange={(e) => setNewTeam({ ...newTeam, Nombre_Equipo: e.target.value })}
                        />
                      </div>


                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Líder del Equipo</Label>
                        <Select 
                          value={newTeam.ID_Lider?.toString()} 
                          onValueChange={(val) => setNewTeam({ ...newTeam, ID_Lider: parseInt(val) })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-xl">
                            <SelectValue placeholder="Seleccionar líder" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground">
                            {employees.filter(e => newTeam.integrantes.includes(e.ID_Empleado)).map(emp => (
                              <SelectItem key={emp.ID_Empleado} value={emp.ID_Empleado.toString()}>
                                {emp.Nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      className="bg-accent hover:bg-accent/90 text-white w-full h-14 font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95"
                      disabled={!newTeam.Nombre_Equipo || isSubmitting}
                      onClick={handleCreateTeam}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Guardar Equipo"}
                    </Button>
                  </div>

                  {/* Right Column: Integrants */}
                  <div className="md:col-span-7 p-8 bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Integrantes Disponibles</Label>
                      <Badge variant="outline" className="border-accent/30 text-accent text-[10px] font-black">{newTeam.integrantes.length} Seleccionados</Badge>
                    </div>
                    
                    <ScrollArea className="h-[350px] border border-white/5 rounded-2xl p-4 bg-black/20">
                      <div className="space-y-1">
                        {employees.map(emp => {
                          const isChecked = newTeam.integrantes.includes(emp.ID_Empleado);
                          return (
                            <div 
                              key={emp.ID_Empleado} 
                              className={cn(
                                "flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer group mb-1",
                                isChecked ? "bg-accent/10 border border-accent/20" : "hover:bg-white/5 border border-transparent"
                              )}
                              onClick={() => toggleMember(emp.ID_Empleado)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isChecked ? "bg-accent border-accent" : "border-white/20 group-hover:border-white/40"
                                )}>
                                  {isChecked && <Plus className="h-4 w-4 text-foreground" />}
                                </div>
                                <span className={cn(
                                  "text-sm font-bold transition-colors",
                                  isChecked ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {emp.Nombre}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <Card key={team.ID_Equipo} className="bg-card border-white/10 hover:border-accent/40 transition-all group overflow-hidden shadow-2xl relative">
                <CardHeader className="pb-4 relative">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-accent/10 text-accent border border-accent/20">
                      {team.Nombre_Equipo?.toLowerCase().includes('instal') ? <Plus className="h-6 w-6" /> : 
                       team.Nombre_Equipo?.toLowerCase().includes('manten') ? <Wrench className="h-6 w-6" /> :
                       <UsersIcon className="h-6 w-6" />}
                    </div>
                    <Badge className="bg-accent/10 text-accent border border-accent/20 font-black text-[9px] h-6 px-3 rounded-full hover:bg-accent/20 transition-colors uppercase">
                      DISPONIBLE
                    </Badge>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {team.Nombre_Equipo}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20" />
                      <p className="text-[10px] font-bold text-muted-foreground italic">
                        Líder del Equipo: <span className="text-foreground not-italic">
                          {team.empleados?.find((r: any) => r.Cargo === 'Líder')?.empleado?.Nombre || "Sin asignar"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center my-4">
                    <p className="text-[9px] uppercase font-black text-muted-foreground mb-2 tracking-[0.2em]">Integrantes</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-foreground">{team.empleados?.length || 0}</span>
                      <div className="p-1.5 rounded-lg bg-accent/20">
                        <UsersIcon className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-black text-accent tracking-[0.2em] ml-1 mb-2">Integrantes</p>
                    {team.empleados?.map((rel: any) => (
                      <div key={rel.ID_Empleado} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group/member hover:bg-white/10 transition-all cursor-default">
                        <div className="flex items-center gap-3 truncate">
                          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-black text-accent border border-accent/20">
                            {rel.empleado?.Nombre?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-foreground/90 truncate capitalize">
                            {rel.empleado?.Nombre?.toLowerCase()}
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover/member:text-accent transition-colors" />
                      </div>
                    ))}
                  </div>
                </CardContent>
                {isAdmin && (
                  <div className="grid grid-cols-2 p-3 md:p-4 bg-white/2 border-t border-white/5 gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-xs md:text-[10px] h-10 md:h-9 font-bold border-accent/30 text-accent uppercase" 
                      onClick={() => {
                        setSelectedTeam(team);
                        setEditTeamData({
                          Nombre_Equipo: team.Nombre_Equipo,
                          ID_Lider: team.empleados?.find((r: any) => r.Cargo === 'Líder')?.ID_Empleado || null,
                          integrantes: team.empleados?.map((r: any) => r.ID_Empleado) || []
                        });
                        setIsEditDialogOpen(true);
                      }}
                    >
                      Gestionar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full text-xs md:text-[10px] h-10 md:h-9 font-bold uppercase gap-2">
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-white/10 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar permanentemente al equipo {team.Nombre_Equipo}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeam(team.ID_Equipo)}
                            className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <UsersIcon className="h-10 w-10 text-muted-foreground mb-6" />
              <h3 className="text-xl font-bold text-foreground uppercase tracking-tighter">No hay equipos registrados</h3>
            </div>
          )}
        </div>

        {/* Edit Team Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border text-foreground sm:max-w-3xl p-0 overflow-hidden rounded-3xl">
            <div className="p-8 border-b border-white/5 flex items-center gap-4 bg-white/5">
              <div className="p-3 rounded-2xl bg-accent/10">
                <Settings2 className="h-6 w-6 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Gestionar Equipo - {selectedTeam?.Nombre_Equipo}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Edita los detalles del equipo, añade/elimina integrantes o cambia el líder.
                </DialogDescription>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 h-full">
              {/* Left Column: Form */}
              <div className="md:col-span-5 p-8 space-y-8 border-r border-white/5">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Nombre del Equipo</Label>
                    <Input
                      value={editTeamData?.Nombre_Equipo || ""}
                      onChange={(e) => setEditTeamData({ ...editTeamData, Nombre_Equipo: e.target.value })}
                      className="bg-white/5 border-white/5 h-12 rounded-xl focus:ring-accent/50 focus:border-accent"
                    />
                  </div>


                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Líder del Equipo</Label>
                    <Select 
                      value={editTeamData?.ID_Lider?.toString()} 
                      onValueChange={(val) => setEditTeamData({ ...editTeamData, ID_Lider: parseInt(val) })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-xl">
                        <SelectValue placeholder="Seleccionar líder" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        {employees.filter(e => editTeamData?.integrantes.includes(e.ID_Empleado)).map(emp => (
                          <SelectItem key={emp.ID_Empleado} value={emp.ID_Empleado.toString()}>
                            {emp.Nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="bg-accent hover:bg-accent/90 text-white w-full h-14 font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95"
                  onClick={handleUpdateTeam}
                  disabled={isSubmitting || !editTeamData?.Nombre_Equipo}
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Guardar"}
                </Button>
              </div>

              {/* Right Column: Integrants Search/List */}
              <div className="md:col-span-7 p-8 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Integrantes</Label>
                  <Badge variant="outline" className="border-accent/30 text-accent text-[10px] font-black">{editTeamData?.integrantes.length} Seleccionados</Badge>
                </div>
                
                <ScrollArea className="h-[350px] border border-white/5 rounded-2xl p-4 bg-black/20">
                  <div className="space-y-1">
                    {employees.map(emp => {
                      const isChecked = editTeamData?.integrantes.includes(emp.ID_Empleado);
                      return (
                        <div 
                          key={emp.ID_Empleado} 
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer group mb-1",
                            isChecked ? "bg-accent/10 border border-accent/20" : "hover:bg-white/5 border border-transparent"
                          )}
                          onClick={() => toggleMember(emp.ID_Empleado, true)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                              isChecked ? "bg-accent border-accent" : "border-white/20 group-hover:border-white/40"
                            )}>
                              {isChecked && <Plus className="h-4 w-4 text-foreground" />}
                            </div>
                            <span className={cn(
                              "text-sm font-bold transition-colors",
                              isChecked ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {emp.Nombre}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
