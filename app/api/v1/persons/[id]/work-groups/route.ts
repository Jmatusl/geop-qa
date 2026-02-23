import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { assignWorkGroupSchema } from "@/lib/validations/person";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const validation = assignWorkGroupSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
        }

        const { workGroupId } = validation.data;

        const [person, group] = await Promise.all([
            prisma.person.findUnique({ where: { id } }),
            prisma.workGroup.findUnique({ where: { id: workGroupId } })
        ]);

        if (!person) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
        if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

        const result = await prisma.personWorkGroup.create({
            data: {
                personId: id,
                workGroupId,
                assignedBy: (await verifySession())?.userId
            }
        });

        const session = await verifySession();
        await AuditLogger.log({
            request,
            userId: session?.userId || null,
            eventType: "ASSIGN_WORK_GROUP",
            module: "Persons",
            metadata: {
                targetId: id,
                newData: { workGroupId }
            }
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("Error assigning work group:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
