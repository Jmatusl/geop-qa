import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    avatarUrl: string | null;
    avatarFile: string | null;
    person?: {
      imagePath: string | null;
    };
  };
}

/**
 * Crear una nueva sesión para un usuario
 */
export async function createSession(userId: string, ipAddress: string | null, userAgent: string | null): Promise<SessionData> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8); // 8 horas por defecto

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      roles: session.user.userRoles.map((ur) => ur.role.code),
      avatarUrl: session.user.avatarUrl,
      avatarFile: session.user.avatarFile,
    },
  };
}

/**
 * Verificar y obtener sesión desde la solicitud
 */
export async function verifySession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  // Verify session and fetch user with person
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          person: {
            select: {
              imagePath: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  // Actualizar última actividad
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date() },
  });

  // Firmar URLs de avatares
  let signedAvatarUrl = session.user.avatarUrl;
  let signedPersonImage = session.user.person?.imagePath;

  try {
    const { getSignedDownloadUrl } = await import("@/lib/storage/r2");

    if (signedAvatarUrl && !signedAvatarUrl.startsWith("http")) {
      signedAvatarUrl = await getSignedDownloadUrl(signedAvatarUrl);
    }

    if (signedPersonImage && !signedPersonImage.startsWith("http")) {
      signedPersonImage = await getSignedDownloadUrl(signedPersonImage);
    }
  } catch (e) {
    console.warn("Error signing session avatars:", e);
  }

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      roles: session.user.userRoles.map((ur) => ur.role.code),
      avatarUrl: signedAvatarUrl,
      avatarFile: session.user.avatarFile,
      person: session.user.person
        ? {
            imagePath: signedPersonImage || null,
          }
        : undefined,
    },
  };
}

/**
 * Destruir una sesión
 */
export async function destroySession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {
    // Ignorar si no existe
  });
}

/**
 * Establecer cookie de sesión
 */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });
}

/**
 * Eliminar cookie de sesión
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete("session_token");
}
