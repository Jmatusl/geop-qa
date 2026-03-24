import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Package, Warehouse } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BodegaDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [warehouse, stockRows, recentMovements] = await Promise.all([
    prisma.bodegaWarehouse.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.bodegaStock.findMany({
      where: { warehouseId: id },
      include: {
        article: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            minimumStock: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.bodegaTransaction.findMany({
      where: { warehouseId: id },
      include: {
        items: {
          include: {
            article: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!warehouse) {
    notFound();
  }

  const totalQuantity = stockRows.reduce((acc, row) => acc + Number(row.quantity), 0);
  const lowStockCount = stockRows.reduce((acc, row) => {
    const available = Number(row.quantity) - Number(row.reservedQuantity);
    const minimum = Number(row.article.minimumStock);
    return available < minimum ? acc + 1 : acc;
  }, 0);

  return (
    <div className="w-full space-y-4 p-4 lg:p-6">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: warehouse.name }]} />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/bodega">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-extrabold uppercase tracking-wide">{warehouse.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{totalQuantity.toLocaleString("es-CL")}</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Artículos con Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{lowStockCount}</p>
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Código Bodega</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{warehouse.code}</p>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Últimos Movimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay movimientos registrados en esta bodega.</p>
          ) : (
            recentMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {movement.folio} · {movement.type}
                  </p>
                  <p className="text-xs text-muted-foreground">{movement.items[0] ? `${movement.items[0].article.code} - ${movement.items[0].article.name}` : "Sin ítems"}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/bodega/movimientos/${movement.id}`}>Ver</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Stock (Top 20)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stockRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin stock registrado para esta bodega.</p>
          ) : (
            stockRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {row.article.code} · {row.article.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reservado: {Number(row.reservedQuantity)} {row.article.unit}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {Number(row.quantity)} {row.article.unit}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
