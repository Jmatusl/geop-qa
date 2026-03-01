"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useBodegaReservations } from "@/lib/hooks/bodega/use-bodega-reservations";

export function ReservasClient() {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    search: "",
  });

  const { data, isLoading, isFetching, refetch } = useBodegaReservations(filters);
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservas de Bodega</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de reservas de stock asociadas a solicitudes internas.</p>
      </div>

      <div className="w-full rounded-xl border border-border bg-white shadow-sm dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-55 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setFilters((prev) => ({ ...prev, page: 1, search: searchInput }));
                }
              }}
              placeholder="Buscar por folio, artículo o bodega..."
              className="pl-9"
              autoComplete="off"
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isFetching}>
            <RefreshCw className={`h-4 w-4 ${isLoading || isFetching ? "animate-spin" : ""}`} />
          </Button>

          <Button asChild>
            <Link href="/bodega/solicitudes-internas">Ir a solicitudes internas</Link>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Artículo</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Cargando reservas...
                  </TableCell>
                </TableRow>
              ) : (data?.data.length ?? 0) > 0 ? (
                data?.data.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/bodega/solicitudes-internas/${reservation.requestItem.request.id}`} className="font-mono text-primary hover:underline">
                        {reservation.requestItem.request.folio}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-80">
                      <p className="line-clamp-1 text-sm font-medium">{reservation.article.code}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{reservation.article.name}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{reservation.warehouse.name}</TableCell>
                    <TableCell>{reservation.quantity}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                        {reservation.status}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {reservation.expiresAt ? format(new Date(reservation.expiresAt), "dd/MM/yyyy", { locale: es }) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(reservation.createdAt), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay reservas para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total: {data?.meta.total ?? 0} registros</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Página {filters.page}</p>
          <div className="flex items-center gap-2">
            <Select
              value={String(filters.pageSize)}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  pageSize: Number(value),
                }))
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="icon"
              variant="outline"
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filters.page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
