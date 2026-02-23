import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await verifySession();

        // 1. Validar sesión y permisos de admin
        if (!session || !session.user.roles.includes('ADMIN')) {
            return NextResponse.json({ error: "No autorizado. Solo administradores pueden desbloquear cuentas." }, { status: 403 });
        }

        // 2. Verificar si el usuario existe
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                firstName: true,
                lastName: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // 3. Ejecutar desbloqueo
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        });

        // 4. Registrar en Auditoría
        await AuditLogger.logAction(request, session.userId, {
            action: "UPDATE",
            module: "Users",
            targetId: id,
            newData: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                actionReason: "Manual Unlock by Administrator"
            },
            oldData: {
                failedLoginAttempts: user.failedLoginAttempts,
                lockedUntil: user.lockedUntil
            }
        });

        await AuditLogger.log({
            request,
            userId: session.userId,
            eventType: "ACCOUNT_UNLOCKED",
            module: "Users",
            metadata: {
                targetId: id,
                targetEmail: user.email,
                previousFailedAttempts: user.failedLoginAttempts,
                unlockedAt: new Date(),
                unlockedBy: {
                    id: session.userId,
                    name: `${session.user.firstName} ${session.user.lastName}`
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `La cuenta de ${user.firstName} ${user.lastName} ha sido desbloqueada exitosamente.`
        });

    } catch (error) {
        console.error("Error unlocking user:", error);
        return NextResponse.json(
            { error: "Error al intentar desbloquear el usuario" },
            { status: 500 }
        );
    }
}
