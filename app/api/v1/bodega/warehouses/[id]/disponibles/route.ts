/**
 * API: Buckets de stock disponible por artículo y bodega (Trazabilidad FIFO)
 * GET /api/v1/bodega/warehouses/[id]/disponibles?articleId=X
 *
 * Retorna los BodegaStockMovementItem con saldo > 0 ordenados FIFO.
 * Fallback: si no existen buckets pero BodegaStock tiene saldo, genera un
 * bucket sintético para que el retiro pueda completarse igualmente.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: warehouseId } = await params;
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json({ error: "articleId es requerido" }, { status: 400 });
    }

    // ── 1. Intentar obtener buckets FIFO trazables ────────────────────────────
    const buckets = await prisma.bodegaStockMovementItem.findMany({
      where: {
        articleId,
        currentBalance: { gt: 0 },
        movement: {
          warehouseId,
          status: { in: ["EJECUTADO", "COMPLETADO"] },
          movementType: { in: ["INGRESO", "INGRESO_TRANSFERENCIA", "AJUSTE", "DEVOLUCION"] },
        },
      },
      include: {
        movement: {
          select: {
            id: true,
            folio: true,
            reason: true,
            createdAt: true,
          },
        },
        article: {
          select: { id: true, code: true, name: true, unit: true },
        },
      },
      orderBy: { createdAt: "asc" }, // FIFO: más antiguo primero
    });

    if (buckets.length > 0) {
      const formatted = buckets.map((item) => ({
        id: item.id,
        movimientoId: item.movement.id,
        numeroMovimiento: item.movement.folio,
        documentoReferencia: item.movement.reason ?? null,
        fecha: item.movement.createdAt.toISOString(),
        saldo: Number(item.currentBalance),
        cantidadOriginal: Number(item.quantity),
        precioUnitario: item.unitCost ? Number(item.unitCost) : null,
      }));
      return NextResponse.json(formatted);
    }

    // ── 2. Fallback: no hay buckets trazables — usar BodegaStock como fuente ──
    // Esto ocurre cuando el stock fue inicializado directamente (seed) sin
    // generar movimientos de ingreso con BodegaStockMovementItem asociados.
    const stockRow = await prisma.bodegaStock.findUnique({
      where: { warehouseId_articleId: { warehouseId, articleId } },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });

    const saldoDisponible = stockRow ? Number(stockRow.quantity) - Number(stockRow.reservedQuantity) : 0;

    if (saldoDisponible > 0) {
      // Generar un bucket sintético representando el stock total disponible.
      // id usa el formato "STOCK-<warehouseId>-<articleId>" para distinguirlo de UUIDs reales.
      const bucketSintetico = [
        {
          id: `STOCK-${warehouseId}-${articleId}`,
          movimientoId: null,
          numeroMovimiento: "Stock Inicial / Sin Trazabilidad",
          documentoReferencia: null,
          fecha: new Date().toISOString(),
          saldo: saldoDisponible,
          cantidadOriginal: saldoDisponible,
          precioUnitario: null,
          esBucketSintetico: true, // flag para que el UI pueda mostrar aviso
        },
      ];
      return NextResponse.json(bucketSintetico);
    }

    // Sin stock en ningún lado
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error al obtener buckets disponibles:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
