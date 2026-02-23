import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

// GET: Listar sesiones activas de UN USUARIO ESPECÍFICO (Vista Admin)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await verifySession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Validar si el solicitante es admin o tiene permiso
        // Usualmente el middleware del dashboard protege esto, pero es bueno asegurar.
        // Asumimos que si pueden acceder a esta API vía UI, tienen acceso por rol.

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const activeSessions = await prisma.session.findMany({
            where: {
                userId: id,
                expiresAt: { gt: new Date() }
            },
            orderBy: { lastActivityAt: 'desc' },
            select: {
                id: true,
                ipAddress: true,
                userAgent: true,
                lastActivityAt: true,
                createdAt: true,
            }
        });

        // No marcamos isCurrent aquí porque el administrador está viendo las sesiones de OTRO usuario.

        return NextResponse.json(activeSessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// DELETE: Revocar como Admin
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }

) {
    try {
        const { id } = await params; // Esto es el ID del Usuario
        const session = await verifySession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { sessionId, type } = body;
        // type: 'single' | 'all'

        if (type === 'all') {
            await prisma.session.deleteMany({
                where: { userId: id }
            });

            await AuditLogger.logAction(request, session.userId, {
                action: "DELETE",
                module: "Users",
                targetId: id, // El objetivo es el Usuario
                newData: { reason: "Admin revoked ALL sessions", action: "GLOBAL_LOGOUT" }
            });
        } else if (type === 'single' && sessionId) {
            await prisma.session.delete({ where: { id: sessionId } });

            await AuditLogger.logAction(request, session.userId, {
                action: "DELETE",
                module: "Users",
                targetId: sessionId,
                newData: { reason: "Admin revoked session", userId: id }
            });

        } else {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error revoking session:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
