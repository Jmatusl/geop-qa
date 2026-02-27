/**
 * Componente: Tabla de Solicitudes Recientes
 * Archivo: components/supply/recent-requests-table.tsx
 * 
 * Muestra las solicitudes más recientes del módulo de insumos
 */

"use client";

import { useRecentSupplyRequests } from "@/lib/hooks/supply/use-supply-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Package } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En Proceso",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  FINALIZADA: "Finalizada",
  ANULADA: "Anulada",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDIENTE: "secondary",
  EN_PROCESO: "default",
  APROBADA: "default",
  RECHAZADA: "destructive",
  FINALIZADA: "outline",
  ANULADA: "outline",
};

const priorityLabels: Record<string, string> = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

interface RecentRequestsTableProps {
  limit?: number;
  showTitle?: boolean;
}

export function RecentRequestsTable({ limit = 10, showTitle = true }: RecentRequestsTableProps) {
  const { data: requests, isLoading } = useRecentSupplyRequests(limit);

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>Solicitudes Recientes</CardTitle>
            <CardDescription>Últimas solicitudes ingresadas al sistema</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>Solicitudes Recientes</CardTitle>
            <CardDescription>Últimas solicitudes ingresadas al sistema</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay solicitudes registradas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Solicitudes Recientes</CardTitle>
              <CardDescription>Últimas {requests.length} solicitudes ingresadas</CardDescription>
            </div>
            <Link href="/insumos/listado">
              <Button variant="outline" size="sm">
                Ver Todas
              </Button>
            </Link>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Folio</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Instalación</TableHead>
                <TableHead className="w-[150px]">Solicitado por</TableHead>
                <TableHead className="w-[100px] text-center">Items</TableHead>
                <TableHead className="w-[130px]">Estado</TableHead>
                <TableHead className="w-[130px]">Valor Estimado</TableHead>
                <TableHead className="w-[120px]">Fecha</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/insumos/${request.id}`}
                      className="hover:underline text-blue-600 dark:text-blue-400"
                    >
                      {request.folio}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[250px]">
                      <p className="truncate font-medium">{request.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate max-w-[150px] text-sm text-muted-foreground">
                      {request.installation.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-sm">{request.requestedBy.name}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {request.itemsCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[request.status] || "default"}>
                      {statusLabels[request.status] || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                        minimumFractionDigits: 0,
                      }).format(request.estimatedValue)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(request.createdAt), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Link href={`/insumos/${request.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
