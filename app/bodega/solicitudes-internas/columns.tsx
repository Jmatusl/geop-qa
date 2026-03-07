"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Eye, Edit, Trash2, Send, MoreVertical, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BodegaInternalRequestListItem } from "@/lib/hooks/bodega/use-bodega-internal-requests";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc" | null;

interface GetRequestColumnsProps {
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
  onEdit?: (id: string) => void;
  onSend?: (id: string) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPrepare?: (id: string) => void;
  onDeliver?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "BORRADOR", className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
  PENDIENTE: { label: "PENDIENTE", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  APROBADA: { label: "APROBADA", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  RECHAZADA: { label: "RECHAZADA", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  EN_PREPARACION: { label: "EN PREPARACIÓN", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  LISTA_PARA_ENTREGA: { label: "LISTA PARA ENTREGA", className: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400" },
  ENTREGADA: { label: "ENTREGADA", className: "bg-slate-900 text-white border-slate-950 dark:bg-white dark:text-black dark:border-white" },
  ANULADA: { label: "ANULADA", className: "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  BAJA: { label: "BAJA", className: "text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-900/50" },
  NORMAL: { label: "NORMAL", className: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/50" },
  ALTA: { label: "ALTA", className: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/50" },
  URGENTE: { label: "URGENTE", className: "text-red-700 border-red-200 bg-red-50 dark:bg-red-900/50" },
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

const SortableHeader = ({ title, sortKey, currentSort, onSort }: { title: string; sortKey: string; currentSort: { key: string | null; direction: SortDirection }; onSort: (key: string) => void }) => {
  const isSorted = currentSort.key === sortKey;
  const direction = isSorted ? currentSort.direction : null;

  return (
    <Button variant="ghost" onClick={() => onSort(sortKey)} className="-ml-3 h-8 hover:bg-accent/50 text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400">
      <span>{title}</span>
      {direction === "asc" && <ArrowUp className="ml-2 h-3 w-3" />}
      {direction === "desc" && <ArrowDown className="ml-2 h-3 w-3" />}
      {!direction && <div className="ml-2 h-3 w-3" aria-hidden="true" />}
    </Button>
  );
};

export const getRequestColumns = ({ currentSort, onSort, onEdit, onSend, onDelete, onApprove, onReject, onPrepare, onDeliver }: GetRequestColumnsProps): ColumnDef<BodegaInternalRequestListItem>[] => [
  {
    accessorKey: "folio",
    header: () => (SORTABLE_COLUMNS.folio ? <SortableHeader title="Folio" sortKey="folio" currentSort={currentSort} onSort={onSort} /> : "Folio"),
    cell: ({ row }) => (
      <Link href={`/bodega/solicitudes-internas/${row.original.id}`} className="font-mono text-[11px] font-black text-[#283c7f] dark:text-blue-400 hover:underline px-2">
        {row.original.folio}
      </Link>
    ),
  },
  {
    accessorKey: "requester",
    header: () => (SORTABLE_COLUMNS.requester ? <SortableHeader title="Solicitante" sortKey="requester" currentSort={currentSort} onSort={onSort} /> : "Solicitante"),
    cell: ({ row }) => {
      const { requester } = row.original;
      return (
        <div className="flex flex-col min-w-[150px]">
          <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">{`${requester.firstName} ${requester.lastName}`}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight tracking-tight">{requester.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "title",
    header: () => (SORTABLE_COLUMNS.title ? <SortableHeader title="Requerimiento" sortKey="title" currentSort={currentSort} onSort={onSort} /> : "Requerimiento"),
    cell: ({ row }) => (
      <div className="max-w-[300px]">
        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug">{row.original.title}</p>
      </div>
    ),
  },
  {
    id: "items",
    header: () => <div className="text-center text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 px-4">Items</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800 text-[10px] font-bold h-6 px-2 lowercase">
          {row.original._count.items} items
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: () => (SORTABLE_COLUMNS.priority ? <SortableHeader title="Prioridad" sortKey="priority" currentSort={currentSort} onSort={onSort} /> : "Prioridad"),
    cell: ({ row }) => {
      const config = priorityConfig[row.original.priority] || { label: row.original.priority, className: "" };
      return (
        <div className="flex justify-center">
          <Badge variant="outline" className={cn("text-[10px] h-6 px-3 bg-white dark:bg-transparent font-black tracking-tighter italic", config.className)}>
            — {config.label}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "statusCode",
    header: () => (SORTABLE_COLUMNS.statusCode ? <SortableHeader title="Estado" sortKey="statusCode" currentSort={currentSort} onSort={onSort} /> : "Estado"),
    cell: ({ row }) => {
      const config = statusConfig[row.original.statusCode] || { label: row.original.statusCode, className: "" };
      return <Badge className={cn("text-[9px] font-black tracking-widest uppercase h-6 px-4 rounded-full border shadow-sm", config.className)}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: "createdAt",
    header: () => (SORTABLE_COLUMNS.createdAt ? <SortableHeader title="Fecha" sortKey="createdAt" currentSort={currentSort} onSort={onSort} /> : "Fecha"),
    cell: ({ row }) => <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{format(new Date(row.original.createdAt), "dd MMM yyyy", { locale: es })}</span>,
  },
  {
    id: "actions",
    header: () => <div className="text-right text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 px-4">Acciones</div>,
    cell: ({ row }) => {
      const solicitud = row.original;
      const status = solicitud.statusCode;
      const id = solicitud.id;

      // Lógica de visibilidad por estado
      const isBorrador = status === "BORRADOR";
      const canEdit = ["BORRADOR", "PENDIENTE"].includes(status);
      const canSend = isBorrador;
      const canDelete = ["BORRADOR", "RECHAZADA", "ANULADA"].includes(status);
      const canApprove = status === "PENDIENTE";
      const canStockActions = ["APROBADA", "PARCIAL", "PREPARADA"].includes(status);

      return (
        <div className="flex justify-end p-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <span className="sr-only">Abrir menú</span>
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] p-1 border-slate-200 dark:border-slate-800 shadow-lg z-100! animate-in fade-in zoom-in-95 duration-100">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 py-1.5 italic">Acciones Disponibles</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              <DropdownMenuItem
                asChild
                className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 italic"
              >
                <Link href={`/bodega/solicitudes-internas/${id}`}>
                  <Eye className="h-3.5 w-3.5" />
                  Visualizar Detalle
                </Link>
              </DropdownMenuItem>

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit?.(id)}
                  className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-600 dark:text-slate-300 italic"
                >
                  <Edit className="h-3.5 w-3.5 text-amber-500" />
                  Editar Registro
                </DropdownMenuItem>
              )}

              {canSend && (
                <DropdownMenuItem
                  onClick={() => onSend?.(id)}
                  className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 italic"
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar a Aprobación
                </DropdownMenuItem>
              )}

              {canApprove && (
                <>
                  <DropdownMenuItem
                    onClick={() => onApprove?.(id)}
                    className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 italic"
                  >
                    Aprobar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReject?.(id)}
                    className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 italic"
                  >
                    Rechazar
                  </DropdownMenuItem>
                </>
              )}

              {canStockActions && (
                <>
                  {(status === "APROBADA" || status === "PARCIAL") && (
                    <DropdownMenuItem
                      onClick={() => onPrepare?.(id)}
                      className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 italic"
                    >
                      Preparar Entrega
                    </DropdownMenuItem>
                  )}
                  {(status === "PREPARADA" || status === "PARCIAL") && (
                    <DropdownMenuItem
                      onClick={() => onDeliver?.(id)}
                      className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 italic"
                    >
                      Retirar Todos los Artículos
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(id)}
                    className="flex items-center gap-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 italic"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Solicitud
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
