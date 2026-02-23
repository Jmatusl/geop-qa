import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { format } from "date-fns";
import { ConsolidadoExcelReport } from "@/lib/reports/modules/consolidado/consolidado-excel";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data } = await request.json();

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const report = new ConsolidadoExcelReport(type);

    if (type === "requests") {
      await report.addRequestsData(data);
    } else {
      await report.addWRData(data);
    }

    const buffer = await report.getBuffer();

    const filename = type === "requests" ? `consolidado_solicitudes_${format(new Date(), "yyyyMMdd")}.xlsx` : `consolidado_rts_${format(new Date(), "yyyyMMdd")}.xlsx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating consolidado export:", error);
    return NextResponse.json({ error: "Error generating export" }, { status: 500 });
  }
}
