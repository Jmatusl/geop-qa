import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { assignSupervisorSchema } from "@/lib/validations/person";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = assignSupervisorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
    }

    const { supervisorId } = validation.data;

    // Verify Person and Supervisor
    const [person, supervisor] = await Promise.all([prisma.person.findUnique({ where: { id } }), prisma.person.findUnique({ where: { id: supervisorId } })]);

    if (!person) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    if (!supervisor) return NextResponse.json({ error: "Supervisor no encontrado" }, { status: 404 });

    // Deactivate previous supervisor if exists (Optional business rule, usually workers have one active primary supervisor)
    await prisma.personSupervisor.updateMany({
      where: { personId: id, isActive: true },
      data: { isActive: false },
    });

    // Create Assignment
    const result = await prisma.personSupervisor.create({
      data: {
        personId: id,
        supervisorId,
        isActive: true,
      },
    });

    // Log
    const session = await verifySession();
    await AuditLogger.log({
      request,
      userId: session?.userId || null,
      eventType: "ASSIGN_SUPERVISOR",
      module: "Persons",
      metadata: {
        targetId: id,
        newData: { supervisorId },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error assigning supervisor:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
