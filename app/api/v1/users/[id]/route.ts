import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    const body = await request.json();

    // Extraer datos permitidos para update
    const {
      firstName,
      lastName,
      email,
      rut,
      password,
      roleId,
      isActive,
      isGoogleSsoEnabled,
      isDeactivated,
      deactivationReasonId,
      deactivationComment,
      personId
    } = body;

    // Validar si existe el usuario
    const user = await prisma.user.findUnique({
      where: { id },
      include: { userIdentities: true } // Se requiere para validar identidades existentes
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Preparar objeto de actualización
    const updateData: any = {
      firstName,
      lastName,
      email,
      rut: (rut && rut.trim() !== "") ? rut : null,
      personId: (personId && personId.trim() !== "") ? personId : null
    };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (isDeactivated !== undefined) {
      updateData.isDeactivated = isDeactivated;
      if (isDeactivated) {
        updateData.deactivatedAt = new Date();
        updateData.deactivationReasonId = deactivationReasonId;
        updateData.deactivationComment = deactivationComment;
        // Futuro: registrar deactivatedById desde la sesión
      } else {
        updateData.deactivatedAt = null;
        updateData.deactivationReasonId = null;
        updateData.deactivationComment = null;
      }
    }

    // Si viene password, hashearlo
    if (password && password.trim() !== "") {
      updateData.passwordHash = await hashPassword(password);
    }

    // Transacción para actualizar usuario y rol si cambió
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos básicos
      const u = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          userRoles: {
            include: { role: true }
          }
        }
      });

      // 2. Actualizar rol si se envió roleId
      if (roleId) {
        // Verificar si ya tiene ese rol
        const currentRole = u.userRoles[0]?.roleId;

        if (currentRole !== roleId) {
          // Eliminar roles anteriores (asumiendo 1 rol por usuario por ahora)
          await tx.userRole.deleteMany({
            where: { userId: id }
          });

          // Asignar nuevo rol
          await tx.userRole.create({
            data: {
              userId: id,
              roleId: roleId
            }
          });
        }
      }

      // 3. Manejo de actualización de Google SSO
      if (isGoogleSsoEnabled !== undefined) {
        const existingIdentity = user.userIdentities.find(id => id.provider === 'google');

        if (isGoogleSsoEnabled) {
          if (existingIdentity) {
            if (!existingIdentity.isEnabled) {
              await tx.userIdentity.update({
                where: { id: existingIdentity.id },
                data: { isEnabled: true }
              });
            }
          } else {
            // Crear nueva identidad provisional si se habilita por primera vez
            // (o si nunca iniciaron sesión pero lo habilita un admin)
            await tx.userIdentity.create({
              data: {
                userId: id,
                provider: 'google',
                providerSubject: `PENDING_${id}`,
                providerEmail: email || user.email,
                isEnabled: true
              }
            });
          }
        } else {
          // Deshabilitar si existe
          if (existingIdentity && existingIdentity.isEnabled) {
            await tx.userIdentity.update({
              where: { id: existingIdentity.id },
              data: { isEnabled: false }
            });
          }
        }
      }

      return u;
    });

    // Detectar si el RUT cambió para registrarlo específicamente
    const rutChanged = rut !== undefined && rut !== user.rut;

    // Log the update
    // 1. Logear actualización general
    await AuditLogger.logAction(request, session?.userId || null, {
      action: "UPDATE",
      module: "Users",
      targetId: id,
      newData: body,
      oldData: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        rut: user.rut,
        isActive: user.isActive,
        isDeactivated: (user as any).isDeactivated
      }
    });

    // 2. Logear cambio de RUT de forma individual si aplica
    if (rutChanged && user.rut) {
      await AuditLogger.log({
        request,
        userId: session?.userId || null,
        eventType: "RUT_UPDATE",
        module: "Users",
        metadata: {
          targetId: id,
          oldRut: user.rut,
          newRut: rut,
          reason: "Manual admin override",
          updatedBy: session ? {
            id: session.userId,
            email: session.user.email,
            name: `${session.user.firstName} ${session.user.lastName}`
          } : "System/Unknown"
        }
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}
