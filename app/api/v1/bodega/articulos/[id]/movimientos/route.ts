import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("bodegaId") || undefined;

    const result = await bodegaStockMovementService.getArticleMovements(id, warehouseId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en historial de movimientos:", error);
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}
