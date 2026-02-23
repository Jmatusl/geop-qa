"use client";

import { useState, useTransition } from "react";
import { Bell, Mail, Save, Loader2, ChevronRight, Info, AlertCircle, ShieldCheck, History, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveUserNotificationPreferences } from "../actions";

interface NotificacionesClientProps {
  initialPrefs: any;
}

export function NotificacionesClient({ initialPrefs }: NotificacionesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState(initialPrefs);

  const handleToggle = (key: string) => {
    setPrefs((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveUserNotificationPreferences(prefs);
      if (res.success) {
        toast.success("Preferencias guardadas correctamente");
      } else {
        toast.error(res.error || "Error al guardar");
      }
    });
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-10">
      {/* Encabezado */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Configuración de Notificaciones
        </h1>
        <p className="text-muted-foreground text-lg">Personalice cómo y cuándo desea recibir alertas del sistema de mantenimiento.</p>
      </div>

      {/* Switch Maestro */}
      <Card className="overflow-hidden border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xl font-bold text-slate-900 dark:text-white cursor-pointer" htmlFor="master-switch">
                  Notificaciones por Correo Electrónico
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">Activa o desactiva de forma global el envío de alertas a su casilla personal.</p>
              </div>
            </div>
            <Switch id="master-switch" checked={prefs.emailEnabled} onCheckedChange={() => handleToggle("emailEnabled")} className="data-[state=checked]:bg-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Grid de Notificaciones Individuales */}
      <div className="grid gap-6">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Preferencias Individuales</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NotificationCard
            icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
            title="Nuevas Solicitudes"
            description="Reciba un aviso inmediato cuando se registre un nuevo requerimiento en las instalaciones que tiene asignadas."
            checked={prefs.onNewRequest}
            onCheckedChange={() => handleToggle("onNewRequest")}
            disabled={!prefs.emailEnabled}
            tag="Aprobadores / Jefaturas"
          />

          <NotificationCard
            icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
            title="Aprobaciones y Rechazos"
            description="Manténgase al tanto del estado de sus propias solicitudes cuando sean revisadas por la jefatura."
            checked={prefs.onApproval}
            onCheckedChange={() => handleToggle("onApproval")}
            disabled={!prefs.emailEnabled}
            tag="Creadores"
          />

          <NotificationCard
            icon={<History className="h-5 w-5 text-blue-500" />}
            title="Cambios y Reprogramación"
            description="Notificar si un trabajo técnico cambia de fecha estimada, se terceriza o se asigna a taller."
            checked={prefs.onReprogram}
            onCheckedChange={() => handleToggle("onReprogram")}
            disabled={!prefs.emailEnabled}
            tag="Seguimiento"
          />

          <NotificationCard
            icon={<FileText className="h-5 w-5 text-sky-500" />}
            title="Cierre Técnico y PDF"
            description="Reciba automáticamente el informe final en formato PDF una vez que el trabajo sea finalizado y cerrado."
            checked={prefs.onClose}
            onCheckedChange={() => handleToggle("onClose")}
            disabled={!prefs.emailEnabled}
            tag="Reportabilidad"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-3 items-start">
        <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>Nota sobre la Jerarquía:</strong> Estas preferencias personales actúan como un filtro secundario. Si la administración desactiva una notificación de forma global en el sistema, usted
          no la recibirá incluso si la tiene activada aquí. Sin embargo, usted siempre puede optar por <strong>no recibir</strong> alertas que sí estén activas globalmente.
        </p>
      </div>

      {/* Barra de Acciones Fija (Mobile) / Botón (Desktop) */}
      <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-800">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="h-12 px-10 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-xl shadow-blue-900/20 gap-2 font-bold transition-all active:scale-95"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Mis Preferencias
        </Button>
      </div>

      {/* Barra fija inferior para móvil (opcional pero siguiendo estándares) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 lg:hidden z-50">
        <Button onClick={handleSave} disabled={isPending} className="w-full h-12 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-lg gap-2 font-bold">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}

function NotificationCard({ icon, title, description, checked, onCheckedChange, disabled, tag }: any) {
  return (
    <Card
      className={`group transition-all duration-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-2xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/40 ${disabled ? "opacity-50 grayscale select-none" : ""}`}
      onClick={() => !disabled && onCheckedChange()}
    >
      <CardHeader className="p-5 flex flex-row items-start justify-between space-y-0">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">{icon}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{title}</CardTitle>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{tag}</span>
            </div>
            <CardDescription className="text-xs leading-relaxed line-clamp-2">{description}</CardDescription>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="data-[state=checked]:bg-blue-600 scale-90" />
      </CardHeader>
    </Card>
  );
}
