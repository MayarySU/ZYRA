"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import DashboardLayout from "../../../../dashboard/layout";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PlantillaEditor } from "@/components/viabilidad/admin/plantilla-editor";

function EditorView() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return <PlantillaEditor plantillaId={id} />;
}

export default function PlantillaViabilidadPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        {!profile || profile.rol !== "admin" ? (
          <div className="py-16 text-center">
            <h1 className="text-lg font-semibold">{ta.admin_only}</h1>
            <p className="text-sm text-muted-foreground">{ta.admin_only_desc}</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            }
          >
            <EditorView />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
