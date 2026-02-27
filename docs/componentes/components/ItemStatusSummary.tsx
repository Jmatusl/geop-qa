// NUEVO COMPONENTE: ItemStatusSummary.tsx
import { Badge } from "@/components/ui/badge";
import { SolicitudItemStatus } from "@prisma/client";

interface ItemStatusSummaryProps {
  items: any[];
  itemStates: Record<number, SolicitudItemStatus>;
  updateItemStatus: (itemId: number, status: SolicitudItemStatus) => void;
}

export default function ItemStatusSummary({ items, itemStates, updateItemStatus }: ItemStatusSummaryProps) {
  const statusColors = {
    PENDIENTE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    EN_COTIZACION: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400",
    COTIZADO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
    APROBADO: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    RECHAZADO: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
    EN_ORDEN_COMPRA: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400",
    COMPLETADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  };

  const statusCounts = items.reduce(
    (acc, item) => {
      const status = itemStates[item.id] || item.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<SolicitudItemStatus, number>,
  );

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(statusCounts).map(([status, count]) => (
        <Badge key={status} variant="secondary" className={statusColors[status as SolicitudItemStatus]}>
          {String(status)}: {String(count)}
        </Badge>
      ))}
    </div>
  );
}
