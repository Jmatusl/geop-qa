"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { AdminMetrics } from "@/components/dashboard/admin-metrics";
import { SystemActivity } from "@/components/dashboard/system-activity";
import { AdminShortcuts } from "@/components/dashboard/admin-shortcuts";

// Configuración de layouts
import dashboardLayouts from "@/lib/config/dashboard-layouts.json";

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  AdminMetrics,
  SystemActivity,
  AdminShortcuts,
};

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading: isDashboardLoading } = useDashboard();

  // Mostrar skeleton mientras se verifica la sesión
  if (isAuthLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-4">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    );
  }

  // Determinar el rol del usuario
  const getUserRole = (): keyof typeof dashboardLayouts => {
    if (!user) return "CLIENTE";

    const roles = user.roles || [];

    if (roles.includes("ADMIN")) return "ADMIN";
    if (roles.includes("OPERADOR")) return "OPERADOR";
    if (roles.includes("USUARIO")) return "USUARIO";

    return "CLIENTE";
  };

  const userRole = getUserRole();
  const layoutConfig = dashboardLayouts[userRole];

  // Título y descripción según rol
  const getTitleAndDescription = () => {
    switch (userRole) {
      case "ADMIN":
        return {
          title: "Panel de Administración",
          description: `Bienvenido de nuevo, ${user?.firstName}. Tienes acceso completo a la gestión del sistema.`,
        };
      case "OPERADOR":
        return {
          title: "Panel de Operaciones",
          description: `Hola ${user?.firstName}, gestiona y supervisa las operaciones del sistema.`,
        };
      case "USUARIO":
        return {
          title: "Mi Panel Personal",
          description: `Hola ${user?.firstName}, aquí tienes un resumen de tu seguridad y actividad reciente.`,
        };
      case "CLIENTE":
        return {
          title: "Mi Credencial",
          description: `Bienvenido ${user?.firstName || ""}`.trim(),
        };
    }
  };

  const { title, description } = getTitleAndDescription();

  // Renderizar componentes dinámicamente según configuración JSON
  const renderComponent = (componentConfig: any, index: number) => {
    const Component = COMPONENT_MAP[componentConfig.type];

    if (!Component) {
      console.warn(`Component ${componentConfig.type} not found in COMPONENT_MAP`);
      return null;
    }

    // Pasar props adicionales según el tipo de componente
    const componentProps: any = { ...componentConfig.props };

    // Componentes que necesitan el user
    if (componentConfig.type === "QuickAccessHub") {
      componentProps.user = user;
    }

    // Componentes que necesitan data del dashboard
    if (componentConfig.type === "AdminMetrics" || componentConfig.type === "SystemActivity") {
      componentProps.data = data;
      componentProps.isLoading = isDashboardLoading;
    }

    return <Component key={index} {...componentProps} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="text-muted-foreground mt-1 text-lg">{description}</p>
      </div>

      {/* Componentes dinámicos según configuración JSON */}
      <div className="space-y-6">{layoutConfig.components.map((componentConfig, index) => renderComponent(componentConfig, index))}</div>
    </div>
  );
}
