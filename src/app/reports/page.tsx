
"use client";

import { useState, useMemo } from "react";
import { 
  Briefcase,
  Check,
  X,
  Clock,
  MapPin,
  Building2,
  Hash,
  Search
} from "lucide-react";
import DashboardLayout from "../dashboard/layout";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { cn } from "@/lib/utils";
import { doc, updateDoc, collection, query, where, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ReportsPage() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.rol === 'admin';
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (isAdmin) {
      return collection(db, "reports");
    }
    return query(collection(db, "reports"), where("employeeId", "==", user?.uid || ""));
  }, [db, isAdmin, profile, user]);

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    return collection(db, "proyectos");
  }, [db, profile]);

  const { data: firestoreReports, isLoading } = useCollection(reportsQuery);
  const { data: projects } = useCollection(projectsQuery);

  const filteredReports = useMemo(() => {
    const reports = firestoreReports || [];
    return reports.filter(report => {
      const content = report.content || report.contenido || "";
      const author = report.authorName || report.autor || "";
      const project = report.projectName || "";
      
      const matchesSearch = content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.toLowerCase().includes(searchTerm.toLowerCase());
      
      const currentStatus = report.status || "Pendiente";
      const matchesFilter = activeFilter === "Todos" || currentStatus === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [firestoreReports, searchTerm, activeFilter]);

  const selectedReport = useMemo(() => {
    return firestoreReports?.find(r => r.id === selectedReportId);
  }, [firestoreReports, selectedReportId]);

  const linkedProject = useMemo(() => {
    if (!selectedReport || !projects) return null;
    return projects.find(p => p.id === selectedReport.projectId);
  }, [selectedReport, projects]);

  const handleUpdateStatus = async (reportId: string, newStatus: "Aprobado" | "Rechazado", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!db || !isAdmin || !selectedReport) return;
    
    setProcessingId(reportId);
    const reportRef = doc(db, "reports", reportId);
    const updateData = { status: newStatus };

    try {
      await updateDoc(reportRef, updateData);
      
      await addDoc(collection(db, "notifications"), {
        userId: selectedReport.employeeId,
        title: `Reporte ${newStatus}`,
        message: `Tu reporte para ${selectedReport.projectName} ha sido ${newStatus.toLowerCase()}.`,
        type: "report",
        read: false,
        createdAt: new Date().toISOString()
      });

      toast({ title: `Reporte ${newStatus}`, description: `El registro ha sido actualizado.` });
      setSelectedReportId(null);
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: reportRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: any, pattern: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isValid(date) ? format(date, pattern, { locale: es }) : "N/A";
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
                : "Consulta los reportes generados al finalizar tus jornadas."}
            </p>
          </div>
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
              placeholder="Buscar reporte..." 
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
                        {report.content || report.contenido || "Sin descripción"}
                      </p>
                    </div>
                    
                    <div className="space-y-3 border-t border-white/5 pt-4 mt-auto">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold text-white/70 truncate max-w-[120px]">{report.authorName || report.autor || "Técnico"}</span>
                        <span>{formatDate(report.timestamp, "d/M/yyyy")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
          <DialogContent className="bg-card border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader className="relative pr-8">
                  <div className="absolute top-0 right-0 flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">
                    <Hash className="h-3 w-3" /> {selectedReport.id.substring(0,8)}
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
                            <p className="font-semibold">{linkedProject?.Cl_ID || "Consultar en Proyectos"}</p>
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
                          {formatDate(selectedReport.timestamp, "PPP")}
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold uppercase text-accent tracking-widest mb-3">Descripción Operativa</h4>
                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                          {selectedReport.content || selectedReport.contenido || "Sin descripción proporcionada."}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white/2 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                          {(selectedReport.authorName || "U").substring(0, 1)}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Emitido por</p>
                          <p className="text-sm font-bold">{selectedReport.authorName || selectedReport.autor || "Técnico"}</p>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (selectedReport.status === "Pendiente" || !selectedReport.status) && (
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
      </div>
    </DashboardLayout>
  );
}
