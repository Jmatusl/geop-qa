import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import EditarSolicitudBodegaClient from "./EditarSolicitudBodegaClient";

export default async function EditarSolicitudInternaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const [request, warehouses] = await Promise.all([
    prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: {
        warehouse: true,
        items: {
          include: {
            article: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    }),
    prisma.bodegaWarehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
  ]);

  if (!request) {
    notFound();
  }

  const editableStatuses = ["BORRADOR", "PENDIENTE", "RECHAZADA"];
  if (!editableStatuses.includes(request.statusCode)) {
    redirect(`/bodega/solicitudes-internas/${id}`);
  }

  const initialData = {
    requestId: id,
    folio: request.folio,
    warehouseId: request.warehouseId,
    justificacion: request.description || "",
    referencia: request.externalReference || "",
    fechaRequerida: request.requiredDate ? request.requiredDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    items: await Promise.all(
      request.items.map(async (item) => {
        const itemWarehouseId = item.warehouseId || request.warehouseId;
        const allStocks = await prisma.bodegaStock.findMany({
          where: { articleId: item.articleId },
          include: { warehouse: true },
        });

        const stockGlobal = allStocks.reduce((sum, s) => sum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
        const bodegasStock = allStocks.map((s) => ({
          bodegaId: s.warehouseId,
          bodegaNombre: s.warehouse.name,
          stock: Number(s.quantity) - Number(s.reservedQuantity),
        }));

        const currentStock = allStocks.find((s) => s.warehouseId === itemWarehouseId);
        const available = currentStock ? Number(currentStock.quantity) - Number(currentStock.reservedQuantity) : 0;

        // Necesitamos el nombre de la bodega del item si no es la global
        let itemWarehouseName = request.warehouse.name;
        if (item.warehouseId && item.warehouseId !== request.warehouseId) {
          const w = allStocks.find((s) => s.warehouseId === item.warehouseId)?.warehouse;
          if (w) itemWarehouseName = w.name;
        }

        return {
          articuloId: item.articleId,
          codigo: item.article.code,
          nombre: item.article.name,
          bodegaOrigenId: itemWarehouseId,
          bodegaOrigenNombre: itemWarehouseName,
          cantidad: Number(item.quantity),
          stockDisponible: available,
          stockGlobal: stockGlobal,
          unidad: item.article.unit,
          bodegasStock: bodegasStock,
        };
      }),
    ),
    fotosEvidencia: (request.metadatos as any)?.fotosEvidencia || [],
  };

  return (
    <div className="w-full">
      <EditarSolicitudBodegaClient initialData={initialData} />
    </div>
  );
}
