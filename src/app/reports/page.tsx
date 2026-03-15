
"use client";

import { useState, useMemo, Suspense } from "react";
import { 
  Briefcase,
  Check,
  X,
  Clock,
  MapPin,
  Building2,
  Hash,
  Search,
  ArrowLeft,
  Zap,
  Wrench,
  AlertCircle,
  FileText
} from "lucide-react";
import DashboardLayout from "../dashboard/layout";
import { format, isValid } from "date-fns";
import { es, enUS, zhCN } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { cn } from "@/lib/utils";
import { doc, updateDoc, collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import { Progress } from "@/components/ui/progress";

function ReportsContent() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAdmin = profile?.rol === 'admin';
  
  const projectIdParam = searchParams.get("projectId");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Queries
  const reportsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    let baseRef = collection(db, "reports");
    if (isAdmin) return baseRef;
    return query(baseRef, where("employeeId", "==", user?.uid || ""));
  }, [db, isAdmin, profile, user]);

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    return collection(db, "proyectos");
  }, [db, profile]);

  const { data: firestoreReports, isLoading } = useCollection(reportsQuery);
  const { data: projects } = useCollection(projectsQuery);

  // Filtrado de reportes
  const filteredReports = useMemo(() => {
    let reports = firestoreReports || [];
    
    // Filtrar por proyecto si viene de la URL
    if (projectIdParam) {
      reports = reports.filter(r => r.projectId === projectIdParam);
    }

    return reports.filter(report => {
      const content = report.content || "";
      const author = report.authorName || "";
      const project = report.projectName || "";
      const matchesSearch = content.toLowerCase().includes(searchTerm.toLowerCase()) || author.toLowerCase().includes(searchTerm.toLowerCase()) || project.toLowerCase().includes(searchTerm.toLowerCase());
      const currentStatus = report.status || "Pendiente";
      const matchesFilter = activeFilter === "Todos" || currentStatus === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [firestoreReports, searchTerm, activeFilter, projectIdParam]);

  const selectedReport = useMemo(() => firestoreReports?.find(r => r.id === selectedReportId), [firestoreReports, selectedReportId]);
  const linkedProject = useMemo(() => selectedReport && projects?.find(p => p.id === selectedReport.projectId), [selectedReport, projects]);
  
  // Resumen del proyecto si se filtra por uno solo
  const currentProject = useMemo(() => projects?.find(p => p.id === projectIdParam), [projects, projectIdParam]);

  const handleUpdateStatus = async (reportId: string, newStatus: "Aprobado" | "Rechazado") => {
    if (!db || !isAdmin) return;
    setProcessingId(reportId);
    const reportRef = doc(db, "reports", reportId);
    try {
      await updateDoc(reportRef, { status: newStatus });
      toast({ title: t.common.success });
      setSelectedReportId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error });
    } finally {
      setProcessingId(null);
    }
  };

  const getLocale = () => {
    if (language === 'en') return enUS;
    if (language === 'zh') return zhCN;
    return es;
  };

  const formatDate = (dateStr: any, pattern: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isValid(date) ? format(date, pattern, { locale: getLocale() }) : "-";
  };

  const clearProjectFilter = () => {
    router.push('/reports');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-body">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-foreground font-headline flex items-center gap-3">
            {projectIdParam && (
              <Button variant="ghost" size="icon" onClick={clearProjectFilter} className="h-10 w-10 rounded-full hover:bg-muted">
                <ArrowLeft className="h-6 w-6 text-accent" />
              </Button>
            )}
            {isAdmin ? t.reports.title_admin : t.reports.title_op}
          </h2>
          <p className="text-muted-foreground">{isAdmin ? t.reports.subtitle_admin : t.reports.subtitle_op}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4">
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full lg:w-auto">
          <TabsList className="bg-muted border border-border p-1">
            {["Todos", "Pendiente", "Aprobado", "Rechazado"].map((tab) => (
              <TabsTrigger key={tab} value={tab} className="text-xs font-semibold px-4">
                {tab === 'Todos' ? t.reports.all : tab === 'Pendiente' ? t.reports.pending : tab === 'Aprobado' ? t.reports.approved : t.reports.rejected}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t.common.search} 
            className="pl-10 bg-muted/50 border-border h-10 text-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
          {filteredReports.map((report) => (
            <div 
              key={report.id} 
              onClick={() => setSelectedReportId(report.id)} 
              className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/40 transition-all flex flex-col shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image src={report.imageUrl || "https://picsum.photos/seed/solar-report/800/600"} alt="" fill className="object-cover" />
                <div className="absolute top-3 right-3">
                  <Badge className={cn("font-bold text-[10px]", report.status === "Aprobado" ? "bg-emerald-500" : report.status === "Rechazado" ? "bg-red-500" : "bg-yellow-500")}>
                    {(report.status || "Pendiente").toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-accent">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider truncate">{report.projectName}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{report.content || "-"}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-4 border-t border-border">
                  <span className="font-bold text-foreground/70 truncate">{report.authorName || t.common.employee}</span>
                  <span>{formatDate(report.timestamp, "d/M/yyyy")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projectIdParam && currentProject ? (
        <div className="max-w-3xl mx-auto pt-10">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  {currentProject.serviceType === 'Mantenimiento' ? <Wrench className="h-10 w-10" /> : <Zap className="h-10 w-10" />}
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-accent border-accent/20">RESUMEN DE PROYECTO</Badge>
                  <h3 className="text-2xl font-bold text-foreground">{currentProject.Pry_Nombre_Proyecto}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 text-accent" />
                    <span className="font-bold text-foreground">Cliente:</span> {currentProject.clientName}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-accent" />
                    <span className="font-bold text-foreground">Ubicación:</span> {currentProject.ubicacion}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="font-bold text-foreground">Estado:</span> {currentProject.Pry_Estado}
                  </div>
                </div>
                <div className="bg-muted/30 p-6 rounded-2xl border border-border flex flex-col justify-center gap-4">
                  <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>Avance General</span>
                    <span className="text-accent">{currentProject.progreso || 0}%</span>
                  </div>
                  <Progress value={currentProject.progreso || 0} className="h-2" />
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-2xl flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-yellow-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-tighter">Sin evidencias cargadas</h4>
                  <p className="text-xs text-muted-foreground">
                    Aún no se han generado reportes operativos para este proyecto. El equipo asignado debe iniciar jornada y finalizarla para subir fotos y notas de campo.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-muted/20 border-t border-border p-4 flex justify-end">
              <Button onClick={clearProjectFilter} variant="outline" className="text-[10px] font-bold uppercase tracking-widest">Ver todos los reportes</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">{t.common.no_results}</h3>
          <p className="text-sm text-muted-foreground mt-2">No se encontraron reportes que coincidan con los filtros aplicados.</p>
        </div>
      )}

      <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-accent flex items-center gap-2">
                  <Briefcase className="h-6 w-6" /> {selectedReport.projectName}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">{t.reports.audit_detail}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-inner">
                    <Image src={selectedReport.imageUrl || "https://picsum.photos/seed/solar-report/800/600"} alt="" fill className="object-cover" />
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-2">
                    <h4 className="text-xs font-bold uppercase text-accent">{t.projects.location}</h4>
                    <p className="text-sm">{linkedProject?.ubicacion || "-"}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    <h4 className="text-xs font-bold uppercase text-accent mb-3">{t.reports.description}</h4>
                    <p className="text-sm leading-relaxed">{selectedReport.content || "-"}</p>
                  </div>
                  {isAdmin && (selectedReport.status === "Pendiente" || !selectedReport.status) && (
                    <div className="flex gap-3 pt-4 border-t border-border">
                      <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 font-bold" onClick={() => handleUpdateStatus(selectedReport.id, "Aprobado")}>{t.reports.approve_btn}</Button>
                      <Button variant="destructive" className="flex-1 font-bold" onClick={() => handleUpdateStatus(selectedReport.id, "Rechazado")}>{t.reports.reject_btn}</Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div></div>}>
        <ReportsContent />
      </Suspense>
    </DashboardLayout>
  );
}
