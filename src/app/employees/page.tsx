"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "../dashboard/layout";
import { useFirestore, useCollection, useUser, useMemoFirebase, useAuth } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, setDoc, doc, serverTimestamp, deleteDoc, query, where, getDocs } from "firebase/firestore";
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
import { Users, Plus, Search, Mail, ShieldCheck, UserCircle, Star, Lock, Copy, Loader2, Trash2, Zap, Phone, RotateCcw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";

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
    Emp_EmailAcceso: "", // NEW: Manual access email field
  });

  // Flag to know if the user edited the access email manually
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);

  // Auto-generate suggested email based on name
  useEffect(() => {
    if (!isEmailManuallyEdited && newEmployee.Emp_Nombre) {
      const cleanInput = newEmployee.Emp_Nombre.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const parts = cleanInput.split(/\s+/);
      const firstInitial = parts[0].charAt(0);
      const lastName = parts.length >= 2 ? parts[1] : parts[0];

      if (firstInitial && lastName) {
        setNewEmployee(prev => ({ ...prev, Emp_EmailAcceso: `${firstInitial}${lastName}@zyra.com` }));
      }
    }
  }, [newEmployee.Emp_Nombre, isEmailManuallyEdited]);

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
    if (!db || !newEmployee.Emp_Nombre || !newEmployee.Emp_CorreoPersonal || !newEmployee.Emp_EmailAcceso) return;

    // Basic format validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.Emp_CorreoPersonal)) {
      toast({ variant: "destructive", title: "Error", description: "Formato de correo personal inválido" });
      return;
    }
    if (!emailRegex.test(newEmployee.Emp_EmailAcceso)) {
      toast({ variant: "destructive", title: "Error", description: "Formato de correo de acceso inválido" });
      return;
    }

    setLoading(true);

    // 1. Check for duplicates in Firestore first (Avoid useless Auth calls)
    try {
      const q = query(collection(db, "users"), where("emailAcceso", "==", newEmployee.Emp_EmailAcceso.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast({
          variant: "destructive",
          title: "Email en uso",
          description: `El correo ${newEmployee.Emp_EmailAcceso} ya está asignado a otro técnico. Prueba con una variación o añade un número.`
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Error checking duplicates:", e);
    }

    const generatedPassword = Math.random().toString(36).slice(-8) + "!";
    const finalAccessEmail = newEmployee.Emp_EmailAcceso.trim();

    let secondaryApp;
    try {
      const appName = `secondary-reg-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Create Auth user
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        finalAccessEmail,
        generatedPassword
      );

      const uid = userCredential.user.uid;

      // 3. Save to Firestore
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid: uid,
        nombre: newEmployee.Emp_Nombre.trim(),
        emailPersonal: newEmployee.Emp_CorreoPersonal.trim(),
        emailAcceso: finalAccessEmail,
        email: finalAccessEmail,
        telefono: newEmployee.Emp_Telefono.trim(),
        rol: "employee",
        nivel: 1,
        puntos: 0,
        racha: 0,
        logros: [],
        createdAt: serverTimestamp(),
      });

      setGeneratedCreds({
        zyraEmail: finalAccessEmail,
        password: generatedPassword,
        personalEmail: newEmployee.Emp_CorreoPersonal
      });
      setShowCredentials(true);

      toast({ title: t.common.success, description: "Empleado registrado con éxito." });

      setNewEmployee({
        Emp_Nombre: "",
        Emp_CorreoPersonal: "",
        Emp_Telefono: "",
        Emp_EmailAcceso: "",
      });
      setIsEmailManuallyEdited(false);
    } catch (e: any) {
      console.error("Error en registro:", e);
      let errorMsg = e.message;
      if (e.code === 'auth/email-already-in-use') {
        errorMsg = "Este email ya existe en el sistema de seguridad. Si el técnico no está en la lista de arriba, significa que es una 'cuenta fantasma' borrar de la consola de Firebase.";
      }
      toast({ variant: "destructive", title: t.common.error, description: errorMsg });
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (delError) { }
      }
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!db || !isAdmin) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "users", employeeId));
      toast({ title: t.common.success, description: "Empleado eliminado de la lista. (Nota: El acceso sigue activo en Firebase Auth)" });
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
                  <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t.employees.full_name}</Label>
                      <Input
                        id="name"
                        placeholder="Ej. Juan Pérez"
                        className="h-11 bg-muted/50 border-border text-foreground"
                        value={newEmployee.Emp_Nombre || ""}
                        onChange={(e) => setNewEmployee({ ...newEmployee, Emp_Nombre: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-accent tracking-widest flex items-center gap-2">
                        <Mail className="h-3 w-3" /> Correo de Acceso (Corporativo)
                      </Label>
                      <div className="relative group">
                        <Input
                          placeholder="usuario@zyra.com"
                          className="h-11 bg-accent/5 border-accent/20 text-foreground font-medium pr-10"
                          value={newEmployee.Emp_EmailAcceso || ""}
                          onChange={(e) => {
                            setNewEmployee({ ...newEmployee, Emp_EmailAcceso: e.target.value });
                            setIsEmailManuallyEdited(true);
                          }}
                        />
                        {isEmailManuallyEdited && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-black text-accent bg-accent/10 px-1 rounded">Editado</div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">Este será su nombre de usuario para iniciar sesión en ZYRA.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t.employees.personal_email}</Label>
                        <Input
                          type="email"
                          placeholder="personal@gmail.com"
                          className="h-11 bg-muted/50 border-border text-foreground"
                          value={newEmployee.Emp_CorreoPersonal || ""}
                          onChange={(e) => setNewEmployee({ ...newEmployee, Emp_CorreoPersonal: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t.employees.phone}</Label>
                        <Input
                          placeholder="10 dígitos"
                          className="h-11 bg-muted/50 border-border text-foreground"
                          value={newEmployee.Emp_Telefono || ""}
                          onChange={(e) => setNewEmployee({ ...newEmployee, Emp_Telefono: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      className="bg-accent hover:bg-accent/90 text-white w-full h-12 text-lg font-bold rounded-xl transition-all shadow-lg"
                      disabled={!newEmployee.Emp_Nombre || !newEmployee.Emp_EmailAcceso || loading}
                      onClick={handleCreateEmployee}
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Crear Registro"}
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
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <p className="text-[10px] text-yellow-500 uppercase font-bold tracking-tighter">
                        COPIE ESTAS CREDENCIALES AHORA. POR SEGURIDAD NO SE VOLVERÁN A MOSTRAR.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full font-bold bg-accent hover:bg-accent/90 text-white h-12 rounded-xl" onClick={() => setIsCreateDialogOpen(false)}>
                      Cerrar y Continuar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-2xl overflow-hidden border-border bg-card">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-foreground text-lg font-bold">{t.employees.payroll}</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t.common.search} className="pl-10 bg-background border-border text-xs h-10 text-foreground" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">{t.employees.full_name}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">{t.employees.access_email}</TableHead>
                    <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">{t.employees.level_points}</TableHead>
                    <TableHead className="text-center text-muted-foreground uppercase text-[10px] font-bold tracking-widest">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="border-border hover:bg-muted/5 transition-colors group">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 transition-transform group-hover:scale-110">
                            <span className="text-xs font-black text-accent">{(emp.nombre || emp.Emp_Nombre || "?").substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{emp.nombre || emp.Emp_Nombre}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Técnico Operativo</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-foreground font-medium"><Mail className="h-3 w-3 text-accent" /> {emp.emailAcceso || emp.email || "N/A"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-[10px] font-black border-accent/20 text-accent">NV {emp.nivel || 1}</Badge>
                          <div className="flex items-center gap-1 group-hover:scale-110 transition-transform"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /><span className="text-xs text-muted-foreground font-black">{emp.puntos || 0}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-muted/50 hover:bg-accent/10 text-accent font-black text-[10px] uppercase rounded-xl"
                            onClick={() => handleViewProfile(emp)}
                          >
                            {t.employees.view_profile}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.common.confirm}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Eliminar permanentemente el registro de {emp.nombre || emp.Emp_Nombre}?
                                  <span className="block mt-2 font-bold text-destructive">Nota: Esto no cancela su acceso en Firebase Auth automáticamente por seguridad.</span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-muted">{t.common.cancel}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-white font-bold"
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
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">No hay técnicos registrados</h3>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Profile Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-md ring-1 ring-border">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2 uppercase font-black tracking-widest text-sm">
                <UserCircle className="h-5 w-5" /> Expediente del Técnico
              </DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-4 bg-muted/10 p-6 rounded-3xl border border-border/50">
                  <div className="h-24 w-24 rounded-2xl bg-accent/20 border-2 border-accent/30 flex items-center justify-center shadow-xl shadow-accent/10">
                    <span className="text-4xl font-black text-accent italic">
                      {(selectedEmployee.nombre || selectedEmployee.Emp_Nombre || "?").substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-foreground tracking-tight">{selectedEmployee.nombre || selectedEmployee.Emp_Nombre}</h3>
                    <div className="inline-block px-3 py-1 bg-accent rounded-full mt-2">
                      <p className="text-[9px] text-white font-black uppercase tracking-[0.3em]">Operaciones ZYRA</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-2xl border border-border text-center shadow-sm">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground block mb-2">Poder / Nivel</Label>
                    <div className="flex items-center justify-center gap-2 text-xl font-black text-accent italic">
                      <Zap className="h-5 w-5 animate-pulse" /> {selectedEmployee.nivel || 1}
                    </div>
                  </div>
                  <div className="bg-card p-4 rounded-2xl border border-border text-center shadow-sm">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground block mb-2">Prestigio / Puntos</Label>
                    <div className="flex items-center justify-center gap-2 text-xl font-black text-yellow-500 italic">
                      <Star className="h-5 w-5 fill-yellow-500" /> {selectedEmployee.puntos || 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2 tracking-widest">Email de Acceso (ID)</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-4 rounded-2xl border border-border/50 group">
                      <div className="flex items-center gap-3 truncate font-bold text-accent">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{selectedEmployee.emailAcceso || selectedEmployee.email || "N/A"}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(selectedEmployee.emailAcceso)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2 tracking-widest">Email Personal</Label>
                    <div className="flex items-center gap-3 text-sm text-foreground bg-muted/20 p-4 rounded-2xl border border-border/50">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{selectedEmployee.emailPersonal || "N/A"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2 tracking-widest">Contacto Directo</Label>
                    <div className="flex items-center gap-3 text-sm text-foreground bg-muted/20 p-4 rounded-2xl border border-border/50">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <span className="font-mono font-bold">{selectedEmployee.telefono || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button className="w-full bg-accent hover:bg-accent/90 text-white font-black h-12 rounded-2xl shadow-lg shadow-accent/20" onClick={() => setIsViewDialogOpen(false)}>
                CERRAR EXPEDIENTE
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
