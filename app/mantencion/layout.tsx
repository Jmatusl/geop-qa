import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { validateMenuAccess } from "@/lib/auth/access";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UIConfig } from "@/components/layout/sidebar-provider";

export default async function MantencionLayout({ children }: { children: React.ReactNode }) {
  // 1. Verify session remotely
  const session = await verifySession();

  if (!session) {
    redirect("/login");
  }

  // 2. Load UI_CONFIG
  let config = uiConfigFallback as UIConfig;
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "UI_CONFIG" },
    });

    if (setting?.isActive && setting.value) {
      const dbValue = setting.value as any;
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
    console.error("Error loading UI_CONFIG for Mantencion layout:", error);
  }

  // 3. Render DashboardShell directly
  return (
    <DashboardShell user={session.user} config={config}>
      <div className="w-full">{children}</div>
    </DashboardShell>
  );
}
