/**
 * Server Actions: Detalle de Solicitud de Insumos
 * Archivo: app/insumos/[id]/actions.ts
 *
 * Thin wrappers al Service Layer para la vista de detalle
 */

"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/client";
import {
  supplyRequestService,
  SupplyRequestBusinessError,
} from "@/lib/services/supply/supply-request-service";
import {
  reviewSupplyRequestSchema,
  cancelSupplyRequestSchema,
} from "@/lib/validations/supply-request";
import type { ReviewSupplyRequestInput, CancelSupplyRequestInput } from "@/lib/validations/supply-request";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Tipo para el detalle completo de una cotización
export type QuotationFullDetail = Prisma.SupplyQuotationGetPayload<{
  include: {
    request: {
      select: {
        id: true;
        folio: true;
        installation: { select: { id: true; name: true } };
        creator: { select: { id: true; firstName: true; lastName: true; email: true } };
      };
    };
    supplier: {
      select: {
        id: true;
        rut: true;
        businessLine: true;
        legalName: true;
        fantasyName: true;
        contactEmail: true;
        phone: true;
      };
    };
    status: { select: { code: true; name: true; color: true } };
    items: {
      include: {
        requestItem: {
          select: {
            id: true;
            itemName: true;
            quantity: true;
            unit: true;
            category: { select: { id: true; name: true } };
          };
        };
      };
    };
    attachments: {
      select: { id: true; fileName: true; fileSize: true; mimeType: true };
    };
  };
}>;

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Obtiene el detalle completo de una solicitud
 */
export async function getSupplyRequestById(id: string) {
  const session = await verifySession();
  if (!session) return null;

  try {
    return await supplyRequestService.getById(id);
  } catch (error) {
    console.error("Error al obtener solicitud:", error);
    return null;
  }
}

/**
 * Aprueba o rechaza una solicitud
 */
export async function revisarSolicitud(
  data: ReviewSupplyRequestInput
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    const validated = reviewSupplyRequestSchema.parse(data);
    await supplyRequestService.review(validated, session.user.id);

    revalidatePath(`/insumos/${data.id}`);
    revalidatePath("/insumos/listado");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error revisando solicitud:", error);
    return { success: false, error: "Error al procesar la solicitud." };
  }
}

/**
 * Anula una solicitud
 */
export async function anularSolicitud(
  data: CancelSupplyRequestInput
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    const validated = cancelSupplyRequestSchema.parse(data);
    await supplyRequestService.cancel(validated, session.user.id);

    revalidatePath(`/insumos/${data.id}`);
    revalidatePath("/insumos/listado");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error anulando solicitud:", error);
    return { success: false, error: "Error al anular la solicitud." };
  }
}

/**
 * Obtiene proveedores activos para el selector de cotizaciones
 */
export async function getActiveSuppliers() {
  const session = await verifySession();
  if (!session) return [];

  try {
    return await supplyRequestService.getActiveSuppliers();
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    return [];
  }
}

/**
 * Crea cotizaciones para la solicitud (una por proveedor seleccionado)
 */
export async function createQuotation(
  requestId: string,
  data: {
    supplierIds: string[];
    itemIds: string[];
    expirationDate: string;
    observationsForSupplier?: string;
    internalObservations?: string;
  }
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await supplyRequestService.createQuotation(
      {
        requestId,
        supplierIds: data.supplierIds,
        itemIds: data.itemIds,
        expirationDate: new Date(data.expirationDate),
        observationsForSupplier: data.observationsForSupplier ?? null,
        internalObservations: data.internalObservations ?? null,
      },
      session.user.id
    );

    revalidatePath(`/insumos/${requestId}`);
    revalidatePath("/insumos/listado");

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error creando cotización:", error);
    return { success: false, error: "Error al crear la cotización." };
  }
}

/**
 * Actualiza el estado de una cotización (legacy, usar aprobarCotizacion o rechazarCotizacion)
 */
export async function updateQuotationStatus(
  quotationId: string,
  requestId: string,
  statusCode: string
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await supplyRequestService.updateQuotationStatus(quotationId, statusCode, session.user.id);

    revalidatePath(`/insumos/${requestId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error actualizando estado de cotización:", error);
    return { success: false, error: "Error al actualizar la cotización." };
  }
}

/**
 * Aprueba una cotización completa (con lógica de negocio completa)
 */
export async function aprobarCotizacion(
  quotationId: string,
  requestId: string,
  purchaseOrderNumber?: string
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await supplyRequestService.approveQuotation(
      quotationId,
      session.user.id,
      purchaseOrderNumber
    );

    revalidatePath(`/insumos/${requestId}`);
    revalidatePath("/insumos/listado");

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error aprobando cotización:", error);
    return { success: false, error: "Error al aprobar la cotización." };
  }
}

/**
 * Rechaza una cotización
 */
export async function rechazarCotizacion(
  quotationId: string,
  requestId: string,
  reason: string
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await supplyRequestService.rejectQuotation(
      quotationId,
      session.user.id,
      reason
    );

    revalidatePath(`/insumos/${requestId}`);
    revalidatePath("/insumos/listado");

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error rechazando cotización:", error);
    return { success: false, error: "Error al rechazar la cotización." };
  }
}

/**
 * Marca una cotización como No Cotizado (proveedor no respondió)
 */
export async function marcarComoNoCotizado(
  quotationId: string,
  requestId: string,
  reason: string
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await supplyRequestService.markAsNoCotizado(
      quotationId,
      session.user.id,
      reason
    );

    revalidatePath(`/insumos/${requestId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error marcando como No Cotizado:", error);
    return { success: false, error: "Error al marcar como No Cotizado." };
  }
}

/**
 * Obtiene el detalle de una cotización específica
 */
export async function getQuotationById(quotationId: string): Promise<QuotationFullDetail | null> {
  const session = await verifySession();
  if (!session) return null;

  try {
    return await supplyRequestService.getQuotationById(quotationId);
  } catch (error) {
    console.error("Error obteniendo detalle de cotización:", error);
    return null;
  }
}

/**
 * Registra una cotización manual con montos e ítems
 */
export async function registerManualQuotation(
  quotationId: string,
  data: {
    quotationDate?: string;
    expirationDate?: string;
    quotationNumber?: string;
    purchaseOrderNumber?: string;
    observations?: string;
    totalAmount?: number;
    items: Array<{
      quotationItemId: string;
      unitPrice?: number;
      quotedQuantity?: number;
      supplierNotes?: string;
    }>;
  }
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await supplyRequestService.registerManualQuotation(
      quotationId,
      {
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : null,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        quotationNumber: data.quotationNumber ?? null,
        purchaseOrderNumber: data.purchaseOrderNumber ?? null,
        observations: data.observations ?? null,
        totalAmount: data.totalAmount ?? null,
        items: data.items,
      },
      session.user.id
    );

    const quotation = await supplyRequestService.getQuotationById(quotationId);
    if (quotation?.requestId) {
      revalidatePath(`/insumos/${quotation.requestId}`);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error registrando cotización manual:", error);
    return { success: false, error: "Error al registrar la cotización manual." };
  }
}

/**
 * Registra envío de cotización por correo (trazabilidad)
 */
export async function sendQuotationByEmail(
  quotationId: string,
  data: {
    recipientEmail: string;
    responseDeadline?: string;
    observations?: string;
    html?: string; // optional html body passed from client preview
    pdfBase64?: string; // PDF generado en el cliente
    subject?: string;
  }
): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    const quotation = await supplyRequestService.getQuotationById(quotationId);
    if (!quotation) {
      return { success: false, error: "Cotización no encontrada" };
    }

    const subject = data.subject?.trim() || `Solicitud de Cotización ${quotation.folio}`;
    const supplierName =
      quotation.supplier?.businessLine ||
      quotation.supplier?.legalName ||
      quotation.supplier?.fantasyName ||
      "Proveedor";

    // If client supplied the HTML (preview) use it; otherwise build a simple HTML
    const mailHtml = data.html ?? `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 8px 0;">Solicitud de Cotización</h2>
        <p style="margin:0 0 12px 0;">Estimado/a ${supplierName},</p>
        <p style="margin:0 0 6px 0;">Se solicita cotizar los ítems asociados al folio <strong>${quotation.folio}</strong>.</p>
        <p style="margin:0 0 6px 0;"><strong>Fecha límite:</strong> ${data.responseDeadline || "No definida"}</p>
        <p style="margin:0 0 6px 0;"><strong>Observaciones:</strong> ${data.observations || "Sin observaciones"}</p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;"/>
        <p style="margin:0;font-size:12px;color:#64748b;">Correo enviado automáticamente desde GEOP Río Dulce.</p>
      </div>
    `;

    // Usar PDF generado en el cliente (si está disponible)
    let pdfBuffer: Buffer | null = null;
    if (data.pdfBase64) {
      try {
        pdfBuffer = Buffer.from(data.pdfBase64, "base64");
      } catch (e) {
        console.error("Error decodificando PDF base64:", e);
        pdfBuffer = null;
      }
    }

    const mailResult = await sendEmail({
      to: data.recipientEmail,
      subject,
      html: mailHtml,
      attachments: pdfBuffer
        ? [
            {
              filename: `${quotation.folio || "cotizacion"}.pdf`,
              content: pdfBuffer,
            },
          ]
        : undefined,
    });

    if (!mailResult.success) {
      return { success: false, error: mailResult.error || "No fue posible enviar el correo" };
    }

    await supplyRequestService.registerQuotationEmailSent(
      quotationId,
      {
        recipientEmail: data.recipientEmail,
        responseDeadline: data.responseDeadline ? new Date(data.responseDeadline) : null,
        observations: data.observations ?? null,
      },
      session.user.id
    );

    if (quotation?.requestId) {
      revalidatePath(`/insumos/${quotation.requestId}`);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof SupplyRequestBusinessError) {
      return { success: false, error: error.message };
    }
    console.error("Error enviando cotización por email:", error);
    return { success: false, error: "Error al registrar el envío de cotización." };
  }
}
