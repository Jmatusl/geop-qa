import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import DetalleSolicitudClient from "./DetalleSolicitudClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BodegaSolicitudInternaDetallePage({ params }: PageProps) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const request = await prisma.bodegaInternalRequest.findUnique({
    where: { id },
    include: {
      status: true,
      warehouse: true,
      requester: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        include: {
          article: true,
        },
        orderBy: { displayOrder: "asc" },
      },
      logs: {
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) {
    notFound();
  }

  const requestDto = {
    id: request.id,
    folio: request.folio,
    title: request.title,
    description: request.description,
    statusCode: request.statusCode,
    statusName: request.status.name,
    warehouseName: request.warehouse.name,
    requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
    items: request.items.map((item) => ({
      id: item.id,
      articleCode: item.article.code,
      articleName: item.article.name,
      quantity: item.quantity.toString(),
      deliveredQuantity: item.deliveredQuantity.toString(),
      observations: item.observations,
    })),
    logs: request.logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      createdAt: log.createdAt.toISOString(),
      creatorName: log.creator ? `${log.creator.firstName} ${log.creator.lastName}` : null,
    })),
  };

  return <DetalleSolicitudClient request={requestDto} />;
}
