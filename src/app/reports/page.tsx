
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  FileText,
  Search,
} from "lucide-react";
import DashboardLayout from "../dashboard/layout";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";

// Mock data based on the provided screenshot for Admin view
const ADMIN_REPORTS_MOCK = [
  { 
    id: "1", 
    fecha: "2026-02-16T10:00:00Z", 
    contenido: "Fuga detectada en tubería de desagüe del sótano. Se requiere acción inmediata para evitar filtraciones mayores.", 
    proyecto: "N/A",
    autor: "Mia Rodriguez",
    estado: "Pendiente",
    imageUrl: "https://picsum.photos/seed/leak/800/600",
    imageHint: "leak repair"
  },
  { 
    id: "2", 
    fecha: "2026-02-15T15:30:00Z", 
    contenido: "Instalación de cuadro eléctrico principal finalizada en planta 3. Todo según norma NCH4.", 
    proyecto: "N/A",
    autor: "Leo Martinez",
    estado: "Aprobado",
    imageUrl: "https://picsum.photos/seed/electric/800/600",
    imageHint: "electrical panel"
  },
  { 
    id: "3", 
    fecha: "2026-02-14T09:15:00Z", 
    contenido: "Paneles instalados y cableado final en unidad 12A. Pendiente validación de inversor.", 
    proyecto: "N/A",
    autor: "Leo Martinez",
    estado: "Aprobado",
    imageUrl: "https://picsum.photos/seed/panels/800/600",
    imageHint: "solar panels"
  },
  { 
    id: "4", 
    fecha: "2026-02-12T11:00:00Z", 
    contenido: "Revisión de unidad de aire acondicionado en azotea. Filtros limpios y carga de gas verificada.", 
    proyecto: "N/A",
    autor: "David Kim",
    estado: "Aprobado",
    imageUrl: "https://picsum.photos/seed/hvac/800/600",
    imageHint: "air conditioning"
  },
  { 
    id: "5", 
    fecha: "2026-02-10T08:00:00Z", 
    contenido: "Mantenimiento preventivo bloqueado por falta de acceso a sala de máquinas.", 
    proyecto: "N/A",
    autor: "Mia Rodriguez",
    estado: "Rechazado",
    imageUrl: "https://picsum.photos/seed/locked/800/600",
    imageHint: "locked door"
  }
];

export default function ReportsPage() {
  const { profile } = useUser();
  const isAdmin = profile?.rol === 'admin';
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredReports = useMemo(() => {
    return ADMIN_REPORTS_MOCK.filter(report => {
      const matchesSearch = report.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.autor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === "Todos" || report.estado === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, activeFilter]);

  if (!isMounted) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 font-body">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-white font-headline">
              Reportes de Trabajo
            </h2>
            <p className="text-muted-foreground">
              Revise, apruebe o rechace los reportes subidos por empleados.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
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
              placeholder="Buscar proyecto, empleado o tarea..." 
              className="pl-10 bg-white/5 border-white/10 focus:border-accent h-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
          {filteredReports.map((report) => (
            <div 
              key={report.id} 
              className="bg-card/40 border border-white/10 rounded-2xl overflow-hidden group hover:border-accent/40 transition-all flex flex-col shadow-xl backdrop-blur-sm"
            >
              {/* Card Image and Badge */}
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={report.imageUrl}
                  alt={report.contenido}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  data-ai-hint={report.imageHint}
                />
                <div className="absolute top-3 right-3">
                  <Badge 
                    className={cn(
                      "font-bold text-[10px] px-2 py-0.5 border-none",
                      report.estado === "Pendiente" && "bg-yellow-200/90 text-yellow-900",
                      report.estado === "Aprobado" && "bg-emerald-200/90 text-emerald-900",
                      report.estado === "Rechazado" && "bg-red-200/90 text-red-900"
                    )}
                  >
                    {report.estado}
                  </Badge>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex flex-col flex-1 space-y-4">
                <p className="text-sm font-semibold text-white leading-snug line-clamp-3 flex-1">
                  {report.contenido}
                </p>
                
                <div className="space-y-1.5 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-bold">Proyecto:</span>
                    <span className="text-white/70">{report.proyecto}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-bold">Por:</span>
                    <span className="text-white/70">
                      {report.autor} <span className="text-white/40 ml-1">el {format(new Date(report.fecha), "d/M/yyyy")}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Sin reportes</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              No se encontraron reportes que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
