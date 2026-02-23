import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { areaSchema } from "@/lib/validations/organization";
import { Prisma } from "@prisma/client";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const item = await prisma.area.findUnique({ where: { id } });

        if (!item) {
            return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("Error fetching area:", error);
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

        const validation = areaSchema.partial().safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
        }

        if (validation.data.code) {
            const existing = await prisma.area.findFirst({
                where: {
                    code: validation.data.code,
                    id: { not: id }
                }
            });
            if (existing) {
                return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
            }
        }

        const currentItem = await prisma.area.findUnique({ where: { id } });
        if (!currentItem) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        const updated = await prisma.area.update({
            where: { id },
            data: validation.data
        });

        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "Areas",
            targetId: id,
            newData: validation.data,
            oldData: currentItem
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating area:", error);
        return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const currentItem = await prisma.area.findUnique({ where: { id } });
        if (!currentItem) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        await prisma.area.delete({ where: { id } });

        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "DELETE",
            module: "Areas",
            targetId: id,
            oldData: currentItem
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({
                error: "No se puede eliminar porque está en uso por trabajadores activos."
            }, { status: 400 });
        }

        console.error("Error deleting area:", error);
        return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
    }
}
