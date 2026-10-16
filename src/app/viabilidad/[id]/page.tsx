"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import DashboardLayout from "../../dashboard/layout";
import { ViabilidadWorkspace } from "@/components/viabilidad/viabilidad-workspace";

function RevisionView() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = Number(params?.id);
  const tab = search.get("tab") ?? undefined;

  if (!Number.isInteger(id) || id <= 0) {
    return <p className="text-sm text-muted-foreground">Revisión no válida.</p>;
  }

  return <ViabilidadWorkspace revisionId={id} initialTab={tab} />;
}

export default function ViabilidadRevisionPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          }
        >
          <RevisionView />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
