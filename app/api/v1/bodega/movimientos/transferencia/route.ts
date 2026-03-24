import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { AuditLogger } from "@/lib/audit/logger";
import { prisma } from "@/lib/prisma";
import { bodegaStockMovementService, BodegaMovementError } from "@/lib/services/bodega/stock-movement-service";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const transferenciaSchema = z.object({
  bodegaOrigenId: z.string().uuid("Bodega origen inválida"),
  bodegaDestinoId: z.string().uuid("Bodega destino inválida"),
  observaciones: z.string().trim().min(10, "La justificación debe tener al menos 10 caracteres").max(500).optional(),
  items: z.array(
    z.object({
      itemId: z.string().min(1, "Ítem origen inválido"),
      articuloId: z.string().uuid("Artículo inválido"),
      cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero"),
    }),
  ).min(1, "Debe seleccionar al menos un artículo"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const canManageStock = await modulePermissionService.userHasPermission(session.user.id, "bodega", "retira_items");
    if (!canManageStock) {
      return NextResponse.json({ error: "Sin permisos para registrar transferencias" }, { status: 403 });
    }

    const body = await request.json();
    const data = transferenciaSchema.parse(body);

    if (data.bodegaOrigenId === data.bodegaDestinoId) {
      return NextResponse.json({ error: "La bodega destino debe ser distinta a la bodega origen" }, { status: 400 });
    }

    const [configSetting, originWarehouse, destinationWarehouse] = await Promise.all([
      prisma.appSetting.findUnique({
        where: { key: "BODEGA_GENERAL_CONFIG" },
        select: { value: true, isActive: true },
      }),
      prisma.bodegaWarehouse.findUnique({
        where: { id: data.bodegaOrigenId },
        select: { id: true, code: true, name: true, isActive: true },
      }),
      prisma.bodegaWarehouse.findUnique({
        where: { id: data.bodegaDestinoId },
        select: { id: true, code: true, name: true, isActive: true },
      }),
    ]);

    if (!originWarehouse || !originWarehouse.isActive) {
      return NextResponse.json({ error: "La bodega origen no existe o está inactiva" }, { status: 400 });
    }

    if (!destinationWarehouse || !destinationWarehouse.isActive) {
      return NextResponse.json({ error: "La bodega destino no existe o está inactiva" }, { status: 400 });
    }

    const config = configSetting?.isActive ? ((configSetting.value as Record<string, unknown>) || {}) : {};
    const originName = (originWarehouse.name || "").toLowerCase();
    const originCode = (originWarehouse.code || "").toLowerCase();
    const comesFromTransit = originCode === "transito" || originName.includes("tránsit") || originName.includes("transit");
    const autoVerifyDestination = config.auto_verificar_ingresos === true || comesFromTransit;

    const salida = await bodegaStockMovementService.createMovement(
      {
        type: "SALIDA",
        warehouseId: data.bodegaOrigenId,
        items: data.items.map((item) => ({
          articleId: item.articuloId,
          quantity: item.cantidad,
          sourceMovementItemId: item.itemId,
        })),
        reason: "EGRESO_TRANSFERENCIA",
        observations: `${data.observaciones || "Transferencia entre bodegas"} | DESTINO: ${data.bodegaDestinoId}`,
        autoVerify: true,
      },
      session.user.id,
    );

    const ingreso = await bodegaStockMovementService.createMovement(
      {
        type: "INGRESO",
        warehouseId: data.bodegaDestinoId,
        items: data.items.map((item) => ({
          articleId: item.articuloId,
          quantity: item.cantidad,
          sourceMovementItemId: item.itemId,
        })),
        reason: "INGRESO_TRANSFERENCIA",
        observations: `${data.observaciones || "Transferencia entre bodegas"} | ORIGEN: ${data.bodegaOrigenId}`,
        autoVerify: autoVerifyDestination,
      },
      session.user.id,
    );

    await AuditLogger.logAction(request, session.user.id, {
      action: "CREATE",
      module: "bodega_movimientos",
      targetId: ingreso?.id || salida?.id || "0",
      newData: {
        type: "TRANSFERENCIA",
        originWarehouseId: data.bodegaOrigenId,
        destinationWarehouseId: data.bodegaDestinoId,
        destinationWarehouseCode: destinationWarehouse.code,
        originWarehouseCode: originWarehouse.code,
        comesFromTransit,
        itemsCount: data.items.length,
        autoVerifyDestination,
      },
    });

    revalidatePath("/bodega/movimientos");
    revalidatePath("/bodega/verificacion");

    return NextResponse.json({
      success: true,
      message: autoVerifyDestination || destinationWarehouse.code === "TRANSITO" ? "Transferencia procesada correctamente" : "Transferencia registrada. El ingreso destino quedó pendiente de revisión manual",
      data: {
        salidaId: salida?.id ?? null,
        ingresoId: ingreso?.id ?? null,
      },
    });
  } catch (error) {
    console.error("Error en POST /api/v1/bodega/movimientos/transferencia:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al procesar la transferencia" }, { status: 500 });
  }
}
