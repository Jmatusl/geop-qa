import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const warehouseId = (searchParams.get("warehouseId") || "").trim();

    if (search.length < 2) {
      return NextResponse.json({ total: 0, resultados: [] });
    }

    const result = await bodegaStockMovementService.quickSearchInventory(search, warehouseId || undefined);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error en consulta rápida" }, { status: 500 });
  }
}
