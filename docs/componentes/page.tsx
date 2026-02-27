import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SolicitudesTableClient from "./components/SolicitudesTableClient";
import { getUserByEmail, getUserOnShipByMail } from "@/actions/UserActions";
import { getSession } from "@/lib/sessionRoles";
import useUserRolesServer from "@/actions/useUserRolesServer";
import { getShipSelect } from "@/actions/shipActions";

export default async function SolicitudInsumosPage() {
  const session = await getSession();
  const userId = session?.user?.email || "";

  // Obtener información del usuario y permisos
  const user = await getUserByEmail(userId);
  const shipId = session?.user?.shipId || null;
  const userOnShipBD = await getUserOnShipByMail(userId);
  const userOnShip = userOnShipBD?.UserOnShip;

  // Verificar si es administrador (roles 7, 8, 10)
  const { isAllowed } = await useUserRolesServer(session.user?.id, [7, 8, 10]);

  // Permisos específicos de Solicitud de Insumos
  const gestionaCotizaciones = user?.gestionaCotizaciones || false;
  const apruebaCotizaciones = user?.apruebaCotizaciones || false;
  const autorizaCotizaciones = user?.autorizaCotizaciones || false;

  // Configurar selección de naves
  let shipSelect: { id: number; name: string }[] = [];
  if (isAllowed === true && userOnShip?.length == 0) {
    shipSelect = await getShipSelect();
  }

  const selectShips = {
    isAllowed,
    shipId,
    userOnShip,
    shipSelect,
  };

  const permisos = {
    gestionaCotizaciones,
    apruebaCotizaciones,
    autorizaCotizaciones,
  };

  return (
    <div className="p-4 py-6">
      {/* <pre>{JSON.stringify({ isAllowed, shipId, userOnShip, shipSelect }, null, 2)}</pre> */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Solicitudes de Insumos</h1>
        <Link href="/dashboard/mantencion/solicitud-insumos/crear">
          <Button className="bg-custom-blue text-white hover:bg-blue-600">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      <SolicitudesTableClient permisos={permisos} selectShips={selectShips} />
    </div>
  );
}
