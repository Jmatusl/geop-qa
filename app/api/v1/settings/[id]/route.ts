import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const setting = await prisma.appSetting.findUnique({ where: { id } });

        if (!setting) return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });

        return NextResponse.json(setting);
    } catch {
        return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { value, description, isActive } = body;

        const oldSetting = await prisma.appSetting.findUnique({ where: { id } });

        const updatedSetting = await prisma.appSetting.update({
            where: { id },
            data: {
                value,
                description,
                isActive,
                version: { increment: 1 } // Incrementar versión automáticamente
            }
        });

        // Registrar actualización
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "Settings",
            targetId: id,
            newData: { value, description, isActive },
            oldData: oldSetting
        });

        return NextResponse.json({ success: true, setting: updatedSetting });

    } catch (error) {
        console.error("Error updating setting:", error);
        return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const oldSetting = await prisma.appSetting.findUnique({ where: { id } });

        await prisma.appSetting.delete({
            where: { id }
        });

        // Registrar eliminación
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "DELETE",
            module: "Settings",
            targetId: id,
            oldData: oldSetting
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting setting:", error);
        return NextResponse.json({ error: "Error al eliminar configuración" }, { status: 500 });
    }
}
