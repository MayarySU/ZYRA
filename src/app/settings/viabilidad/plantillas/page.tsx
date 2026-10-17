"use client";

import DashboardLayout from "../../../dashboard/layout";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PlantillasLista } from "@/components/viabilidad/admin/plantillas-lista";

export default function PlantillasViabilidadPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;

  if (!profile || profile.rol !== "admin") {
    return (
      <DashboardLayout>
        <div className="py-16 text-center">
          <h1 className="text-lg font-semibold">{ta.admin_only}</h1>
          <p className="text-sm text-muted-foreground">{ta.admin_only_desc}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PlantillasLista />
    </DashboardLayout>
  );
}
