import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const roleId = searchParams.get("roleId");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { rut: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleId && roleId !== "all") {
      where.userRoles = {
        some: {
          roleId: roleId,
        },
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,

        orderBy: (function () {
          const sortBy = searchParams.get("sortBy");
          const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

          switch (sortBy) {
            case "rut":
              return { rut: sortOrder };
            case "fullName":
              return { firstName: sortOrder };
            case "email":
              return { email: sortOrder };
            case "isActive":
              return { isActive: sortOrder };
            default:
              return { createdAt: "desc" };
          }
        })(),
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          userIdentities: true, // Incluir identidades para verificar estado SSO
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rut: true,
            },
          },
        },
      }),
    ]);

    // Mapear respuesta para aplanar roles y quitar passwordHash
    // Mapear respuesta para aplanar roles y quitar passwordHash
    const { getSignedDownloadUrl } = await import("@/lib/storage/r2");

    const safeUsers = await Promise.all(
      users.map(async (user) => {
        const { passwordHash, ...rest } = user;
        // Obtener el rol principal
        const primaryRoleRelation = user.userRoles[0];
        const primaryRoleName = primaryRoleRelation?.role?.name || "Sin Rol";
        const primaryRoleId = primaryRoleRelation?.roleId || "";

        // Verificar si Google SSO está habilitado (identidad existe y está activa)
        const googleIdentity = user.userIdentities.find((id) => id.provider === "google");
        const isGoogleSsoEnabled = googleIdentity ? googleIdentity.isEnabled : false;

        // Firmar avatar si existe
        let signedAvatarUrl = user.avatarUrl;
        if (user.avatarUrl && !user.avatarUrl.startsWith("http")) {
          try {
            signedAvatarUrl = await getSignedDownloadUrl(user.avatarUrl);
          } catch (e) {
            /* ignore */
          }
        }

        return {
          ...rest,
          avatarUrl: signedAvatarUrl, // Sobrescribimos con la URL firmada
          role: {
            name: primaryRoleName,
            id: primaryRoleId, // Importante para precargar el select
          },
          isGoogleSsoEnabled,
        };
      }),
    );

    return NextResponse.json({
      data: safeUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Extraer nuevos campos
    const { firstName, lastName, email, rut, password, roleId, passwordMode, isGoogleSsoEnabled } = body;

    // Validar emails duplicados
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    // Validar RUT duplicado (solo si viene)
    if (rut) {
      const existingRut = await prisma.user.findUnique({ where: { rut } });
      if (existingRut) {
        return NextResponse.json({ error: "El RUT ya está registrado" }, { status: 400 });
      }
    }

    // Lógica de Contraseña
    let passwordHash: string;
    let mustChangePassword = false;

    if (passwordMode === "MANUAL") {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: "Contraseña requerida en modo manual" }, { status: 400 });
      }
      passwordHash = await hashPassword(password);
      mustChangePassword = true; // Forzar cambio si es manual por seguridad
    } else {
      // Modo AUTO: Generar hash aleatorio imposible de adivinar
      // Esto previene el login hasta la activación
      passwordHash = await hashPassword(crypto.randomUUID());
    }

    // Transacción para crear usuario, rol, identidad y tokens
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          rut: rut && rut.trim() !== "" ? rut : null,
          passwordHash,
          mustChangePassword,
          isActive: true,
          personId: body.personId && body.personId.trim() !== "" ? body.personId : undefined,
        },
      });

      // Asignar Rol
      if (roleId) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: roleId,
          },
        });
      }

      // Handle Google SSO
      if (isGoogleSsoEnabled) {
        // Manejo de Google SSO: Crear identidad provisional con sujeto PENDING.
        // El flujo de login real actualizará esto al validar el email.

        await tx.userIdentity.create({
          data: {
            userId: user.id,
            provider: "google",
            providerSubject: `PENDING_${user.id}`, // Marcador de posición
            providerEmail: email,
            isEnabled: true,
          },
        });
      }

      return user;
    });

    // Acciones post-creación (fuera de la transacción)
    if (passwordMode === "AUTO") {
      // Generar token y enviar correo
      // Importación dinámica necesaria
      const { generateActivationToken } = await import("@/lib/auth/tokens");
      const { sendActivationEmail } = await import("@/lib/email/client");

      const token = await generateActivationToken(result.id);
      await sendActivationEmail(email, token, firstName);
    }

    const { passwordHash: _, ...userWithoutPassword } = result;

    // Registrar evento de creación
    const session = await verifySession();
    await AuditLogger.logAction(request, session?.userId || null, {
      action: "CREATE",
      module: "Users",
      targetId: result.id,
      newData: {
        firstName,
        lastName,
        email,
        rut,
        roleId,
        isActive: true,
        isGoogleSsoEnabled,
      },
    });

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error al crear usuario", details: error.message }, { status: 500 });
  }
}
