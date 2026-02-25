import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import ListadoDesktop from "./components/ListadoDesktop";
import ListadoClient from "./components/ListadoClient";

export const metadata = {
  title: "Requerimientos de Actividades | GEOP Río Dulce",
  description: "Gestión de solicitudes de trabajo y actividades operativas.",
};

export default async function ActividadesListadoPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Carga catálogos y permisos en el servidor
  const [statuses, priorities, activityTypes, permissions] = await Promise.all([
    prisma.actStatusReq.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, code: true, colorHex: true } }),
    prisma.actPriority.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, code: true, colorHex: true } }),
    prisma.actActivityType.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    import("../configuracion/sistema/actions").then((m) => m.getMyActPermissions()),
  ]);

  const catalogs = { statuses, priorities, activityTypes };

  return (
    <div className="w-full">
      {/* Versión móvil */}
      <div className="lg:hidden">
        <ListadoClient permissions={permissions} />
      </div>

      {/* Versión escritorio */}
      <div className="hidden lg:block lg:space-y-4 lg:pb-10 lg:py-6">
        <ListadoDesktop catalogs={catalogs} permissions={permissions} />
      </div>
    </div>
  );
}
