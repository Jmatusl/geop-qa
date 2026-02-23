import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { validateMenuAccess } from "@/lib/auth/access";
import IngresoClient from "./components/IngresoClient";
import IngresoDesktop from "./components/IngresoDesktop";

export const metadata = {
  title: "Ingreso de Requerimiento | MantenimientoGEOP",
  description: "Formulario para ingresar nuevos requerimientos de mantenimiento.",
};

export default async function IngresoMantencionPage() {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  // Autorizar acceso al módulo
  const isAuthorized = await validateMenuAccess(session.userId, "/mantencion/ingreso");
  if (!isAuthorized) {
    redirect("/desautorizado");
  }

  // Cargar taxonomía para los selects en cascada
  const [installations, areas, systems, equipments, types, applicants] = await Promise.all([
    prisma.mntInstallation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.mntArea.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.mntSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, areaId: true },
    }),
    // @ts-ignore
    prisma.mntEquipment.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 100, // Límite razonable para carga inicial
      include: {
        system: {
          select: { name: true, area: { select: { name: true } } },
        },
      },
    }),
    prisma.mntRequestType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.mntApplicant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, installations: { select: { id: true } } },
    }),
  ]);

  return (
    <div className="w-full">
      {/* Versión Móvil */}
      <div className="lg:hidden">
        <IngresoClient data={{ installations, areas, systems, equipments, types, applicants }} />
      </div>

      {/* Versión Escritorio */}
      <div className="hidden lg:block animate-in fade-in slide-in-from-bottom-4 duration-500 lg:space-y-4 lg:pb-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ingresar Requerimiento</h1>
          <p className="text-muted-foreground text-base max-w-2xl">Registre una nueva anomalía operativa, falla técnica o solicitud de trabajo para su posterior evaluación.</p>
        </div>
        <IngresoDesktop data={{ installations, areas, systems, equipments, types, applicants }} />
      </div>
    </div>
  );
}
