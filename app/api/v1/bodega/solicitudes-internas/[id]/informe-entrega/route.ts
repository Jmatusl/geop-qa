/**
 * API: Informe PDF de Entrega — Solicitud Interna de Bodega
 * GET /api/v1/bodega/solicitudes-internas/[id]/informe-entrega
 *
 * Genera y retorna en caliente el PDF de comprobante de entrega.
 * La solicitud debe estar en estado ENTREGADA.
 * Incluye firma del bodeguero (del mantenedor /mantenedores/firmas) si existe.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateInformeEntrega } from "@/lib/reports/modules/bodega/informe-entrega";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Obtener la solicitud con todas las relaciones necesarias para el PDF
    const request_ = await prisma.bodegaTransaction.findUnique({
      where: { id },
      include: {
        warehouse: true,
        requester: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            article: { select: { name: true, code: true, unit: true } },
          },
          orderBy: { displayOrder: "asc" },
        },
        logs: {
          include: {
            creator: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!request_) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (request_.status !== "COMPLETADA") {
      return NextResponse.json({ error: `El informe solo está disponible para solicitudes completadas (estado actual: ${request_.status})` }, { status: 422 });
    }

    // ── Lectura de metadatos con compatibilidad entre formato plano (nuevo) y anidado (legado)
    const rawMeta = (request_.metadata as any) || {};
    // Formato plano: { receptorNombre, firmaReceptor, ... }
    // Formato legado: { entrega: { receptorNombre, firmaReceptor, ... } }
    const meta = rawMeta.entrega
      ? {
          receptorNombre: rawMeta.receptorNombre ?? rawMeta.entrega.receptorNombre,
          receptorRut: rawMeta.receptorRut ?? rawMeta.entrega.receptorRut,
          firmaReceptor: rawMeta.firmaReceptor ?? rawMeta.entrega.firmaReceptor,
          fotoEvidencia: rawMeta.fotoEvidencia ?? rawMeta.entrega.fotoEvidencia,
          observaciones: rawMeta.observaciones ?? null,
          confirmedAt: rawMeta.confirmedAt ?? rawMeta.entrega.fechaEntrega,
          deliveredByUserId: rawMeta.deliveredByUserId ?? rawMeta.entrega.entregadoPor,
          deliveredByName: rawMeta.deliveredByName ?? null,
        }
      : rawMeta;

    // Resolver nombre del bodeguero: primero del meta, luego consulta a la BD
    let bodegueroName: string = meta.deliveredByName || "";
    if (!bodegueroName && meta.deliveredByUserId) {
      try {
        const usuario = await prisma.user.findUnique({
          where: { id: meta.deliveredByUserId },
          select: { firstName: true, lastName: true },
        });
        if (usuario) bodegueroName = `${usuario.firstName} ${usuario.lastName}`;
      } catch {
        /* ignorar */
      }
    }
    // Fallback al nombre del creador del log ENTREGADA si aún no se resuelve
    if (!bodegueroName) {
      const logEntrega = request_.logs.find((l) => l.action === "COMPLETE" || l.action === "ENTREGADA");
      if (logEntrega?.creator) {
        bodegueroName = `${logEntrega.creator.firstName} ${logEntrega.creator.lastName}`;
      }
    }
    if (!bodegueroName) bodegueroName = "Bodeguero";

    // Buscar la firma del bodeguero (del mantenedor /mantenedores/firmas)
    let firmaBodegueroBase64: string | null = null;
    try {
      const deliveredByUserId = meta.deliveredByUserId || session.userId;
      const firma = await prisma.signature.findFirst({
        where: {
          OR: [
            { userId: deliveredByUserId, isActive: true },
            { isDefault: true, isActive: true },
          ],
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
      if (firma?.data) {
        firmaBodegueroBase64 = firma.data;
      }
    } catch {
      // No bloquear si no hay firma
    }

    // Logo corporativo
    let logoBase64: string | null = null;
    try {
      const uiSetting = await prisma.appSetting.findUnique({ where: { key: "UI_CONFIG" } });
      const uiConfig = uiSetting?.value as any;
      logoBase64 = uiConfig?.logo?.light_mode?.image || null;
    } catch {
      /* ignorar */
    }

    // Construir el DTO para el generador
    const pdfBuffer = await generateInformeEntrega({
      folio: request_.folio,
      title: request_.title || "Solicitud de Bodega",
      warehouseName: request_.warehouse.name,
      requesterName: request_.requester ? `${request_.requester.firstName} ${request_.requester.lastName}` : "Solicitante",
      bodegueroName,
      deliveredAt: meta.confirmedAt || request_.updatedAt.toISOString(),
      receptorNombre: meta.receptorNombre || "N/A",
      receptorRut: meta.receptorRut || null,
      observaciones: meta.observaciones || null,
      firmaReceptorBase64: meta.firmaReceptor || null,
      firmaBodegueroBase64,
      fotoEvidenciaBase64: meta.fotoEvidencia || null,
      items: request_.items.map((it) => ({
        articleCode: it.article.code,
        articleName: it.article.name,
        quantity: it.quantity.toString(),
        deliveredQuantity: it.deliveredQuantity.toString(),
        unit: it.article.unit || "und",
        warehouseName: request_.warehouse.name,
      })),
      logs: request_.logs.map((l) => ({
        action: l.action,
        description: l.description,
        createdAt: l.createdAt.toISOString(),
        creatorName: l.creator ? `${l.creator.firstName} ${l.creator.lastName}` : null,
      })),
      logoBase64,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="InformeEntrega_${request_.folio}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generando informe de entrega:", error);
    return NextResponse.json({ error: "Error al generar el informe" }, { status: 500 });
  }
}
