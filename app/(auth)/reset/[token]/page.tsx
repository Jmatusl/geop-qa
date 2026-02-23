import { prisma } from "@/lib/prisma";
import { ResetView } from "@/components/auth/reset-view";
import { Metadata } from "next";
import { verifySession, destroySession } from "@/lib/auth/session";

import { verifyPasswordResetToken } from "@/lib/auth/tokens";

export const metadata: Metadata = {
  title: "Restablecer Contraseña | GEOP - Sotex",
  description: "Crea una nueva contraseña para tu cuenta en GEOP - Sotex.",
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  // Si hay sesión activa, cerrarla para evitar conflictos
  const session = await verifySession();
  if (session) {
    await destroySession(session.token);
  }

  // Validar token antes de renderizar
  const userId = await verifyPasswordResetToken(token);
  const isValidToken = !!userId;

  // Fetch configuración UI_CONFIG
  const setting = await prisma.appSetting.findUnique({
    where: { key: "UI_CONFIG" },
  });

  // Parsear JSON de forma segura
  let config = null;
  if (setting && setting.value) {
    config = setting.value as any;
  }

  return <ResetView token={token} config={config} isValidToken={isValidToken} />;
}
