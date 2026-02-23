"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, ImageIcon, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";

export type PendingRequest = {
  id: string;
  folio: number;
  folioPrefix: string;
  createdAt: Date;
  equipment: {
    name: string;
    brand: string | null;
    model: string | null;
  };
  type: {
    name: string;
  };
  description: string;
  installation: {
    name: string;
  };
  evidences: any[];
};

interface ColumnProps {
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetails: (request: PendingRequest) => void;
}

export const SORTABLE_COLUMNS: Record<string, boolean> = {
  folio: true,
  createdAt: true,
  equipment_name: true,
  type_name: true,
  description: false,
  installation_name: true,
  evidences: false,
  actions: false,
};

const SortableHeader = ({ column, title }: { column: any; title: string }) => {
  const isSortable = SORTABLE_COLUMNS[column.id];

  if (!isSortable) {
    return <span>{title}</span>;
  }

  return (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 h-auto hover:bg-transparent flex items-center gap-1 font-bold">
      {title}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="h-4 w-4 text-blue-500" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="h-4 w-4 text-blue-500" />
      ) : (
        <div className="w-4 h-4 opacity-50 text-slate-300" />
      )}
    </Button>
  );
};

export const getColumns = ({ onApprove, onReject, onViewDetails }: ColumnProps): ColumnDef<PendingRequest>[] => [
  {
    accessorKey: "folio",
    header: ({ column }) => <SortableHeader column={column} title="Folio" />,
    cell: ({ row }) => (
      <Link href={`/mantencion/gestion/${row.original.id}`} className="font-mono font-bold text-blue-600 hover:underline">
        #{row.original.folioPrefix}-{row.getValue("folio")}
      </Link>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} title="Ingreso" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm">{format(row.original.createdAt, "dd/MM/yyyy")}</span>
        <span className="text-xs text-muted-foreground">{format(row.original.createdAt, "HH:mm")}</span>
      </div>
    ),
  },
  {
    accessorFn: (row) => row.equipment.name,
    id: "equipment_name",
    header: ({ column }) => <SortableHeader column={column} title="Equipo" />,
    cell: ({ row }) => (
      <div className="flex flex-col max-w-[200px]">
        <span className="font-semibold truncate">{row.original.equipment.name}</span>
        <span className="text-xs text-muted-foreground truncate">
          {row.original.equipment.brand} {row.original.equipment.model}
        </span>
      </div>
    ),
  },
  {
    accessorFn: (row) => row.type.name,
    id: "type_name",
    header: ({ column }) => <SortableHeader column={column} title="Tipo" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium bg-slate-50 dark:bg-slate-800">
        {row.original.type.name}
      </Badge>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => <SortableHeader column={column} title="Descripción" />,
    cell: ({ row }) => (
      <p className="text-sm line-clamp-2 max-w-[300px]" title={row.original.description}>
        {row.original.description}
      </p>
    ),
  },
  {
    accessorFn: (row) => row.installation.name,
    id: "installation_name",
    header: ({ column }) => <SortableHeader column={column} title="Instalación" />,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.installation.name}</span>,
  },
  {
    id: "evidences",
    header: ({ column }) => <SortableHeader column={column} title="Evidencias" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        {row.original.evidences.length > 0 ? (
          <Badge variant="secondary" className="gap-1">
            <ImageIcon className="h-3 w-3" />
            {row.original.evidences.length}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs italic">Sin fotos</span>
        )}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right px-4">Acciones</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2 px-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" asChild>
                <Link href={`/mantencion/gestion/${row.original.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver Detalle</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                onClick={() => onApprove(row.original.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aprobar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => onReject(row.original.id)}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rechazar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    ),
  },
];
