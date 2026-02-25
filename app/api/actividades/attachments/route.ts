"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const createAttachmentSchema = z.object({
  requirementId: z.string().uuid(),
  storagePath: z.string(),
  publicUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

/**
 * POST /api/actividades/attachments
 * Guarda un adjunto de requerimiento en la base de datos.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createAttachmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error },
        { status: 400 }
      );
    }

    const { requirementId, storagePath, publicUrl, fileName, fileSize, mimeType } = parsed.data;

    // Verificar que el requerimiento existe
    const requirement = await prisma.actRequirement.findUnique({
      where: { id: requirementId },
      select: {
        id: true,
        isApproved: true,
        createdById: true,
      },
    });

    if (!requirement) {
      return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });
    }

    // Verificar permisos: solo el creador o usuarios con permisos pueden agregar adjuntos
    const isCreator = requirement.createdById === session.user.id;
    const { getMyActPermissions } = await import("@/app/actividades/configuracion/sistema/actions");
    const permissions = await getMyActPermissions();
    const hasPermission = permissions.autoriza || permissions.chequea;

    if (!isCreator && !hasPermission) {
      return NextResponse.json(
        { error: "No tiene permiso para agregar adjuntos a este requerimiento" },
        { status: 403 }
      );
    }

    // No permitir agregar adjuntos si el requerimiento está aprobado (solo usuarios autorizados)
    if (requirement.isApproved && !permissions.autoriza) {
      return NextResponse.json(
        { error: "No se pueden agregar adjuntos a un requerimiento aprobado" },
        { status: 403 }
      );
    }

    // Crear el adjunto en la base de datos
    const attachment = await prisma.actAttachment.create({
      data: {
        requirementId,
        storagePath,
        publicUrl,
        fileName,
        fileSize,
        mimeType,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ success: true, attachment });
  } catch (error) {
    console.error("[API] Error guardando adjunto de requerimiento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
