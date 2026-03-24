import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";
import { AuditLogger } from "@/lib/audit/logger";
import { bodegaTransactionService, BodegaTransactionError } from "@/lib/services/bodega/transaction-service";

const updateSchema = z.object({
  field: z.enum(["cotizacion", "guia", "docRef"]),
  value: z.string().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { field, value } = updateSchema.parse(body);

    const transaction = await bodegaTransactionService.getById(id);

    // Parse current observations
    const currentObs = transaction.observations || "";
    const parts = currentObs.split(" | ");

    let cc = "No asignado";
    let docRef = "";
    let cotizacion = "";
    let guia = "";
    const otherParts: string[] = [];

    parts.forEach((part) => {
      if (part.startsWith("C. Costo: ")) cc = part.replace("C. Costo: ", "").trim();
      else if (part.startsWith("Doc. Ref: ")) docRef = part.replace("Doc. Ref: ", "").trim();
      else if (part.startsWith("N° Cotización: ")) cotizacion = part.replace("N° Cotización: ", "").trim();
      else if (part.startsWith("Guía Despacho: ")) guia = part.replace("Guía Despacho: ", "").trim();
      else if (part.trim()) otherParts.push(part.trim());
    });

    let oldValue = "";
    let fieldLabel = "";

    if (field === "cotizacion") {
      oldValue = cotizacion || "N/A";
      cotizacion = value || "";
      fieldLabel = "N° COTIZACIÓN";
    } else if (field === "guia") {
      oldValue = guia || "N/A";
      guia = value || "";
      fieldLabel = "GUÍA DESPACHO";
    } else if (field === "docRef") {
      oldValue = docRef || "N/A";
      docRef = value || "";
      fieldLabel = "REFERENCIA";
    }

    // Reconstruct observations
    const newParts = [...otherParts];
    if (cc && cc !== "No asignado") newParts.push(`C. Costo: ${cc}`);
    if (docRef) newParts.push(`Doc. Ref: ${docRef}`);
    if (cotizacion) newParts.push(`N° Cotización: ${cotizacion}`);
    if (guia) newParts.push(`Guía Despacho: ${guia}`);

    const newObservations = newParts.join(" | ");

    await bodegaTransactionService.updateObservations(
      id, 
      newObservations, 
      field === "docRef" ? (value || null) : undefined,
      field === "cotizacion" ? (value || null) : undefined,
      field === "guia" ? (value || null) : undefined,
      session.userId
    );

    // Auditoría de sistema
    await AuditLogger.logAction(req, session.userId, {
      action: "UPDATE",
      module: "BODEGA_MOVIMIENTOS",
      targetId: id,
      newData: { [field]: value },
      oldData: { [field]: oldValue },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating observations:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (error instanceof BodegaTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
