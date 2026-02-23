import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { WorkRequirementPdf } from "@/lib/reports/modules/mantencion/work-requirement-pdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 1. Obtener datos del WR con relaciones necesarias
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

    // 3. Obtener configuración de empresa (Opcional, se puede expandir)
    // Usamos valores por defecto o de AppSetting si existen
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
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": isPreview ? `inline; filename="Solicitud-Trabajo-${wr.folio}.pdf"` : `attachment; filename="Solicitud-Trabajo-${wr.folio}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
