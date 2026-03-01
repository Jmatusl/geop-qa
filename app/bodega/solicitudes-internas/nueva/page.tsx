import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NuevaSolicitudBodegaClient from "./NuevaSolicitudBodegaClient";

export const metadata = {
  title: "Nueva Solicitud Interna | Bodega",
};

export default async function NuevaSolicitudInternaPage() {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const [warehouses, articles] = await Promise.all([
    prisma.bodegaWarehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
    prisma.bodegaArticle.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
      },
      take: 500,
    }),
  ]);

  if (warehouses.length === 0) {
    return (
      <div className="w-full p-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">Sin bodegas activas</h3>
          <p className="text-sm text-muted-foreground mt-1">Debe existir al menos una bodega activa para crear solicitudes.</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="w-full p-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">Sin artículos activos</h3>
          <p className="text-sm text-muted-foreground mt-1">Debe existir al menos un artículo activo para crear solicitudes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <NuevaSolicitudBodegaClient warehouses={warehouses} articles={articles} />
    </div>
  );
}
