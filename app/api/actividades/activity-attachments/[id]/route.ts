"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { deleteFile } from "@/lib/storage/r2";

/**
 * DELETE /api/actividades/activity-attachments/[id]
 * Elimina un adjunto de una actividad.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el adjunto existe
    const attachment = await prisma.actActivityAttachment.findUnique({
      where: { id },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            requirement: {
              select: {
                id: true,
                folio: true,
                folioPrefix: true,
                isApproved: true,
                createdById: true,
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
    }

    // Verificar permisos: solo el creador o usuarios con permiso de autorizar pueden eliminar
    const isCreator = attachment.activity.requirement.createdById === session.user.id;
    const { getMyActPermissions } = await import("@/app/actividades/configuracion/sistema/actions");
    const permissions = await getMyActPermissions();
    const hasPermission = permissions.autoriza || permissions.chequea;

    if (!isCreator && !hasPermission) {
      return NextResponse.json(
        { error: "No tiene permiso para eliminar este adjunto" },
        { status: 403 }
      );
    }

    // No permitir eliminación si el requerimiento está aprobado (solo usuarios autorizados)
    if (attachment.activity.requirement.isApproved && !permissions.autoriza) {
      return NextResponse.json(
        { error: "No se pueden eliminar adjuntos de un requerimiento aprobado" },
        { status: 403 }
      );
    }

    // Eliminar archivo de R2
    try {
      await deleteFile(attachment.storagePath);
    } catch (error) {
      console.error("[API] Error eliminando archivo de R2:", error);
      // Continuar con la eliminación de BD aunque falle R2
    }

    // Eliminar de la base de datos
    await prisma.actActivityAttachment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error eliminando adjunto de actividad:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
