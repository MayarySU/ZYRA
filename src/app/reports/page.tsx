"use client";

import { useState, useMemo, useRef, Suspense, useEffect } from "react";
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
  FileText,
  Plus,
  Users,
  CalendarDays,
  ImagePlus,
  Trash2,
  Loader2,
  Download,
  Eye,
  Camera,
  Edit3
} from "lucide-react";
import DashboardLayout from "../dashboard/layout";
import { format, isValid } from "date-fns";
import { es, enUS, zhCN } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReportes,
  useProyectos,
  useEquipos,
  useAprobarReporte,
  useRechazarReporte,
  qk,
} from "@/hooks/queries";
import { db } from "@/lib/data";

function ReportsContent() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = profile?.rol === 'admin';

  const projectIdParam = searchParams.get("projectId");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Edit State
  const [editMode, setEditMode] = useState(false);
  const [editComentarios, setEditComentarios] = useState("");
  const [editPhoto, setEditPhoto] = useState<{ name: string, dataUrl: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: reportes = [], isLoading } = useReportes();
  const { data: proyectos = [] } = useProyectos();
  const { data: equipos = [] } = useEquipos();
  const aprobar = useAprobarReporte();
  const rechazar = useRechazarReporte();

  const estadoNorm = (estado?: string | null) => (estado || "pendiente").toLowerCase();

  // Filtrado de reportes
  const filteredReports = useMemo(() => {
    let reports = reportes || [];

    // Filtrar por proyecto si viene de la URL
    if (projectIdParam) {
      reports = reports.filter(r => r.proyecto_id === parseInt(projectIdParam));
    }

    return reports.filter(report => {
      const content = report.comentarios || "";
      const project = report.proyectos?.nombre_proyecto || "";
      const matchesSearch = content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === "Todos" || estadoNorm(report.estado) === activeFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [reportes, searchTerm, activeFilter, projectIdParam]);

  const selectedReport = useMemo(() => reportes?.find(r => r.id_reporte === parseInt(selectedReportId || "0")), [reportes, selectedReportId]);
  const selectedProject = useMemo(() => selectedReport ? proyectos.find(p => p.id_proyecto === selectedReport.proyecto_id) : undefined, [proyectos, selectedReport]);
  const selectedTeam = useMemo(() => {
    if (!selectedReport) return null;
    const equipoId = selectedReport.equipo_id ?? selectedReport.proyectos?.equipo_id ?? null;
    return equipos.find(e => e.id_equipo === equipoId) ?? null;
  }, [equipos, selectedReport]);

  const handleUpdateStatus = async (reportId: string, newStatus: "Aprobado" | "Rechazado") => {
    if (!isAdmin) return;
    const reporteId = parseInt(reportId);
    if (Number.isNaN(reporteId)) return;
    try {
      if (newStatus === "Aprobado") {
        await aprobar.mutateAsync(reporteId);
      } else {
        await rechazar.mutateAsync({ reporteId });
      }

      toast({ title: t.common.success });
      setSelectedReportId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: e?.message });
    }
  };

  useEffect(() => {
    if (selectedReportId && selectedReport) {
      setEditMode(false);
      setEditComentarios(selectedReport.comentarios || "");
      setEditPhoto(null);
    }
  }, [selectedReportId, selectedReport]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditPhoto({ name: file.name, dataUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResubmitReport = async () => {
    if (!selectedReportId) return;
    const reporteId = parseInt(selectedReportId);
    if (Number.isNaN(reporteId)) return;
    setProcessingId(selectedReportId);
    try {
      const { error } = await db()
        .from("reportes")
        .update({ comentarios: editComentarios, estado: "pendiente" })
        .eq("id_reporte", reporteId);
      if (error) throw new Error(error.message);

      queryClient.invalidateQueries({ queryKey: qk.reportes });
      toast({ title: t.common.success, description: "Reporte reenviado exitosamente." });
      setEditMode(false);
      setSelectedReportId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se abra el detalle
    if (!isAdmin) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este reporte?")) return;

    const reporteId = parseInt(reportId);
    if (Number.isNaN(reporteId)) return;
    setProcessingId(reportId);
    try {
      const { error } = await db().from("reportes").delete().eq("id_reporte", reporteId);
      if (error) throw new Error(error.message);

      queryClient.invalidateQueries({ queryKey: qk.reportes });
      toast({ title: t.common.success, description: "Reporte eliminado." });
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
          {filteredReports.map((report) => {
            const equipo = equipos.find(e => e.id_equipo === (report.equipo_id ?? report.proyectos?.equipo_id));
            return (
              <div
                key={report.id_reporte}
                onClick={() => setSelectedReportId(report.id_reporte.toString())}
                className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/40 transition-all flex flex-col shadow-xl group"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image src={"https://picsum.photos/seed/solar-report/800/600"} alt="" fill className="object-cover" />
                  <div className="absolute top-3 right-3">
                    <Badge className={cn("font-bold text-[10px]", estadoNorm(report.estado) === "aprobado" ? "bg-emerald-500" : estadoNorm(report.estado) === "rechazado" ? "bg-red-500" : "bg-yellow-500")}>
                      {estadoNorm(report.estado).toUpperCase()}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute bottom-3 right-3 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => handleDeleteReport(report.id_reporte.toString(), e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-accent">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider truncate">{report.proyectos?.nombre_proyecto}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{report.comentarios || "-"}</p>
                  </div>
                  {equipo?.nombre_equipo && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="text-[10px] font-medium truncate">{equipo.nombre_equipo}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-4 border-t border-border">
                    <span className="font-bold text-foreground/70 truncate">SQL Report</span>
                    <span>{formatDate(report.fecha_reporte, "d/M/yyyy")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-tighter">{t.common.no_results}</h3>
          <p className="text-sm text-muted-foreground mt-2">No se encontraron reportes que coincidan con los filtros aplicados.</p>
        </div>
      )}

      {/* ====== VIEW REPORT DETAIL DIALOG ====== */}
      <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
        <DialogContent className="w-[95vw] bg-card border-border text-foreground sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-accent flex items-center gap-2">
                  <Briefcase className="h-6 w-6" /> {selectedReport.proyectos?.nombre_proyecto || "Auditoría de Reporte"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">{t.reports.audit_detail}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Project + Team Info Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                    <h4 className="text-[10px] font-bold uppercase text-accent tracking-widest">Datos del Proyecto</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 text-accent" />
                        <span className="font-semibold text-foreground">{selectedReport.proyectos?.nombre_proyecto || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        <span>{selectedProject?.ubicacion || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-accent" />
                        <span>{formatDate(selectedReport.fecha_reporte, "PPP")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                    <h4 className="text-[10px] font-bold uppercase text-accent tracking-widest">Equipo Responsable</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-accent" />
                        <span className="font-semibold text-foreground">{selectedTeam?.nombre_equipo || "Sin equipo"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5 text-accent" />
                        <span>Tipo: N/A</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3.5 w-3.5 text-accent" />
                        <span>ID Reporte: {selectedReport.id_reporte}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <h4 className="text-xs font-bold uppercase text-accent mb-3">{t.reports.description}</h4>
                  {editMode ? (
                    <Textarea
                      value={editComentarios}
                      onChange={(e) => setEditComentarios(e.target.value)}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{selectedReport.comentarios || "-"}</p>
                  )}
                </div>

                {/* Potentially multiple photos or single URL */}
                <div className="space-y-2">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-inner">
                    <Image src={editPhoto?.dataUrl || "https://picsum.photos/seed/solar-report/800/600"} alt="" fill className="object-cover" />
                  </div>
                  {editMode && (
                    <div className="flex justify-end">
                      <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                        <Camera className="h-4 w-4 mr-2" /> Cambiar Foto
                      </Button>
                    </div>
                  )}
                </div>

                {/* Metadata footer */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                  <Badge variant="outline" className="text-[9px] font-bold">Proyecto: {selectedReport.proyectos?.nombre_proyecto}</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold">Fecha: {formatDate(selectedReport.fecha_reporte, "PPP")}</Badge>
                  <Badge variant="outline" className={cn("text-[9px] font-bold", estadoNorm(selectedReport.estado) === "aprobado" ? "border-emerald-500/50 text-emerald-500" : estadoNorm(selectedReport.estado) === "rechazado" ? "border-red-500/50 text-red-500" : "border-yellow-500/50 text-yellow-500")}>
                    {estadoNorm(selectedReport.estado).toUpperCase()}
                  </Badge>
                </div>

                {/* Admin Approve/Reject */}
                {isAdmin && estadoNorm(selectedReport.estado) === "pendiente" && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 font-bold" disabled={aprobar.isPending || rechazar.isPending} onClick={() => handleUpdateStatus(selectedReport.id_reporte.toString(), "Aprobado")}>{t.reports.approve_btn}</Button>
                    <Button variant="destructive" className="flex-1 font-bold" disabled={aprobar.isPending || rechazar.isPending} onClick={() => handleUpdateStatus(selectedReport.id_reporte.toString(), "Rechazado")}>{t.reports.reject_btn}</Button>
                  </div>
                )}

                {/* Operator Edit/Resubmit for Rejected Reports */}
                {!isAdmin && estadoNorm(selectedReport.estado) === "rechazado" && (
                  <div className="pt-4 border-t border-border flex flex-col gap-3">
                    {editMode ? (
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancelar</Button>
                        <Button className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold" onClick={handleResubmitReport} disabled={processingId === selectedReportId}>
                          {processingId === selectedReportId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Reenviar Reporte
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold" onClick={() => setEditMode(true)}>
                        <Edit3 className="h-4 w-4 mr-2" /> Corregir Reporte
                      </Button>
                    )}
                  </div>
                )}
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
