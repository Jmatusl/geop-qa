import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        rut: true,
        avatarUrl: true,
        person: {
          select: {
            id: true,
            rut: true,
            firstName: true,
            lastName: true,
            motherLastName: true,
            imagePath: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Generar URLs firmadas para imágenes si existen
    let signedAvatarUrl = user.avatarUrl;
    if (user.avatarUrl && !user.avatarUrl.startsWith("http")) {
      try {
        const { getSignedDownloadUrl } = await import("@/lib/storage/r2");
        signedAvatarUrl = await getSignedDownloadUrl(user.avatarUrl);
      } catch (e) {
        console.warn("Error signing avatarUrl:", e);
      }
    }

    let signedPersonImage = user.person?.imagePath;
    if (user.person?.imagePath && !user.person.imagePath.startsWith("http")) {
      try {
        const { getSignedDownloadUrl } = await import("@/lib/storage/r2");
        signedPersonImage = await getSignedDownloadUrl(user.person.imagePath);
      } catch (e) {
        console.warn("Error signing personImage:", e);
      }
    }

    return NextResponse.json({
      ...user,
      avatarUrl: signedAvatarUrl,
      person: user.person
        ? {
            ...user.person,
            imagePath: signedPersonImage,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const updateData: any = {};

    // Actualizar información básica
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    // Lógica de cambio de contraseña
    if (newPassword && newPassword.trim() !== "") {
      // Requerir contraseña actual por seguridad si se establece una nueva
      if (!currentPassword) {
        return NextResponse.json({ error: "Se requiere contraseña actual para cambiarla" }, { status: 400 });
      }

      // Importar bcrypt localmente
      const bcrypt = require("bcryptjs");
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash || "");

      if (!isValid) {
        return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: "No data changed" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    // Registro de auditoría
    await AuditLogger.logAction(request, session.userId, {
      action: "UPDATE",
      module: "Profile",
      targetId: session.userId,
      newData: { firstName, lastName, phone, passwordChanged: !!newPassword },
      oldData: { firstName: user.firstName, lastName: user.lastName, phone: user.phone },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
