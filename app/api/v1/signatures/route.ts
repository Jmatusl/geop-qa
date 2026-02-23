import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";

const signatureSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  data: z.string().min(10, "La firma está vacía"),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  userId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const signatures = await prisma.signature.findMany({
      where: {
        OR: [{ name: { contains: search, mode: "insensitive" } }],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(signatures);
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return NextResponse.json({ error: "Error al obtener firmas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = signatureSchema.parse(body);

    // Validar tamaño aproximado del base64 (50KB limite)
    if (validated.data.length > 102400) {
      return NextResponse.json({ error: "La firma es demasiado pesada (máx 50KB original)" }, { status: 400 });
    }

    // Logic for "Unico Default" per user
    if (validated.isDefault && validated.userId) {
      await prisma.signature.updateMany({
        where: { userId: validated.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const signature = await prisma.signature.create({
      data: validated,
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "CREATE",
      module: "Signatures",
      targetId: signature.id,
      newData: validated,
    });

    return NextResponse.json(signature, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating signature:", error);
    return NextResponse.json({ error: "Error al crear firma" }, { status: 500 });
  }
}
