
"use client";

import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  ArrowRight, 
  Plus,
  Sparkles,
  Camera,
  Loader2,
  Briefcase,
  Users,
  ClipboardList,
  Building2,
  Zap,
  Wrench,
  Trash2,
  Settings2,
  CheckCircle2,
  Circle,
  TrendingUp,
  X
} from "lucide-react";
import Image from "next/image";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { doc, collection, addDoc, query, where, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { aiReportDraftingAssistant } from "@/ai/flows/ai-report-drafting-assistant-flow";
import { useI18n } from "@/components/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function ProjectsPage() {
  const { profile, user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // --- Admin Project Management State ---
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [managedProject, setManagedProject] = useState<any>(null);
  const [managedStatus, setManagedStatus] = useState("");
  const [managedProgress, setManagedProgress] = useState(0);
  const [checklistItems, setChecklistItems] = useState<{name: string; done: boolean}[]>([]);
  const [savingManage, setSavingManage] = useState(false);

  const [newProject, setNewProject] = useState({
    Pry_Nombre_Proyecto: "",
    clientId: "",
    serviceType: "Instalación",
    assignedTeamId: "no-team",
    addressType: "client" as "client" | "custom",
    customAddress: "",
    imageUrl: "https://picsum.photos/seed/solar-default/800/450"
  });

  const [reportContent, setReportContent] = useState("");
  const [reportPhotos, setReportPhotos] = useState<{ name: string; dataUrl: string }[]>([]);
  const [usedMaterials, setUsedMaterials] = useState<{ id: string; name: string; qty: number }[]>([]);
  const [opChecklistItems, setOpChecklistItems] = useState<{ name: string; done: boolean }[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [checklist, setChecklist] = useState({
    epp_completo: false,
    herramientas_listas: false,
    seguridad_area: false
  });

  const userTeamsQuery = useMemoFirebase(() => {
    if (!db || !user || isAdmin) return null;
    return query(collection(db, "teams"), where("members", "array-contains", user.uid));
  }, [db, user, isAdmin]);

  const { data: myTeams } = useCollection(userTeamsQuery);

  const clientsQuery = useMemoFirebase(() => (db && profile && isAdmin) ? collection(db, "clientes") : null, [db, profile, isAdmin]);
  const { data: clients } = useCollection(clientsQuery);

  const teamsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "teams");
    return query(collection(db, "teams"), where("members", "array-contains", user?.uid));
  }, [db, profile, isAdmin, user?.uid]);
  const { data: teams } = useCollection(teamsQuery);

  // Checklist templates (from materials/checklist_servicio)
  const checklistsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    return collection(db, "checklist_servicio");
  }, [db, profile]);
  const { data: checklistTemplates } = useCollection(checklistsQuery);

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "proyectos");
    if (myTeams && myTeams.length > 0) {
      const teamIds = myTeams.map(t => t.id);
      return query(collection(db, "proyectos"), where("assignedTeamId", "in", teamIds));
    }
    return query(collection(db, "proyectos"), where("assignedTeamId", "==", "no-team"));
  }, [db, isAdmin, profile, myTeams]);

  const materialsQuery = useMemoFirebase(() => (db && profile) ? collection(db, "materiales") : null, [db, profile]);
  const { data: allMaterials } = useCollection(materialsQuery);

  const employeesQuery = useMemoFirebase(() => (db && profile && isAdmin) ? collection(db, "users") : null, [db, profile, isAdmin]);
  const { data: employees } = useCollection(employeesQuery);

  const { data: firestoreProjects, isLoading: projectsLoading } = useCollection(projectsQuery);

  const createNotification = async (notif: { userId: string, title: string, message: string, type: string }) => {
    if (!db) return;
    try {
      await addDoc(collection(db, "notifications"), {
        ...notif,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error creating notification:", e);
    }
  };

  const notifyTeamMembers = (teamId: string, title: string, message: string) => {
    const team = teams?.find(t => t.id === teamId);
    if (!team) return;
    
    const recipients = new Set<string>();
    if (team.leaderId) recipients.add(team.leaderId);
    if (team.members) team.members.forEach((uid: string) => recipients.add(uid));
    
    recipients.forEach(uid => {
      createNotification({ userId: uid, title, message, type: 'project' });
    });
  };

  const handleCreateProject = () => {
    if (!db) return;
    setLoading(true);

    const selectedClient = clients?.find(c => c.id === newProject.clientId);
    const finalAddress = newProject.addressType === 'client' 
      ? (selectedClient?.Cl_Direccion || "Sin dirección registrada") 
      : newProject.customAddress;

    const colRef = collection(db, "proyectos");
    const data = {
      Pry_Nombre_Proyecto: newProject.Pry_Nombre_Proyecto,
      clientId: newProject.clientId,
      clientName: selectedClient?.Cl_Nombre || "Cliente Desconocido",
      serviceType: newProject.serviceType,
      assignedTeamId: newProject.assignedTeamId,
      ubicacion: finalAddress,
      Pry_Estado: "Pendiente",
      progreso: 0,
      fecha_creacion: new Date().toISOString(),
      imageUrl: newProject.imageUrl,
      createdAt: serverTimestamp(),
    };

    addDoc(colRef, data)
      .then(async (docRef) => {
        toast({ title: t.common.success, description: t.projects.create_success });
        setIsCreateDialogOpen(false);
        
        // Notificar al equipo asignado
        if (newProject.assignedTeamId !== 'no-team') {
          notifyTeamMembers(
            newProject.assignedTeamId, 
            "Nuevo Proyecto Asignado", 
            `Se te ha asignado el proyecto: ${newProject.Pry_Nombre_Proyecto}`
          );
        }

        setNewProject({
          Pry_Nombre_Proyecto: "",
          clientId: "",
          serviceType: "Instalación",
          assignedTeamId: "no-team",
          addressType: "client",
          customAddress: "",
          imageUrl: "https://picsum.photos/seed/solar-default/800/450"
        });
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!db || !isAdmin) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "proyectos", projectId));
      toast({ title: t.common.success, description: t.common.delete });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `proyectos/${projectId}`,
        operation: 'delete'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProjectTeam = (projectId: string, teamId: string) => {
    if (!db) return;
    const docRef = doc(db, "proyectos", projectId);
    const data = { assignedTeamId: teamId };

    updateDoc(docRef, data)
      .then(() => {
        toast({ title: t.common.success });
        setIsTeamDialogOpen(false);
        
        // Notificar al equipo asignado
        if (teamId !== 'no-team') {
          const projectName = firestoreProjects?.find(p => p.id === projectId)?.Pry_Nombre_Proyecto || "Proyecto";
          notifyTeamMembers(
            teamId, 
            "Proyecto Reasignado", 
            `Se te ha reasignado el proyecto: ${projectName}`
          );
        }
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      });
  };

  // --- Admin: Open manage dialog ---
  const openManageDialog = (project: any) => {
    setManagedProject(project);
    setManagedStatus(project.Pry_Estado || "Pendiente");
    setManagedProgress(project.progreso || 0);

    // Load checklist items from project or from template
    if (project.checklistItems && project.checklistItems.length > 0) {
      setChecklistItems(project.checklistItems);
    } else {
      // Try to get template based on service type
      const templateKey = project.serviceType === 'Mantenimiento' ? 'Mantenimiento' : 'Instalación';
      const template = checklistTemplates?.find(c => c.id === templateKey);
      if (template?.items && template.items.length > 0) {
        setChecklistItems(template.items.map((item: any) => ({
          name: typeof item === 'string' ? item : (item.name || 'Tarea'),
          done: false
        })));
      } else {
        setChecklistItems([]);
      }
    }
    setIsManageDialogOpen(true);
  };

  // --- Admin: Save project management changes ---
  const handleSaveManagement = async () => {
    if (!db || !managedProject) return;
    setSavingManage(true);

    const docRef = doc(db, "proyectos", managedProject.id);
    const prevStatus = managedProject.Pry_Estado || "Pendiente";
    const data: any = {
      Pry_Estado: managedStatus,
      progreso: managedProgress,
      checklistItems: checklistItems,
      updatedAt: serverTimestamp(),
    };

    // If status changed to Finalizado, set completion date
    if (managedStatus === 'Finalizado' && prevStatus !== 'Finalizado') {
      data.fecha_finalizacion = new Date().toISOString();
      data.progreso = 100;
    }

    try {
      await updateDoc(docRef, data);

      // Log points history if status advanced
      if (prevStatus !== managedStatus) {
        const pointsCol = collection(db, "puntos_historial");
        const pointsForStatus = managedStatus === 'EnProceso' ? 25 : managedStatus === 'Finalizado' ? 100 : 0;
        if (pointsForStatus > 0) {
          await addDoc(pointsCol, {
            projectId: managedProject.id,
            projectName: managedProject.Pry_Nombre_Proyecto,
            teamId: managedProject.assignedTeamId || 'no-team',
            action: `Estado cambiado: ${prevStatus} → ${managedStatus}`,
            points: pointsForStatus,
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp(),
          }).catch(() => {}); // Non-critical
        }
      }

      toast({ title: t.common.success, description: `Proyecto actualizado a ${managedStatus}` });
      setIsManageDialogOpen(false);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data
      }));
    } finally {
      setSavingManage(false);
    }
  };

  // --- Toggle checklist item ---
  const toggleChecklistItem = (index: number) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], done: !updated[index].done };
    setChecklistItems(updated);
    // Auto-calculate progress from checklist
    const doneCount = updated.filter(i => i.done).length;
    const newProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : managedProgress;
    setManagedProgress(newProgress);
  };

  const toggleOpChecklistItem = (index: number) => {
    const updated = [...opChecklistItems];
    updated[index] = { ...updated[index], done: !updated[index].done };
    setOpChecklistItems(updated);
  };

  const handleStartDay = (project: any) => {
    if (!user || !db) return;
    
    // Validar checklist completo
    if (opChecklistItems.length > 0 && !opChecklistItems.every(i => i.done)) {
      toast({ variant: "destructive", title: "Checklist incompleto", description: "Debes completar todas las tareas para iniciar." });
      return;
    }

    setLoading(true);
    const userRef = doc(db, "users", user.uid);
    const data = {
      projectStatus: {
        ...profile?.projectStatus,
        [project.id]: {
          checklist_completado: true,
          timestamp_inicio: new Date().toISOString(),
          en_curso: true,
          checklistSnapshot: opChecklistItems
        }
      }
    };

    updateDoc(userRef, data)
      .then(() => {
        toast({ title: t.projects.day_started, description: t.projects.confirm_start });
        setIsSheetOpen(false);
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      })
      .finally(() => setLoading(false));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReportPhotos(prev => [...prev, { name: file.name, dataUrl: ev.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setReportPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddUsedMaterial = (matId: string) => {
    const mat = allMaterials?.find(m => m.id === matId);
    if (!mat) return;
    setUsedMaterials(prev => {
      const existing = prev.find(p => p.id === matId);
      if (existing) return prev;
      return [...prev, { id: matId, name: mat.Mat_Nombre, qty: 1 }];
    });
  };

  const updateUsedMaterialQty = (id: string, qty: number) => {
    setUsedMaterials(prev => prev.map(m => m.id === id ? { ...m, qty: Math.max(1, qty) } : m));
  };

  const removeUsedMaterial = (id: string) => {
    setUsedMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleFinishDayAndReport = async (project: any) => {
    if (!user || !db || !profile) return;
    if (!reportContent) {
      toast({ variant: "destructive", title: t.common.error, description: "Por favor escribe las notas del reporte." });
      return;
    }
    if (reportPhotos.length === 0) {
      toast({ variant: "destructive", title: "Fotos requeridas", description: "Debes subir al menos una evidencia fotográfica." });
      return;
    }

    setLoading(true);
    const reportsCol = collection(db, "reports");
    const reportData = {
      projectId: project.id,
      projectName: project.Pry_Nombre_Proyecto,
      content: reportContent,
      authorName: profile.nombre || "Técnico Zyra",
      employeeId: user.uid,
      assignedTeamId: project.assignedTeamId || "no-team",
      status: "Pendiente",
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
      photoEvidence: reportPhotos,
      usedMaterials: usedMaterials,
      imageUrl: reportPhotos[0].dataUrl
    };

    try {
      // 1. Crear el reporte
      await addDoc(reportsCol, reportData);

      // 2. Descontar Stock
      for (const mat of usedMaterials) {
        const matRef = doc(db, "materiales", mat.id);
        const currentMat = allMaterials?.find(m => m.id === mat.id);
        if (currentMat) {
          const newStock = (currentMat.Mat_Stock_Disponible || 0) - mat.qty;
          await updateDoc(matRef, { Mat_Stock_Disponible: Math.max(0, newStock) });
        }
      }

      // 3. Actualizar puntos y nivel del usuario
      const currentPoints = profile.puntos || 0;
      const currentLevel = profile.level || 1;
      const newPoints = currentPoints + 50;
      let newLevel = currentLevel;
      if (newPoints >= currentLevel * 200) newLevel = currentLevel + 1;

      const userRef = doc(db, "users", user.uid);
      const userDataUpdate = {
        projectStatus: {
          ...profile?.projectStatus,
          [project.id]: {
            checklist_completado: false,
            en_curso: false,
            ultimo_reporte: new Date().toISOString()
          }
        },
        puntos: newPoints,
        level: newLevel
      };
      await updateDoc(userRef, userDataUpdate);

      // 3. ACTUALIZAR ESTADO DEL PROYECTO A FINALIZADO
      const projectRef = doc(db, "proyectos", project.id);
      await updateDoc(projectRef, {
        Pry_Estado: "Finalizado",
        progreso: 100,
        fecha_finalizacion: new Date().toISOString()
      });

      // 4. NOTIFICAR A ADMINISTRADORES
      const admins = employees?.filter(u => u.rol === 'admin'); // Usando employees o allUsers si está disponible
      admins?.forEach(admin => {
        createNotification({
          userId: admin.id,
          title: "Proyecto Finalizado",
          message: `${profile.nombre} ha terminado el proyecto ${project.Pry_Nombre_Proyecto}.`,
          type: 'report'
        });
      });

      // 5. EVALUAR MEDALLAS/LOGROS
      const { checkAndAwardAchievements } = await import("@/lib/gamification");
      const newBadges = await checkAndAwardAchievements(db, user.uid, profile);
      if (newBadges && newBadges.length > 0) {
        toast({ title: "¡Nueva Medalla!", description: `Has ganado: ${newBadges.join(', ')}`, variant: "default" });
      }

      toast({ title: "Proyecto Finalizado", description: "El reporte se envió y el proyecto se marcó como terminado." });
      setIsSheetOpen(false);
      setReportContent("");
      setReportPhotos([]);
    } catch (e: any) {
      console.error("Error al finalizar:", e);
      toast({ variant: "destructive", title: t.common.error });
    } finally {
      setLoading(false);
    }
  };

  const handleAiDraft = async (projectName: string) => {
    if (!reportContent) {
      toast({ title: t.common.error, description: t.projects.placeholder_notes });
      return;
    }

    setIsAiDrafting(true);
    try {
      const result = await aiReportDraftingAssistant({
        reportNotes: reportContent,
        projectName: projectName,
        employeeName: profile?.nombre || "Técnico"
      });

      setReportContent(result.draftedReportDescription);
      toast({ title: t.projects.ai_assistant, description: "AI Assistant OK" });
    } catch (e) {
      toast({ variant: "destructive", title: t.common.error, description: "AI Error" });
    } finally {
      setIsAiDrafting(false);
    }
  };

  if (isUserLoading || (isAdmin && projectsLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 font-body text-foreground">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {isAdmin ? t.projects.title_admin : t.projects.title_op}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {isAdmin ? t.projects.subtitle_admin : t.projects.subtitle_op}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
                  <Plus className="h-4 w-4" /> {t.projects.new_project}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-xl bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-accent text-xl">{t.projects.new_project}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre del Proyecto</Label>
                      <Input 
                        placeholder="Ej: Instalación Residencial..."
                        className="h-11 bg-muted/50"
                        value={newProject.Pry_Nombre_Proyecto}
                        onChange={(e) => setNewProject({...newProject, Pry_Nombre_Proyecto: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</Label>
                      <Select value={newProject.clientId} onValueChange={(val) => setNewProject({...newProject, clientId: val})}>
                        <SelectTrigger className="h-11 bg-muted/50">
                          <SelectValue placeholder="Seleccionar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.Cl_Nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Servicio</Label>
                      <Select value={newProject.serviceType} onValueChange={(val) => setNewProject({...newProject, serviceType: val})}>
                        <SelectTrigger className="h-11 bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Instalación">Instalación</SelectItem>
                          <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Equipo Asignado</Label>
                      <Select value={newProject.assignedTeamId} onValueChange={(val) => setNewProject({...newProject, assignedTeamId: val})}>
                        <SelectTrigger className="h-11 bg-muted/50">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-team">Sin asignar</SelectItem>
                          {teams?.map((team) => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Dirección del Proyecto</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Usar la del Cliente</span>
                        <span className="sr-only">Cambiar tipo de dirección</span>
                        <Switch 
                          checked={newProject.addressType === 'custom'} 
                          onCheckedChange={(checked) => setNewProject({...newProject, addressType: checked ? 'custom' : 'client'})} 
                        />
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Personalizada</span>
                      </div>
                    </div>
                    
                    {newProject.addressType === 'custom' ? (
                      <Input 
                        placeholder="Ingresar dirección física..."
                        className="h-11 bg-background"
                        value={newProject.customAddress}
                        onChange={(e) => setNewProject({...newProject, customAddress: e.target.value})}
                      />
                    ) : (
                      <div className="text-sm p-3 bg-background/50 rounded-lg border border-border/50 text-muted-foreground italic">
                        {newProject.clientId ? (
                          clients?.find(c => c.id === newProject.clientId)?.Cl_Direccion || "Este cliente no tiene dirección registrada"
                        ) : "Selecciona un cliente para ver su dirección..."}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold"
                    disabled={!newProject.Pry_Nombre_Proyecto || !newProject.clientId || loading}
                    onClick={handleCreateProject}
                  >
                    {loading ? t.common.loading : t.common.create}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {firestoreProjects && firestoreProjects.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {firestoreProjects.map((project: any) => {
              const isEnCurso = profile?.projectStatus?.[project.id]?.en_curso;
              const statusColor = project.Pry_Estado === 'EnProceso' ? 'bg-emerald-500' : project.Pry_Estado === 'Finalizado' ? 'bg-primary' : 'bg-yellow-500';
              const assignedTeam = teams?.find(t => t.id === project.assignedTeamId);

              return (
                <Card key={project.id} className="overflow-hidden flex flex-col h-full shadow-lg relative group border-border">
                  <div className="relative h-40 w-full overflow-hidden">
                    <Image
                      src={project.imageUrl || "https://picsum.photos/seed/solar-pan/800/450"}
                      alt={project.Pry_Nombre_Proyecto}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                      <Badge className={cn("font-bold text-[9px] px-2 py-0.5 text-white border-none", statusColor)}>
                        {(project.Pry_Estado || 'PENDIENTE').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="bg-black/50 text-[8px] border-white/20 text-white gap-1">
                        {project.serviceType === 'Mantenimiento' ? <Wrench className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                        {project.serviceType?.toUpperCase()}
                      </Badge>
                      
                      {isAdmin && project.Pry_Estado !== 'Finalizado' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.common.confirm}</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar el proyecto "{project.Pry_Nombre_Proyecto}"? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-muted">{t.common.cancel}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteProject(project.id)}
                                className="bg-destructive hover:bg-destructive/90 text-white"
                              >
                                {t.common.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">{project.Pry_Nombre_Proyecto}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold mb-1">
                        <MapPin className="h-3 w-3 text-accent" />
                        <span className="truncate">{project.ubicacion || "Ubicación Pendiente"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold mb-3">
                        <Building2 className="h-3 w-3 text-accent" />
                        <span className="truncate">{project.clientName || "Cliente no especificado"}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 text-[9px] text-accent uppercase font-bold mb-3">
                          <Users className="h-3 w-3" />
                          <span>{assignedTeam?.name || "SIN EQUIPO ASIGNADO"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase">
                        <span>{t.projects.progress}</span>
                        <span className="text-foreground">{project.progreso || 0}%</span>
                      </div>
                      <Progress value={project.progreso || 0} className="h-1" />
                    </div>
                  </CardContent>

                  <CardFooter className="p-0 border-t border-border">
                    {isAdmin ? (
                      <div className="grid grid-cols-3 w-full">
                        {project.Pry_Estado === 'Finalizado' ? (
                          <div className="h-10 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase text-emerald-500 border-r border-border">
                            <CheckCircle2 className="h-3 w-3" /> Finalizado
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            className="h-10 text-[10px] font-bold border-r border-border rounded-none uppercase gap-1.5 hover:bg-accent/10 text-accent"
                            onClick={() => openManageDialog(project)}
                          >
                            <Settings2 className="h-3 w-3" /> Gestionar
                          </Button>
                        )}
                        <Dialog open={isTeamDialogOpen && selectedProject?.id === project.id} onOpenChange={(open) => {
                          setIsTeamDialogOpen(open);
                          if (open) setSelectedProject(project);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="h-10 text-[10px] font-bold border-r border-border rounded-none uppercase gap-1.5 hover:bg-muted">
                              <Users className="h-3 w-3" /> {t.nav.teams}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-xs bg-card border-border">
                            <DialogHeader>
                              <DialogTitle className="text-sm font-bold uppercase tracking-widest">{t.teams.manage_leader}</DialogTitle>
                              <DialogDescription>Asignar equipo al proyecto.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block">{t.projects.team_assigned}</Label>
                              <Select 
                                defaultValue={project.assignedTeamId} 
                                onValueChange={(val) => handleUpdateProjectTeam(project.id, val)}
                              >
                                <SelectTrigger className="bg-muted/50 h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no-team">Sin asignar</SelectItem>
                                  {teams?.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          className="h-10 text-[10px] font-bold rounded-none uppercase gap-1.5 hover:bg-muted"
                          onClick={() => router.push(`/reports?projectId=${project.id}`)}
                        >
                          <ClipboardList className="h-3 w-3" /> {t.nav.reports}
                        </Button>
                      </div>
                    ) : (
                      <Sheet open={isSheetOpen && selectedProject?.id === project.id} onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (open) {
                          setSelectedProject(project);
                          // Cargar checklist dinámico al abrir
                          if (project.checklistItems && project.checklistItems.length > 0) {
                            setOpChecklistItems(project.checklistItems);
                          } else {
                            const templateKey = project.serviceType === 'Mantenimiento' ? 'Mantenimiento' : 'Instalación';
                            const template = checklistTemplates?.find(c => c.id === templateKey);
                            if (template?.items) {
                              setOpChecklistItems(template.items.map((it: any) => ({
                                name: typeof it === 'string' ? it : (it.name || 'Tarea'),
                                done: false
                              })));
                            } else {
                              setOpChecklistItems([]);
                            }
                          }
                          setReportPhotos([]);
                        }
                      }}>
                        <SheetTrigger asChild>
                          <Button 
                            className={cn(
                              "w-full h-12 rounded-none font-black text-xs uppercase tracking-widest text-white border-none",
                              isEnCurso ? "bg-emerald-600 hover:bg-emerald-700" : "bg-accent hover:bg-accent/90"
                            )}
                          >
                            {isEnCurso ? t.projects.finish_day : t.projects.start_day}
                            <ArrowRight className="h-3 w-3 ml-2" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto px-6 border-border">
                          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6 mt-2" />
                          <SheetHeader className="text-left mb-8">
                            <SheetTitle className="text-accent text-2xl font-black">{project.Pry_Nombre_Proyecto}</SheetTitle>
                            <SheetDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
                              {project.serviceType} - {isEnCurso ? t.projects.finish_day : t.projects.checklist}
                            </SheetDescription>
                          </SheetHeader>
                          
                          <div className="space-y-6 pb-20 text-foreground">
                            {!isEnCurso ? (
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between px-1">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tareas Obligatorias</Label>
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                      {opChecklistItems.filter(i => i.done).length}/{opChecklistItems.length}
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    {opChecklistItems.length > 0 ? opChecklistItems.map((item, idx) => (
                                      <div 
                                        key={idx} 
                                        onClick={() => toggleOpChecklistItem(idx)}
                                        className={cn(
                                          "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                                          item.done 
                                            ? "bg-emerald-500/10 border-emerald-500/30 shadow-inner" 
                                            : "bg-muted/30 border-border hover:border-accent/30"
                                        )}
                                      >
                                        <Label className={cn("text-xs font-bold leading-tight max-w-[80%] cursor-pointer transition-colors", item.done ? "text-emerald-500" : "text-foreground")}>
                                          {item.name}
                                        </Label>
                                        {item.done ? (
                                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground/30" />
                                        )}
                                      </div>
                                    )) : null}
                                  </div>
                                </div>
                                <Button 
                                  className="w-full bg-accent hover:bg-accent/90 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-accent/20"
                                  disabled={(opChecklistItems.length > 0 && !opChecklistItems.every(i => i.done)) || loading}
                                  onClick={() => handleStartDay(project)}
                                >
                                  {loading ? t.common.loading : t.projects.confirm_start}
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.projects.notes}</Label>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-[10px] border-accent/30 text-accent font-black gap-1.5 rounded-full"
                                      onClick={() => handleAiDraft(project.Pry_Nombre_Proyecto)}
                                      disabled={isAiDrafting}
                                    >
                                      {isAiDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                      {t.projects.ai_assistant}
                                    </Button>
                                  </div>
                                  <Textarea 
                                    placeholder={t.projects.placeholder_notes}
                                    className="min-h-[120px] text-sm rounded-2xl p-4 bg-muted/20"
                                    value={reportContent}
                                    onChange={(e) => setReportContent(e.target.value)}
                                  />

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Materiales Usados</Label>
                                      <Select onValueChange={handleAddUsedMaterial}>
                                        <SelectTrigger className="w-[180px] h-8 text-[10px] bg-muted/30 border-border">
                                          <SelectValue placeholder="Añadir material..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {allMaterials?.map(m => (
                                            <SelectItem key={m.id} value={m.id} className="text-xs">
                                              {m.Mat_Nombre} (Stock: {m.Mat_Stock_Disponible})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      {usedMaterials.map(mat => (
                                        <div key={mat.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-xl border border-border">
                                          <span className="text-xs font-bold">{mat.name}</span>
                                          <div className="flex items-center gap-3">
                                            <input 
                                              type="number" 
                                              value={mat.qty} 
                                              onChange={(e) => updateUsedMaterialQty(mat.id, parseInt(e.target.value))}
                                              className="w-12 bg-transparent text-center text-xs font-bold border-b border-accent/20 focus:border-accent outline-none"
                                            />
                                            <button onClick={() => removeUsedMaterial(mat.id)} className="text-destructive"><X className="h-4 w-4" /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={photoInputRef}
                                    onChange={handlePhotoUpload}
                                  />

                                  {reportPhotos.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 border-b border-border pb-4">
                                      {reportPhotos.map((photo, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                          <Image src={photo.dataUrl} alt="" fill className="object-cover" />
                                          <button 
                                            onClick={() => removePhoto(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="h-2 w-2" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-4">
                                    <div 
                                      onClick={() => photoInputRef.current?.click()}
                                      className="aspect-square w-full rounded-2xl bg-muted/20 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent/40 transition-colors cursor-pointer"
                                    >
                                      <Camera className="h-6 w-6" />
                                      <span className="text-[9px] font-bold uppercase tracking-tighter">Añadir Evidencia</span>
                                    </div>
                                    <div className="bg-muted/10 p-4 rounded-2xl border border-border flex flex-col justify-center">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Fotos</p>
                                      <p className={cn("text-xl font-black", reportPhotos.length > 0 ? "text-accent" : "text-muted-foreground/30")}>
                                        {reportPhotos.length}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <Button 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-emerald-900/20"
                                  disabled={!reportContent || reportPhotos.length === 0 || loading}
                                  onClick={() => handleFinishDayAndReport(project)}
                                >
                                  {loading ? t.common.loading : t.projects.confirm_finish}
                                </Button>
                              </div>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-muted/20 rounded-3xl border border-dashed border-border">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4 border border-border">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">{t.common.no_results}</h3>
          </div>
        )}

        {/* ====== ADMIN: PROJECT MANAGEMENT DIALOG ====== */}
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-xl">
            {managedProject && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-accent flex items-center gap-2">
                    <Settings2 className="h-5 w-5" /> {managedProject.Pry_Nombre_Proyecto}
                  </DialogTitle>
                  <DialogDescription>Gestión de ejecución del proyecto — Estado, avance y checklist de servicio.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Status Change */}
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Estado del Proyecto</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'Pendiente', label: 'Pendiente', color: 'bg-yellow-500', icon: Circle },
                        { value: 'EnProceso', label: 'En Proceso', color: 'bg-emerald-500', icon: TrendingUp },
                        { value: 'Finalizado', label: 'Finalizado', color: 'bg-primary', icon: CheckCircle2 },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            setManagedStatus(s.value);
                            if (s.value === 'Pendiente') setManagedProgress(0);
                            if (s.value === 'EnProceso' && managedProgress < 1) setManagedProgress(1);
                            if (s.value === 'Finalizado') setManagedProgress(100);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            managedStatus === s.value 
                              ? "border-accent bg-accent/10" 
                              : "border-border hover:border-accent/30 bg-muted/20"
                          )}
                        >
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white", s.color)}>
                            <s.icon className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Avance del Proyecto</Label>
                      <Badge variant="outline" className="text-accent font-bold text-sm border-accent/30">{managedProgress}%</Badge>
                    </div>
                    <Slider
                      value={[managedProgress]}
                      onValueChange={(val) => setManagedProgress(val[0])}
                      max={100}
                      step={5}
                      className="w-full"
                      disabled={managedStatus === 'Finalizado' || managedStatus === 'Pendiente'}
                    />
                  </div>

                  {/* Info Summary */}
                  <div className="bg-muted/20 rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2"><Building2 className="h-3 w-3 text-accent" /><strong className="text-foreground">Cliente:</strong> {managedProject.clientName || 'N/A'}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-accent" /><strong className="text-foreground">Ubicación:</strong> {managedProject.ubicacion || 'N/A'}</div>
                    <div className="flex items-center gap-2"><Zap className="h-3 w-3 text-accent" /><strong className="text-foreground">Tipo:</strong> {managedProject.serviceType || 'N/A'}</div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" className="w-full border-border" onClick={() => setIsManageDialogOpen(false)}>{t.common.cancel}</Button>
                  <Button 
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-11 gap-2"
                    onClick={handleSaveManagement}
                    disabled={savingManage}
                  >
                    {savingManage ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
