"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Save, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { saveInsumosSystemConfig } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Props {
  initialConfig: { config: any };
}

export default function InsumosConfigClient({ initialConfig }: Props) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState(initialConfig);

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveInsumosSystemConfig({ config: config.config });
      if (result.success) {
        toast.success("Configuración guardada correctamente");
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    });
  };

  const handleDeadlineChange = (value: string) => {
    const numValue = Number(value);
    if (numValue >= 1) {
      setConfig((p) => ({
        ...p,
        config: { ...p.config, defaultDeadlineDays: numValue },
      }));
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          Configuración del Módulo
        </h1>
        <p className="text-muted-foreground">Configuración técnica del módulo de insumos.</p>
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
            <Package className="h-5 w-5 text-emerald-500" /> Configuración del Sistema
          </CardTitle>
          <CardDescription>Configuración técnica del módulo de insumos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="deadline-days">Días por defecto para Fecha Límite de Respuesta</Label>
            <div className="space-y-1">
              <Input
                id="deadline-days"
                type="number"
                min={1}
                value={config.config.defaultDeadlineDays}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                placeholder="7"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Número de días para establecer el plazo de respuesta por defecto en las cotizaciones. Mínimo: 1 día.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="h-12 px-8 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-lg gap-2"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
