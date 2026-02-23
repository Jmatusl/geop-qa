import { prisma } from "@/lib/prisma";
import { LoginView } from "@/components/auth/login-view";
import { Metadata } from "next";
import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Iniciar Sesión | GEOP - Sotex",
  description: "Acceso al sistema GEOP - Sotex.",
};

export const dynamic = "force-dynamic"; // Asegurar que no cachee estáticamente si cambiamos la config

export default async function LoginPage() {
  // Verificar si ya hay sesión activa
  const session = await verifySession();
  if (session) {
    redirect("/dashboard");
  }

  // Fetch configuración UI_CONFIG
  const setting = await prisma.appSetting.findUnique({
    where: { key: "UI_CONFIG" },
  });

  // Parsear JSON de forma segura
  let config = null;
  if (setting && setting.value) {
    config = setting.value as any; // Cast a any o tipado específico
  }

  return <LoginView config={config} />;
}
