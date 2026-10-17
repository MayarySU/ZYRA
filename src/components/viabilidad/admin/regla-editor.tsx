"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  OPERADORES_CONDICION,
  VALIDACION_TIPOS,
  reglaEvaluacionError,
  reglaOpcionError,
} from "./plantillas-utils";
import type { EfectoSenalViabilidad, TipoValidacionViabilidad } from "@/lib/data/rpc";

type Regla = Record<string, unknown>;

function str(o: Regla, k: string): string {
  return typeof o[k] === "string" ? (o[k] as string) : "";
}

export function ReglaEditor({
  kind,
  value,
  onChange,
  disabled = false,
}: {
  kind: "pregunta" | "opcion";
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const ta = t.viabilidad.plantillasAdmin;

  const error =
    kind === "pregunta" ? reglaEvaluacionError(value) : reglaOpcionError(value);

  // Sin regla
  if (value === null || value === undefined) {
    return (
      <div className="space-y-2">
        <Label>{ta.rule_title}</Label>
        <div className="flex items-center justify-between rounded-md border border-dashed p-3">
          <span className="text-sm text-muted-foreground">{ta.rule_none}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange(
                kind === "pregunta"
                  ? { efecto: "no_apto" }
                  : { efecto: "accion_requerida" }
              )
            }
          >
            {ta.rule_add}
          </Button>
        </div>
      </div>
    );
  }

  // Regla no representable en el editor guiado → solo lectura (edición técnica)
  if (error) {
    return (
      <div className="space-y-2">
        <Label>{ta.rule_title}</Label>
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-xs font-medium">{ta.rule_technical}</p>
          <p className="text-xs text-muted-foreground">{ta.rule_technical_hint}</p>
          <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              {ta.rule_remove}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const regla = value as Regla;
  const cuando = regla.cuando as { operador?: string; valor?: string } | undefined;
  const efecto = str(regla, "efecto") as EfectoSenalViabilidad;

  function setCampo(patch: Regla): void {
    const base: Regla = { ...regla };
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === null || v === undefined) delete base[k];
      else base[k] = v;
    }
    onChange(base);
  }

  function setTrigger(activo: boolean): void {
    const base: Regla = { ...regla };
    if (activo) base.cuando = { operador: "=", valor: "" };
    else delete base.cuando;
    onChange(base);
  }

  function setCuando(patch: { operador?: string; valor?: string }): void {
    const actual = (regla.cuando as { operador?: string; valor?: string }) ?? {};
    setCampo({ cuando: { ...actual, ...patch } });
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label>{ta.rule_title}</Label>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            {ta.rule_remove}
          </Button>
        )}
      </div>

      {kind === "pregunta" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={cuando != null}
              disabled={disabled}
              onCheckedChange={setTrigger}
            />
            <span className="text-sm">{ta.rule_trigger}</span>
          </div>
          {cuando != null && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{ta.rule_operator}</Label>
                <Select
                  value={cuando.operador ?? "="}
                  disabled={disabled}
                  onValueChange={(v) => setCuando({ operador: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERADORES_CONDICION.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ta.rule_value}</Label>
                <Input
                  value={cuando.valor ?? ""}
                  disabled={disabled}
                  onChange={(e) => setCuando({ valor: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">{ta.rule_effect}</Label>
        <Select
          value={efecto}
          disabled={disabled}
          onValueChange={(v) => setCampo({ efecto: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no_apto">{ta.effect_no_apto}</SelectItem>
            <SelectItem value="validacion_especializada">
              {ta.effect_validacion}
            </SelectItem>
            <SelectItem value="accion_requerida">{ta.effect_accion}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {efecto === "validacion_especializada" && (
        <div className="space-y-1">
          <Label className="text-xs">{ta.rule_validacion_tipo}</Label>
          <Select
            value={str(regla, "validacion_tipo") || "otro"}
            disabled={disabled}
            onValueChange={(v) => setCampo({ validacion_tipo: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALIDACION_TIPOS.map((vt) => (
                <SelectItem key={vt} value={vt}>
                  {vt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {efecto === "accion_requerida" && (
        <div className="space-y-1">
          <Label className="text-xs">{ta.rule_descripcion_accion}</Label>
          <Input
            value={str(regla, "descripcion_accion")}
            disabled={disabled}
            onChange={(e) => setCampo({ descripcion_accion: e.target.value })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{ta.rule_mensaje}</Label>
          <Input
            value={str(regla, "mensaje")}
            disabled={disabled}
            onChange={(e) => setCampo({ mensaje: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{ta.rule_motivo}</Label>
          <Input
            value={str(regla, "motivo")}
            disabled={disabled}
            onChange={(e) => setCampo({ motivo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export type { EfectoSenalViabilidad, TipoValidacionViabilidad };
