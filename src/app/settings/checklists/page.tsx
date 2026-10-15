"use client";

import { useState } from "react";
import DashboardLayout from "../../dashboard/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, ClipboardList, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlantillas } from "@/hooks/queries";

export default function ChecklistsSettingsPage() {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = usePlantillas();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-accent" /> Plantillas de Checklist
            </h2>
            <p className="text-muted-foreground mt-1">Configura los materiales requeridos para cada tipo de servicio.</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-white font-bold gap-2">
            <Plus className="h-4 w-4" /> Nueva Plantilla
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template: any) => (
              <Card key={template.id_checklist_servicio} className="border-border bg-card hover:border-accent/30 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-start">
                    <span>{template.nombre}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase">
                      <Package className="h-3 w-3" /> Materiales en plantilla:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(template.checklist_servicio_detalle || template.detalles || []).length > 0 ? (
                        (template.checklist_servicio_detalle || template.detalles || []).slice(0, 3).map((d: any) => (
                          <span key={d.id_checklist_servicio_detalle || d.ID_Checklist_Servicio_Detalle} className="px-2 py-1 bg-muted rounded text-[10px] font-medium border border-border">
                            {(d.materiales?.nombre_material || d.material?.Nombre_Material || d.material?.nombre_material)} (x{d.cantidad_requerida ?? d.Cantidad_Requerida})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin materiales</span>
                      )}
                      {(template.checklist_servicio_detalle || template.detalles || []).length > 3 && (
                        <span className="text-[10px] text-accent">+{((template.checklist_servicio_detalle || template.detalles).length - 3)} más</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
