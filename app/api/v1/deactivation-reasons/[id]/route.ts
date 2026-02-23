import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const reason = await prisma.userDeactivationReason.findUnique({
            where: { id }
        });

        if (!reason) {
            return NextResponse.json({ error: "Motivo no encontrado" }, { status: 404 });
        }

        return NextResponse.json(reason);
    } catch (error) {
        console.error("Error fetching deactivation reason:", error);
        return NextResponse.json({ error: "Error al obtener motivo" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { code, name, description, displayOrder, isActive } = body;

        // Validar si el código cambia y ya existe
        if (code) {
            const existing = await prisma.userDeactivationReason.findFirst({
                where: {
                    code,
                    id: { not: id }
                }
            });
            if (existing) {
                return NextResponse.json({ error: "El código ya está en uso por otro motivo" }, { status: 400 });
            }
        }

        const oldReason = await prisma.userDeactivationReason.findUnique({ where: { id } });

        const updatedReason = await prisma.userDeactivationReason.update({
            where: { id },
            data: {
                code,
                name,
                description,
                displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : undefined,
                isActive
            }
        });

        // Registrar actualización
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "DeactivationReasons",
            targetId: id,
            newData: { code, name, description, displayOrder, isActive },
            oldData: oldReason
        });

        return NextResponse.json({ success: true, data: updatedReason });

    } catch (error) {
        console.error("Error updating deactivation reason:", error);
        return NextResponse.json({ error: "Error al actualizar motivo" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verificar si está en uso por usuarios
        const usersInUse = await prisma.user.count({
            where: { deactivationReasonId: id }
        });

        if (usersInUse > 0) {
            return NextResponse.json({
                error: "No se puede eliminar el motivo porque está siendo utilizado por usuarios."
            }, { status: 400 });
        }

        const oldReason = await prisma.userDeactivationReason.findUnique({ where: { id } });

        await prisma.userDeactivationReason.delete({
            where: { id }
        });

        // Registrar eliminación
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "DELETE",
            module: "DeactivationReasons",
            targetId: id,
            oldData: oldReason
        });

        return NextResponse.json({ success: true, message: "Motivo eliminado correctamente" });

    } catch (error) {
        console.error("Error deleting deactivation reason:", error);
        return NextResponse.json({ error: "Error al eliminar motivo" }, { status: 500 });
    }
}
