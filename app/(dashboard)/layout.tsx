import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { validateMenuAccess } from "@/lib/auth/access";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UIConfig } from "@/components/layout/sidebar-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 1. Verificar sesión en servidor
  const session = await verifySession();

  if (!session) {
    redirect("/login");
  }

  // 2. Validar acceso a la ruta actual (Authorization)
  // Usamos el header 'x-current-path' inyectado por el Proxy
  const headersList = await headers();
  const currentPath = headersList.get("x-current-path") || "";

  // Solo validamos si hay un path y no es la raíz del dashboard ni rutas de API
  // Las rutas /validar/* son públicas y no deberían llegar aquí por el proxy, pero si llegaran, el layout no aplica
  if (currentPath && currentPath !== "/dashboard" && !currentPath.startsWith("/api/")) {
    const hasAccess = await validateMenuAccess(session.userId, currentPath);
    if (!hasAccess) {
      // Redirigir al dashboard si no tiene permisos
      redirect("/dashboard");
    }
  }

  // 3. Cargar configuración UI_CONFIG
  let config = uiConfigFallback as UIConfig;
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "UI_CONFIG" },
    });

    if (setting?.isActive && setting.value) {
      const dbValue = setting.value as any;
      // Simple merge: Priority to DB values
      config = {
        ...uiConfigFallback,
        ...dbValue,
        aside: { ...uiConfigFallback.aside, ...(dbValue.aside || {}) },
        isotipo: { ...uiConfigFallback.isotipo, ...(dbValue.isotipo || {}) },
        logo: { ...uiConfigFallback.logo, ...(dbValue.logo || {}) },
        logo_cliente: { ...uiConfigFallback.logo_cliente, ...(dbValue.logo_cliente || {}) },
      } as UIConfig;
    }
  } catch (error) {
    console.error("Error loading UI_LOGIN config:", error);
  }

  return (
    <DashboardShell user={session.user} config={config}>
      {children}
    </DashboardShell>
  );
}
