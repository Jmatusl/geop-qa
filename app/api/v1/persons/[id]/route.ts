import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { personSchema } from "@/lib/validations/person";
import { deleteFile } from "@/lib/storage/r2";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        workGroups: {
          include: { workGroup: true },
          orderBy: { assignedAt: "desc" },
        },
        areas: {
          include: { area: true },
          orderBy: { assignedAt: "desc" },
        },
        jobPositions: {
          include: { jobPosition: true },
          orderBy: { startDate: "desc" },
        },
        supervisors: {
          include: { supervisor: true },
          orderBy: { assignedAt: "desc" },
        },
        user: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });

    if (!person) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error("Error fetching person:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = personSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
    }

    if (validation.data.rut) {
      const existing = await prisma.person.findFirst({
        where: {
          rut: validation.data.rut,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "El RUT ya existe" }, { status: 400 });
      }
    }

    const currentItem = await prisma.person.findUnique({ where: { id } });
    if (!currentItem) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const updateData: any = { ...validation.data };
    if (validation.data.birthDate) {
      updateData.birthDate = new Date(validation.data.birthDate);
    }

    const updated = await prisma.person.update({
      where: { id },
      data: updateData,
    });

    // Auto-cleanup: If image changed and there was an old one, delete it from R2
    let actionDetails = "UPDATE";

    if (updateData.imagePath && currentItem.imagePath && updateData.imagePath !== currentItem.imagePath) {
      try {
        // Determine action type for audit
        actionDetails = "UPDATE_IMAGE";

        // Extract key from old URL. Assumes URL ends with /key
        // e.g. https://.../persons/rut_timestamp.jpg
        const oldUrl = currentItem.imagePath;
        const oldKey = oldUrl.split("/").pop(); // simpler approach if structure is reliable

        // Better approach: if we know the structure is ".../persons/..."
        // or just rely on the stored public URL structure.
        // Assuming R2 R3 Key is what we need.
        // If publicUrl is "domain.com/persons/key.jpg", key is "persons/key.jpg"
        // But previously we stored key as "persons/filename".
        // So if public URL is "domain.com/persons/filename", we need "persons/filename".

        // Let's try to find "persons/" in the URL.
        if (oldKey) {
          // Reconstruct key if needed or use logic.
          // Our keys are "persons/filename".
          // The URL might be ".../persons/filename".
          // So taking everything after the last slash gives "filename".
          // We need "persons/filename".
          const match = oldUrl.match(/(persons\/[^/]+)$/);
          if (match && match[1]) {
            await deleteFile(match[1]);
          } else {
            // Fallback: try to just delete the "persons/" + filename
            await deleteFile(`persons/${oldKey}`);
          }
        }
      } catch (cleanupError) {
        console.error("Failed to cleanup old image:", cleanupError);
        // Non-blocking error
      }
    }

    const session = await verifySession();
    await AuditLogger.logAction(request, session?.userId || null, {
      action: actionDetails as any, // Cast to any to allow custom actions if AuditEventType allows string
      module: "Persons",
      targetId: id,
      newData: validation.data,
      oldData: currentItem,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating person:", error);
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const currentItem = await prisma.person.findUnique({ where: { id } });
    if (!currentItem) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Soft delete? Schema has isActive. User request implies management is critical.
    // Let's soft delete by default or hard delete if no critical data constraint?
    // Usually Persons are rarely deleted, just deactivated.
    // But CRUD implies delete. I'll allow delete and catch constraints.

    await prisma.person.delete({ where: { id } });

    const session = await verifySession();
    await AuditLogger.logAction(request, session?.userId || null, {
      action: "DELETE",
      module: "Persons",
      targetId: id,
      oldData: currentItem,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // FK constraint
    console.error("Error deleting person:", error);
    return NextResponse.json({ error: "No se puede eliminar, tiene registros asociados." }, { status: 400 });
  }
}
