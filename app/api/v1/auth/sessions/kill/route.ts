import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { verifySession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, sessionId, killAll } = body;

    let userId: string | null = null;

    // 1. Intentar obtener usuario por sesión activa primero (Dashboard)
    const session = await verifySession();

    if (session) {
      userId = session.user.id;
    } else if (email && password) {
      // 2. Si no hay sesión, verificar credenciales (Login)
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      const passwordMatch = await verifyPassword(password, user.passwordHash);
      if (!passwordMatch) {
        return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
      }

      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 3. Ejecutar acción de cierre
    if (killAll) {
      await prisma.session.deleteMany({
        where: { userId },
      });
    } else if (sessionId) {
      // Verificar que la sesión pertenezca al usuario
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId: userId,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Sesión(es) cerrada(s) con éxito" });
  } catch (error) {
    console.error("Error killing session:", error);
    return NextResponse.json({ error: "Error al cerrar la sesión" }, { status: 500 });
  }
}
