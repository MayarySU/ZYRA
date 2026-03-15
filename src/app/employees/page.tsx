"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser } from "@/firebase";
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
import { Users, Plus, Search, Mail, Phone, ShieldCheck, UserCircle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function EmployeesPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    Emp_Nombre: "",
    Emp_Correo: "",
    Emp_Telefono: "",
    Rol_ID: 2, // Default: Empleado
    puntos: 0,
    nivel: 1,
    racha: 0
  });

  const employeesQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: employees, loading: employeesLoading } = useCollection(employeesQuery);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => 
      e.Emp_Nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.Emp_Correo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const handleCreateEmployee = async () => {
    if (!db) return;
    setLoading(true);
    try {
      // En una app real, esto debería usar Firebase Auth para crear la cuenta.
      // Para efectos de gestión administrativa en esta demo, registramos el perfil en la colección users.
      await addDoc(collection(db, "users"), {
        ...newEmployee,
        rol: 'employee', // Por defecto todos los nuevos registros son empleados
        createdAt: serverTimestamp(),
      });
      toast({ title: "Empleado registrado", description: "El perfil operativo se creó correctamente." });
      setIsCreateDialogOpen(false);
      setNewEmployee({
        Emp_Nombre: "",
        Emp_Correo: "",
        Emp_Telefono: "",
        Rol_ID: 2,
        puntos: 0,
        nivel: 1,
        racha: 0
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar al empleado." });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Users className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-muted-foreground max-w-md">
            Solo el personal administrativo tiene permisos para gestionar la nómina de empleados y sus credenciales de acceso.
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
              <UserCircle className="h-8 w-8 text-accent" /> Empleados (EMP)
            </h2>
            <p className="text-muted-foreground">Gestión de capital humano, roles y niveles de acceso.</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> Registrar Empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-accent">Nuevo Perfil de Empleado</DialogTitle>
                <CardDescription>
                  Capture los datos personales para el seguimiento operativo (EMP).
                </CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Nombre Completo</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Juan Antonio Pérez" 
                    className="bg-white/5 border-white/10"
                    value={newEmployee.Emp_Nombre}
                    onChange={(e) => setNewEmployee({...newEmployee, Emp_Nombre: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">E-mail</Label>
                    <Input 
                      type="email"
                      placeholder="j.perez@empresa.com" 
                      className="bg-white/5 border-white/10"
                      value={newEmployee.Emp_Correo}
                      onChange={(e) => setNewEmployee({...newEmployee, Emp_Correo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Teléfono</Label>
                    <Input 
                      placeholder="+56 9..." 
                      className="bg-white/5 border-white/10"
                      value={newEmployee.Emp_Telefono}
                      onChange={(e) => setNewEmployee({...newEmployee, Emp_Telefono: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold"
                  disabled={!newEmployee.Emp_Nombre || !newEmployee.Emp_Correo || loading}
                  onClick={handleCreateEmployee}
                >
                  {loading ? "Registrando..." : "Guardar Empleado (EMP)"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border-white/5 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-bold">Nómina Activa</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre o correo..." 
                  className="pl-10 bg-white/5 border-white/5 text-xs h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employeesLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
              </div>
            ) : filteredEmployees.length > 0 ? (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Empleado</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Contacto</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Rol</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Nivel / Puntos</TableHead>
                    <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                            <span className="text-xs font-bold text-accent">{(emp.Emp_Nombre || emp.nombre || "?").substring(0,2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{emp.Emp_Nombre || emp.nombre}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">ID: {emp.id.substring(0,8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-white">
                            <Mail className="h-3 w-3 text-accent" /> {emp.Emp_Correo || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" /> {emp.Emp_Telefono || "Sin registro"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={emp.rol === 'admin' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-primary/10 text-primary border-primary/20"}>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {emp.rol === 'admin' ? "ADMIN" : "OPERATIVO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-accent" />
                            <span className="text-xs font-bold text-white">Nivel {emp.nivel || 1}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-muted-foreground">{emp.puntos || 0} pts</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-accent hover:bg-accent/10 font-bold text-[10px]">
                          VER PERFIL
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Sin registros de empleados</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Comience registrando un empleado operativo para asignarle equipos y proyectos en el sistema.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}