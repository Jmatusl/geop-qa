"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, BellOff, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Tipo de configuración de notificación del usuario
 */
interface UserNotificationConfig {
  moduleCode: string;
  moduleName: string;
  moduleIcon: string | null;
  notifications: {
    eventKey: string;
    eventName: string;
    description: string | null;
    isEnabledGlobally: boolean;
    isOptedOut: boolean;
    canReceive: boolean;
    requiredPermissions: string[];
  }[];
}

/**
 * Componente de Preferencias Personales de Notificaciones
 * 
 * Permite al usuario configurar qué notificaciones desea recibir
 * basándose en los permisos que tiene asignados en cada módulo.
 */
export function PersonalNotificationPreferences() {
  const [config, setConfig] = useState<UserNotificationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar configuración del usuario
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        const res = await fetch("/api/v1/notifications/preferences");
        if (!res.ok) throw new Error("Error al cargar configuración");
        
        const data: UserNotificationConfig[] = await res.json();
        setConfig(data);
        
        // Seleccionar primer módulo por defecto
        if (data.length > 0) {
          setSelectedModule(data[0].moduleCode);
        }
      } catch (error: any) {
        console.error("Error cargando preferencias:", error);
        toast.error("No se pudieron cargar las preferencias");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Toggle de opt-out de una notificación específica
  const handleToggleOptOut = async (moduleCode: string, eventKey: string, isOptedOut: boolean) => {
    try {
      // Actualización optimista UI
      setConfig(prevConfig =>
        prevConfig.map(module => {
          if (module.moduleCode !== moduleCode) return module;
          
          return {
            ...module,
            notifications: module.notifications.map(notif => {
              if (notif.eventKey !== eventKey) return notif;
              
              return {
                ...notif,
                isOptedOut,
                canReceive: notif.isEnabledGlobally && !isOptedOut,
              };
            }),
          };
        })
      );
      
      // Sincronizar con backend
      setIsSaving(true);
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode, eventKey, isOptedOut }),
      });
      
      if (!res.ok) {
        throw new Error("Error al actualizar preferencia");
      }
      
      toast.success(isOptedOut ? "Notificación desactivada" : "Notificación activada");
    } catch (error: any) {
      console.error("Error toggling preference:", error);
      toast.error("No se pudo actualizar la preferencia");
      
      // Revertir cambio optimista
      setConfig(prevConfig =>
        prevConfig.map(module => {
          if (module.moduleCode !== moduleCode) return module;
          
          return {
            ...module,
            notifications: module.notifications.map(notif => {
              if (notif.eventKey !== eventKey) return notif;
              
              return {
                ...notif,
                isOptedOut: !isOptedOut,
                canReceive: notif.isEnabledGlobally && isOptedOut,
              };
            }),
          };
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Contar notificaciones activas por módulo
  const getActiveNotificationsCount = (moduleCode: string): number => {
    const module = config.find(m => m.moduleCode === moduleCode);
    if (!module) return 0;
    return module.notifications.filter(n => n.canReceive).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Cargando preferencias...</span>
      </div>
    );
  }

  if (config.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No tiene permisos asignados en ningún módulo operativo. Las notificaciones se enviarán según los permisos que le sean otorgados.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <Alert className="mb-4">
        <Bell className="h-4 w-4" />
        <AlertDescription>
          Aquí puede personalizar qué notificaciones desea recibir. Solo se muestran las notificaciones de los módulos donde tiene permisos asignados.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedModule || undefined} onValueChange={setSelectedModule} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
          {config.map((module) => {
            const activeCount = getActiveNotificationsCount(module.moduleCode);
            const totalCount = module.notifications.length;
            return (
              <TabsTrigger key={module.moduleCode} value={module.moduleCode} className="flex items-center gap-2">
                <span>{module.moduleName}</span>
                <Badge variant={activeCount > 0 ? "default" : "secondary"} className="ml-1 h-5 min-w-[35px] px-1.5">
                  {activeCount}/{totalCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {config.map((module) => (
          <TabsContent key={module.moduleCode} value={module.moduleCode}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-blue-500" />
                  {module.moduleName} - Mis Notificaciones
                </CardTitle>
                <CardDescription>
                  Configure qué notificaciones desea recibir de este módulo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {module.notifications.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No tiene permisos para recibir notificaciones de este módulo.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {module.notifications.map((notification) => {
                      const isDisabledGlobally = !notification.isEnabledGlobally;
                      const isActive = !notification.isOptedOut;
                      
                      return (
                        <div
                          key={notification.eventKey}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                            isDisabledGlobally
                              ? "opacity-40 bg-slate-50 dark:bg-slate-800/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 pr-8">
                            <Label
                              htmlFor={`notif-${module.moduleCode}-${notification.eventKey}`}
                              className={`text-sm font-semibold ${
                                isDisabledGlobally ? "cursor-not-allowed" : "cursor-pointer"
                              }`}
                            >
                              {notification.eventName}
                              {isDisabledGlobally && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                  (Deshabilitada globalmente)
                                </span>
                              )}
                            </Label>
                            {notification.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {notification.description}
                              </p>
                            )}
                            {notification.requiredPermissions.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Permisos:</span>
                                {notification.requiredPermissions.map((perm) => (
                                  <span
                                    key={perm}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                                  >
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Switch
                            id={`notif-${module.moduleCode}-${notification.eventKey}`}
                            checked={isActive}
                            disabled={isSaving || isDisabledGlobally}
                            onCheckedChange={(checked) =>
                              handleToggleOptOut(module.moduleCode, notification.eventKey, !checked)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
