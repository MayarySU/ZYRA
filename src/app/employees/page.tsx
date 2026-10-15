"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "../dashboard/layout";
import {
  useEmpleados,
  useEliminarEmpleado,
  useRoles,
} from "@/hooks/queries";
import { crearEmpleadoConAcceso } from "@/app/actions/empleados";
import type { Empleado } from "@/lib/data";
import {
  Card, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import {
  Users, Plus, Search, Mail, Phone, UserCircle, Loader2, Trash2, Star, Lock, Check, Zap, Copy, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: empleados = [], isLoading, isError } = useEmpleados();
  const { data: roles = [] } = useRoles();
  const eliminar = useEliminarEmpleado();
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState({ email: "", password: "" });

  const [newEmployee, setNewEmployee] = useState({
    nombre: "", correo: "", telefono: "", rol: "tecnico", password: ""
  });

  useEffect(() => {
    if (isError) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los empleados" });
    }
  }, [isError, toast]);

  const filteredEmpleados = useMemo(() => {
    return (empleados || [])
      .filter(e => !e?.nombre?.toLowerCase().includes('administrador'))
      .filter(e =>
        e?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e?.correo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [empleados, searchTerm]);

  const handleCreateEmployee = async () => {
    if (!newEmployee.nombre || !newEmployee.correo) {
      toast({ variant: "destructive", title: "Error", description: "El nombre y el correo son obligatorios" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.correo)) {
      toast({ variant: "destructive", title: "Error", description: "Formato de correo inválido" });
      return;
    }
    if (!user) return;

    setIsCreating(true);
    try {
      const res = await crearEmpleadoConAcceso({
        nombre: newEmployee.nombre,
        correo: newEmployee.correo,
        telefono: newEmployee.telefono,
        rol: newEmployee.rol,
        password: newEmployee.password,
      });

      if (!res.ok) {
        toast({ variant: "destructive", title: "Error al registrar", description: res.error });
        return;
      }

      setGeneratedCredentials({ email: res.email, password: res.password });
      setIsCreateDialogOpen(false);
      setIsSuccessDialogOpen(true);
      setNewEmployee({ nombre: "", correo: "", telefono: "", rol: "tecnico", password: "" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al registrar", description: e.message || "Error desconocido" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!user) return;
    try {
      await eliminar.mutateAsync(id);
      toast({ title: "Éxito", description: "Empleado eliminado correctamente" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 font-body text-foreground">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <UserCircle className="h-8 w-8 text-accent" /> Empleados
            </h2>
            <p className="text-muted-foreground">Gestión del personal operativo.</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> Registrar Empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-lg bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-accent">Registrar Empleado</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre Completo</Label>
                  <Input placeholder="Ej. Juan Pérez" className="h-11 bg-muted/50 border-border"
                    value={newEmployee.nombre}
                    onChange={(e) => setNewEmployee({ ...newEmployee, nombre: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Correo de Acceso</Label>
                    <Input type="email" placeholder="ejemplo@essesolar.com" className="h-11 bg-muted/50 border-border"
                      value={newEmployee.correo}
                      onChange={(e) => setNewEmployee({ ...newEmployee, correo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Teléfono</Label>
                    <Input placeholder="10 dígitos" className="h-11 bg-muted/50 border-border"
                      value={newEmployee.telefono}
                      onChange={(e) => setNewEmployee({ ...newEmployee, telefono: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rol</Label>
                    <Select value={newEmployee.rol}
                      onValueChange={(v) => setNewEmployee({ ...newEmployee, rol: v })}>
                      <SelectTrigger className="h-11 bg-muted/50 border-border">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id_rol} value={r.nombre_rol} className="capitalize">
                            {r.nombre_rol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Contraseña temporal</Label>
                    <Input placeholder="Se genera si se deja vacío" className="h-11 bg-muted/50 border-border"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Se creará una cuenta de acceso con este correo. Si dejas la contraseña vacía se generará una temporal.
                </p>
              </div>
              <DialogFooter>
                <Button className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold rounded-xl"
                  disabled={!newEmployee.nombre || !newEmployee.correo || isCreating}
                  onClick={handleCreateEmployee}>
                  {isCreating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Crear Acceso"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-2xl overflow-hidden border-border bg-card">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-foreground text-lg font-bold">Nómina Activa</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-10 bg-background border-border text-xs h-10"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>

          <div className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : filteredEmpleados.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest pl-6">Nombre Completo</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">E-Mail de Acceso Zyra</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Nivel / Puntos</TableHead>
                    <TableHead className="text-center text-muted-foreground uppercase text-[10px] font-bold tracking-widest pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpleados.map((emp) => {
                    // Los puntos viven en `puntos_historial` (otorgados por RPC), no en `empleados`.
                    const totalPuntos = 0;
                    const nivel = Math.max(1, Math.floor(totalPuntos / 200) + 1);

                    const displayEmail = emp.correo || "—";

                    return (
                      <TableRow key={emp.id_empleado} className="border-border hover:bg-muted/5 transition-colors group">
                        <TableCell className="py-5 pl-6">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20 transition-transform group-hover:scale-105">
                              <span className="text-[10px] font-black text-accent">
                                {emp.nombre?.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground leading-tight">{emp.nombre}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Técnico Operativo</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[11px] text-foreground font-medium lowercase">
                            <Mail className="h-3 w-3 text-accent/60" /> {displayEmail}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <Badge className="bg-accent/10 text-accent border border-accent/20 font-bold text-[9px] h-7 px-3 rounded-full">
                              NV {nivel}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs font-black text-foreground">{totalPuntos}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[9px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 transition-all px-4"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsProfileDialogOpen(true);
                              }}
                            >
                              Ver Perfil
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8 p-0">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Eliminar permanentemente el registro de <strong>{emp.nombre}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-muted">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteEmployee(emp.id_empleado)}
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
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">No hay empleados registrados</h3>
              </div>
            )}
          </div>
        </Card>

        {/* EXPEDIENTE DEL TÉCNICO DIALOG */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-3xl bg-[#fdfdfd] border-none rounded-[40px] p-0 overflow-hidden text-slate-800">
            <div className="p-8 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <DialogTitle className="text-[14px] font-black uppercase tracking-widest text-accent">Expediente del Técnico</DialogTitle>
              <DialogDescription className="sr-only">Información detallada y expediente del técnico operativo.</DialogDescription>
            </div>

            <div className="p-8 grid md:grid-cols-12 gap-8">
              {/* Columna Izquierda: Perfil Card */}
              <div className="md:col-span-12 lg:col-span-5 flex flex-col items-center">
                <div className="w-full aspect-square max-w-[240px] rounded-[50px] bg-[#f8f7ff] border-[12px] border-white shadow-2xl shadow-accent/5 flex items-center justify-center mb-6 overflow-hidden relative group">
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-7xl font-black text-accent italic tracking-tighter">
                    {selectedEmployee?.nombre?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedEmployee?.nombre}</h3>
                <Badge className="bg-accent text-white font-black text-[9px] uppercase tracking-widest px-6 py-2 mt-2 rounded-full shadow-lg shadow-accent/20 border-none">
                  Operaciones Zyra
                </Badge>
              </div>

              {/* Columna Derecha: Stats & Data */}
              <div className="md:col-span-12 lg:col-span-7 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Stats Cards */}
                  <div className="bg-white border border-slate-100 p-6 rounded-[30px] flex flex-col items-center shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Poder / Nivel</p>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-accent fill-accent/10" />
                      <span className="text-3xl font-black text-accent italic italic">
                        {1}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-6 rounded-[30px] flex flex-col items-center shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Prestigio / Puntos</p>
                    <div className="flex items-center gap-2">
                      <Star className="h-6 w-6 text-yellow-500 fill-yellow-400" />
                      <span className="text-3xl font-black text-slate-800 italic">
                        {0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Email de Acceso</p>
                    <div className="h-14 bg-[#f8f8fa] border border-slate-50 rounded-2xl flex items-center px-6 gap-3 group focus-within:border-accent/30 transition-all">
                      <Mail className="h-4 w-4 text-accent/50" />
                      <span className="text-xs font-bold text-accent truncate">{selectedEmployee?.correo || "—"}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña Asignada</p>
                    <div className="h-14 bg-[#f8f8fa] border border-slate-50 rounded-2xl flex items-center px-6 gap-3">
                      <Lock className="h-4 w-4 text-accent/50" />
                      <span className="text-xs font-bold text-accent tracking-widest">
                        {"********"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Personal</p>
                    <div className="h-14 bg-white border border-slate-100 rounded-2xl flex items-center px-6 gap-3">
                      <Mail className="h-4 w-4 text-slate-300" />
                      <span className="text-xs font-medium text-slate-600 truncate">{selectedEmployee?.correo || "N/A"}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Contacto Directo</p>
                    <div className="h-14 bg-white border border-slate-100 rounded-2xl flex items-center px-6 gap-3">
                      <Phone className="h-4 w-4 text-slate-300" />
                      <span className="text-xs font-black text-slate-800">{selectedEmployee?.telefono || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 flex justify-center">
              <Button 
                className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-[2px] text-xs rounded-2xl shadow-xl shadow-accent/20"
                onClick={() => setIsProfileDialogOpen(false)}
              >
                Cerrar Expediente
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* REGISTRO EXITOSO DIALOG */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md bg-white border-none rounded-[32px] p-0 overflow-hidden shadow-2xl">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <DialogTitle className="text-xl font-black text-emerald-600 tracking-tight">Registro Exitoso</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-1">Las credenciales han sido generadas correctamente.</DialogDescription>
            </div>

            <div className="px-8 pb-8 space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Acceso Zyra</p>
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center px-4 font-bold text-slate-700 text-sm">
                  {generatedCredentials.email}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Temporal</p>
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center px-4 font-mono font-bold text-accent text-sm tracking-widest">
                  {generatedCredentials.password}
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 border-accent/20 text-accent font-bold gap-3 rounded-xl hover:bg-accent/5"
                onClick={() => {
                  const text = `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Copiado", description: "Credenciales copiadas al portapapeles" });
                }}
              >
                <Copy className="h-4 w-4" />
                Copiar Ambas Credenciales
              </Button>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                  Copie estas credenciales ahora. Por seguridad no se volverán a mostrar.
                </p>
              </div>

              <Button 
                className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20"
                onClick={() => setIsSuccessDialogOpen(false)}
              >
                Cerrar y Continuar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}