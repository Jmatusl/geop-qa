import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { ActivityRequirementPdf } from "@/lib/reports/modules/actividades/requirement-pdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 1. Obtener datos del requerimiento con relaciones necesarias
    const requirement = await prisma.actRequirement.findUnique({
      where: { id },
      include: {
        activityType: { select: { id: true, name: true } },
        priority: { select: { id: true, name: true, colorHex: true } },
        status: { select: { id: true, name: true, code: true, colorHex: true } },
        location: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        ship: { select: { id: true, name: true } },
        applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
        responsible: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, rut: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        activities: {
          include: {
            activityType: { select: { name: true } },
            responsible: { select: { firstName: true, lastName: true } },
            supplier: { select: { id: true, fantasyName: true, legalName: true, rut: true } },
            status: { select: { name: true, code: true, colorHex: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!requirement) {
      return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });
    }

    // 2. Buscar la firma predeterminada del creador
    const creatorWithSignature = await prisma.user.findUnique({
      where: { id: requirement.createdById },
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
    const report = new ActivityRequirementPdf();
    await report.generate({
      requirement,
      companyData,
      userSignature: defaultSignature?.data,
      userRut: requirement.createdBy.rut || undefined,
    });

    const buffer = report.getBuffer();
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";
    const folio = `${requirement.folioPrefix}-${String(requirement.folio).padStart(4, "0")}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": isPreview 
          ? `inline; filename="Requerimiento-${folio}.pdf"` 
          : `attachment; filename="Requerimiento-${folio}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
