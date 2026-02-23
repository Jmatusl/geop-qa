import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.userId;

        // Obtener datos personales en paralelo
        const [mySessions, myActivity, failedAttempts] = await Promise.all([
            // Sus sesiones activas
            prisma.session.findMany({
                where: {
                    userId,
                    expiresAt: { gt: new Date() },
                },
                select: {
                    id: true,
                    ipAddress: true,
                    userAgent: true,
                    lastActivityAt: true,
                    createdAt: true,
                },
                orderBy: { lastActivityAt: 'desc' }
            }),
            // Su actividad reciente
            prisma.accessLog.findMany({
                where: { userId },
                take: 10,
                orderBy: { createdAt: "desc" },
            }),
            // Intentos fallidos recientes (para alertar al usuario)
            prisma.accessLog.findMany({
                where: {
                    eventType: { in: ["login_failed", "account_locked"] },
                    metadata: { path: ["email"], equals: session.user.email }
                },
                take: 5,
                orderBy: { createdAt: "desc" }
            })
        ]);

        return NextResponse.json({
            sessions: mySessions,
            activity: myActivity,
            securityAlerts: failedAttempts.filter(log => {
                // Solo alertar si son de las últimas 24 horas y no son del propio usuario (IP distinta)
                const isRecent = new Date(log.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
                return isRecent;
            })
        });
    } catch (error) {
        console.error("Personal Stats Error:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
