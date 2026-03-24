import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { AuditLogger } from "@/lib/audit/logger";
import { bodegaTransactionService, BodegaTransactionError } from "@/lib/services/bodega/transaction-service";
import { createBodegaTransactionSchema, bodegaTransactionFiltersSchema } from "@/lib/validations/bodega-transaction";
import { createBodegaMovementSchema } from "@/lib/validations/bodega-movement";
import { bodegaStockMovementService, BodegaMovementError } from "@/lib/services/bodega/stock-movement-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());
    
    const filters = bodegaTransactionFiltersSchema.parse({
      ...queryObject,
      type: (queryObject.type || queryObject.movementType) as any,
    });

    const result = await bodegaTransactionService.listOperational(filters);
    return NextResponse.json({ ...result, data: result.items });
  } catch (error) {
    console.error("Error en GET /api/v1/bodega/movimientos:", error);
    return NextResponse.json({ error: "Error al obtener movimientos de bodega" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const canManageStock = await modulePermissionService.userHasPermission(session.user.id, "bodega", "retira_items");

    if (!canManageStock) {
      return NextResponse.json({ error: "Sin permisos para registrar movimientos" }, { status: 403 });
    }

    const body = await request.json();
    
    // Si pide autoVerify, solo los RETIROS/SALIDAS requieren permiso de aprobación adicional.
    // Los INGRESOS y AJUSTES pueden auto-completarse con el permiso base de bodega.
    const isAutoVerify = body.autoVerify === true;
    const movementType = body.type || body.movementType;
    if (isAutoVerify && (movementType === "RETIRO" || movementType === "SALIDA")) {
      const canApprove = await modulePermissionService.userHasPermission(session.user.id, "bodega", "aprueba_solicitudes");
      if (!canApprove) {
        return NextResponse.json({ error: "Sin permisos de aprobación para auto-verificación de retiros" }, { status: 403 });
      }
    }

    // Adaptar formato legacy si es necesario
    const items = body.items || (body.articleId && body.quantity ? [{ articleId: body.articleId, quantity: body.quantity, unitCost: body.unitCost }] : []);

    const isTransferLikeReason = body.reason === "EGRESO_TRANSFERENCIA" || body.reason === "INGRESO_TRANSFERENCIA";
    const hasSourceMovementItems = items.some((it: any) => Boolean(it.sourceMovementItemId || it.sourceTransactionItemId || it.sourceId));
    let forceAutoVerifyFromTransit = false;

    if ((movementType === "INGRESO" || movementType === "AJUSTE") && hasSourceMovementItems) {
      const sourceIds = items
        .map((it: any) => it.sourceMovementItemId || it.sourceTransactionItemId || it.sourceId)
        .filter(Boolean);

      if (sourceIds.length > 0) {
        const sourceItems = await prisma.bodegaTransactionItem.findMany({
          where: { id: { in: sourceIds } },
          include: {
            transaction: {
              include: {
                warehouse: {
                  select: { code: true, name: true },
                },
              },
            },
          },
        });

        forceAutoVerifyFromTransit = sourceItems.some((sourceItem) => {
          const code = (sourceItem.transaction.warehouse?.code || "").toLowerCase();
          const name = (sourceItem.transaction.warehouse?.name || "").toLowerCase();
          return code === "transito" || name.includes("tránsit") || name.includes("transit");
        });
      }
    }

    if (isTransferLikeReason || hasSourceMovementItems) {
      const legacyData = createBodegaMovementSchema.parse({
        type: body.type || body.movementType,
        warehouseId: body.warehouseId,
        articleId: body.articleId,
        quantity: body.quantity,
        unitCost: body.unitCost,
        items: items.map((it: any) => ({
          articleId: it.articleId,
          quantity: it.quantity,
          unitCost: it.unitCost,
          sourceMovementItemId: it.sourceMovementItemId || it.sourceTransactionItemId || it.sourceId,
        })),
        reason: body.reason,
        observations: body.observations,
        responsable: body.responsable,
        externalReference: body.externalReference,
        evidence: body.evidence,
        autoVerify: body.reason === "EGRESO_TRANSFERENCIA" ? true : (isAutoVerify || forceAutoVerifyFromTransit),
      });

      const created = await bodegaStockMovementService.createMovement(legacyData, session.user.id);

      await AuditLogger.logAction(request, session.user.id, {
        action: "CREATE",
        module: "bodega_movimientos",
        targetId: created?.id || "0",
        newData: {
          type: legacyData.type,
          warehouseId: legacyData.warehouseId,
          itemsCount: created?.items?.length,
          isAutoVerify: legacyData.autoVerify === true,
          reason: legacyData.reason,
        },
      });

      revalidatePath("/bodega/movimientos");

      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    const data = createBodegaTransactionSchema.parse({
      type: body.type || body.movementType, // Soporta ambos para transición
      status: "PENDIENTE", // Siempre inicia PENDIENTE si se va a auto-procesar
      warehouseId: body.warehouseId,
      observations: body.observations,
      externalReference: body.externalReference,
      quotationNumber: body.quotationNumber,
      deliveryGuide: body.deliveryGuide,
      items: items.map((it: any) => ({
        ...it,
        sourceTransactionItemId: it.sourceMovementItemId || it.sourceTransactionItemId || it.sourceId
      })),
      autoComplete: isAutoVerify,
      autoApprove: isAutoVerify
    });

    const created = await bodegaTransactionService.create(data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "CREATE",
      module: "bodega_movimientos",
      targetId: created?.id || "0",
      newData: {
        type: data.type,
        warehouseId: data.warehouseId,
        itemsCount: created?.items.length,
        isAutoVerify
      },
    });

    revalidatePath("/bodega/movimientos");

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/v1/bodega/movimientos:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    if (error instanceof BodegaTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al registrar movimiento de bodega" }, { status: 500 });
  }
}
