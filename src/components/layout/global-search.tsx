"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Briefcase, 
  Users, 
  Building2, 
  ClipboardList, 
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";

export function GlobalSearch() {
  const router = useRouter();
  const { profile, user, isAdmin } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Queries base
  const projectsQuery = useMemoFirebase(() => db ? collection(db, "proyectos") : null, [db]);
  const clientsQuery = useMemoFirebase(() => (db && isAdmin) ? collection(db, "clientes") : null, [db, isAdmin]);
  const employeesQuery = useMemoFirebase(() => (db && isAdmin) ? collection(db, "users") : null, [db, isAdmin]);
  const reportsQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isAdmin) return collection(db, "reports");
    return query(collection(db, "reports"), where("employeeId", "==", user?.uid || ""));
  }, [db, isAdmin, user]);

  const { data: projects, isLoading: pL } = useCollection(projectsQuery);
  const { data: clients, isLoading: cL } = useCollection(clientsQuery);
  const { data: employees, isLoading: eL } = useCollection(employeesQuery);
  const { data: reports, isLoading: rL } = useCollection(reportsQuery);

  const isLoading = pL || cL || eL || rL;

  const results = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return null;

    const term = searchTerm.toLowerCase();

    return {
      projects: projects?.filter(p => p.Pry_Nombre_Proyecto?.toLowerCase().includes(term)).slice(0, 3) || [],
      clients: clients?.filter(c => c.Cl_Nombre?.toLowerCase().includes(term) || c.Cl_RazonSocial?.toLowerCase().includes(term)).slice(0, 3) || [],
      employees: employees?.filter(e => (e.nombre || e.Emp_Nombre)?.toLowerCase().includes(term) || (e.email || e.emailAcceso)?.toLowerCase().includes(term)).slice(0, 3) || [],
      reports: reports?.filter(r => r.content?.toLowerCase().includes(term) || r.projectName?.toLowerCase().includes(term)).slice(0, 3) || []
    };
  }, [searchTerm, projects, clients, employees, reports]);

  const hasResults = results && (
    results.projects.length > 0 || 
    results.clients.length > 0 || 
    results.employees.length > 0 || 
    results.reports.length > 0
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.common.search}
              className="pl-10 h-10 bg-muted/50 border-border focus:ring-accent w-full md:w-[300px] lg:w-[400px] transition-all"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] md:w-[400px] p-0 bg-card border-border shadow-2xl overflow-hidden" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            )}

            {!isLoading && !hasResults && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">{t.common.no_results}</p>
              </div>
            )}

            {!isLoading && hasResults && (
              <div className="divide-y divide-border">
                {results.projects.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="h-3 w-3" /> {t.nav.projects}
                    </h4>
                    {results.projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleNavigate(`/projects`)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/10 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-xs font-bold text-foreground truncate">{p.Pry_Nombre_Proyecto}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {results.clients.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="h-3 w-3" /> {t.nav.clients}
                    </h4>
                    {results.clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleNavigate(`/clients`)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/10 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-xs font-bold text-foreground truncate">{c.Cl_Nombre}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {results.employees.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-3 w-3" /> {t.nav.employees}
                    </h4>
                    {results.employees.map(e => (
                      <button
                        key={e.id}
                        onClick={() => handleNavigate(`/employees`)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/10 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-foreground">{e.nombre || e.Emp_Nombre}</span>
                          <span className="text-[9px] text-muted-foreground truncate">{e.email || e.emailAcceso}</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {results.reports.length > 0 && (
                  <div className="p-2">
                    <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <ClipboardList className="h-3 w-3" /> {t.nav.reports}
                    </h4>
                    {results.reports.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleNavigate(`/reports`)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/10 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] font-black text-accent uppercase tracking-tighter mb-0.5">{r.projectName}</span>
                          <span className="text-xs font-bold text-foreground truncate max-w-[250px]">{r.content}</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
