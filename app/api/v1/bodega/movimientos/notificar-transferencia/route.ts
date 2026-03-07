import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/client";
import { generateTransferenciaEmailHtml } from "@/lib/email/templates/bodega/transferencia";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { itemsCount, documentReference, originId, destinationId, observations, responsable, items } = body;

    // Obtener la configuración de notificaciones
    const defaultSettings = await prisma.appSetting.findUnique({
      where: { key: "BODEGA_NOTIFICACIONES_CONFIG" },
    });

    const notifConfig = (defaultSettings?.value as any)?.transferencias;

    if (!notifConfig || !notifConfig.enabled) {
      return NextResponse.json({ success: true, message: "Notificaciones deshabilitadas" });
    }

    // 1. Obtener nombres de bodegas
    const [originWarehouse, destinationWarehouse] = await Promise.all([
      prisma.bodegaWarehouse.findUnique({ where: { id: originId }, select: { name: true } }),
      prisma.bodegaWarehouse.findUnique({ where: { id: destinationId }, select: { name: true } }),
    ]);

    // 2. Obtener costos de artículos si se incluye tabla
    let enrichedItems = [];
    if (notifConfig.incluir_tabla && items && items.length > 0) {
      const itemIds = items.map((i: any) => i.itemId).filter(Boolean);

      // Consultar los costos desde los movimientos originales de stock
      const stockMoveItems =
        itemIds.length > 0
          ? await prisma.bodegaStockMovementItem.findMany({
              where: { id: { in: itemIds } },
              select: { id: true, unitCost: true },
            })
          : [];

      const costMap = new Map(stockMoveItems.map((s) => [s.id, Number(s.unitCost || 0)]));

      enrichedItems = items.map((i: any) => ({
        articuloSku: i.articuloSku || "S/K",
        articuloNombre: i.articuloNombre || "Artículo desconocido",
        cantidadTransferir: i.cantidad || i.cantidadTransferir || 0,
        unitCost: costMap.get(i.itemId) || 0,
      }));
    }

    // Preparar el asunto y reemplazar placeholders
    let subject = notifConfig.asunto || "Aviso de Transferencia Interna: {NUMERO}";
    subject = subject.replace("{NUMERO}", documentReference || "S/R").replace("{MOTIVO}", observations || "");

    // Generar el HTML usando la plantilla
    const html = generateTransferenciaEmailHtml({
      documentReference: documentReference || "S/R",
      mensajePersonalizado: notifConfig.mensaje_personalizado || "Le informamos que se ha procesado una transferencia entre bodegas correctamente.",
      originWarehouse: originWarehouse?.name || "Desconocida",
      destinationWarehouse: destinationWarehouse?.name || "Desconocida",
      observations: observations,
      itemsCount: itemsCount,
      items: enrichedItems,
      incluirTabla: !!notifConfig.incluir_tabla,
      responsable: responsable,
      fecha: new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
    });

    // Destinatarios
    const tos = (notifConfig.destinatarios || "")
      .split(/[,;]/)
      .map((e: string) => e.trim())
      .filter(Boolean);

    if (tos.length === 0) {
      return NextResponse.json({ success: true, message: "No hay destinatarios configurados" });
    }

    const res = await sendEmail({
      to: tos.join(","),
      subject,
      html,
    });

    if (!res.success) {
      throw new Error(res.error || "No se pudo enviar el correo de notificación");
    }

    return NextResponse.json({ success: true, message: "Notificación enviada con éxito" });
  } catch (error: any) {
    console.error("Error al notificar transferencia:", error);
    return NextResponse.json({ error: error.message || "Error al notificar transferencia" }, { status: 500 });
  }
}
