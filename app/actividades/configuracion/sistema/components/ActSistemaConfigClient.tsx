"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Save, Loader2, Cloud } from "lucide-react";
import { toast } from "sonner";
import { saveActSystemConfig } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Props {
  initialConfig: { rules: any };
}

export default function ActSistemaConfigClient({ initialConfig }: Props) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState(initialConfig);

  const toggleRule = (key: string) => setConfig((p) => ({ ...p, rules: { ...p.rules, [key]: !p.rules[key] } }));

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveActSystemConfig({ rules: config.rules });
      if (result.success) toast.success("Configuración guardada");
      else toast.error(result.error ?? "Error al guardar");
    });
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          Configuración del Módulo
        </h1>
        <p className="text-muted-foreground">Configuración técnica del módulo de actividades.</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Las notificaciones y permisos ahora se gestionan desde{" "}
          <a href="/mantenedores/notificaciones" className="underline font-semibold">
            /mantenedores/notificaciones
          </a>{" "}
          y{" "}
          <a href="/mantenedores/usuarios" className="underline font-semibold">
            /mantenedores/usuarios
          </a>{" "}
          respectivamente.
        </AlertDescription>
      </Alert>

      <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-sky-500" /> Configuración del Sistema
          </CardTitle>
          <CardDescription>Configuración técnica del módulo de actividades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prefijo de Folio</Label>
              <Input
                value={config.rules.folioPrefix}
                onChange={(e) => setConfig((p) => ({ ...p, rules: { ...p.rules, folioPrefix: e.target.value.toUpperCase() } }))}
                placeholder="REQ"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">Requerimientos se crearán como REQ-0001, etc.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Auto-Asignación</Label>
              <p className="text-sm text-muted-foreground">Asignar automáticamente al responsable de la ubicación.</p>
            </div>
            <Switch checked={config.rules.autoAssign} onCheckedChange={() => toggleRule("autoAssign")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button onClick={handleSave} disabled={isPending} className="h-12 px-8 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-lg gap-2">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
