import { NextRequest, NextResponse } from "next/server";

import { verifySession } from "@/lib/auth/session";
import { bodegaReportingService } from "@/lib/services/bodega/reporting-service";

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const warehouseId = request.nextUrl.searchParams.get("warehouseId") || undefined;
  const data = await bodegaReportingService.getDashboard({ warehouseId });

  return NextResponse.json({ success: true, data });
}
