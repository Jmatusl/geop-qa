"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Save, Loader2, Cloud, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { saveMntSystemConfig } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SistemaConfigClientProps {
  initialConfig: {
    rules: any;
  };
}

export default function SistemaConfigClient({ initialConfig }: SistemaConfigClientProps) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState(initialConfig);

  const handleToggleRule = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: !prev.rules[key],
      },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveMntSystemConfig(config);
      if (result.success) {
        toast.success("Configuración guardada exitosamente");
      } else {
        toast.error(`Error: ${result.error}`);
      }
    });
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          Reglas del Sistema
        </h1>
        <p className="text-muted-foreground">Configuración global de comportamientos y automatizaciones del módulo.</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Las notificaciones ahora se gestionan desde{" "}
          <a href="/mantenedores/notificaciones" className="underline font-semibold">
            /mantenedores/notificaciones
          </a>
          , y la aprobación cruzada desde{" "}
          <a href="/mantenedores/usuarios" className="underline font-semibold">
            /mantenedores/usuarios → Permisos
          </a>
          .
        </AlertDescription>
      </Alert>

      {/* Reglas de Aprobación */}
      <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Flujo de Autorizaciones
          </CardTitle>
          <CardDescription>Automatice o restrinja el proceso de validación técnica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Auto-Aprobación Activa</Label>
              <p className="text-sm text-muted-foreground">Omitir el paso por la bandeja de pendientes para solicitudes menores.</p>
            </div>
            <Switch checked={config.rules.autoApprovalEnabled} onCheckedChange={() => handleToggleRule("autoApprovalEnabled")} />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Aprobación Cruzada</Label>
              <p className="text-sm text-muted-foreground">
                Permitir la asignación de validadores inter-instalación.{" "}
                <span className="italic text-xs">
                  (Los usuarios autorizados se gestionan desde{" "}
                  <a href="/mantenedores/usuarios" className="underline">
                    permisos de usuario
                  </a>
                  )
                </span>
              </p>
            </div>
            <Switch checked={config.rules.crossApprovalEnabled} onCheckedChange={() => handleToggleRule("crossApprovalEnabled")} />
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-xl flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-tight">Atención Técnica</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                La auto-aprobación marcada como activa permitirá que los requerimientos pasen directamente a estado
                <span className="font-bold underline mx-1">"APROBADO"</span> sin inspección humana previa. Use con discreción.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema y Storage */}
      <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-sky-500" />
            Almacenamiento y Evidencia
          </CardTitle>
          <CardDescription>Configuración técnica de los servicios de soporte.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Proveedor de Imágenes</Label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.rules.storageProvider === "R2" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : "border-border hover:border-slate-300 dark:hover:border-slate-700"}`}
                onClick={() => setConfig((prev) => ({ ...prev, rules: { ...prev.rules, storageProvider: "R2" } }))}
              >
                <p className="font-bold text-lg">Cloudflare R2</p>
                <p className="text-xs text-muted-foreground">S3 Compatible / Alto rendimiento</p>
              </div>
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.rules.storageProvider === "Cloudinary" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : "border-border hover:border-slate-300 dark:hover:border-slate-700"}`}
                onClick={() => setConfig((prev) => ({ ...prev, rules: { ...prev.rules, storageProvider: "Cloudinary" } }))}
              >
                <p className="font-bold text-lg">Cloudinary</p>
                <p className="text-xs text-muted-foreground">Optimización automática de assets</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-dashed">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold">Registro de Gastos</Label>
                <p className="text-[13px] text-muted-foreground italic">Exigir el ingreso de costos al finalizar el mantenimiento.</p>
              </div>
              <Switch checked={config.rules.requireCosts} onCheckedChange={() => handleToggleRule("requireCosts")} />
            </div>
          </div>

          <div className="pt-4 border-t border-dashed space-y-4">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configuración de Folios</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prefijo Folio Solicitud Interna</Label>
                <Input
                  value={config.rules.internalPrefix}
                  onChange={(e) => setConfig((prev) => ({ ...prev, rules: { ...prev.rules, internalPrefix: e.target.value.toUpperCase() } }))}
                  placeholder="RD"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Úselo para identificar solicitudes operativas.</p>
              </div>
              <div className="space-y-2">
                <Label>Prefijo Folio Tercerización</Label>
                <Input
                  value={config.rules.workReqPrefix}
                  onChange={(e) => setConfig((prev) => ({ ...prev, rules: { ...prev.rules, workReqPrefix: e.target.value.toUpperCase() } }))}
                  placeholder="RT"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Úselo para identificar requerimientos de trabajo externos.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button onClick={handleSave} disabled={isPending} className="h-12 px-8 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-lg gap-2">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Configuración Maestra
        </Button>
      </div>
    </div>
  );
}
