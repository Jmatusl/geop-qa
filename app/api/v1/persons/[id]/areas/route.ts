import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { assignAreaSchema } from "@/lib/validations/person";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const validation = assignAreaSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
        }

        const { areaId } = validation.data;

        // Verify Person and Area
        const [person, area] = await Promise.all([
            prisma.person.findUnique({ where: { id } }),
            prisma.area.findUnique({ where: { id: areaId } })
        ]);

        if (!person) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
        if (!area) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

        // Create Assignment
        const result = await prisma.personArea.create({
            data: {
                personId: id,
                areaId,
                assignedBy: (await verifySession())?.userId
            }
        });

        // Log
        const session = await verifySession();
        await AuditLogger.log({
            request,
            userId: session?.userId || null,
            eventType: "ASSIGN_AREA",
            module: "Persons",
            metadata: {
                targetId: id,
                newData: { areaId }
            }
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("Error assigning area:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
