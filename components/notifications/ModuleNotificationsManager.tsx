"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Tipo de datos de módulo con configuración de notificaciones
 */
interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  emailEnabled: boolean;
  displayOrder: number;
  notificationSettings: NotificationSetting[];
}

interface NotificationSetting {
  id: string;
  eventKey: string;
  eventName: string;
  description: string | null;
  isEnabled: boolean;
  requiredPermissions: string[];
}

/**
 * Componente de Gestión Centralizada de Notificaciones por Módulo
 * 
 * Permite configurar individualmente cada evento de notificación
 * por módulo operativo (actividades, mantención, etc.).
 */
export function ModuleNotificationsManager() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado local de notificaciones por módulo
  const [notificationStates, setNotificationStates] = useState<Map<string, Map<string, boolean>>>(new Map());
  
  // Estado global de habilitación de email por módulo
  const [moduleEmailEnabled, setModuleEmailEnabled] = useState<Map<string, boolean>>(new Map());

  // Cargar módulos con sus notificaciones
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Obtener módulos con notificaciones
        const modulesRes = await fetch("/api/v1/notifications/modules");
        if (!modulesRes.ok) throw new Error("Error al cargar módulos");
        const modulesData: Module[] = await modulesRes.json();
        
        // Construir Map de estados de notificaciones
        const statesMap = new Map<string, Map<string, boolean>>();
        const emailEnabledMap = new Map<string, boolean>();
        
        modulesData.forEach((module) => {
          const moduleNotifs = new Map<string, boolean>();
          module.notificationSettings.forEach((notif) => {
            moduleNotifs.set(notif.eventKey, notif.isEnabled);
          });
          statesMap.set(module.code, moduleNotifs);
          emailEnabledMap.set(module.code, module.emailEnabled);
        });
        
        setModules(modulesData.filter(m => m.isActive));
        setNotificationStates(statesMap);
        setModuleEmailEnabled(emailEnabledMap);
        
        // Seleccionar primer módulo por defecto
        if (modulesData.length > 0) {
          setSelectedModule(modulesData[0].code);
        }
      } catch (error: any) {
        console.error("Error cargando notificaciones:", error);
        toast.error("No se pudieron cargar las configuraciones");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Toggle global de habilitación de email por módulo
  const handleToggleGlobalEmail = async (moduleCode: string, emailEnabled: boolean) => {
    try {
      // Actualización optimista UI
      const updatedEmailStates = new Map(moduleEmailEnabled);
      updatedEmailStates.set(moduleCode, emailEnabled);
      setModuleEmailEnabled(updatedEmailStates);
      
      // Sincronizar con backend
      setIsSaving(true);
      const res = await fetch(`/api/v1/notifications/modules/${moduleCode}/toggle-global`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled }),
      });
      
      if (!res.ok) {
        throw new Error("Error al actualizar switch global");
      }
      
      toast.success(emailEnabled ? "Notificaciones del módulo activadas" : "Notificaciones del módulo desactivadas");
    } catch (error: any) {
      console.error("Error toggling global email:", error);
      toast.error("No se pudo actualizar el switch global");
      
      // Revertir cambio optimista
      const revertedStates = new Map(moduleEmailEnabled);
      revertedStates.set(moduleCode, !emailEnabled);
      setModuleEmailEnabled(revertedStates);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle de una notificación específica
  const handleToggleNotification = async (moduleCode: string, eventKey: string, isEnabled: boolean) => {
    try {
      // Actualización optimista UI
      const updatedStates = new Map(notificationStates);
      const moduleNotifs = new Map(updatedStates.get(moduleCode) || new Map());
      moduleNotifs.set(eventKey, isEnabled);
      updatedStates.set(moduleCode, moduleNotifs);
      setNotificationStates(updatedStates);
      
      // Sincronizar con backend
      setIsSaving(true);
      const res = await fetch(`/api/v1/notifications/modules/${moduleCode}/events/${eventKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      
      if (!res.ok) {
        throw new Error("Error al actualizar notificación");
      }
      
      toast.success(isEnabled ? "Notificación activada" : "Notificación desactivada");
    } catch (error: any) {
      console.error("Error toggling notification:", error);
      toast.error("No se pudo actualizar la notificación");
      
      // Revertir cambio optimista
      const revertedStates = new Map(notificationStates);
      const moduleNotifs = new Map(revertedStates.get(moduleCode) || new Map());
      moduleNotifs.set(eventKey, !isEnabled);
      revertedStates.set(moduleCode, moduleNotifs);
      setNotificationStates(revertedStates);
    } finally {
      setIsSaving(false);
    }
  };

  // Contar notificaciones activas por módulo
  const getActiveNotificationsCount = (moduleCode: string): number => {
    const moduleNotifs = notificationStates.get(moduleCode);
    if (!moduleNotifs) return 0;
    return Array.from(moduleNotifs.values()).filter(v => v).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Cargando configuraciones...</span>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          No hay módulos activos configurados en el sistema.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <Alert className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
        <ShieldAlert className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Configuración Global de Notificaciones</strong> — Estas configuraciones afectan a todos los usuarios del sistema. 
          Las notificaciones se enviarán automáticamente a los usuarios según los permisos que tengan en cada módulo. 
          Los usuarios pueden personalizar sus preferencias individuales en su perfil.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedModule || undefined} onValueChange={setSelectedModule} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
          {modules.map((module) => {
            const activeCount = getActiveNotificationsCount(module.code);
            const totalCount = module.notificationSettings.length;
            return (
              <TabsTrigger key={module.code} value={module.code} className="flex items-center gap-2">
                <span>{module.name}</span>
                <Badge variant={activeCount > 0 ? "default" : "secondary"} className="ml-1 h-5 min-w-[35px] px-1.5">
                  {activeCount}/{totalCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {modules.map((module) => (
          <TabsContent key={module.code} value={module.code}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="h-5 w-5 text-blue-500" />
                      {module.name} - Notificaciones
                    </CardTitle>
                    {module.description && (
                      <CardDescription>{module.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Label htmlFor={`global-${module.code}`} className="text-sm font-semibold whitespace-nowrap">
                      Notificaciones del Módulo
                    </Label>
                    <Switch
                      id={`global-${module.code}`}
                      checked={moduleEmailEnabled.get(module.code) || false}
                      disabled={isSaving}
                      onCheckedChange={(checked) =>
                        handleToggleGlobalEmail(module.code, checked)
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {module.notificationSettings.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay notificaciones configuradas para este módulo.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {module.notificationSettings.map((notification) => {
                      const isEnabled = notificationStates.get(module.code)?.get(notification.eventKey) || false;
                      const globalEnabled = moduleEmailEnabled.get(module.code) || false;
                      return (
                        <div
                          key={notification.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                            globalEnabled 
                              ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" 
                              : "opacity-50 bg-slate-50 dark:bg-slate-800/30"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 pr-8">
                            <Label
                              htmlFor={`notif-${notification.id}`}
                              className={`text-sm font-semibold ${globalEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}
                            >
                              {notification.eventName}
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
                            id={`notif-${notification.id}`}
                            checked={isEnabled}
                            disabled={isSaving || !globalEnabled}
                            onCheckedChange={(checked) =>
                              handleToggleNotification(module.code, notification.eventKey, checked)
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
