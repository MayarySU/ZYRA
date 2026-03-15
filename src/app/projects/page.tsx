
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
  ClipboardList
} from "lucide-react";
import Image from "next/image";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { doc, setDoc, collection, addDoc, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
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
  DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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
  const [newProject, setNewProject] = useState({
    Pry_Nombre_Proyecto: "",
    Cl_ID: "",
    Srv_ID: "Instalación",
    Eq_ID: "no-team",
    ubicacion: "",
    imageUrl: "https://picsum.photos/seed/solar-default/800/450"
  });

  const [reportContent, setReportContent] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "proyectos");
    if (myTeams && myTeams.length > 0) {
      const teamIds = myTeams.map(t => t.id);
      return query(collection(db, "proyectos"), where("assignedTeamId", "in", teamIds));
    }
    return query(collection(db, "proyectos"), where("assignedTeamId", "==", "no-team"));
  }, [db, isAdmin, profile, myTeams]);

  const teamsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "teams");
  }, [db]);

  const { data: firestoreProjects, isLoading: projectsLoading } = useCollection(projectsQuery);
  const { data: teams } = useCollection(teamsQuery);

  const handleCreateProject = () => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db, "proyectos");
    const data = {
      ...newProject,
      Pry_Estado: "Pendiente",
      progreso: 0,
      assignedTeamId: newProject.Eq_ID,
      fecha_creacion: new Date().toISOString(),
    };

    addDoc(colRef, data)
      .then(() => {
        toast({ title: t.common.success, description: t.projects.create_success });
        setIsCreateDialogOpen(false);
        setNewProject({
          Pry_Nombre_Proyecto: "",
          Cl_ID: "",
          Srv_ID: "Instalación",
          Eq_ID: "no-team",
          ubicacion: "",
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

  const handleUpdateProjectTeam = (projectId: string, teamId: string) => {
    if (!db) return;
    const docRef = doc(db, "proyectos", projectId);
    const data = { assignedTeamId: teamId };

    updateDoc(docRef, data)
      .then(() => {
        toast({ title: t.common.success });
        setIsTeamDialogOpen(false);
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      });
  };

  const handleStartDay = (project: any) => {
    if (!user || !db) return;
    setLoading(true);
    const userRef = doc(db, "users", user.uid);
    const data = {
      projectStatus: {
        ...profile?.projectStatus,
        [project.id]: {
          checklist_completado: true,
          timestamp_inicio: new Date().toISOString(),
          en_curso: true
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

  const handleFinishDayAndReport = (project: any) => {
    if (!user || !db || !profile) return;
    if (!reportContent) {
      toast({ variant: "destructive", title: t.common.error, description: t.projects.placeholder_notes });
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
      imageUrl: project.imageUrl || "https://picsum.photos/seed/report-final/800/600"
    };

    addDoc(reportsCol, reportData)
      .then(() => {
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

        updateDoc(userRef, userDataUpdate).catch((err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: userDataUpdate
          }));
        });

        toast({ title: t.projects.day_finished, description: "+50 pts" });
        setIsSheetOpen(false);
        setReportContent("");
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: reportsCol.path,
          operation: 'create',
          requestResourceData: reportData
        }));
      })
      .finally(() => setLoading(false));
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
              <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-accent text-xl">{t.projects.new_project}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t.projects.project_name}</Label>
                    <Input 
                      className="h-11 bg-muted/50"
                      value={newProject.Pry_Nombre_Proyecto}
                      onChange={(e) => setNewProject({...newProject, Pry_Nombre_Proyecto: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t.projects.client}</Label>
                      <Input 
                        className="h-11 bg-muted/50"
                        value={newProject.Cl_ID}
                        onChange={(e) => setNewProject({...newProject, Cl_ID: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t.projects.team_assigned}</Label>
                      <Select value={newProject.Eq_ID} onValueChange={(val) => setNewProject({...newProject, Eq_ID: val})}>
                        <SelectTrigger className="h-11 bg-muted/50">
                          <SelectValue placeholder={t.common.back} />
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
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t.projects.location}</Label>
                    <Input 
                      className="h-11 bg-muted/50"
                      value={newProject.ubicacion}
                      onChange={(e) => setNewProject({...newProject, ubicacion: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white w-full h-12 font-bold"
                    disabled={!newProject.Pry_Nombre_Proyecto || loading}
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
                    <div className="absolute top-3 right-3">
                      <Badge className={cn("font-bold text-[9px] px-2 py-0.5 text-white border-none", statusColor)}>
                        {(project.Pry_Estado || 'PENDIENTE').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">{project.Pry_Nombre_Proyecto}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold mb-1">
                        <MapPin className="h-3 w-3 text-accent" />
                        <span className="truncate">{project.ubicacion || "Ubicación Pendiente"}</span>
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
                      <div className="grid grid-cols-2 w-full">
                        <Dialog open={isTeamDialogOpen && selectedProject?.id === project.id} onOpenChange={(open) => {
                          setIsTeamDialogOpen(open);
                          if (open) setSelectedProject(project);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="h-10 text-[10px] font-bold border-r border-border rounded-none uppercase gap-2 hover:bg-muted">
                              <Users className="h-3 w-3" /> {t.nav.teams}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xs bg-card border-border">
                            <DialogHeader>
                              <DialogTitle className="text-sm font-bold uppercase tracking-widest">{t.teams.manage_leader}</DialogTitle>
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
                          className="h-10 text-[10px] font-bold rounded-none uppercase text-accent gap-2 hover:bg-accent/10"
                          onClick={() => router.push(`/reports?projectId=${project.id}`)}
                        >
                          <ClipboardList className="h-3 w-3" /> {t.nav.reports}
                        </Button>
                      </div>
                    ) : (
                      <Sheet open={isSheetOpen && selectedProject?.id === project.id} onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (open) setSelectedProject(project);
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
                              {isEnCurso ? t.projects.finish_day : t.projects.checklist}
                            </SheetDescription>
                          </SheetHeader>
                          
                          <div className="space-y-6 pb-20 text-foreground">
                            {!isEnCurso ? (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  {[
                                    { key: 'epp_completo', label: t.projects.epp_label },
                                    { key: 'seguridad_area', label: t.projects.area_label },
                                    { key: 'herramientas_listas', label: t.projects.tools_label },
                                  ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                                      <Label className="text-xs font-bold leading-tight max-w-[70%] text-foreground">{item.label}</Label>
                                      <Switch 
                                        checked={(checklist as any)[item.key]} 
                                        onCheckedChange={(v) => setChecklist({...checklist, [item.key]: v})} 
                                      />
                                    </div>
                                  ))}
                                </div>
                                <Button 
                                  className="w-full bg-accent hover:bg-accent/90 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-accent/20"
                                  disabled={!checklist.epp_completo || !checklist.seguridad_area || !checklist.herramientas_listas || loading}
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
                                    className="min-h-[180px] text-sm rounded-2xl p-4 bg-muted/20"
                                    value={reportContent}
                                    onChange={(e) => setReportContent(e.target.value)}
                                  />
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="aspect-square w-full rounded-2xl bg-muted/20 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent/40 transition-colors cursor-pointer">
                                      <Camera className="h-6 w-6" />
                                      <span className="text-[9px] font-bold uppercase tracking-tighter">{t.projects.photo_work}</span>
                                    </div>
                                    <div className="aspect-square w-full rounded-2xl bg-muted/20 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent/40 transition-colors cursor-pointer">
                                      <Camera className="h-6 w-6" />
                                      <span className="text-[9px] font-bold uppercase tracking-tighter">{t.projects.photo_material}</span>
                                    </div>
                                  </div>
                                </div>

                                <Button 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-emerald-900/20"
                                  disabled={!reportContent || loading}
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
      </div>
    </DashboardLayout>
  );
}
