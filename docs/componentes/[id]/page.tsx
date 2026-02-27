import React from "react";
import { notFound } from "next/navigation";
import { getSolicitudPageData } from "@/actions/solicitud-insumos/solicitudActions";
import { getUserByEmail, getUserOnShipByMail } from "@/actions/UserActions";
import { getSession } from "@/lib/sessionRoles";
import useUserRolesServer from "@/actions/useUserRolesServer";
import SolicitudDetailClient from "./SolicitudDetailClient";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getSession();
  const userId = session?.user?.email || "";

  // Obtener información del usuario y permisos
  const user = await getUserByEmail(userId);
  const shipId = session?.user?.shipId || null;
  const userOnShipBD = await getUserOnShipByMail(userId);
  const userOnShip = userOnShipBD?.UserOnShip;

  const { isAllowed } = await useUserRolesServer(session.user?.id, [7, 8, 10]);

  // Permisos específicos
  const gestionaCotizaciones = user?.gestionaCotizaciones || false;
  const apruebaCotizaciones = user?.apruebaCotizaciones || false;
  const autorizaCotizaciones = user?.autorizaCotizaciones || false;

  const permisos = {
    gestionaCotizaciones,
    apruebaCotizaciones,
    autorizaCotizaciones,
  };

  const selectShips = {
    isAllowed,
    shipId,
    userOnShip,
  };

  // Obtener datos de la solicitud
  const id = Number(params.id);
  const res = await getSolicitudPageData(id);

  if (!res.success) {
    notFound();
  }

  const { solicitud, proveedores, bodegas, usuarios } = (res as any).data;

  // Validar permisos de acceso a esta solicitud específica
  if (!isAllowed && solicitud.shipId !== shipId) {
    // Usuario sin permisos de admin intentando acceder a solicitud de otra nave
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="mt-4">No tienes permisos para ver esta solicitud.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pt-6">
      <SolicitudDetailClient solicitudId={id} solicitud={solicitud} proveedores={proveedores} bodegas={bodegas} usuarios={usuarios} permisos={permisos} selectShips={selectShips} />
    </div>
  );
}
