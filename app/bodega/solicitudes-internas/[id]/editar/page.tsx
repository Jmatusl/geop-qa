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

  const [request, warehouses, articles] = await Promise.all([
    prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: {
        items: {
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
    prisma.bodegaArticle.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
      },
      take: 500,
    }),
  ]);

  if (!request) {
    notFound();
  }

  if (!['PENDIENTE', 'RECHAZADA'].includes(request.statusCode)) {
    redirect(`/bodega/solicitudes-internas/${id}`);
  }

  const initialData = {
    warehouseId: request.warehouseId,
    title: request.title,
    description: request.description || "",
    priority: request.priority,
    requiredDate: request.requiredDate ? request.requiredDate.toISOString().slice(0, 10) : "",
    observations: request.observations || "",
    items: request.items.map((item) => ({
      articleId: item.articleId,
      quantity: String(Number(item.quantity)),
      observations: item.observations || "",
    })),
  };

  return (
    <div className="w-full">
      <EditarSolicitudBodegaClient requestId={id} warehouses={warehouses} articles={articles} initialData={initialData} />
    </div>
  );
}
