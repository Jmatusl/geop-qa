import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const history = await bodegaStockMovementService.getArticleMovements(id);

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error al obtener historial de movimientos de artículo:", error);
    return NextResponse.json({ error: "Error al obtener historial de movimientos" }, { status: 500 });
  }
}
