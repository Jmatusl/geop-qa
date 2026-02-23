import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { uploadFile, deleteFile } from "@/lib/storage/r2";
import { AuditLogger } from "@/lib/audit/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
    }

    // Validaciones básicas
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo JPG, PNG, WEBP o GIF" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      // 2MB
      return NextResponse.json({ error: "El archivo no debe superar los 2MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop() || "jpg";
    const key = `avatars/${session.userId}-${timestamp}.${fileExt}`;

    // Obtener usuario actual para borrar avatar anterior si existe
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl && currentUser.avatarUrl.includes("avatars/")) {
      // Solo borramos si parece un path de R2 nuestro
      // (por si a futuro usamos URLs externas directamente)
      try {
        // Extraer key si es una URL completa, o usar el valor si guardamos solo la key/path
        // Asumimos que guardamos el path relativo o absoluto en R2
        // Si guardas la URL pública completa, habría que parsearla.
        // En este diseño simple, asumiremos que avatarUrl guarda la KEY o PATH relativo.
        // Si guardamos la URL pública, la lógica de borrado debe extraer la key.
        // Para simplificar: guardaremos el PATH relativo (key) en la DB.
        await deleteFile(currentUser.avatarUrl);
      } catch (e) {
        console.warn("Error borrando avatar anterior:", e);
      }
    }

    // Subir nuevo archivo
    await uploadFile(key, buffer, file.type);

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: key },
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "UPDATE_AVATAR",
      module: "Profile",
      targetId: session.userId,
      newData: { avatarUrl: key },
    });

    return NextResponse.json({ success: true, avatarUrl: key });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Error al subir el avatar" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl) {
      try {
        await deleteFile(currentUser.avatarUrl);
      } catch (e) {
        console.warn("Error borrando avatar de R2:", e);
      }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: null },
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "DELETE_AVATAR",
      module: "Profile",
      targetId: session.userId,
      newData: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json({ error: "Error al eliminar el avatar" }, { status: 500 });
  }
}
