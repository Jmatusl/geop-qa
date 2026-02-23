import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { uploadFile, deleteFile } from "@/lib/storage/r2";
import { AuditLogger } from "@/lib/audit/logger";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetUserId } = await params;

    // Verificar permisos (solo admins o roles con permiso de editar usuarios)
    // Por ahora asumimos que si puede llegar aquí es admin, pero idealmente verificar roles.
    // TODO: Implementar verificación de roles granular si es necesario.

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo excede 2MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop() || "jpg";
    const key = `avatars/${targetUserId}-${timestamp}.${fileExt}`;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { avatarUrl: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.avatarUrl && targetUser.avatarUrl.includes("avatars/")) {
      try {
        await deleteFile(targetUser.avatarUrl);
      } catch (e) {
        console.warn("Error borrando avatar anterior:", e);
      }
    }

    await uploadFile(key, buffer, file.type);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { avatarUrl: key },
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "UPDATE_USER_AVATAR",
      module: "Users",
      targetId: targetUserId,
      newData: { avatarUrl: key },
    });

    return NextResponse.json({ success: true, avatarUrl: key });
  } catch (error) {
    console.error("Error uploading user avatar:", error);
    return NextResponse.json({ error: "Error al subir avatar de usuario" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetUserId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { avatarUrl: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.avatarUrl) {
      try {
        await deleteFile(targetUser.avatarUrl);
      } catch (e) {
        console.warn("Error borrando avatar R2:", e);
      }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { avatarUrl: null },
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "DELETE_USER_AVATAR",
      module: "Users",
      targetId: targetUserId,
      newData: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user avatar:", error);
    return NextResponse.json({ error: "Error al eliminar avatar" }, { status: 500 });
  }
}
