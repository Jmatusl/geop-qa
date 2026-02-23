import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

// GET: Listar sesiones activas del usuario actual
export async function GET(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const activeSessions = await prisma.session.findMany({
            where: {
                userId: session.userId,
                expiresAt: { gt: new Date() }
            },
            orderBy: { lastActivityAt: 'desc' },
            select: {
                id: true,
                ipAddress: true,
                userAgent: true,
                lastActivityAt: true,
                createdAt: true,
                token: true // Para verificar si coincide con la actual
            }
        });

        // Agregar flag 'isCurrent'.
        // Asumimos que podemos obtener el token actual de las cookies.

        const cookieStore = request.cookies;
        const currentToken = cookieStore.get("session_token")?.value;

        const safeSessions = activeSessions.map(s => ({
            id: s.id,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            lastActivityAt: s.lastActivityAt,
            createdAt: s.createdAt,
            isCurrent: s.token === currentToken
        }));

        return NextResponse.json(safeSessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
    }
}

// DELETE: Revocar una sesión específica o todas las demás
export async function DELETE(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { sessionId, type } = body;
        // type: 'single' | 'others' | 'all'

        if (type === 'others') {
            const cookieStore = request.cookies;
            const currentToken = cookieStore.get("session_token")?.value;

            if (!currentToken) return NextResponse.json({ error: "Current session not found" }, { status: 400 });

            await prisma.session.deleteMany({
                where: {
                    userId: session.userId,
                    token: { not: currentToken }
                }
            });

            await AuditLogger.logAction(request, session.userId, {
                action: "DELETE",
                module: "Profile",
                targetId: "ALL_OTHER_SESSIONS",
                newData: { reason: "User revoked other sessions" }
            });
        } else if (type === 'single' && sessionId) {
            const targetSession = await prisma.session.findFirst({
                where: { id: sessionId, userId: session.userId }
            });

            if (!targetSession) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }

            await prisma.session.delete({ where: { id: sessionId } });

            await AuditLogger.logAction(request, session.userId, {
                action: "DELETE",
                module: "Profile",
                targetId: sessionId,
                newData: { reason: "User revoked session" }
            });

        } else {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error revoking session:", error);
        return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
    }
}
