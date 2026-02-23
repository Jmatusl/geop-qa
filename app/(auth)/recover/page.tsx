import { prisma } from "@/lib/prisma";
import { RecoverView } from "@/components/auth/recover-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar Contraseña | GEOP - Sotex",
  description: "Recupera tu acceso al sistema GEOP - Sotex.",
};

export const dynamic = "force-dynamic";

export default async function RecoverPage() {
  // Fetch configuración UI_CONFIG
  const setting = await prisma.appSetting.findUnique({
    where: { key: "UI_CONFIG" },
  });

  // Parsear JSON de forma segura
  let config = null;
  if (setting && setting.value) {
    config = setting.value as any;
  }

  return <RecoverView config={config} />;
}
