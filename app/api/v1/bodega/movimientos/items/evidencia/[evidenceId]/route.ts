import { NextRequest, NextResponse } from "next/server";
import { bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ evidenceId: string }> }) {
  try {
    const { evidenceId } = await params;
    await bodegaStockMovementService.removeItemEvidence(evidenceId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
