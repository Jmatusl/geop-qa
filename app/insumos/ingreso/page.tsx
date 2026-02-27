/**
 * Página: Ingreso de Solicitud de Insumos
 * Archivo: app/insumos/ingreso/page.tsx
 * 
 * Servidor Component que orquesta la vista de creación
 */

import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import IngresoDesktop from "./components/IngresoDesktop";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Nueva Solicitud de Insumos | Sistema GeOPRD",
};

export default async function IngresoSolicitudPage() {
  // Verificar sesión
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  // Obtener catálogos necesarios (server-side)
  const [categories, units, installations] = await Promise.all([
    // Categorías activas
    prisma.mntSupplyCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),

    // Unidades activas
    prisma.unitMaster.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 100, // Limitar a 100 para evitar sobrecarga
    }),

    // Instalaciones activas
    prisma.mntInstallation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Validar que existan datos maestros
  if (categories.length === 0) {
    return (
      <div className="w-full p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
            Sin Categorías Disponibles
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            No hay categorías de insumos activas. Por favor, contacte al administrador.
          </p>
        </div>
      </div>
    );
  }

  if (installations.length === 0) {
    return (
      <div className="w-full p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
            Sin Instalaciones Disponibles
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            No hay instalaciones activas. Por favor, contacte al administrador.
          </p>
        </div>
      </div>
    );
  }

  const currentUserName = `${session.user.firstName} ${session.user.lastName}`.trim();

  return (
    <div className="w-full">
      <IngresoDesktop
        categories={categories}
        units={units}
        installations={installations}
        currentUserId={session.user.id}
        currentUserName={currentUserName}
      />
    </div>
  );
}
