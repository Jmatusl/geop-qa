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
        const { code, name, description, isActive } = body;

        // TODO: Validar si cambia el code que no exista otro igual (omitiendo el mismo id)
        // Por simplicidad asumo que code no se edita o se valida en front, pero idealmente aquí también.

        const oldRole = await prisma.role.findUnique({ where: { id } });

        const updatedRole = await prisma.role.update({
            where: { id },
            data: {
                code,
                name,
                description,
                isActive
            }
        });

        // Registrar actualización
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "Roles",
            targetId: id,
            newData: { code, name, description, isActive },
            oldData: oldRole
        });

        return NextResponse.json({ success: true, role: updatedRole });

    } catch (error) {
        console.error("Error updating role:", error);
        return NextResponse.json(
            { error: "Error al actualizar rol" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Soft delete: cambiar isActive a false
        // Ojo, si el usuario quiere borrar borrar, sería delete.
        // Pero roles suelen tener dependencias. Mejor desactivar.

        const oldRole = await prisma.role.findUnique({ where: { id } });

        const updatedRole = await prisma.role.update({
            where: { id },
            data: { isActive: false }
        });

        // Registrar eliminación (lógica)
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "DELETE",
            module: "Roles",
            targetId: id,
            oldData: oldRole
        });

        return NextResponse.json({ success: true, role: updatedRole });

    } catch (error) {
        console.error("Error deleting role:", error);
        return NextResponse.json({ error: "Error al eliminar rol" }, { status: 500 });
    }
}
