"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BodegaInternalRequestListItem } from "@/lib/hooks/bodega/use-bodega-internal-requests";

export type SortDirection = "asc" | "desc" | null;

interface GetRequestColumnsProps {
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
}

const statusLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  PARCIAL: "Parcial",
  ENTREGADA: "Entregada",
  ANULADA: "Anulada",
};

const priorityLabel: Record<string, string> = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

const SORTABLE_COLUMNS = {
  folio: true,
  statusCode: true,
  title: true,
  warehouse: true,
  requester: true,
  priority: true,
  createdAt: true,
};

const SortableHeader = ({
  title,
  sortKey,
  currentSort,
  onSort,
}: {
  title: string;
  sortKey: string;
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
}) => {
  const isSorted = currentSort.key === sortKey;
  const direction = isSorted ? currentSort.direction : null;

  return (
    <Button variant="ghost" onClick={() => onSort(sortKey)} className="-ml-3 h-8 hover:bg-accent/50">
      <span>{title}</span>
      {direction === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
      {direction === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
      {!direction && <div className="ml-2 h-4 w-4" aria-hidden="true" />}
    </Button>
  );
};

export const getRequestColumns = ({ currentSort, onSort }: GetRequestColumnsProps): ColumnDef<BodegaInternalRequestListItem>[] => [
  {
    accessorKey: "folio",
    header: () =>
      SORTABLE_COLUMNS.folio ? <SortableHeader title="Folio" sortKey="folio" currentSort={currentSort} onSort={onSort} /> : "Folio",
    cell: ({ row }) => (
      <Link href={`/bodega/solicitudes-internas/${row.original.id}`} className="font-mono text-sm font-semibold text-primary hover:underline whitespace-nowrap">
        {row.original.folio}
      </Link>
    ),
  },
  {
    accessorKey: "statusCode",
    header: () =>
      SORTABLE_COLUMNS.statusCode ? (
        <SortableHeader title="Estado" sortKey="statusCode" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Estado"
      ),
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
        {statusLabel[row.original.statusCode] ?? row.original.statusCode}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: () =>
      SORTABLE_COLUMNS.title ? (
        <SortableHeader title="Descripción" sortKey="title" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Descripción"
      ),
    cell: ({ row }) => (
      <div className="max-w-104">
        <p className="text-sm font-medium line-clamp-1">{row.original.title}</p>
        {row.original.description ? (
          <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "warehouse",
    header: () =>
      SORTABLE_COLUMNS.warehouse ? (
        <SortableHeader title="Bodega" sortKey="warehouse" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Bodega"
      ),
    cell: ({ row }) => <span className="text-sm whitespace-nowrap">{row.original.warehouse.name}</span>,
  },
  {
    accessorKey: "requester",
    header: () =>
      SORTABLE_COLUMNS.requester ? (
        <SortableHeader title="Solicitante" sortKey="requester" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Solicitante"
      ),
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{`${row.original.requester.firstName} ${row.original.requester.lastName}`}</span>
    ),
  },
  {
    accessorKey: "priority",
    header: () =>
      SORTABLE_COLUMNS.priority ? (
        <SortableHeader title="Prioridad" sortKey="priority" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Prioridad"
      ),
    cell: ({ row }) => <span className="text-sm whitespace-nowrap">{priorityLabel[row.original.priority] ?? row.original.priority}</span>,
  },
  {
    accessorKey: "createdAt",
    header: () =>
      SORTABLE_COLUMNS.createdAt ? (
        <SortableHeader title="Fecha" sortKey="createdAt" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Fecha"
      ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: es })}
      </span>
    ),
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2.5 text-xs font-semibold">
          {row.original._count.items}
        </span>
      </div>
    ),
  },
];
