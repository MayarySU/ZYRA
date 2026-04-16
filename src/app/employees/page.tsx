
"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser, useMemoFirebase, useAuth } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, setDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
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
import { Users, Plus, Search, Mail, ShieldCheck, UserCircle, Star, Lock, Copy, Loader2, Trash2, Zap, Phone, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { sendResetNotificationAction } from "@/app/actions/email-actions";

export default function EmployeesPage() {
  const { profile, loading: userLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState({ zyraEmail: "", password: "", personalEmail: "" });

  const [newEmployee, setNewEmployee] = useState({
    Emp_Nombre: "",
    Emp_CorreoPersonal: "",
    Emp_Telefono: "",
  });

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, "users");
  }, [db, isAdmin]);

  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => 
      (e.nombre || e.Emp_Nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.emailAcceso || e.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const handleCreateEmployee = async () => {
    if (!db || !newEmployee.Emp_Nombre || !newEmployee.Emp_CorreoPersonal) return;

    // Validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.Emp_CorreoPersonal)) {
      toast({ variant: "destructive", title: "Error", description: "Formato de correo personal inválido" });
      return;
    }

    if (newEmployee.Emp_Telefono && !/^\d{10,13}$/.test(newEmployee.Emp_Telefono.replace(/\s+/g, ""))) {
      toast({ variant: "destructive", title: "Error", description: "El teléfono debe tener un formato válido (10-13 dígitos)" });
      return;
    }

    setLoading(true);
    
    // Generación de credenciales corporativas
    const cleanInput = newEmployee.Emp_Nombre.trim().toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const parts = cleanInput.split(/\s+/);
    const firstInitial = parts[0].charAt(0);
    const lastName = parts.length >= 2 ? parts[1] : parts[0];

    const generatedZyraEmail = `${firstInitial}${lastName}@zyra.com`;
    const generatedPassword = Math.random().toString(36).slice(-8) + "!";

    let secondaryApp;
    try {
      const appName = `secondary-reg-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);
      
      // 1. Crear usuario en Firebase Auth usando el correo CORPORATIVO generado
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        generatedZyraEmail, 
        generatedPassword
      );
      
      const uid = userCredential.user.uid;

      // 2. Guardar perfil en Firestore con el UID correcto y el email de acceso
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid: uid,
        nombre: newEmployee.Emp_Nombre.trim(),
        emailPersonal: newEmployee.Emp_CorreoPersonal.trim(),
        emailAcceso: generatedZyraEmail,
        email: generatedZyraEmail, // Este es el email que Firebase Auth usará para el login
        telefono: newEmployee.Emp_Telefono.trim(),
        rol: "employee",
        nivel: 1,
        puntos: 0,
        racha: 0,
        logros: [],
        createdAt: serverTimestamp(),
      });

      setGeneratedCreds({ 
        zyraEmail: generatedZyraEmail, 
        password: generatedPassword,
        personalEmail: newEmployee.Emp_CorreoPersonal
      });
      setShowCredentials(true);
      
      toast({ 
        title: t.common.success, 
        description: "Empleado registrado con éxito."
      });

      setNewEmployee({
        Emp_Nombre: "",
        Emp_CorreoPersonal: "",
        Emp_Telefono: "",
      });
    } catch (e: any) {
      console.error("Error en registro:", e);
      let errorMsg = e.message;
      if (e.code === 'auth/email-already-in-use') {
        errorMsg = "Este email corporativo ya existe. Intenta variar el nombre del empleado.";
      }
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: errorMsg
      });
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (delError) {}
      }
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!db || !isAdmin) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "users", employeeId));
      toast({ title: t.common.success, description: t.common.delete });
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (emp: any) => {
    if (!emp || !emp.email) return;
    setLoading(true);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, emp.email);
      }
      toast({ 
        title: "Proceso completado", 
        description: `Se ha enviado el enlace de seguridad a: ${emp.email}` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la solicitud." });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (emp: any) => {
    setSelectedEmployee(emp);
    setIsViewDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copiado al portapapeles" });
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
            <Users className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t.common.error}</h2>
          <p className="text-muted-foreground max-w-md">Acceso restringido: Solo administradores pueden gestionar el personal.</p>
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
              <UserCircle className="h-8 w-8 text-accent" /> {t.employees.title}
            </h2>
            <p className="text-muted-foreground">{t.employees.subtitle}</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setShowCredentials(false);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                <Plus className="h-4 w-4" /> {t.employees.register}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-lg bg-card border-border">
              {!showCredentials ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-accent">{t.employees.register}</DialogTitle>
                    <CardDescription className="text-muted-foreground">Registra un nuevo técnico para acceso al sistema ZYRA.</CardDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">{t.employees.full_name}</Label>
                      <Input 
                        id="name" 
                        placeholder="Nombre completo" 
                        className="bg-muted/50 border-border text-foreground"
                        value={newEmployee.Emp_Nombre || ""}
                        onChange={(e) => setNewEmployee({...newEmployee, Emp_Nombre: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">{t.employees.personal_email}</Label>
                        <Input 
                          type="email"
                          placeholder="correo@ejemplo.com" 
                          className="bg-muted/50 border-border text-foreground"
                          value={newEmployee.Emp_CorreoPersonal || ""}
                          onChange={(e) => setNewEmployee({...newEmployee, Emp_CorreoPersonal: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">{t.employees.phone}</Label>
                        <Input 
                          placeholder="+52 ..." 
                          className="bg-muted/50 border-border text-foreground"
                          value={newEmployee.Emp_Telefono || ""}
                          onChange={(e) => setNewEmployee({...newEmployee, Emp_Telefono: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold"
                      disabled={!newEmployee.Emp_Nombre || !newEmployee.Emp_CorreoPersonal || loading}
                      onClick={handleCreateEmployee}
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : t.common.save}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-emerald-500 flex items-center gap-2">
                      <ShieldCheck className="h-6 w-6" /> Registro Exitoso
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">EMAIL DE ACCESO ZYRA</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={generatedCreds.zyraEmail || ""} className="bg-muted/50 border-border font-mono text-sm text-foreground" />
                        <Button variant="outline" size="icon" className="border-border hover:bg-muted" onClick={() => copyToClipboard(generatedCreds.zyraEmail)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">PASSWORD TEMPORAL</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={generatedCreds.password || ""} className="bg-muted/50 border-border font-mono text-sm text-accent" />
                        <Button variant="outline" size="icon" className="border-border hover:bg-muted" onClick={() => copyToClipboard(generatedCreds.password)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md">
                      <p className="text-[10px] text-yellow-500 uppercase font-bold tracking-tighter flex items-center gap-2">
                        <Lock className="h-3 w-3" /> COPIE ESTAS CREDENCIALES AHORA
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full font-bold bg-accent hover:bg-accent/90 text-white" onClick={() => setIsCreateDialogOpen(false)}>
                      Cerrar y Continuar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-2xl overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-foreground text-lg font-bold">{t.employees.payroll}</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t.common.search} className="pl-10 bg-background border-border text-xs h-9 text-foreground" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employeesLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : filteredEmployees.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.employees.full_name}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.employees.access_email}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">{t.employees.level_points}</TableHead>
                    <TableHead className="text-center text-muted-foreground uppercase text-[10px] font-bold">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="border-border hover:bg-muted/5 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                            <span className="text-xs font-bold text-accent">{(emp.nombre || emp.Emp_Nombre || "?").substring(0,2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{emp.nombre || emp.Emp_Nombre}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Técnico Operativo</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-foreground"><Mail className="h-3 w-3 text-accent" /> {emp.emailAcceso || emp.email || "N/A"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-foreground">NV {emp.nivel || 1}</span>
                          <div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /><span className="text-xs text-muted-foreground">{emp.puntos || 0} pts</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-accent hover:bg-accent/10 font-bold text-[10px]"
                            onClick={() => handleViewProfile(emp)}
                          >
                            {t.employees.view_profile}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.common.confirm}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Eliminar permanentemente el acceso de {emp.nombre || emp.Emp_Nombre}? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-muted">{t.common.cancel}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-white"
                                >
                                  {t.common.delete}
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
                <Users className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">No hay técnicos registrados</h3>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <UserCircle className="h-5 w-5" /> Perfil del Técnico
              </DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-4 border-b border-border pb-6">
                  <div className="h-20 w-20 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center">
                    <span className="text-2xl font-black text-accent">
                      {(selectedEmployee.nombre || selectedEmployee.Emp_Nombre || "?").substring(0,2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground">{selectedEmployee.nombre || selectedEmployee.Emp_Nombre}</h3>
                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mt-1">Operaciones de Campo</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-xl border border-border text-center">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Nivel</Label>
                    <div className="flex items-center justify-center gap-2 text-sm font-black text-foreground">
                      <Zap className="h-4 w-4 text-accent" /> {selectedEmployee.nivel || 1}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border text-center">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Puntos</Label>
                    <div className="flex items-center justify-center gap-2 text-sm font-black text-foreground">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> {selectedEmployee.puntos || 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Email ZYRA (Acceso)</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 truncate">
                        <Mail className="h-4 w-4 text-accent" /> 
                        <span className="font-medium truncate">{selectedEmployee.emailAcceso || selectedEmployee.email || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Email Personal</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 truncate">
                        <Mail className="h-4 w-4 text-muted-foreground" /> 
                        <span className="font-medium truncate">{selectedEmployee.emailPersonal || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Contacto</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 truncate">
                        <Phone className="h-4 w-4 text-accent" /> 
                        <span className="font-medium truncate">{selectedEmployee.telefono || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12" onClick={() => setIsViewDialogOpen(false)}>
                Cerrar Perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
