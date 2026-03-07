import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isActiveStr = searchParams.get("isActive");

    const where: any = {};
    if (search) {
      where.OR = [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }];
    }
    if (isActiveStr === "true") where.isActive = true;
    else if (isActiveStr === "false") where.isActive = false;

    const bodegas = await prisma.bodegaWarehouse.findMany({
      where,
      orderBy: [{ name: "asc" }],
    });

    // Para cada bodega, calculamos sus estadísticas
    const results = await Promise.all(
      bodegas.map(async (bodega) => {
        // Total Items: artículos distintos con stock > 0
        const totalItemsCount = await prisma.bodegaStock.count({
          where: {
            warehouseId: bodega.id,
            quantity: { gt: 0 },
          },
        });

        // Valor Total: suma de (saldo_actual * unitCost)
        // Solo lotes/ítems vigentes
        const stockItems = await prisma.bodegaStockMovementItem.findMany({
          where: {
            currentBalance: { gt: 0 },
            movement: {
              warehouseId: bodega.id,
            },
          },
          select: {
            currentBalance: true,
            unitCost: true,
          },
        });

        const valorTotal = stockItems.reduce((acc, item) => {
          const qty = Number(item.currentBalance ?? 0);
          const cost = Number(item.unitCost ?? 0);
          return acc + qty * cost;
        }, 0);

        return {
          id: bodega.id,
          name: bodega.name,
          code: bodega.code,
          location: bodega.location,
          isActive: bodega.isActive,
          estadisticas: {
            totalItems: totalItemsCount,
            valorTotal: valorTotal,
          },
        };
      }),
    );

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Error cargando dashboard de bodegas:", error);
    return NextResponse.json({ error: "Error al cargar bodegas" }, { status: 500 });
  }
}
