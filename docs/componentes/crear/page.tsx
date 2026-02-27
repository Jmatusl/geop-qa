import React from "react";
import { getSession } from "@/lib/sessionRoles";
import { getUserOnShipByMail, getUserByEmail } from "@/actions/UserActions";
import useUserRolesServer from "@/actions/useUserRolesServer";
import { getShipsByIds, getShipSelect } from "@/actions/shipActions";
import CreateSolicitudFormClient from "../components/CreateSolicitudFormClient";
import { getCategoriasInsumos } from "@/actions/categoriaInsumosActions";

export default async function CreatePage() {
  const session = await getSession();
  const shipId = session?.user?.shipId || null;
  const userOnShipBD = await getUserOnShipByMail(session?.user?.email);
  const userOnShip = userOnShipBD?.UserOnShip;
  const { isAllowed } = await useUserRolesServer(session.user?.id, [7, 8, 10]);

  let shipSelect: { id: number; name: string }[] = [];

  if (isAllowed === true && userOnShip?.length == 0) {
    shipSelect = await getShipSelect();
  }

  // Si no tiene permisos y no está asignado a ninguna nave, cargar la nave fija
  if (isAllowed === false && userOnShip?.length == 0) {
    shipSelect = await getShipsByIds(shipId ? [shipId] : []);
  }

  const selectShips = {
    isAllowed,
    shipId,
    userOnShip,
    shipSelect,
  };

  // Permisos específicos de Solicitud de Insumos (cotizaciones)
  const user = await getUserByEmail(session?.user?.email || "");
  const gestionaCotizaciones = user?.gestionaCotizaciones || false;
  const apruebaCotizaciones = user?.apruebaCotizaciones || false;
  const autorizaCotizaciones = user?.autorizaCotizaciones || false;

  const permisos = {
    gestionaCotizaciones,
    apruebaCotizaciones,
    autorizaCotizaciones,
  };

  // Obtener categorías desde la tabla CategoriaInsumos
  const categoriasResp = await getCategoriasInsumos();
  const CATEGORIES = categoriasResp.success && Array.isArray(categoriasResp.data) ? categoriasResp.data.map((c: any) => ({ id: c.id.toString(), label: c.nombre })) : [];

  const URGENCIES = [
    { id: "BAJA", label: "Baja" },
    { id: "NORMAL", label: "Normal" },
    { id: "ALTA", label: "Alta" },
    { id: "URGENTE", label: "Urgente" },
  ];

  return (
    <div className="p-4 pt-6">
      <CreateSolicitudFormClient selectShips={selectShips} categories={CATEGORIES as any} urgencies={URGENCIES as any} permisos={permisos} />
    </div>
  );
}
