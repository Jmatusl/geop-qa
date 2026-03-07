import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { WorkRequirementPdf } from "@/lib/reports/modules/mantencion/work-requirement-pdf";
import { sendEmail } from "@/lib/email/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { email, message } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "El correo electrónico es requerido" }, { status: 400 });
  }

  try {
    // 1. Obtener datos del WR
    const wr = await prisma.mntWorkRequirement.findUnique({
      where: { id },
      include: {
        provider: true,
        status: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, rut: true },
        },
        requests: {
          include: {
            request: {
              include: {
                installation: true,
                equipment: {
                  select: { name: true, brand: true, model: true },
                },
              },
            },
          },
        },
      },
    });

    if (!wr) {
      return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });
    }

    // 2. Buscar la firma predeterminada del creador (vía relación de usuario)
    const creatorWithSignature = await prisma.user.findUnique({
      where: { id: wr.createdById },
      include: {
        signatures: {
          where: {
            isDefault: true,
            isActive: true,
          },
          take: 1,
        },
      },
    });
    const defaultSignature = creatorWithSignature?.signatures[0];

    // 3. Obtener configuración de empresa
    const companySettings = await prisma.appSetting.findUnique({
      where: { key: "COMPANY_INFO" },
    });
    const companyData = (companySettings?.value as any) || {
      name: "Rio Dulce SA",
      rut: "96.989.370-3",
      address: "Av. Diego Portales 2000, piso 5, Puerto Montt, Chile",
      businessLine: "Transporte Marítimo y Procesamiento de especies hidrobiológicas",
    };

    // 4. Generar PDF
    const report = new WorkRequirementPdf();
    await report.generate({
      wr,
      companyData,
      userSignature: defaultSignature?.data,
      userRut: wr.createdBy.rut || undefined,
    });

    const buffer = report.getBuffer();

    // 5. Enviar Email
    const { generateWrEmailHtml } = await import("@/lib/email/templates/mantenimiento/work-requirement");
    const html = generateWrEmailHtml({
      folio: wr.folio.toString(),
      createdAt: wr.createdAt,
      title: wr.title || "",
      providerName: wr.provider.legalName || wr.provider.fantasyName || "No registrado",
      installationName: wr.requests?.[0]?.request?.installation?.name || "Múltiple / No aplica",
      description: wr.description || "Sin descripción adicional",
      message: message,
      primaryColor: companyData?.primaryColor || "#283c7f",
    });

    const result = await sendEmail({
      to: email,
      subject: `Solicitud de Trabajo - Folio ${wr.folio} - ${wr.title}`,
      html,
      attachments: [
        {
          filename: `Solicitud-Trabajo-${wr.folio}.pdf`,
          content: buffer,
        },
      ],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Error al enviar correo" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("Error sending WR email:", error);
    return NextResponse.json({ error: "Error interno al enviar correo" }, { status: 500 });
  }
}
