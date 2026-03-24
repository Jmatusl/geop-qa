import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/client";
import { generateMovimientoEmailHtml } from "@/lib/email/templates/bodega/movimiento";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type || body.movementType;
    const { documentReference, warehouseId, observations, responsable, items, costCenterId } = body;

    // Obtener la configuración de notificaciones
    const defaultSettings = await prisma.appSetting.findUnique({
      where: { key: "BODEGA_NOTIFICACIONES_CONFIG" },
    });

    const config = defaultSettings?.value as any;
    let notifConfig = null;

    if (type === "INGRESO") {
      notifConfig = config?.ingresos;
    } else if (type === "SALIDA") {
      notifConfig = config?.egresos;
    }

    if (!notifConfig || !notifConfig.enabled) {
      return NextResponse.json({ success: true, message: "Notificaciones deshabilitadas" });
    }

    // 1. Obtener nombre de bodega y centro de costo
    const [warehouse, costCenter] = await Promise.all([
      prisma.bodegaWarehouse.findUnique({ where: { id: warehouseId }, select: { name: true } }),
      costCenterId ? prisma.bodegaCostCenter.findUnique({ where: { id: costCenterId }, select: { name: true } }) : Promise.resolve(null),
    ]);

    // 2. Preparar items enriquecidos (SKU, Nombre, Costo)
    let enrichedItems = [];
    if (notifConfig.incluir_tabla && items && items.length > 0) {
      // Si recibimos solo IDs y cantidades, buscamos los detalles
      const articleIds = items.map((i: any) => i.articleId).filter(Boolean);

      const articles = await prisma.bodegaArticle.findMany({
        where: { id: { in: articleIds } },
        select: { id: true, name: true, code: true },
      });

      const artMap = new Map(articles.map((a) => [a.id, a]));

      enrichedItems = items.map((i: any) => {
        const art = artMap.get(i.articleId);
        return {
          articuloSku: art?.code || "S/K",
          articuloNombre: art?.name || "Artículo desconocido",
          cantidad: i.quantity || 0,
          unitCost: 0, // Para ingresos/egresos simples a veces no tenemos el costo a mano aqui
        };
      });
    }

    // Preparar el asunto y reemplazar placeholders
    let subject = notifConfig.asunto || (type === "INGRESO" ? "Aviso de Ingreso: {NUMERO}" : "Aviso de Retiro: {NUMERO}");
    subject = subject.replace("{NUMERO}", documentReference || "S/R").replace("{MOTIVO}", observations || "");

    // Generar el HTML usando la plantilla
    const html = generateMovimientoEmailHtml({
      type: type,
      documentReference: documentReference || "S/R",
      mensajePersonalizado: notifConfig.mensaje_personalizado || (type === "INGRESO" ? "Se ha procesado un ingreso a bodega." : "Se ha procesado un egreso de bodega."),
      warehouseName: warehouse?.name || "Desconocida",
      observations: observations,
      itemsCount: items.length,
      items: enrichedItems,
      incluirTabla: !!notifConfig.incluir_tabla,
      responsable: responsable,
      fecha: new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
      costCenterName: costCenter?.name,
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
    console.error("Error al notificar movimiento:", error);
    return NextResponse.json({ error: error.message || "Error al notificar movimiento" }, { status: 500 });
  }
}
