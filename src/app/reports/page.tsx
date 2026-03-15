
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Zap, 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  Loader2,
  CheckCircle2,
  History,
  Clock,
  FileText
} from "lucide-react";
import { aiReportDraftingAssistant } from "@/ai/flows/ai-report-drafting-assistant-flow";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "../dashboard/layout";
import { useUser } from "@/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { toast } = useToast();
  const { profile } = useUser();
  const [reportNotes, setReportNotes] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftedContent, setDraftedContent] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mock de reportes enviados por este empleado (Demo)
  // Usamos fechas estáticas para evitar errores de hidratación
  const [myReports, setMyReports] = useState([
    { 
      id: "1", 
      fecha: "2024-03-20T14:30:00Z", 
      contenido: "Finalizada la conexión de los inversores en el bloque B. Se realizaron pruebas de tensión satisfactorias.", 
      proyecto: "Residencial Las Palmas",
      highlights: ["Inversores conectados", "Pruebas de tensión OK"]
    },
    { 
      id: "2", 
      fecha: "2024-03-19T10:15:00Z", 
      contenido: "Montaje de estructura de soporte para paneles en techumbre norte completado al 100%.", 
      proyecto: "Residencial Las Palmas",
      highlights: ["Estructura completada", "Fase 1 terminada"]
    }
  ]);

  const handleAIDraft = async () => {
    if (!reportNotes.trim()) return;
    setDrafting(true);
    try {
      const result = await aiReportDraftingAssistant({
        reportNotes,
        projectName: "Proyecto Demo Solar",
        employeeName: profile?.nombre || "Operador",
      });
      setDraftedContent(result.draftedReportDescription);
      setHighlights(result.keyHighlights);
      toast({ title: "Draft generado", description: "La IA ha estructurado tu reporte." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de IA", description: "No pudimos generar el borrador." });
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!draftedContent) return;
    setSubmitting(true);
    
    // Simulación de envío
    setTimeout(() => {
      const newReport = {
        id: Math.random().toString(36).substr(2, 9),
        fecha: new Date().toISOString(),
        contenido: draftedContent,
        proyecto: "Proyecto Demo Solar",
        highlights: highlights
      };
      
      setMyReports([newReport, ...myReports]);
      toast({ title: "Reporte enviado (Demo)", description: "Tu reporte ha sido guardado en tu historial." });
      setReportNotes("");
      setDraftedContent("");
      setHighlights([]);
      setSelectedFile(null);
      setSubmitting(false);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white">Gestión de Reportes</h2>
          <p className="text-muted-foreground">Consulta tu historial y genera nuevos reportes operativos.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Formulario de Nuevo Reporte */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-card border-white/5 border-l-4 border-l-accent shadow-xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Nuevo Reporte de Actividad
                </CardTitle>
                <CardDescription>Escribe tus notas y deja que la IA organice el reporte profesional.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-white">¿Qué avances lograste hoy?</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ej: Instalé 5 paneles, revisión de cableado terminada..."
                      className="min-h-[120px] bg-white/5 border-white/10 focus:border-accent text-white resize-none"
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAIDraft} 
                    disabled={drafting || !reportNotes}
                    className="w-full bg-accent hover:bg-accent/90 text-white gap-2 h-11 shadow-lg shadow-accent/20"
                  >
                    {drafting ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5" />}
                    {drafting ? "Procesando notas..." : "Estructurar Reporte con IA"}
                  </Button>
                </div>

                {draftedContent && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6 pt-6 border-t border-white/10">
                    <div className="space-y-2">
                      <Label className="text-accent font-bold uppercase tracking-wider text-[10px]">BORRADOR GENERADO</Label>
                      <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-sm text-white leading-relaxed whitespace-pre-wrap">
                        {draftedContent}
                      </div>
                    </div>

                    {highlights.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-primary font-bold uppercase tracking-wider text-[10px]">PUNTOS CLAVE</Label>
                        <div className="flex flex-wrap gap-2">
                          {highlights.map((h, i) => (
                            <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary py-1">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label htmlFor="photo" className="cursor-pointer">
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-white/20 hover:border-accent transition-all text-sm text-muted-foreground group">
                              <ImageIcon className="h-5 w-5 group-hover:text-accent transition-colors" />
                              {selectedFile ? selectedFile.name : "Adjuntar evidencia fotográfica"}
                            </div>
                            <Input 
                              id="photo" 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              accept="image/*"
                            />
                          </Label>
                        </div>
                      </div>

                      <Button 
                        onClick={handleSubmitReport} 
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-primary/90 text-background font-bold h-12 gap-2 shadow-lg shadow-primary/20"
                      >
                        {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                        {submitting ? "Sincronizando..." : "Confirmar y Enviar a Revisión"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historial Propio del Empleado */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-card border-white/5 h-full">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Mis Reportes Recientes
                </CardTitle>
                <CardDescription>Solo tú puedes ver este historial de actividad.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {myReports.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {myReports.map((report) => (
                      <div key={report.id} className="p-4 hover:bg-white/2 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-accent uppercase tracking-tighter">
                              {report.proyecto}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {isMounted ? (
                                format(new Date(report.fecha), "PPP 'a las' p", { locale: es })
                              ) : (
                                "Cargando fecha..."
                              )}
                            </div>
                          </div>
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px]">ENVIADO</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                          "{report.contenido}"
                        </p>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] font-medium text-white hover:underline cursor-pointer">Ver reporte completo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-white">No hay reportes previos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tus reportes aparecerán aquí una vez que los envíes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
