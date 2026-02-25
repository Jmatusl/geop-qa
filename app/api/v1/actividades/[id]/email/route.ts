import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { ActivityRequirementPdf } from "@/lib/reports/modules/actividades/requirement-pdf";
import { sendEmail } from "@/lib/email/client";
import {
  generateRequerimientoEmailHTML,
  type RequerimientoActividadPdfData,
  type RequerimientoEmailConfig,
} from "@/lib/email/templates/activity-requirement";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { recipients, providerName } = await request.json();

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "Debe proporcionar al menos un destinatario" }, { status: 400 });
  }

  try {
    // 1. Obtener datos del requerimiento de actividad
    const requirement = await prisma.actRequirement.findUnique({
      where: { id },
      include: {
        activityType: true,
        priority: true,
        status: true,
        location: true,
        area: true,
        ship: true,
        applicant: {
          select: { id: true, firstName: true, lastName: true, email: true, rut: true },
        },
        responsible: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, rut: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        activities: {
          include: {
            supplier: true,
            status: true,
            activityType: true,
          },
        },
      },
    });

    if (!requirement) {
      return NextResponse.json({ error: "Requerimiento no encontrado" }, { status: 404 });
    }

    // 2. Buscar la firma predeterminada del usuario actual
    const userWithSignature = await prisma.user.findUnique({
      where: { id: session.userId },
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
    const defaultSignature = userWithSignature?.signatures[0];

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

    // 4. Obtener configuración de email (template)
    const emailSettings = await prisma.appSetting.findUnique({
      where: { key: "EMAIL_REQUERIMIENTO_ACTIVIDAD" },
    });
    const emailConfig: RequerimientoEmailConfig = (emailSettings?.value as any) || {
      greeting: "Estimado/a Proveedor",
      bodyIntro: "Se adjunta requerimiento de trabajo para su revisión y gestión.",
      bodyOutro: "Agradecemos su pronta respuesta y quedamos atentos a sus comentarios.",
      footerText: "Este es un correo automático, por favor no responder.",
      companyName: companyData.name,
      companyAddress: companyData.address,
      companyPhone: "+56 65 2123456",
      companyEmail: "contacto@riodulce.cl",
    };

    // 5. Generar PDF
    const report = new ActivityRequirementPdf();
    await report.generate({
      requirement,
      companyData,
      userSignature: defaultSignature?.data,
      userRut: requirement.createdBy.rut || undefined,
    });

    const buffer = report.getBuffer();

    // 6. Preparar datos para el template de correo
    const requerimientoData: RequerimientoActividadPdfData = {
      folio: `${requirement.folioPrefix}-${requirement.folio}`,
      folioPrefix: requirement.folioPrefix,
      folioNumber: String(requirement.folio),
      fechaTentativa: requirement.estimatedDate || new Date(),
      nombreActividad: requirement.activityType?.name || "Sin actividad",
      nombreSolicitante: `${requirement.applicant?.firstName || ""} ${requirement.applicant?.lastName || ""}`.trim(),
      estado: requirement.status?.name || "Desconocido",
      prioridad: requirement.priority?.name || "Normal",
      area: requirement.area?.name,
      ubicacion: requirement.location?.name,
      descripcion: requirement.description || "Sin descripción",
      actividades: requirement.activities.map((activity) => ({
        nombreActividad: activity.activityType?.name || activity.name || "Sin nombre",
        descripcion: activity.description || "Sin descripción",
        estado: activity.status?.name || "Pendiente",
        valorEstimado: activity.estimatedValue ? parseFloat(activity.estimatedValue.toString()) : 0,
      })),
    };

    // 7. Generar HTML del correo
    const html = generateRequerimientoEmailHTML(requerimientoData, emailConfig, providerName);

    // 8. Enviar Email a todos los destinatarios
    const emailPromises = recipients.map((email: string) =>
      sendEmail({
        to: email,
        subject: `Requerimiento de Actividad - ${requirement.folioPrefix}-${requirement.folio} - ${providerName}`,
        html,
        attachments: [
          {
            filename: `Requerimiento-${requirement.folioPrefix}-${requirement.folio}.pdf`,
            content: buffer,
          },
        ],
      }),
    );

    const results = await Promise.allSettled(emailPromises);
    
    // Verificar si todos los correos se enviaron correctamente
    const failedEmails = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success));
    
    // Guardar registro de correos enviados exitosamente
    const successfulEmails = recipients.filter((_, index) => {
      const result = results[index];
      return result.status === "fulfilled" && (result as PromiseFulfilledResult<any>).value.success;
    });

    if (successfulEmails.length > 0) {
      const folioDisplay = `${requirement.folioPrefix}-${String(requirement.folio).padStart(4, "0")}`;
      const emailRecords = successfulEmails.map((email) => ({
        requirementId: id,
        requirementFolio: folioDisplay,
        providerName: providerName || null,
        recipient: email,
        subject: `Requerimiento de Actividad - ${requirement.folioPrefix}-${requirement.folio} - ${providerName}`,
        sentById: session.userId,
      }));

      await prisma.actEmailSent.createMany({
        data: emailRecords,
      });
    }
    
    if (failedEmails.length > 0) {
      console.error("Algunos correos fallaron:", failedEmails);
      return NextResponse.json(
        {
          error: `Se enviaron ${recipients.length - failedEmails.length} de ${recipients.length} correos`,
          partial: true,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Correo enviado correctamente a ${recipients.length} destinatario(s)`,
    });
  } catch (error) {
    console.error("Error sending activity requirement email:", error);
    return NextResponse.json({ error: "Error interno al enviar correo" }, { status: 500 });
  }
}
