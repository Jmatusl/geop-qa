import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Extraer campos permitidos
        const { title, icon, path, enabled, order, parentId, roles, showIcon } = body;

        const oldMenu = await prisma.menuItem.findUnique({ where: { id } });

        // Actualizar
        const updatedMenu = await prisma.menuItem.update({
            where: { id },
            data: {
                title,
                icon,
                path,
                enabled,
                order,
                parentId,
                roles,
                showIcon
            }
        });

        // Registrar actualización
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "Menus",
            targetId: id,
            newData: { title, icon, path, enabled, order, roles },
            oldData: oldMenu
        });

        return NextResponse.json({ success: true, menu: updatedMenu });

    } catch (error) {
        console.error("Error updating menu:", error);
        return NextResponse.json({ error: "Error al actualizar menú" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const oldMenu = await prisma.menuItem.findUnique({ where: { id } });

        // Eliminar (Hard delete porque es estructura config).
        // Prisma tiene onDelete: Cascade en schema, así que borrará hijos automáticamente.
        await prisma.menuItem.delete({
            where: { id }
        });

        // Registrar eliminación
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "DELETE",
            module: "Menus",
            targetId: id,
            oldData: oldMenu
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting menu:", error);
        return NextResponse.json({ error: "Error al eliminar menú" }, { status: 500 });
    }
}
