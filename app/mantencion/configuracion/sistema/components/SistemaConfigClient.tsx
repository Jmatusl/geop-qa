"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, ShieldCheck, Settings, Database, Mail, Save, Loader2, Cloud, History, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { saveMntSystemConfig } from "../actions";

interface SistemaConfigClientProps {
  initialConfig: {
    rules: any;
    notifications: any;
  };
  users: { id: string; firstName: string; lastName: string; email: string | null }[];
}

export default function SistemaConfigClient({ initialConfig, users }: SistemaConfigClientProps) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState(() => ({
    ...initialConfig,
    rules: { ...initialConfig.rules, crossApprovers: initialConfig.rules.crossApprovers || [] },
  }));

  const handleToggleNotification = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

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

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full lg:w-[600px] grid-cols-3 rounded-xl h-12 bg-slate-100 dark:bg-slate-900 border p-1">
          <TabsTrigger value="notifications" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <ShieldCheck className="h-4 w-4" /> Aprobaciones
          </TabsTrigger>
          <TabsTrigger value="global" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <Database className="h-4 w-4" /> Sistema
          </TabsTrigger>
        </TabsList>

        {/* Pestaña: Notificaciones */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="rounded-2xl border-none shadow-sm shadow-slate-200 dark:shadow-none bg-white dark:bg-slate-900 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                Preferencias de Notificación
              </CardTitle>
              <CardDescription>Defina qué eventos dispararán alertas por correo electrónico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Enviar Correos Electrónicos</Label>
                  <p className="text-sm text-muted-foreground italic">Activación maestra para todas las alertas del módulo.</p>
                </div>
                <Switch checked={config.notifications.emailEnabled} onCheckedChange={() => handleToggleNotification("emailEnabled")} />
              </div>

              <div className="grid gap-4 px-2">
                <NotificationToggle
                  label="Nuevo Requerimiento"
                  description="Notificar a los aprobadores cuando se registre una nueva falla en sus naves."
                  checked={config.notifications.onNewRequest}
                  onCheckedChange={() => handleToggleNotification("onNewRequest")}
                  disabled={!config.notifications.emailEnabled}
                />
                <NotificationToggle
                  label="Aprobaciones y Rechazos"
                  description="Informar al solicitante sobre la decisión de la jefatura."
                  checked={config.notifications.onApproval}
                  onCheckedChange={() => handleToggleNotification("onApproval")}
                  disabled={!config.notifications.emailEnabled}
                />
                <NotificationToggle
                  label="Cambios de Estado y Reprogramación"
                  description="Avisar si un trabajo se terceriza o se cambia la fecha estimada."
                  checked={config.notifications.onReprogram}
                  onCheckedChange={() => handleToggleNotification("onReprogram")}
                  disabled={!config.notifications.emailEnabled}
                />
                <NotificationToggle
                  label="Cierre Técnico"
                  description="Enviar el informe PDF automáticamente al finalizar el requerimiento."
                  checked={config.notifications.onClose}
                  onCheckedChange={() => handleToggleNotification("onClose")}
                  disabled={!config.notifications.emailEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Reglas de Aprobación */}
        <TabsContent value="rules" className="mt-6">
          <Card className="rounded-2xl border-none shadow-sm shadow-slate-200 dark:shadow-none bg-white dark:bg-slate-900 border">
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

              <div className="flex flex-col p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl mt-4 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Aprobación Cruzada</Label>
                    <p className="text-sm text-muted-foreground">Actívelo para permitir la asignación de validadores inter-instalación.</p>
                  </div>
                  <Switch checked={config.rules.crossApprovalEnabled} onCheckedChange={() => handleToggleRule("crossApprovalEnabled")} />
                </div>

                {config.rules.crossApprovalEnabled && (
                  <div className="pt-4 border-t space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <Label className="text-sm font-semibold">Usuarios autorizados para aprobación cruzada:</Label>
                    </div>
                    <ScrollArea className="h-[200px] rounded-lg border bg-white dark:bg-slate-950 p-2">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-md transition-colors">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={config.rules.crossApprovers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              setConfig((prev: any) => ({
                                ...prev,
                                rules: {
                                  ...prev.rules,
                                  crossApprovers: checked ? [...prev.rules.crossApprovers, user.id] : prev.rules.crossApprovers.filter((id: string) => id !== user.id),
                                },
                              }));
                            }}
                          />
                          <Label htmlFor={`user-${user.id}`} className="flex flex-col cursor-pointer pb-1">
                            <span className="text-sm font-bold leading-none">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">{user.email || "Sin correo"}</span>
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
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
        </TabsContent>

        {/* Pestaña: Sistema y Storage */}
        <TabsContent value="global" className="mt-6">
          <Card className="rounded-2xl border-none shadow-sm shadow-slate-200 dark:shadow-none bg-white dark:bg-slate-900 border">
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
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button onClick={handleSave} disabled={isPending} className="h-12 px-8 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-lg gap-2">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Configuración Maestra
        </Button>
      </div>
    </div>
  );
}

function NotificationToggle({ label, description, checked, onCheckedChange, disabled }: any) {
  return (
    <div className={`flex items-center justify-between py-3 ${disabled ? "opacity-40 grayscale" : ""}`}>
      <div className="space-y-1 pr-8">
        <Label className="text-sm font-semibold">{label}</Label>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
