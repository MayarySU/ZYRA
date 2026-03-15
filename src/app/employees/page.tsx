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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Search, Mail, ShieldCheck, UserCircle, Star, Lock, Copy, Loader2, Trash2, Zap, Phone, MessageSquare, RotateCcw } from "lucide-react";
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
  const [generatedCreds, setGeneratedCreds] = useState({ email: "", password: "" });

  const [newEmployee, setNewEmployee] = useState({
    Emp_Nombre: "",
    Emp_CorreoPersonal: "",
    Emp_Telefono: "",
  });

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => 
      (e.Emp_Nombre || e.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.emailAcceso || e.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const handleCreateEmployee = async () => {
    if (!db || !newEmployee.Emp_Nombre) return;
    setLoading(true);
    
    const cleanInput = newEmployee.Emp_Nombre.trim().toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const parts = cleanInput.split(/\s+/);
    const firstInitial = parts[0].charAt(0);
    
    let lastName = "";
    if (parts.length >= 2) {
      lastName = parts[1];
    } else {
      lastName = parts[0];
    }

    const generatedEmail = `${firstInitial}${lastName}@zyra.com`;
    const generatedPassword = Math.random().toString(36).slice(-8) + "!";

    let secondaryApp;
    try {
      secondaryApp = initializeApp(firebaseConfig, "secondary-registration");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        generatedEmail, 
        generatedPassword
      );
      
      const uid = userCredential.user.uid;

      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid: uid,
        nombre: newEmployee.Emp_Nombre,
        emailPersonal: newEmployee.Emp_CorreoPersonal,
        emailAcceso: generatedEmail,
        email: generatedEmail,
        telefono: newEmployee.Emp_Telefono,
        rol: "employee",
        nivel: 1,
        puntos: 0,
        racha: 0,
        logros: [],
        createdAt: serverTimestamp(),
      });

      setGeneratedCreds({ email: generatedEmail, password: generatedPassword });
      setShowCredentials(true);
      
      toast({ 
        title: t.common.success, 
        description: t.projects.create_success
      });

      setNewEmployee({
        Emp_Nombre: "",
        Emp_CorreoPersonal: "",
        Emp_Telefono: "",
      });
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: e.message
      });
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
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
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: e.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email || !auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ 
        title: t.common.success, 
        description: "Se ha enviado un correo para restablecer la contraseña a: " + email
      });
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: e.message
      });
    }
  };

  const handleViewProfile = (emp: any) => {
    setSelectedEmployee(emp);
    setIsViewDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: t.common.success });
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
          <p className="text-muted-foreground max-w-md">{t.employees.subtitle}</p>
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
            <DialogContent className="sm:max-w-lg bg-card border-border">
              {!showCredentials ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-accent">{t.employees.register}</DialogTitle>
                    <CardDescription className="text-muted-foreground">{t.employees.subtitle}</CardDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">{t.employees.full_name}</Label>
                      <Input 
                        id="name" 
                        placeholder="Nombre completo del empleado" 
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
                          placeholder="+52 000 000 0000" 
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
                      {loading ? t.common.loading : t.common.save}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-emerald-500 flex items-center gap-2">
                      <ShieldCheck className="h-6 w-6" /> {t.common.success}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">EMAIL DE ACCESO ZYRA</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={generatedCreds.email || ""} className="bg-muted/50 border-border font-mono text-sm text-foreground" />
                        <Button variant="outline" size="icon" className="border-border hover:bg-muted" onClick={() => copyToClipboard(generatedCreds.email)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">PASSWORD</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={generatedCreds.password || ""} className="bg-muted/50 border-border font-mono text-sm text-accent" />
                        <Button variant="outline" size="icon" className="border-border hover:bg-muted" onClick={() => copyToClipboard(generatedCreds.password)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md">
                      <p className="text-[10px] text-yellow-500 uppercase font-bold tracking-tighter flex items-center gap-2">
                        <Lock className="h-3 w-3" /> SECURITY: PASSWORD SHOWN ONLY ONCE
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full font-bold bg-accent hover:bg-accent/90 text-white" onClick={() => setIsCreateDialogOpen(false)}>
                      {t.common.understood}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-2xl overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-lg font-bold">{t.employees.payroll}</CardTitle>
              <div className="relative w-64">
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
                            <span className="text-xs font-bold text-accent">{(emp.Emp_Nombre || emp.nombre || "?").substring(0,2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{emp.Emp_Nombre || emp.nombre}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">ID: {emp.id.substring(0,8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-foreground"><Mail className="h-3 w-3 text-accent" /> {emp.emailAcceso || emp.email || "N/A"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-foreground">{t.dashboard.level} {emp.nivel || 1}</span>
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
                                  {t.common.delete}: {emp.Emp_Nombre || emp.nombre}?
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
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">{t.common.no_results}</h3>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Profile Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-accent flex items-center gap-2">
                <UserCircle className="h-5 w-5" /> {t.employees.view_profile}
              </DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-4 border-b border-border pb-6">
                  <div className="h-20 w-20 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center">
                    <span className="text-2xl font-black text-accent">
                      {(selectedEmployee.Emp_Nombre || selectedEmployee.nombre || "?").substring(0,2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground">{selectedEmployee.Emp_Nombre || selectedEmployee.nombre}</h3>
                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mt-1">Técnico Operativo</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-xl border border-border">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Nivel Actual</Label>
                    <div className="flex items-center gap-2 text-sm font-black text-foreground">
                      <Zap className="h-4 w-4 text-accent" /> {selectedEmployee.nivel || 1}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Puntos Totales</Label>
                    <div className="flex items-center gap-2 text-sm font-black text-foreground">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> {selectedEmployee.puntos || 0} pts
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Email de Acceso ZYRA</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 truncate">
                        <Mail className="h-4 w-4 text-accent" /> 
                        <span className="font-medium truncate">{selectedEmployee.emailAcceso || selectedEmployee.email || "N/A"}</span>
                      </div>
                    </div>
                    {selectedEmployee.emailAcceso && (
                      <button 
                        className="text-[9px] text-accent font-bold uppercase tracking-tighter ml-1 mt-1 hover:underline flex items-center gap-1"
                        onClick={() => handleResetPassword(selectedEmployee.emailAcceso)}
                      >
                        <RotateCcw className="h-3 w-3" /> Restablecer contraseña
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Email Personal</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 truncate">
                        <Mail className="h-4 w-4 text-muted-foreground" /> 
                        <span className="font-medium truncate">{selectedEmployee.emailPersonal || "N/A"}</span>
                      </div>
                      {selectedEmployee.emailPersonal && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-accent hover:bg-accent/10"
                          asChild
                        >
                          <a 
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedEmployee.emailPersonal}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Teléfono de Contacto</Label>
                    <div className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 truncate">
                        <Phone className="h-4 w-4 text-accent" /> 
                        <span className="font-medium truncate">{selectedEmployee.telefono || "N/A"}</span>
                      </div>
                      {selectedEmployee.telefono && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                            title="WhatsApp"
                            asChild
                          >
                            <a 
                              href={`https://wa.me/${selectedEmployee.telefono.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-accent hover:bg-accent/10"
                            title="Llamar"
                            asChild
                          >
                            <a href={`tel:${selectedEmployee.telefono.replace(/\D/g, '')}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12" onClick={() => setIsViewDialogOpen(false)}>
                {t.common.back}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
