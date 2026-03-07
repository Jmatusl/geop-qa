"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Edit, MoreHorizontal, Trash2, Clock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc" | null;

interface GetArticleColumnsProps {
  onEdit: (item: BodegaArticle) => void;
  onDelete: (item: BodegaArticle) => void;
  onViewHistory: (item: BodegaArticle) => void; // Nueva prop
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
}

const SORTABLE_COLUMNS: Record<string, boolean> = {
  code: true,
  name: true,
  articleType: true,
  isActive: true,
};

function SortableHeader({ title, sortKey, currentSort, onSort }: { title: string; sortKey: string; currentSort: { key: string | null; direction: SortDirection }; onSort: (key: string) => void }) {
  const isSorted = currentSort.key === sortKey;
  const direction = isSorted ? currentSort.direction : null;

  return (
    <Button variant="ghost" className="-ml-4 h-8 hover:bg-accent/50" onClick={() => onSort(sortKey)}>
      <span>{title}</span>
      <div className="ml-2 flex h-4 w-4 items-center justify-center">
        {direction === "asc" ? <ArrowUp className="h-4 w-4" /> : direction === "desc" ? <ArrowDown className="h-4 w-4" /> : <div className="h-4 w-4" />}
      </div>
    </Button>
  );
}

export const getArticleColumns = ({ onEdit, onDelete, onViewHistory, currentSort, onSort }: GetArticleColumnsProps): ColumnDef<BodegaArticle>[] => [
  {
    accessorKey: "imagePath",
    header: "Imagen",
    cell: ({ row }) => {
      const url = row.original.imagePath;
      const getFullUrl = (key: string) => {
        if (key.startsWith("http")) return key;
        return `/api/v1/storage/signed-url?key=${encodeURIComponent(key)}&redirect=true`;
      };

      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {url ? <img src={getFullUrl(url)} alt={row.original.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-400" />}
        </div>
      );
    },
  },
  {
    accessorKey: "code",
    header: () => (SORTABLE_COLUMNS.code ? <SortableHeader title="Código" sortKey="code" currentSort={currentSort} onSort={onSort} /> : "Código"),
    cell: ({ row }) => (
      <Button variant="link" className="h-auto p-0 font-bold text-[#283c7f] dark:text-blue-400" onClick={() => onEdit(row.original)}>
        {row.original.code}
      </Button>
    ),
  },
  {
    accessorKey: "name",
    header: () => (SORTABLE_COLUMNS.name ? <SortableHeader title="Nombre" sortKey="name" currentSort={currentSort} onSort={onSort} /> : "Nombre"),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="line-clamp-1 max-w-70 font-medium">{row.original.name}</span>
        {row.original.brand && (
          <span className="text-[10px] text-muted-foreground uppercase">
            {row.original.brand} {row.original.model}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "articleType",
    header: () => (SORTABLE_COLUMNS.articleType ? <SortableHeader title="Tipo" sortKey="articleType" currentSort={currentSort} onSort={onSort} /> : "Tipo"),
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.articleType || "N/A"}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: () => (SORTABLE_COLUMNS.isActive ? <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} /> : "Estado"),
    cell: ({ row }) => (row.original.isActive ? <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;

      return (
        <div className="flex h-full items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
            onClick={() => onEdit(item)}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
            onClick={() => onViewHistory(item)}
            title="Ver Historial"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => onDelete(item)}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
