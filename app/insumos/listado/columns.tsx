/**
 * Componente: Columnas de Tabla de Solicitudes de Insumos
 * Archivo: app/insumos/listado/columns.tsx
 *
 * Definición de columnas rediseñadas para TanStack Table
 */

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  XCircle,
  PackageCheck,
  Info,
  FileSearch,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import type { SupplyRequestListItem } from "@/lib/hooks/supply/use-supply-requests";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --------------- Configuración de colores por estado de solicitud ---------------

/** Color del círculo indicador en la columna FOLIO */
const folioCircleColor: Record<string, string> = {
  PENDIENTE: "bg-amber-400",
  EN_PROCESO: "bg-blue-500",
  APROBADA: "bg-emerald-500",
  RECHAZADA: "bg-red-500",
  FINALIZADA: "bg-slate-400",
  ANULADA: "bg-red-400",
};

/** Clases Tailwind para el badge de estado de solicitud */
const statusBadgeStyle: Record<string, string> = {
  PENDIENTE:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  EN_PROCESO:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  APROBADA:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  RECHAZADA:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  FINALIZADA:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  ANULADA:
    "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const statusLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En Cotización",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  FINALIZADA: "Finalizada",
  ANULADA: "Anulada",
};

// --------------- Configuración de colores para estados de items ---------------

/** Clases para badges de estado de items individuales */
const itemStatusStyle: Record<string, string> = {
  PENDIENTE:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  COTIZADO:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  EN_COTIZACION:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  AUTORIZADO:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
  APROBADO:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  RECHAZADO:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  ENTREGADO:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300",
  NO_DISPONIBLE:
    "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const itemStatusLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  COTIZADO: "Cotizado",
  EN_COTIZACION: "En Cotización",
  AUTORIZADO: "Autorizado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  ENTREGADO: "Entregado",
  NO_DISPONIBLE: "No Disponible",
};

// --------------- Definición de columnas ---------------

export const columns: ColumnDef<SupplyRequestListItem>[] = [
  // FOLIO — con indicador de color + link
  {
    accessorKey: "folio",
    header: "Folio",
    cell: ({ row }) => {
      const folio = row.getValue("folio") as string;
      const status = row.original.status;
      return (
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <Link href={`/insumos/${row.original.id}`} className="flex items-center gap-2 group">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${folioCircleColor[status] ?? "bg-slate-400"}`}
              />
              <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:underline whitespace-nowrap">
                {folio}
              </span>
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72 text-xs">
                <div className="space-y-1">
                  <p><span className="font-semibold">Folio:</span> {row.original.folio}</p>
                  <p><span className="font-semibold">Fecha:</span> {format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: es })}</p>
                  <p><span className="font-semibold">Estado:</span> {statusLabel[row.original.status] ?? row.original.status}</p>
                  <p><span className="font-semibold">Instalación:</span> {row.original.installation.name}</p>
                  <p><span className="font-semibold">Solicitante:</span> {row.original.creator.name}</p>
                  <p className="line-clamp-2"><span className="font-semibold">Descripción:</span> {row.original.description || row.original.title || "-"}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      );
    },
  },

  // ESTADO — badge con colores
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            statusBadgeStyle[status] ?? "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          {statusLabel[status] ?? status}
        </span>
      );
    },
  },

  // DES. SOLICITANTE — título + descripción truncada
  {
    accessorKey: "title",
    header: "Des. Solicitante",
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      const desc = row.original.description;
      return (
        <div className="max-w-55">
          <p className="text-sm font-medium leading-tight line-clamp-1">{title}</p>
          {desc && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{desc}</p>
          )}
        </div>
      );
    },
  },

  // INSTALACIÓN
  {
    accessorKey: "installation",
    header: "Instalación",
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{row.original.installation.name}</span>
    ),
  },

  // SOLICITANTE
  {
    accessorKey: "creator",
    header: "Solicitante",
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{row.original.creator.name}</span>
    ),
  },

  // FECHA — creación
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(date, "dd/MM/yyyy", { locale: es })}
        </span>
      );
    },
  },

  // ITEMS — conteo clickeable
  {
    accessorKey: "itemsCount",
    header: "Items",
    cell: ({ row, table }) => {
      const count = row.original.itemsCount;
      
      // Accedemos a la función openItemsModal del meta de la tabla
      const openModal = (table.options.meta as any)?.openItemsModal;
      
      return (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openModal?.(row.original.id)}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors cursor-pointer"
          >
            {count}
          </button>
        </div>
      );
    },
  },

  // COTIZACIONES — con tooltip
  {
    accessorKey: "quotationsCount",
    header: "Cotizaciones",
    cell: ({ row }) => {
      const cots = row.original.quotationsCount;
      const approved = row.original.quotationsSummary.filter((q) => q.statusCode === "APROBADA").length;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-center hover:bg-accent/50 rounded-md px-2 py-1 transition-colors">
                <span className="block text-sm font-semibold tabular-nums">{cots}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap inline-flex items-center gap-1">
                  Aprobadas: {approved}
                  <FileSearch className="h-3 w-3" />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-96 text-xs">
              <div className="space-y-2">
                <p className="font-semibold">Total Cotizaciones: {cots} | Aprobadas: {approved}</p>
                {row.original.quotationsSummary.length === 0 ? (
                  <p className="text-muted-foreground">Sin cotizaciones registradas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {row.original.quotationsSummary.map((quotation) => (
                      <div key={quotation.id} className="rounded border border-border p-2">
                        <p><span className="font-semibold">Código:</span> {quotation.folio}</p>
                        <p><span className="font-semibold">Monto:</span> {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(quotation.totalAmount ?? 0)}</p>
                        <p><span className="font-semibold">Estado:</span> {quotation.statusCode}</p>
                        <p className="truncate"><span className="font-semibold">Proveedor:</span> {quotation.supplierName}</p>
                        <p><span className="font-semibold">OC:</span> {quotation.purchaseOrderNumber || "-"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },

  // ESTADOS ITEMS — resumen de estados como badges
  {
    id: "itemStatusSummary",
    header: "Estados Items",
    cell: ({ row }) => {
      const summary = row.original.itemStatusSummary;
      const entries = Object.entries(summary);
      if (entries.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {entries.map(([code, cnt]) => (
            <span
              key={code}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                itemStatusStyle[code] ?? "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {itemStatusLabel[code] ?? code}: {cnt}
            </span>
          ))}
        </div>
      );
    },
  },

  // ACCIONES
  {
    id: "actions",
    cell: ({ row }) => {
      const req = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/insumos/${req.id}`} className="flex items-center cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </Link>
            </DropdownMenuItem>
            {req.status === "PENDIENTE" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/insumos/${req.id}`} className="flex items-center cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600">
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Aprobar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
