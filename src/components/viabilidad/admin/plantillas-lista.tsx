"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { PlantillaEstadoBadge } from "@/components/viabilidad/badges";
import {
  usePlantillasViabilidad,
  useCrearPlantillaViabilidad,
  useCrearVersionPlantillaViabilidad,
} from "@/hooks/queries/use-viabilidad";
import { useServicios, useEmpresa } from "@/hooks/queries";
import type { TipoEtapaViabilidad } from "@/lib/data/rpc";

export function PlantillasLista() {
  const { toast } = useToast();
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;
  const router = useRouter();

  const { data: plantillas = [], isLoading } = usePlantillasViabilidad();
  const { data: servicios = [] } = useServicios();
  const { data: empresa } = useEmpresa();

  const crear = useCrearPlantillaViabilidad();
  const crearVersion = useCrearVersionPlantillaViabilidad();

  const [open, setOpen] = useState(false);
  const [servicioId, setServicioId] = useState<string>("");
  const [etapa, setEtapa] = useState<TipoEtapaViabilidad>("previabilidad");
  const [nombre, setNombre] = useState("");

  function etapaLabel(v: string): string {
    return v === "previabilidad"
      ? t.viabilidad.stage_previabilidad
      : t.viabilidad.stage_ingenieria;
  }

  async function onCrear() {
    if (!empresa || !servicioId || !nombre.trim()) return;
    try {
      const res = await crear.mutateAsync({
        empresaId: empresa.id_empresa,
        servicioId: Number(servicioId),
        tipoEtapa: etapa,
        nombre,
      });
      toast({ title: ta.create_ok });
      setOpen(false);
      setServicioId("");
      setNombre("");
      router.push(`/settings/viabilidad/plantillas/${res.id_plantilla_viabilidad}`);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  async function onCrearVersion(id: number) {
    try {
      const res = await crearVersion.mutateAsync(id);
      toast({ title: ta.clone_ok });
      router.push(`/settings/viabilidad/plantillas/${res.id_plantilla_viabilidad}`);
    } catch (e) {
      toast({ variant: "destructive", title: String((e as Error).message) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{ta.title}</h1>
          <p className="text-sm text-muted-foreground">{ta.subtitle}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {ta.new_template}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : plantillas.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {ta.no_templates}
        </p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ta.field_name}</TableHead>
                  <TableHead>{ta.field_service}</TableHead>
                  <TableHead>{ta.field_stage}</TableHead>
                  <TableHead>{ta.version}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantillas.map((p) => (
                  <TableRow key={p.id_plantilla_viabilidad}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.nombre}</span>
                        <PlantillaEstadoBadge estado={p.estado} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.servicios?.tipo ?? `#${p.servicio_id}`}
                    </TableCell>
                    <TableCell>{etapaLabel(p.tipo_etapa)}</TableCell>
                    <TableCell>{p.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/settings/viabilidad/plantillas/${p.id_plantilla_viabilidad}`}>
                            {ta.open}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCrearVersion(p.id_plantilla_viabilidad)}
                        >
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          {ta.create_version}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ta.new_template}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{ta.new_template_desc}</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{ta.field_service}</Label>
              <Select value={servicioId} onValueChange={setServicioId}>
                <SelectTrigger>
                  <SelectValue placeholder={ta.service_placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {servicios.map((s) => (
                    <SelectItem key={s.id_servicio} value={String(s.id_servicio)}>
                      {s.tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{ta.field_stage}</Label>
              <Select
                value={etapa}
                onValueChange={(v) => setEtapa(v as TipoEtapaViabilidad)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previabilidad">
                    {t.viabilidad.stage_previabilidad}
                  </SelectItem>
                  <SelectItem value="ingenieria">
                    {t.viabilidad.stage_ingenieria}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{ta.field_name}</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={onCrear}
              disabled={!servicioId || !nombre.trim() || crear.isPending}
            >
              {crear.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
