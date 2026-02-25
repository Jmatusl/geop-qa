"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, ShieldCheck, ShieldAlert, Settings } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Tipo de datos de módulo con permisos
 */
interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  permissions: ModulePermission[];
}

interface ModulePermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface UserPermission {
  moduleCode: string;
  permissionCodes: string[];
}

interface PermissionsTabProps {
  userId: string;
}

/**
 * Componente de Tabs Dinámicos para Permisos por Módulo
 * 
 * Muestra un tab por cada módulo activo, con permisos agrupados por categoría.
 * Permite otorgar/revocar permisos mediante checkboxes interactivos.
 */
export function PermissionsTab({ userId }: PermissionsTabProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [userPermissions, setUserPermissions] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar módulos y permisos del usuario
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Obtener módulos con sus permisos
        const modulesRes = await fetch("/api/v1/permissions/modules");
        if (!modulesRes.ok) throw new Error("Error al cargar módulos");
        const modulesData: Module[] = await modulesRes.json();
        
        // Obtener permisos del usuario
        const userPermsRes = await fetch(`/api/v1/permissions/users/${userId}`);
        if (!userPermsRes.ok) throw new Error("Error al cargar permisos");
        const userPermsData: UserPermission[] = await userPermsRes.json();
        
        // Construir Map de permisos por módulo
        const permsMap = new Map<string, string[]>();
        userPermsData.forEach((up) => {
          permsMap.set(up.moduleCode, up.permissionCodes);
        });
        
        setModules(modulesData.filter(m => m.isActive));
        setUserPermissions(permsMap);
        
        // Seleccionar primer módulo por defecto
        if (modulesData.length > 0) {
          setSelectedModule(modulesData[0].code);
        }
      } catch (error: any) {
        console.error("Error cargando permisos:", error);
        toast.error("No se pudieron cargar los permisos");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [userId]);

  // Toggle de un permiso específico
  const handleTogglePermission = async (moduleCode: string, permissionCode: string, isChecked: boolean) => {
    try {
      const currentPerms = userPermissions.get(moduleCode) || [];
      let newPerms: string[];
      
      if (isChecked) {
        // Agregar permiso
        newPerms = [...currentPerms, permissionCode];
      } else {
        // Remover permiso
        newPerms = currentPerms.filter(p => p !== permissionCode);
      }
      
      // Actualización optimista UI
      const updatedMap = new Map(userPermissions);
      updatedMap.set(moduleCode, newPerms);
      setUserPermissions(updatedMap);
      
      // Sincronizar con backend
      setIsSaving(true);
      const res = await fetch(`/api/v1/permissions/users/${userId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleCode,
          permissionCodes: newPerms,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Error al sincronizar permisos");
      }
      
      toast.success(isChecked ? "Permiso otorgado" : "Permiso revocado");
    } catch (error: any) {
      console.error("Error toggling permission:", error);
      toast.error("No se pudo actualizar el permiso");
      
      // Revertir cambio optimista
      const currentPerms = userPermissions.get(moduleCode) || [];
      const revertedMap = new Map(userPermissions);
      if (isChecked) {
        revertedMap.set(moduleCode, currentPerms.filter(p => p !== permissionCode));
      } else {
        revertedMap.set(moduleCode, [...currentPerms, permissionCode]);
      }
      setUserPermissions(revertedMap);
    } finally {
      setIsSaving(false);
    }
  };

  // Contar permisos activos por módulo
  const getActivePermissionsCount = (moduleCode: string): number => {
    return userPermissions.get(moduleCode)?.length || 0;
  };

  // Agrupar permisos por categoría
  const getPermissionsByCategory = (permissions: ModulePermission[]) => {
    const categories = {
      approval: permissions.filter(p => p.category === "approval"),
      operation: permissions.filter(p => p.category === "operation"),
      admin: permissions.filter(p => p.category === "admin"),
      other: permissions.filter(p => !p.category || !["approval", "operation", "admin"].includes(p.category)),
    };
    return categories;
  };

  // Mapeo de iconos de categorías
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "approval":
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case "operation":
        return <Shield className="h-4 w-4 text-emerald-500" />;
      case "admin":
        return <Settings className="h-4 w-4 text-amber-500" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-slate-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "approval":
        return "Aprobaciones";
      case "operation":
        return "Operaciones";
      case "admin":
        return "Administración";
      default:
        return "Otros";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Cargando permisos...</span>
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
      <Alert className="mb-4">
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Gestiona los permisos operativos del usuario por cada módulo. Los cambios se aplican inmediatamente.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedModule || undefined} onValueChange={setSelectedModule} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
          {modules.map((module) => {
            const activeCount = getActivePermissionsCount(module.code);
            return (
              <TabsTrigger key={module.code} value={module.code} className="flex items-center gap-2">
                <span>{module.name}</span>
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                    {activeCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {modules.map((module) => (
          <TabsContent key={module.code} value={module.code}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {module.name}
                </CardTitle>
                {module.description && (
                  <CardDescription>{module.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {module.permissions.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay permisos definidos para este módulo.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(getPermissionsByCategory(module.permissions)).map(([category, perms]) => {
                      if (perms.length === 0) return null;
                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                            {getCategoryIcon(category)}
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {getCategoryLabel(category)}
                            </h4>
                          </div>
                          <div className="space-y-3 ml-6">
                            {perms.map((permission) => {
                              const isChecked = userPermissions.get(module.code)?.includes(permission.code) || false;
                              return (
                                <div key={permission.id} className="flex items-start space-x-3">
                                  <Checkbox
                                    id={`perm-${permission.id}`}
                                    checked={isChecked}
                                    disabled={isSaving}
                                    onCheckedChange={(checked) =>
                                      handleTogglePermission(module.code, permission.code, checked === true)
                                    }
                                  />
                                  <div className="space-y-1 flex-1">
                                    <Label
                                      htmlFor={`perm-${permission.id}`}
                                      className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {permission.name}
                                    </Label>
                                    {permission.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {permission.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
