import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { bodegaTransactionService, BodegaTransactionError } from "@/lib/services/bodega/transaction-service";
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

  try {
    const transaction = await bodegaTransactionService.getById(id);

    const requestDto = {
      id: transaction.id,
      folio: transaction.folio,
      title: transaction.title ?? "",
      description: transaction.description ?? "",
      status: transaction.status,
      statusName: transaction.status,
      priority: transaction.priority ?? "NORMAL",
      warehouseName: transaction.warehouse.name,
      requesterName: transaction.requester 
        ? `${transaction.requester.firstName} ${transaction.requester.lastName}` 
        : "N/A",
      externalReference: transaction.externalReference ?? null,
      requiredDate: transaction.requiredDate ? new Date(transaction.requiredDate).toISOString() : null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      items: transaction.items.map((item) => ({
        id: item.id,
        articleId: item.articleId,
        articleCode: item.article.code,
        articleName: item.article.name,
        quantity: item.quantity.toString(),
        deliveredQuantity: item.deliveredQuantity.toString(),
        observations: item.observations,
        warehouseId: transaction.warehouseId,
        warehouseName: transaction.warehouse.name,
        unit: item.article.unit ?? "und",
      })),
      logs: transaction.logs.map((log) => ({
        id: log.id,
        action: log.action,
        description: log.description,
        createdAt: log.createdAt.toISOString(),
        creatorName: log.creator ? `${log.creator.firstName} ${log.creator.lastName}` : null,
      })),
    };

    return <DetalleSolicitudClient request={requestDto} />;
  } catch (error) {
    if (error instanceof BodegaTransactionError) {
      notFound();
    }
    throw error;
  }
}
