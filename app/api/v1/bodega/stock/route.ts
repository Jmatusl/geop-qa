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
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "20");
    const search = (searchParams.get("search") || "").trim();
    const warehouseId = (searchParams.get("warehouseId") || "").trim();

    const result = await bodegaStockMovementService.listStock({
      page,
      pageSize,
      search,
      warehouseId,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al obtener stock" }, { status: 500 });
  }
}
