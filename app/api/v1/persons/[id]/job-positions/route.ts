import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { assignJobPositionSchema } from "@/lib/validations/person";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const validation = assignJobPositionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
        }

        const { jobPositionId, startDate, endDate } = validation.data;

        // Verify Person
        const person = await prisma.person.findUnique({ where: { id } });
        if (!person) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

        // Verify JobPosition
        const jobPosition = await prisma.jobPosition.findUnique({ where: { id: jobPositionId } });
        if (!jobPosition) return NextResponse.json({ error: "Cargo no encontrado" }, { status: 404 });

        // Create Assignment
        const result = await prisma.personJobPosition.create({
            data: {
                personId: id,
                jobPositionId,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                isActive: true
            }
        });

        // Log
        const session = await verifySession();
        await AuditLogger.log({
            request,
            userId: session?.userId || null,
            eventType: "ASSIGN_JOB_POSITION",
            module: "Persons",
            metadata: {
                targetId: id,
                newData: { jobPositionId, startDate, endDate }
            }
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("Error assigning job position:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
