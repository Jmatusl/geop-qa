import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";

const bulkAssignSchema = z.object({
  supervisorId: z.string().uuid("ID de supervisor inválido"),
  personIds: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un trabajador"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Validate permissions (ADMIN or SUPERVISOR role)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { userRoles: { include: { role: true } } },
    });

    const roles = user?.userRoles.map((ur) => ur.role.code) || [];
    const hasPermission = roles.includes("ADMIN") || roles.includes("SUPERVISOR");

    if (!user || !hasPermission) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await request.json();
    const validation = bulkAssignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
    }

    const { supervisorId, personIds } = validation.data;

    // Verify supervisor exists and is a person
    const supervisor = await prisma.person.findUnique({ where: { id: supervisorId } });
    if (!supervisor) {
      return NextResponse.json({ error: "Supervisor no encontrado" }, { status: 404 });
    }

    // Execute bulk update in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Deactivate current active supervisors for these persons
      await tx.personSupervisor.updateMany({
        where: {
          personId: { in: personIds },
          isActive: true,
        },
        data: { isActive: false },
      });

      // 2. Create new assignments
      const assignments = personIds.map((personId) => ({
        personId,
        supervisorId,
        isActive: true,
      }));

      await tx.personSupervisor.createMany({
        data: assignments,
      });

      // 3. Log the bulk action
      await AuditLogger.log({
        request,
        userId: session.userId,
        eventType: "BUL_ASSIGN_SUPERVISOR",
        module: "Persons",
        metadata: {
          supervisorId,
          count: personIds.length,
          personIds,
        },
      });
    });

    return NextResponse.json({ success: true, count: personIds.length });
  } catch (error) {
    console.error("Error in bulk supervisor assignment:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
