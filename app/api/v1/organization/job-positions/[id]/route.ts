import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { jobPositionSchema } from "@/lib/validations/organization";
import { Prisma } from "@prisma/client";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const item = await prisma.jobPosition.findUnique({ where: { id } });

        if (!item) {
            return NextResponse.json({ error: "Cargo no encontrado" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("Error fetching job position:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const validation = jobPositionSchema.partial().safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
        }

        // Si se actualiza el código, verificar unicidad
        if (validation.data.code) {
            const existing = await prisma.jobPosition.findFirst({
                where: {
                    code: validation.data.code,
                    id: { not: id }
                }
            });
            if (existing) {
                return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
            }
        }

        const currentItem = await prisma.jobPosition.findUnique({ where: { id } });
        if (!currentItem) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        const updated = await prisma.jobPosition.update({
            where: { id },
            data: validation.data
        });

        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "JobPositions",
            targetId: id,
            newData: validation.data,
            oldData: currentItem
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating job position:", error);
        return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const currentItem = await prisma.jobPosition.findUnique({ where: { id } });
        if (!currentItem) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        await prisma.jobPosition.delete({ where: { id } });

        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "DELETE",
            module: "JobPositions",
            targetId: id,
            oldData: currentItem
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        // Manejar error de llave foránea (P2003)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({
                error: "No se puede eliminar porque está en uso por trabajadores activos."
            }, { status: 400 });
        }

        console.error("Error deleting job position:", error);
        return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
    }
}
