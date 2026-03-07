import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaReportingService } from "@/lib/services/bodega/reporting-service";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const warehouseId = request.nextUrl.searchParams.get("warehouseId") || undefined;
    const data = await bodegaReportingService.getLowStockArticles({ warehouseId });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching low stock articles:", error);
    return NextResponse.json({ success: false, error: "Error al obtener artículos con stock bajo" }, { status: 500 });
  }
}
