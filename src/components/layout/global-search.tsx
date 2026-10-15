
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Briefcase, 
  Users, 
  Building2, 
  ClipboardList, 
  Package,
  ArrowRight,
  Loader2,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  useProyectos,
  useClientes,
  useServicios,
  useMateriales,
  useEmpleados,
} from "@/hooks/queries";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";

export function GlobalSearch() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = profile?.rol === 'admin';

  const { data: projects = [], isLoading: isLoadingProjects } = useProyectos();
  const { data: clients = [], isLoading: isLoadingClients } = useClientes();
  const { data: services = [], isLoading: isLoadingServices } = useServicios();
  const { data: materials = [], isLoading: isLoadingMaterials } = useMateriales();
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmpleados();

  const isLoading =
    isLoadingProjects ||
    isLoadingClients ||
    isLoadingServices ||
    isLoadingMaterials ||
    isLoadingEmployees;

  const results = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return null;

    const term = searchTerm.toLowerCase();

    return {
      projects: projects?.filter(p => 
        p.nombre_proyecto?.toLowerCase().includes(term) ||
        p.ubicacion?.toLowerCase().includes(term)
      ).slice(0, 4) || [],
      
      clients: clients?.filter(c => 
        c.nombre?.toLowerCase().includes(term) || 
        c.razon_social?.toLowerCase().includes(term) ||
        c.correo?.toLowerCase().includes(term)
      ).slice(0, 4) || [],

      services: services?.filter(s => 
        s.tipo?.toLowerCase().includes(term) ||
        s.descripcion?.toLowerCase().includes(term)
      ).slice(0, 4) || [],

      materials: materials?.filter(m => 
        m.nombre_material?.toLowerCase().includes(term)
      ).slice(0, 4) || [],
      
      employees: employees?.filter(e => 
        e.nombre?.toLowerCase().includes(term) || 
        e.correo?.toLowerCase().includes(term)
      ).slice(0, 4) || []
    };
  }, [searchTerm, projects, clients, services, materials, employees]);

  const hasResults = results && (
    results.projects.length > 0 || 
    results.clients.length > 0 || 
    results.services.length > 0 ||
    results.materials.length > 0 ||
    results.employees.length > 0
  );

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full max-w-md md:ml-4">
      <Popover open={isOpen && searchTerm.length >= 2} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input
              placeholder={t.common.search}
              className="pl-10 h-10 bg-muted/50 border-border focus:ring-accent w-full md:w-[300px] lg:w-[400px] transition-all rounded-full"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] md:w-[450px] p-0 bg-card border-border shadow-2xl overflow-hidden rounded-2xl" 
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {isLoading && (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            )}

            {!isLoading && !hasResults && (
              <div className="p-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-tighter">
                  {t.common.no_results}
                </p>
              </div>
            )}

            {!isLoading && hasResults && (
              <div className="divide-y divide-border">
                {results.projects.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="h-3 w-3 text-accent" /> {t.nav.projects}
                    </h4>
                    {results.projects.map(p => (
                      <button
                        key={p.id_proyecto}
                        onClick={() => handleNavigate(`/projects`)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-accent/10 transition-all flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground truncate">{p.nombre_proyecto}</span>
                          <span className="text-[10px] text-muted-foreground truncate uppercase">{p.ubicacion}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                )}

                {results.clients.length > 0 && isAdmin && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-emerald-500" /> {t.nav.clients}
                    </h4>
                    {results.clients.map(c => (
                      <button
                        key={c.id_cliente}
                        onClick={() => handleNavigate(`/clients`)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-500/10 transition-all flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground truncate">{c.nombre}</span>
                          <span className="text-[10px] text-muted-foreground truncate uppercase">{c.razon_social}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                )}

                {results.employees.length > 0 && isAdmin && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-3 w-3 text-blue-500" /> {t.nav.employees}
                    </h4>
                    {results.employees.map(e => (
                      <button
                        key={e.id_empleado}
                        onClick={() => handleNavigate(`/employees`)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-500/10 transition-all flex items-center justify-between group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold text-foreground">{e.nombre}</span>
                          <span className="text-[10px] text-muted-foreground truncate uppercase">{e.correo}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                )}

                {results.services.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <ClipboardList className="h-3 w-3 text-orange-500" /> Servicios
                    </h4>
                    {results.services.map(s => (
                      <button
                        key={s.id_servicio}
                        onClick={() => handleNavigate(`/settings/services`)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-orange-500/10 transition-all flex items-center justify-between group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold text-foreground truncate">{s.tipo}</span>
                          <span className="text-[10px] text-muted-foreground truncate uppercase">{s.descripcion}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                )}

                {results.materials.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Package className="h-3 w-3 text-amber-500" /> {t.nav.materials}
                    </h4>
                    {results.materials.map(m => (
                      <button
                        key={m.id_material}
                        onClick={() => handleNavigate(`/materials`)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-amber-500/10 transition-all flex items-center justify-between group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold text-foreground truncate">{m.nombre_material}</span>
                          <span className="text-[10px] text-muted-foreground truncate uppercase">{m.unidad}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
