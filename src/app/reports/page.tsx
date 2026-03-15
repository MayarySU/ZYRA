
"use client";

import { useState, useMemo } from "react";
import { 
  FileText,
  Search,
  Briefcase,
  Check,
  X,
  Clock,
  AlertCircle,
  MapPin,
  User,
  Calendar,
  Building2,
  ExternalLink,
  Hash,
  Plus,
  Sparkles,
  Camera,
  Loader2
} from "lucide-react";
import DashboardLayout from "../dashboard/layout";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { cn } from "@/lib/utils";
import { doc, updateDoc, collection, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiReportDraftingAssistant } from "@/ai/flows/ai-report-drafting-assistant-flow";

export default function ReportsPage() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Create report states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [newReport, setNewReport] = useState({
    projectId: "",
    projectName: "",
    content: "",
    imageUrl: "https://picsum.photos/seed/report-new/800/600",
  });

  // Firestore connection
  const reportsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) {
      return collection(db, "reports");
    }
    // Employees see reports from their team
    if (profile.teamId) {
      return query(collection(db, "reports"), where("assignedTeamId", "==", profile.teamId));
    }
    // Or just their own reports if no team
    return query(collection(db, "reports"), where("employeeId", "==", profile.uid));
  }, [db, isAdmin, profile]);

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) return collection(db, "proyectos");
    if (profile.teamId) {
      return query(collection(db, "proyectos"), where("assignedTeamId", "==", profile.teamId));
    }
    return null;
  }, [db, isAdmin, profile]);

  const { data: firestoreReports, isLoading } = useCollection(reportsQuery);
  const { data: projects } = useCollection(projectsQuery);

  const filteredReports = useMemo(() => {
    const reports = firestoreReports || [];
    return reports.filter(report => {
      const matchesSearch = 
        (report.content || report.contenido || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.authorName || report.autor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.projectName || report.proyecto || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = report.status || "Pendiente";
      const matchesFilter = activeFilter === "Todos" || status === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [firestoreReports, searchTerm, activeFilter]);

  const selectedReport = useMemo(() => {
    return firestoreReports?.find(r => r.id === selectedReportId);
  }, [firestoreReports, selectedReportId]);

  const linkedProject = useMemo(() => {
    if (!selectedReport || !projects) return null;
    return projects.find(p => p.id === selectedReport.projectId || p.Pry_Nombre_Proyecto === selectedReport.projectName);
  }, [selectedReport, projects]);

  const handleUpdateStatus = (reportId: string, newStatus: "Aprobado" | "Rechazado", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!db || !isAdmin) return;
    
    setProcessingId(reportId);
    const reportRef = doc(db, "reports", reportId);
    const updateData = { status: newStatus };

    updateDoc(reportRef, updateData)
      .then(() => {
        toast({ 
          title: `Reporte ${newStatus}`, 
          description: `El registro ha sido actualizado.` 
        });
        if (selectedReportId === reportId) setSelectedReportId(null);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: reportRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setProcessingId(null));
  };

  const handleCreateReport = async () => {
    if (!db || !profile || !user) return;
    setProcessingId("creating");
    
    const reportData = {
      ...newReport,
      employeeId: user.uid,
      authorName: profile.nombre || "Técnico Zyra",
      assignedTeamId: profile.teamId || "sin-equipo",
      status: "Pendiente",
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "reports"), reportData);
      toast({ title: "Reporte Enviado", description: "Tu reporte ha sido registrado y está pendiente de validación." });
      setIsCreateDialogOpen(false);
      setNewReport({ projectId: "", projectName: "", content: "", imageUrl: "https://picsum.photos/seed/report-new/800/600" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar el reporte." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAiDraft = async () => {
    if (!newReport.content || !newReport.projectId) {
      toast({ title: "Faltan datos", description: "Por favor selecciona un proyecto y escribe algunas notas básicas." });
      return;
    }

    setIsAiDrafting(true);
    try {
      const selectedProj = projects?.find(p => p.id === newReport.projectId);
      const result = await aiReportDraftingAssistant({
        reportNotes: newReport.content,
        projectName: selectedProj?.Pry_Nombre_Proyecto || "Proyecto Solar",
        employeeName: profile?.nombre || "Técnico"
      });

      setNewReport(prev => ({ ...prev, content: result.draftedReportDescription }));
      toast({ title: "Asistente AI", description: "El reporte ha sido estructurado profesionalmente." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error AI", description: "No se pudo conectar con el asistente de redacción." });
    } finally {
      setIsAiDrafting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 font-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-white font-headline">
              {isAdmin ? "Auditoría de Reportes (REP)" : "Tus Reportes Operativos"}
            </h2>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Validación de evidencias y protocolos de seguridad en obra." 
                : "Registro de actividades y evidencias diarias en terreno."}
            </p>
          </div>

          {!isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2 h-12">
                  <Plus className="h-5 w-5" /> Nuevo Reporte
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-accent flex items-center gap-2">
                    <FileText className="h-6 w-6" /> Crear Reporte Diario
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Sube tu evidencia y describe las tareas realizadas hoy.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Proyecto Relacionado</Label>
                    <Select 
                      onValueChange={(val) => {
                        const proj = projects?.find(p => p.id === val);
                        setNewReport({...newReport, projectId: val, projectName: proj?.Pry_Nombre_Proyecto || ""});
                      }}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Seleccionar proyecto activo" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10 text-white">
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.Pry_Nombre_Proyecto}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Descripción de Tareas</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-accent font-bold gap-1 hover:bg-accent/10"
                        onClick={handleAiDraft}
                        disabled={isAiDrafting}
                      >
                        {isAiDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        ASISTENTE AI
                      </Button>
                    </div>
                    <Textarea 
                      placeholder="Escribe tus notas aquí..." 
                      className="bg-white/5 border-white/10 min-h-[120px] text-sm"
                      value={newReport.content}
                      onChange={(e) => setNewReport({...newReport, content: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Evidencia Fotográfica</Label>
                    <div className="aspect-video w-full rounded-lg bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-muted-foreground group hover:border-accent/40 transition-colors cursor-pointer">
                      <Camera className="h-8 w-8" />
                      <span className="text-xs">Tomar Foto o Subir Archivo</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12"
                    disabled={!newReport.projectId || !newReport.content || processingId === "creating"}
                    onClick={handleCreateReport}
                  >
                    {processingId === "creating" ? "Enviando..." : "ENVIAR REPORTE PARA VALIDACIÓN"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4">
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full lg:w-auto">
            <TabsList className="bg-white/5 border border-white/10 p-1">
              {["Todos", "Pendiente", "Aprobado", "Rechazado"].map((tab) => (
                <TabsTrigger 
                  key={tab} 
                  value={tab}
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-xs font-semibold px-4"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por obra o técnico..." 
              className="pl-10 bg-white/5 border-white/10 focus:border-accent h-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
            {filteredReports.map((report) => {
              const currentStatus = report.status || "Pendiente";
              return (
                <div 
                  key={report.id} 
                  onClick={() => setSelectedReportId(report.id)}
                  className="bg-card/40 border border-white/10 rounded-2xl overflow-hidden group hover:border-accent/40 cursor-pointer transition-all flex flex-col shadow-xl backdrop-blur-sm"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={report.imageUrl || "https://picsum.photos/seed/solar-report/800/600"}
                      alt={report.content || ""}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className={cn(
                        "font-bold text-[10px] px-2 py-0.5 border-none shadow-lg",
                        currentStatus === "Pendiente" && "bg-yellow-500 text-white",
                        currentStatus === "Aprobado" && "bg-emerald-500 text-white",
                        currentStatus === "Rechazado" && "bg-red-500 text-white"
                      )}>
                        {currentStatus.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-accent">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate">{report.projectName}</span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {report.content || report.contenido}
                      </p>
                    </div>
                    
                    <div className="space-y-3 border-t border-white/5 pt-4 mt-auto">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold text-white/70">{report.authorName || report.autor}</span>
                        <span>{report.timestamp ? format(new Date(report.timestamp), "d/M/yyyy") : "N/A"}</span>
                      </div>

                      {isAdmin && currentStatus === "Pendiente" && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white font-bold text-[10px] h-8 gap-1.5"
                            onClick={(e) => handleUpdateStatus(report.id, "Aprobado", e)}
                          >
                            <Check className="h-3 w-3" /> APROBAR
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
          <DialogContent className="bg-card border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader className="relative pr-8">
                  <div className="absolute top-0 right-0 flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">
                    <Hash className="h-3 w-3" /> {selectedReport.id}
                  </div>
                  <DialogTitle className="text-2xl font-bold text-accent flex items-center gap-2">
                    <Briefcase className="h-6 w-6" /> {selectedReport.projectName}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Expediente detallado del reporte operativo y estado del proyecto.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                      <Image
                        src={selectedReport.imageUrl || "https://picsum.photos/seed/solar-report/800/600"}
                        alt="Evidencia"
                        fill
                        className="object-cover"
                      />
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-accent tracking-widest border-b border-white/5 pb-2">Datos del Proyecto</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Cliente</p>
                            <p className="font-semibold">{linkedProject?.Cl_ID || "Inmobiliaria El Sol"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Dirección Operativa</p>
                            <p className="font-semibold">{linkedProject?.ubicacion || "Ubicación de Obra"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className={cn(
                          "font-bold px-3 py-1",
                          selectedReport.status === "Pendiente" && "bg-yellow-500",
                          selectedReport.status === "Aprobado" && "bg-emerald-500",
                          selectedReport.status === "Rechazado" && "bg-red-500"
                        )}>
                          {selectedReport.status?.toUpperCase() || "PENDIENTE"}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {selectedReport.timestamp ? format(new Date(selectedReport.timestamp), "PPP") : "Sin fecha"}
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold uppercase text-accent tracking-widest mb-3">Descripción Operativa</h4>
                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                          {selectedReport.content || selectedReport.contenido}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white/2 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                          {(selectedReport.authorName || "U").substring(0, 1)}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Emitido por</p>
                          <p className="text-sm font-bold">{selectedReport.authorName || selectedReport.autor}</p>
                        </div>
                      </div>
                    </div>

                    {isAdmin && selectedReport.status === "Pendiente" && (
                      <div className="flex gap-3 pt-4 border-t border-white/5">
                        <Button 
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12"
                          onClick={() => handleUpdateStatus(selectedReport.id, "Aprobado")}
                          disabled={!!processingId}
                        >
                          <Check className="h-5 w-5 mr-2" /> APROBAR
                        </Button>
                        <Button 
                          variant="destructive"
                          className="flex-1 font-bold h-12"
                          onClick={() => handleUpdateStatus(selectedReport.id, "Rechazado")}
                          disabled={!!processingId}
                        >
                          <X className="h-5 w-5 mr-2" /> RECHAZAR
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {!isLoading && filteredReports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Sin reportes en esta sección</h3>
            <p className="text-muted-foreground mt-2 max-w-xs">
              {isAdmin 
                ? "No hay reportes pendientes de validación." 
                : "Aún no has subido reportes o no hay actividad en tus proyectos asignados."}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
