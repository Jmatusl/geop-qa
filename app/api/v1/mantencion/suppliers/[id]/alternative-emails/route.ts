import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface ActivityEmail {
  email: string;
  enabled: boolean;
}

/**
 * GET: Obtener todos los correos alternativos del proveedor
 * POST: Agregar un nuevo correo alternativo al proveedor
 * PUT: Actualizar la lista completa de correos alternativos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supplier = await prisma.mntSupplier.findUnique({
      where: { id },
      select: { activityEmails: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const emails = Array.isArray(supplier.activityEmails)
      ? supplier.activityEmails
      : [];

    return NextResponse.json({ emails });
  } catch (error) {
    console.error("Error al obtener correos alternativos:", error);
    return NextResponse.json(
      { error: "Error al obtener correos alternativos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Correo electrónico inválido" },
        { status: 400 }
      );
    }

    const supplier = await prisma.mntSupplier.findUnique({
      where: { id },
      select: { activityEmails: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const currentEmails = Array.isArray(supplier.activityEmails)
      ? supplier.activityEmails
      : [];

    if (
      currentEmails.some(
        (e: any) => e.email?.toLowerCase() === email.toLowerCase()
      )
    ) {
      return NextResponse.json(
        { error: "El correo ya existe" },
        { status: 400 }
      );
    }

    const updatedEmails = [...currentEmails, { email, enabled: true }];

    const updated = await prisma.mntSupplier.update({
      where: { id },
      data: { activityEmails: updatedEmails },
      select: { activityEmails: true },
    });

    return NextResponse.json({ success: true, emails: updated.activityEmails });
  } catch (error) {
    console.error("Error al agregar correo:", error);
    return NextResponse.json(
      { error: "Error al agregar correo" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { emails } = body;

    if (!Array.isArray(emails)) {
      return NextResponse.json(
        { error: "Emails debe ser un array" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(
      (e: any) =>
        !e.email ||
        typeof e.email !== "string" ||
        typeof e.enabled !== "boolean" ||
        !emailRegex.test(e.email)
    );

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: "Algunos correos son inválidos" },
        { status: 400 }
      );
    }

    const supplier = await prisma.mntSupplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.mntSupplier.update({
      where: { id },
      data: { activityEmails: emails },
      select: { activityEmails: true },
    });

    return NextResponse.json({ success: true, emails: updated.activityEmails });
  } catch (error) {
    console.error("Error al actualizar correos:", error);
    return NextResponse.json(
      { error: "Error al actualizar correos" },
      { status: 500 }
    );
  }
}
