import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { warehouseId, articleIds } = await request.json();

    if (!warehouseId || !articleIds || !Array.isArray(articleIds)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const stocks = await prisma.bodegaStock.findMany({
      where: {
        warehouseId,
        articleId: { in: articleIds },
      },
      select: {
        articleId: true,
        quantity: true,
        reservedQuantity: true,
      },
    });

    const result = stocks.reduce(
      (acc, s) => {
        acc[s.articleId] = Number(s.quantity) - Number(s.reservedQuantity);
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Error al consultar stock" }, { status: 500 });
  }
}
