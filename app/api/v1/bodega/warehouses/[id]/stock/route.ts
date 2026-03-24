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

    const stockItems = await prisma.bodegaTransactionItem.findMany({
      where: {
        transaction: {
          warehouseId,
          status: { in: ["EJECUTADO", "COMPLETADO", "COMPLETADA", "APLICADO", "APLICADA"] },
          type: { in: ["INGRESO", "INGRESO_TRANSFERENCIA", "AJUSTE", "DEVOLUCION"] },
        },
        currentBalance: { gt: 0 },
      },
      include: {
        article: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
          },
        },
        transaction: {
          select: {
            id: true,
            folio: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const formatted = stockItems.map((item) => ({
      itemId: item.id,
      articuloId: item.article.id,
      articuloNombre: item.article.name,
      articuloSku: item.article.code,
      cantidad: Number(item.currentBalance), // saldo
      unitCost: item.unitCost ? Number(item.unitCost) : 0,
      unit: item.article.unit,
      movimientoNumero: item.transaction.folio,
      movimientoFecha: item.transaction.createdAt,
      movimientoId: item.transaction.id,
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error al obtener stock de la bodega:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
