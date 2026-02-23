import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { verifySession, destroySession } from "@/lib/auth/session";
import { ActivateView } from "@/components/auth/activate-view";

export const metadata: Metadata = {
    title: "Activar Cuenta | Sistema de Certificaciones",
    description: "Configura tu contraseña para activar tu cuenta.",
};

export const dynamic = 'force-dynamic';

export default async function ActivateAccountPage({ params }: { params: Promise<{ token: string }> }) {
    const resolvedParams = await params;
    const token = resolvedParams.token;

    // Si hay sesión activa, cerrarla para evitar conflictos
    const session = await verifySession();
    if (session) {
        await destroySession(session.token);
    }

    // Fetch configuración UI_CONFIG
    const setting = await prisma.appSetting.findUnique({
        where: { key: "UI_CONFIG" }
    });

    // Parsear JSON de forma segura
    let config = null;
    if (setting && setting.value) {
        config = setting.value as any;
    }

    return <ActivateView token={token} config={config} />;
}
