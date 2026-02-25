import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import IngresoDesktop from "./components/IngresoDesktop";
import IngresoClient from "./components/IngresoClient";

export const metadata = {
  title: "Nuevo Requerimiento | GEOP Río Dulce",
  description: "Formulario para ingresar nuevos requerimientos de actividades.",
};

export default async function ActividadesIngresoPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Cargar catálogos en el servidor
  const [activityTypes, priorities, locations, users, ships, masterActivityNames, areas, suppliers] = await Promise.all([
    prisma.actActivityType.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.actPriority.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, colorHex: true } }),
    prisma.mntActivityLocation.findMany({ where: { isEnabled: true }, orderBy: { name: "asc" }, select: { id: true, name: true, commune: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true, email: true } }),
    prisma.mntInstallation.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.actMasterActivityName.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        defaultAreaId: true,
        defaultApplicantUserId: true,
        defaultDescription: true,
      },
    }),
    prisma.mntArea.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.mntSupplier.findMany({ where: { isActive: true }, orderBy: { fantasyName: "asc" }, select: { id: true, fantasyName: true, rut: true, legalName: true, contactEmail: true, activityEmails: true } }),
  ]);

  const catalogs = { activityTypes, priorities, locations, users, ships, masterActivityNames, areas, suppliers };

  return (
    <div className="w-full">
      {/* Versión móvil */}
      <div className="lg:hidden">
        <IngresoClient catalogs={catalogs} currentUser={session.user} />
      </div>

      {/* Versión escritorio */}
      <div className="hidden lg:block lg:py-6">
        <IngresoDesktop catalogs={catalogs} currentUser={session.user} />
      </div>
    </div>
  );
}
