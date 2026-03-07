import { NextRequest, NextResponse } from "next/server";
import { bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL de evidencia requerida" }, { status: 400 });
    }

    const result = await bodegaStockMovementService.addItemEvidence(itemId, url);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
