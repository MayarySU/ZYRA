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
import { doc, collection, addDoc, query, where, serverTimestamp, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { aiReportDraftingAssistant } from "@/ai/flows/ai-report-drafting-assistant-flow";
import { useI18n } from "@/components/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { logActivity } from "@/lib/activity-logger";
import { checkAndAwardAchievements } from "@/lib/gamification"; // MOVE TO TOP

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
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- Admin Project Management State ---
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [managedProject, setManagedProject] = useState<any>(null);
  const [managedStatus, setManagedStatus] = useState("");
  const [managedProgress, setManagedProgress] = useState(0);
  const [checklistItems, setChecklistItems] = useState<{ name: string; done: boolean }[]>([]);
  const [managedTeamId, setManagedTeamId] = useState("no-team");
  const [savingManage, setSavingManage] = useState(false);

  // --- Operator / Report State ---
  const [newProject, setNewProject] = useState({
    Pry_Nombre_Proyecto: "",
    clientId: "",
    serviceType: "Instalación",
    assignedTeamId: "no-team",
    addressType: "client" as "client" | "custom",
    customAddress: "",
    imageUrl: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2070&auto=format&fit=crop"
  });

  const [reportContent, setReportContent] = useState("");
  const [reportPhotos, setReportPhotos] = useState<{ name: string; dataUrl: string }[]>([]);
  const [opChecklistItems, setOpChecklistItems] = useState<{ name: string; done: boolean }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // --- Notification Helpers ---
  const createNotification = async (data: { userId: string, title: string, message: string, type: string }) => {
    /* Temporarily disabled to avoid permission errors
    if (!db) return;
    try {
      await addDoc(collection(db, "notifications"), {
        ...data,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error creating notification:", e);
    }
    */
    console.log("Notification skipped (Permissions):", data.title);
  };

  const notifyTeamMembers = async (teamId: string, title: string, message: string) => {
    if (!db || !teamId || teamId === 'no-team') return;
    try {
      const teamRef = doc(db, "teams", teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const members = teamData.members || [];
        const leaderId = teamData.leaderId;

        const userIds = new Set<string>();
        if (leaderId) userIds.add(leaderId);
        members.forEach((m: string) => userIds.add(m));

        const notificationPromises = Array.from(userIds).map(id =>
          createNotification({
            userId: id,
            title,
            message,
            type: 'project'
          })
        );
        await Promise.all(notificationPromises);
      }
    } catch (e) {
      console.error("Error notifying team:", e);
    }
  };

  // --- Firestore Queries ---
  const teamsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "teams");
    return query(collection(db, "teams"), where("members", "array-contains", user?.uid));
  }, [db, profile, isAdmin, user?.uid]);
  const { data: teams } = useCollection(teamsQuery);

  const userTeamsQuery = useMemoFirebase(() => {
    if (!db || !user || isAdmin) return null;
    return query(collection(db, "teams"), where("members", "array-contains", user.uid));
  }, [db, user, isAdmin]);
  const { data: myTeams } = useCollection(userTeamsQuery);

  const clientsQuery = useMemoFirebase(() => (db && profile && isAdmin) ? collection(db, "clientes") : null, [db, profile, isAdmin]);
  const { data: clients } = useCollection(clientsQuery);

  const checklistsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    return collection(db, "checklist_servicio");
  }, [db, profile]);
  const { data: checklistTemplates } = useCollection(checklistsQuery);

  const allMaterialsQuery = useMemoFirebase(() => {
    if (!db || !profile || profile.rol !== 'admin') return null;
    return collection(db, "materiales");
  }, [db, profile]);
  const { data: allMaterials } = useCollection(allMaterialsQuery);

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "proyectos");
    if (myTeams && myTeams.length > 0) {
      const teamIds = myTeams.map(t => t.id);
      return query(collection(db, "proyectos"), where("assignedTeamId", "in", teamIds));
    }
    return query(collection(db, "proyectos"), where("assignedTeamId", "==", "no-team"));
  }, [db, isAdmin, profile, myTeams]);
  const { data: firestoreProjects, isLoading: projectsLoading } = useCollection(projectsQuery);


  const employeesQuery = useMemoFirebase(() => (db && profile && isAdmin) ? collection(db, "users") : null, [db, profile, isAdmin]);
  const { data: employees } = useCollection(employeesQuery);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "reports");
    // Technicians see their own reports (or team reports if needed later)
    return query(collection(db, "reports"), where("employeeId", "==", user?.uid));
  }, [db, isAdmin, profile, user?.uid]);
  const { data: reports } = useCollection(reportsQuery);

  // --- Handlers ---
  const handleCreateProject = () => {
    if (!db || !user?.uid) return;
    setLoading(true);

    const currentUid = user.uid;
    const currentProfileName = profile?.nombre || "Admin";

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

        /* 
        await logActivity(db, {
          userId: currentUid,
          userName: currentProfileName,
          type: 'project_assigned',
          title: "Proyecto Creado",
          description: `Se creó el proyecto: ${newProject.Pry_Nombre_Proyecto}`,
          projectId: docRef.id,
          projectName: newProject.Pry_Nombre_Proyecto
        });
        */

        if (newProject.assignedTeamId !== 'no-team') {
          notifyTeamMembers(newProject.assignedTeamId, "Nuevo Proyecto Asignado", `Se te ha asignado: ${newProject.Pry_Nombre_Proyecto}`);
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
        if (teamId !== 'no-team') {
          const projectName = firestoreProjects?.find(p => p.id === projectId)?.Pry_Nombre_Proyecto || "Proyecto";
          notifyTeamMembers(teamId, "Proyecto Reasignado", `Se te ha reasignado el proyecto: ${projectName}`);
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

  const openManageDialog = (project: any) => {
    setManagedProject(project);
    setManagedStatus(project.Pry_Estado || "Pendiente");
    setManagedProgress(project.progreso || 0);
    setManagedTeamId(project.assignedTeamId || "no-team");

    if (project.checklistItems && project.checklistItems.length > 0) {
      setChecklistItems(project.checklistItems);
    } else {
      const templateKey = project.serviceType === 'Mantenimiento' ? 'Mantenimiento' : 'Instalación';
      const template = checklistTemplates?.find(c => c.id === templateKey);
      if (template?.items) {
        setChecklistItems(template.items.map((it: any) => ({
          name: typeof it === 'string' ? it : (it.name || 'Tarea'),
          done: false
        })));
      } else {
        setChecklistItems([]);
      }
    }
    setIsManageDialogOpen(true);
  };

  const handleSaveManagement = async () => {
    if (!db || !managedProject) return;
    setSavingManage(true);

    const docRef = doc(db, "proyectos", managedProject.id);
    const prevStatus = managedProject.Pry_Estado || "Pendiente";
    const data: any = {
      Pry_Estado: managedStatus,
      progreso: managedProgress,
      checklistItems: checklistItems,
      assignedTeamId: managedTeamId,
      updatedAt: serverTimestamp(),
    };

    if (managedStatus === 'Finalizado' && prevStatus !== 'Finalizado') {
      data.fecha_finalizacion = new Date().toISOString();
      data.progreso = 100;
    }

    try {
      await updateDoc(docRef, data);
      if (prevStatus !== managedStatus) {
        const pointsForStatus = managedStatus === 'EnProceso' ? 25 : managedStatus === 'Finalizado' ? 100 : 0;
        if (pointsForStatus > 0) {
          await addDoc(collection(db, "puntos_historial"), {
            projectId: managedProject.id,
            projectName: managedProject.Pry_Nombre_Proyecto,
            teamId: managedProject.assignedTeamId || 'no-team',
            action: `Estado cambiado: ${prevStatus} → ${managedStatus}`,
            points: pointsForStatus,
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp(),
          }).catch(() => { });
        }
      }
      toast({ title: t.common.success, description: `Proyecto a ${managedStatus}` });
      setIsManageDialogOpen(false);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path, operation: 'update'
      }));
    } finally {
      setSavingManage(false);
    }
  };

  const toggleChecklistItem = (index: number) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], done: !updated[index].done };
    setChecklistItems(updated);
    const doneCount = updated.filter(i => i.done).length;
    const newProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : managedProgress;
    setManagedProgress(newProgress);
  };

  const toggleOpChecklistItem = (index: number) => {
    const updated = [...opChecklistItems];
    updated[index] = { ...updated[index], done: !updated[index].done };
    setOpChecklistItems(updated);
  };

  const handleStartDay = async (project: any) => {
    if (!user?.uid || !db) return;
    
    const currentUid = user.uid;
    const currentProfileName = profile?.nombre || "Técnico";

    // Calculate initial progress based on what's marked before starting
    const totalItems = opChecklistItems.length;
    const finishedItems = opChecklistItems.filter(i => i.done).length;
    const calculatedProgress = totalItems > 0 ? Math.round((finishedItems / totalItems) * 100) : project.progreso || 0;

    setLoading(true);
    const userRef = doc(db, "users", currentUid);
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
      .then(async () => {
        // 1. Create an INITIAL REPORT so the progress bar moves immediately
        try {
          await addDoc(collection(db, "reports"), {
            projectId: project.id,
            Pry_Nombre_Proyecto: project.Pry_Nombre_Proyecto,
            employeeId: currentUid,
            employeeName: currentProfileName,
            content: "Inicio de jornada con verificación de materiales.",
            progressAtTime: calculatedProgress,
            checklistSnapshot: opChecklistItems,
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp(),
            type: 'start_day_sync' // Internal tag to identify this as a sync report
          });
        } catch (reportErr) {
          console.warn("Initial sync report failed:", reportErr);
        }

        // 2. Attempt a MINIMAL update to projects (might fail due to permissions, but we try)
        try {
          const projectRef = doc(db, "proyectos", project.id);
          await updateDoc(projectRef, {
            Pry_Estado: "EnProceso",
            progreso: calculatedProgress
          });
        } catch (projErr) {
          console.warn("Minimal sync failed:", projErr);
        }

        toast({ title: t.projects.day_started, description: `Iniciado al ${calculatedProgress}% y sincronizado.` });
        setIsSheetOpen(false);
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update' }));
      })
      .finally(() => setLoading(false));
  };

  function handleToggleOpItem(idx: number) {
    setOpChecklistItems(prev => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], done: !updated[idx].done };
      }
      return updated;
    });
  }

  const handleFinishDayAndReport = async (project: any) => {
    if (!user?.uid || !db || !profile) return;
    setLoading(true);

    try {
      // Calculate progress based on completion of checklist items
      const totalItems = opChecklistItems.length;
      const finishedItems = opChecklistItems.filter(i => i.done).length;
      const calculatedProgress = totalItems > 0 ? Math.round((finishedItems / totalItems) * 100) : project.progreso || 0;

      const currentUid = user.uid;
      const currentProfile = profile;

      // Find team details for the report
      const assignedTeam = teams?.find(t => t.id === project.assignedTeamId);

      // 1. Create Report in "reports" collection
      const reportData = {
        // Project Metadata (sync with ReportsPage)
        projectId: project.id,
        projectName: project.Pry_Nombre_Proyecto || "Sin nombre",
        clientName: project.clientName || "N/A",
        ubicacion: project.ubicacion || "N/A",
        serviceType: project.serviceType || "N/A",
        projectStatus: project.Pry_Estado || "N/A",
        projectProgress: calculatedProgress,
        
        // Team Metadata
        assignedTeamId: project.assignedTeamId || "no-team",
        teamName: assignedTeam?.name || "Sin equipo asignado",
        teamType: assignedTeam?.type || "N/A",
        teamLeader: assignedTeam?.leaderId || null,
        teamMembers: assignedTeam?.members || [],
        
        // Report specific data
        content: reportContent || "Reporte de avance diario",
        authorName: currentProfile.nombre || "Técnico Zyra",
        employeeId: currentUid,
        status: "Pendiente",
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
        photoEvidence: reportPhotos,
        progressAtTime: calculatedProgress,
        checklistSnapshot: opChecklistItems
      };
      // 1. Create Report in "reports" collection
      try {
        await addDoc(collection(db, "reports"), reportData);
      } catch (reportErr: any) {
        console.error("Error creating report:", reportErr);
        throw new Error("No tienes permiso para crear reportes. " + reportErr.message);
      }

      // 2. Update Project (MINIMAL update for dashboard sync)
      let projectUpdateSuccess = true;
      try {
        const projectRef = doc(db, "proyectos", project.id);
        await updateDoc(projectRef, {
          progreso: calculatedProgress,
          Pry_Estado: calculatedProgress === 100 ? "Finalizado" : "EnProceso"
        });
      } catch (projErr: any) {
        console.warn("Minimal project update failed:", projErr);
        projectUpdateSuccess = false;
      }

      // 3. Update User (Gamification & Status) - CRITICAL for clearing 'en_curso'
      try {
        const userRef = doc(db, "users", currentUid);
        const currentPoints = currentProfile.puntos || 0;
        const currentLevel = currentProfile.level || 1;
        
        let newPoints = currentPoints;
        if (calculatedProgress > (project.progreso || 0)) newPoints += 50;
        
        let newLevel = currentLevel;
        if (newPoints >= currentLevel * 200) newLevel = currentLevel + 1;

        await updateDoc(userRef, {
          workingOn: null, // Clear active project reference
          projectStatus: { 
            ...(currentProfile?.projectStatus || {}), 
            [project.id]: { 
              checklist_completado: calculatedProgress === 100, 
              en_curso: false, // Force false even if project update failed
              ultimo_reporte: new Date().toISOString(),
              lastCalculatedProgress: calculatedProgress
            } 
          },
          puntos: newPoints,
          level: newLevel
        });
      } catch (userErr) {
        console.error("Error updating points/status:", userErr);
      }

      if (projectUpdateSuccess) {
        toast({ title: t.common.success, description: "Reporte guardado y progreso actualizado." });
      } else {
        toast({ 
          title: "Reporte Enviado", 
          description: "Tu reporte se guardó correctamente. El Administrador verificará el avance próximamente.",
          variant: "default" 
        });
      }
      setIsSheetOpen(false);
      setReportContent("");
      setReportPhotos([]);
    } catch (err: any) {
      console.error("Critical Save error:", err);
      toast({ 
        title: "Error de Guardado", 
        description: err.message || "No se pudo procesar la solicitud.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAiDraft = async (projectName: string) => {
    if (!reportContent) return;
    setIsAiDrafting(true);
    try {
      const result = await aiReportDraftingAssistant({ reportNotes: reportContent, projectName, employeeName: profile?.nombre || "Técnico" });
      setReportContent(result.draftedReportDescription);
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setReportPhotos(prev => [...prev, { name: file.name, dataUrl: ev.target?.result as string }]);
      reader.readAsDataURL(file);
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // --- Rendering ---
  if (isUserLoading || (isAdmin && projectsLoading)) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 font-body text-foreground pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{isAdmin ? t.projects.title_admin : t.projects.title_op}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{isAdmin ? t.projects.subtitle_admin : t.projects.subtitle_op}</p>
          </div>
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild><Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2"><Plus className="h-4 w-4" /> {t.projects.new_project}</Button></DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-xl bg-card border-border"><DialogHeader><DialogTitle className="text-accent text-xl">{t.projects.new_project}</DialogTitle></DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre</Label><Input value={newProject.Pry_Nombre_Proyecto} onChange={(e) => setNewProject({ ...newProject, Pry_Nombre_Proyecto: e.target.value })} className="h-11 bg-muted/50" /></div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</Label><Select value={newProject.clientId} onValueChange={(val) => setNewProject({ ...newProject, clientId: val })}><SelectTrigger className="h-11 bg-muted/50"><SelectValue placeholder="Selecciona Cliente" /></SelectTrigger><SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.Cl_Nombre}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Servicio</Label><Select value={newProject.serviceType} onValueChange={(val) => setNewProject({ ...newProject, serviceType: val })}><SelectTrigger className="h-11 bg-muted/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Instalación">{t.teams.installation}</SelectItem><SelectItem value="Mantenimiento">{t.teams.maintenance}</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Equipo (EQ)</Label><Select value={newProject.assignedTeamId} onValueChange={(val) => setNewProject({ ...newProject, assignedTeamId: val })}><SelectTrigger className="h-11 bg-muted/50"><SelectValue placeholder="Seleccionar Equipo" /></SelectTrigger><SelectContent><SelectItem value="no-team">SIN EQUIPO ASIGNADO</SelectItem>{teams?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                </div>
                <DialogFooter><Button className="w-full bg-accent text-white" onClick={handleCreateProject} disabled={loading || !newProject.Pry_Nombre_Proyecto || !newProject.clientId}>{t.common.create}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {firestoreProjects?.map((project: any) => {
            const isEnCurso = profile?.projectStatus?.[project.id]?.en_curso;
            const assignedTeam = teams?.find(t => t.id === project.assignedTeamId);

            // Calculate "Virtual" Progress from latest report
            const projectReports = reports?.filter(r => r.projectId === project.id) || [];
            const latestReport = projectReports.length > 0 
              ? [...projectReports].sort((a,b) => (b.timestamp || "").localeCompare(a.timestamp || ""))[0]
              : null;
            
            const displayProgress = latestReport ? (latestReport.progressAtTime || 0) : (project.progreso || 0);
            const displayStatus = latestReport 
              ? (latestReport.progressAtTime === 100 ? 'Finalizado' : 'EnProceso') 
              : project.Pry_Estado;

            return (
              <Card key={project.id} className="border-border bg-card shadow-lg hover:shadow-xl transition-all overflow-hidden flex flex-col relative group">
                <div className="h-40 relative">
                  <Image src={project.imageUrl || "https://picsum.photos/seed/solar/800/450"} alt="" fill className="object-cover" />
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    <Badge className={cn(
                      "font-bold uppercase tracking-widest text-white border-none", 
                      displayStatus === 'Finalizado' ? "bg-emerald-500" : 
                      displayStatus === 'EnProceso' ? "bg-accent" : "bg-yellow-500"
                    )}>
                      {displayStatus}
                    </Badge>
                    {isAdmin && (
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
                              ¿Estás seguro de que deseas eliminar el proyecto?
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-black text-foreground truncate">{project.Pry_Nombre_Proyecto}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3 text-accent" /> {project.ubicacion}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="h-3 w-3 text-accent" /> {project.clientName}</div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 text-[10px] text-accent font-black uppercase tracking-tight">
                        <Users className="h-3 w-3" /> {assignedTeam?.name || "SIN EQUIPO"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                      <span>Progreso</span>
                      <span>{displayProgress}%</span>
                    </div>
                    <Progress value={displayProgress} className="h-1.5" />
                  </div>
                </CardContent>
                <CardFooter className="p-0 border-t border-border">
                  {isAdmin ? (
                    <div className="grid grid-cols-2 w-full">
                      <Button variant="ghost" className="h-12 rounded-none text-accent font-bold border-r border-border" onClick={() => openManageDialog(project)}><Settings2 className="h-4 w-4 mr-2" /> Gestionar</Button>
                      <Button variant="ghost" className="h-12 rounded-none text-foreground font-bold" onClick={() => router.push(`/reports?projectId=${project.id}`)}><ClipboardList className="h-4 w-4 mr-2" /> Reportes</Button>
                    </div>
                  ) : project.Pry_Estado === 'Finalizado' ? (
                    <Button disabled className="w-full h-12 rounded-none font-bold bg-muted text-muted-foreground cursor-not-allowed">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Proyecto Cerrado
                    </Button>
                  ) : (
                    <Sheet open={isSheetOpen && selectedProject?.id === project.id} onOpenChange={(o) => { 
                      setIsSheetOpen(o); 
                      if (o) { 
                        setSelectedProject(project); 
                        // Load items from the LATEST VIRTUAL progress instead of the blocked database record
                        const currentTasks = latestReport?.checklistSnapshot || project.checklistItems || [];
                        setOpChecklistItems(currentTasks); 
                      } 
                    }}>
                      <SheetTrigger asChild><Button className={cn("w-full h-12 rounded-none font-bold text-white", isEnCurso ? "bg-emerald-600" : "bg-accent")}>{isEnCurso ? "Reportar Avance" : "Iniciar Día"}</Button></SheetTrigger>
                      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto w-full bg-card border-t border-white/10 p-0">
                        <div className="max-w-xl mx-auto pb-10">
                          <SheetHeader className="p-6 border-b border-white/5 bg-accent/5">
                            <SheetTitle className="text-accent flex items-center gap-2">
                              <ClipboardList className="h-5 w-5" /> Reportar Avance - {project.Pry_Nombre_Proyecto}
                            </SheetTitle>
                          </SheetHeader>
                          
                          <div className="space-y-8 p-6">
                            {/* Checklist always visible for verification */}
                            <div className="space-y-4">
                              <Label className="text-xs font-black uppercase tracking-widest text-accent">Verificación de Tareas / Materiales</Label>
                              <div className="grid gap-3">
                                {opChecklistItems.length > 0 ? (
                                  opChecklistItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/30 transition-all">
                                      <div className="flex items-center gap-3">
                                        <Checkbox 
                                          id={`task-${idx}`} 
                                          checked={item.done} 
                                          onCheckedChange={() => handleToggleOpItem(idx)} 
                                          className="h-5 w-5 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent" 
                                        />
                                        <label htmlFor={`task-${idx}`} className={cn("text-sm font-bold transition-all", item.done ? "text-muted-foreground line-through" : "text-white")}>
                                          {item.name}
                                        </label>
                                      </div>
                                      <Badge variant="outline" className={cn("text-[8px] uppercase font-black", item.done ? "text-emerald-500 border-emerald-500/30" : "text-orange-400 border-orange-400/30")}>
                                        {item.done ? "LISTO" : "PENDIENTE"}
                                      </Badge>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground italic text-center py-4">No hay tareas asignadas a este proyecto.</p>
                                )}
                              </div>
                            </div>

                            {!isEnCurso ? (
                              <div className="space-y-6 pt-4 border-t border-white/5">
                                <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
                                  <p className="text-sm text-orange-500 font-bold">Verifica todos los puntos anteriores para iniciar jornada.</p>
                                </div>
                                <Button onClick={() => handleStartDay(project)} className="w-full h-16 bg-accent hover:bg-accent/90 text-white font-black text-lg rounded-2xl shadow-xl shadow-accent/20">
                                  CONFIRMAR E INICIAR JORNADA
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-8 pt-4 border-t border-white/5">
                                <div className="space-y-4">
                                  <Label className="text-xs font-black uppercase tracking-widest text-accent">Observaciones y Resumen de Avance</Label>
                                  <Textarea 
                                    value={reportContent} 
                                    onChange={(e) => setReportContent(e.target.value)} 
                                    placeholder="Describe cualquier imprevisto o detalle relevante..." 
                                    className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl focus:ring-accent" 
                                  />
                                </div>

                                <Button 
                                  onClick={() => handleFinishDayAndReport(project)} 
                                  className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20"
                                  disabled={loading}
                                >
                                  {loading ? "GUARDANDO..." : "ENVIAR AVANCE Y TERMINAR JORNADA"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Manage Dialog */}
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-xl bg-card border-border">
            {managedProject && (
              <>
                <DialogHeader><DialogTitle className="text-xl font-bold text-accent">{managedProject.Pry_Nombre_Proyecto}</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-xs uppercase font-bold text-muted-foreground">Estado</Label><Select value={managedStatus} onValueChange={setManagedStatus}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="EnProceso">En Proceso</SelectItem><SelectItem value="Finalizado">Finalizado</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs uppercase font-bold text-muted-foreground">Equipo (EQ)</Label><Select value={managedTeamId} onValueChange={setManagedTeamId}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no-team">SIN EQUIPO ASIGNADO</SelectItem>{teams?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><div className="flex justify-between text-xs font-bold uppercase mb-2"><span>Progreso Estructura</span><span className="text-accent">{managedProgress}%</span></div><Slider value={[managedProgress]} onValueChange={(v) => setManagedProgress(v[0])} max={100} step={5} /></div>
                </div>
                <DialogFooter><Button onClick={handleSaveManagement} className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl" disabled={savingManage}>Guardar Cambios</Button></DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
