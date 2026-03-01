import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UIConfig } from "@/components/layout/sidebar-provider";

export default async function BodegaLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect("/login");

  let config = uiConfigFallback as UIConfig;
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: "UI_CONFIG" } });
    if (setting?.isActive && setting.value) {
      const dbValue = setting.value as Record<string, unknown>;
      const aside = (dbValue.aside as Record<string, unknown> | undefined) ?? {};
      const isotipo = (dbValue.isotipo as Record<string, unknown> | undefined) ?? {};
      const logo = (dbValue.logo as Record<string, unknown> | undefined) ?? {};
      const logoCliente = (dbValue.logo_cliente as Record<string, unknown> | undefined) ?? {};
      config = {
        ...uiConfigFallback,
        ...dbValue,
        aside: { ...uiConfigFallback.aside, ...aside },
        isotipo: { ...uiConfigFallback.isotipo, ...isotipo },
        logo: { ...uiConfigFallback.logo, ...logo },
        logo_cliente: { ...uiConfigFallback.logo_cliente, ...logoCliente },
      } as UIConfig;
    }
  } catch (error) {
    console.error("Error cargando UI_CONFIG para layout de Bodega:", error);
  }

  return (
    <DashboardShell user={session.user} config={config}>
      <div className="w-full">{children}</div>
    </DashboardShell>
  );
}
