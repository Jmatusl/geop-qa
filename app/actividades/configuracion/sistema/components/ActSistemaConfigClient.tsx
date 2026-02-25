"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Settings, Users, Save, Loader2, Mail, Cloud, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { saveActSystemConfig } from "../actions";

const PERMISSIONS = [
  {
    key: "autoriza",
    label: "Autoriza Actividades",
    description: "Permite al usuario autorizar actividades",
  },
  {
    key: "chequea",
    label: "Chequear Actividades",
    description: "Puede realizar chequeos de actividades antes de la aprobación",
  },
  {
    key: "revisa",
    label: "Revisar Requerimientos",
    description: "Puede aprobar revisiones solicitadas por otros usuarios",
  },
  {
    key: "recepciona",
    label: "Recepciona Requerimientos",
    description: "Puede registrar recepciones de trabajo en requerimientos",
  },
];

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Props {
  initialConfig: { rules: any; notifications: any; permissions: any[] };
  users: User[];
}

export default function ActSistemaConfigClient({ initialConfig, users }: Props) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState(initialConfig);

  // Normaliza permisos a map userId → Set<permission>
  const [permMap, setPermMap] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    initialConfig.permissions.forEach((p: any) => {
      map[p.userId] = new Set(p.permissions);
    });
    return map;
  });

  const toggleNotification = (key: string) => setConfig((p) => ({ ...p, notifications: { ...p.notifications, [key]: !p.notifications[key] } }));
  const toggleRule = (key: string) => setConfig((p) => ({ ...p, rules: { ...p.rules, [key]: !p.rules[key] } }));

  const togglePermission = (userId: string, perm: string) => {
    setPermMap((prev) => {
      const current = new Set(prev[userId] || []);
      if (current.has(perm)) current.delete(perm);
      else current.add(perm);
      return { ...prev, [userId]: current };
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const permissions = Object.entries(permMap)
        .map(([userId, perms]) => ({
          userId,
          permissions: Array.from(perms),
        }))
        .filter((p) => p.permissions.length > 0);

      const result = await saveActSystemConfig({ rules: config.rules, notifications: config.notifications, permissions });
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
        <p className="text-muted-foreground">Administre las reglas, notificaciones y permisos del módulo de actividades.</p>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full lg:w-[500px] grid-cols-3 rounded-xl h-12 bg-slate-100 dark:bg-slate-900 border p-1">
          <TabsTrigger value="notifications" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="permissions" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <ShieldCheck className="h-4 w-4" /> Permisos
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4" /> Sistema
          </TabsTrigger>
        </TabsList>

        {/* Notificaciones */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" /> Preferencias de Notificación
              </CardTitle>
              <CardDescription>Defina qué eventos dispararán alertas por correo electrónico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Enviar Correos Electrónicos</Label>
                  <p className="text-sm text-muted-foreground italic">Activación maestra para todas las alertas del módulo.</p>
                </div>
                <Switch checked={config.notifications.emailEnabled} onCheckedChange={() => toggleNotification("emailEnabled")} />
              </div>

              <div className="grid gap-4 px-2">
                {[
                  { key: "onNewRequest", label: "Nuevo Requerimiento", desc: "Notificar a responsables cuando se registre un nuevo requerimiento." },
                  { key: "onAssign", label: "Asignación de Responsable", desc: "Avisar al responsable asignado." },
                  { key: "onStatusChange", label: "Cambio de Estado", desc: "Informar al solicitante sobre cambios de estado." },
                  { key: "onComplete", label: "Completado", desc: "Notificar al solicitante cuando el requerimiento sea completado." },
                ].map(({ key, label, desc }) => (
                  <div key={key} className={`flex items-center justify-between py-3 ${!config.notifications.emailEnabled ? "opacity-40 grayscale" : ""}`}>
                    <div className="space-y-1 pr-8">
                      <Label className="text-sm font-semibold">{label}</Label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch checked={config.notifications[key]} onCheckedChange={() => toggleNotification(key)} disabled={!config.notifications.emailEnabled} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permisos */}
        <TabsContent value="permissions" className="mt-6">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-emerald-500" /> Permisos Operativos
              </CardTitle>
              <CardDescription>Defina quién tiene autorización para las acciones críticas del flujo de requerimientos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="border-b">
                      <th className="text-left py-4 px-6 font-bold text-slate-700 dark:text-slate-200">Usuario</th>
                      {PERMISSIONS.map((p) => (
                        <th key={p.key} className="text-left py-4 px-6 min-w-[200px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">{p.label}</div>
                            <p className="text-[10px] sm:text-xs font-normal text-muted-foreground leading-tight">{p.description}</p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 border-r border-border/50">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">{user.email || "Sin correo"}</span>
                          </div>
                        </td>
                        {PERMISSIONS.map((perm) => (
                          <td key={perm.key} className="py-4 px-6 text-center lg:text-left transition-colors">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`perm-${user.id}-${perm.key}`}
                                checked={permMap[user.id]?.has(perm.key) || false}
                                onCheckedChange={() => togglePermission(user.id, perm.key)}
                                className="h-5 w-5 rounded-md border-slate-300 dark:border-slate-700 data-[state=checked]:bg-[#283c7f] data-[state=checked]:border-[#283c7f]"
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema */}
        <TabsContent value="system" className="mt-6">
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
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button onClick={handleSave} disabled={isPending} className="h-12 px-8 rounded-xl bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-lg gap-2">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
