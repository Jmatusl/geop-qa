import CreateSolicitudForm from "@/app/dashboard/mantencion/solicitud-insumos/components/CreateSolicitudForm";
import { getSolicitudInsumosById } from "@/actions/solicitud-insumos/solicitudActions";
import { getSession } from "@/lib/sessionRoles";
import { getUserOnShipByMail, getUserByEmail } from "@/actions/UserActions";
import useUserRolesServer from "@/actions/useUserRolesServer";
import { getShipsByIds, getShipSelect } from "@/actions/shipActions";
import { getCategoriasInsumos } from "@/actions/categoriaInsumosActions";

// Helper to convert a server-side solicitud (Prisma types) into a plain serializable object
function serializeSolicitud(solicitud: any) {
  if (!solicitud) return solicitud;

  const safe = { ...solicitud } as any;

  // Dates -> ISO strings
  if (safe.fechaEstimadaEntrega instanceof Date) safe.fechaEstimadaEntrega = safe.fechaEstimadaEntrega.toISOString();
  if (safe.createdAt instanceof Date) safe.createdAt = safe.createdAt.toISOString();
  if (safe.updatedAt instanceof Date) safe.updatedAt = safe.updatedAt.toISOString();

  // Items: convert Decimal -> number and Dates to ISO
  if (Array.isArray(safe.items)) {
    safe.items = safe.items.map((it: any) => {
      const item: any = { ...it };
      // quantity might be Prisma.Decimal
      if (item.quantity && typeof item.quantity === "object" && typeof item.quantity.toNumber === "function") {
        try {
          item.quantity = item.quantity.toNumber();
        } catch (e) {
          item.quantity = Number(item.quantity);
        }
      } else {
        item.quantity = Number(item.quantity ?? 0);
      }
      if (item.neededByDate instanceof Date) item.neededByDate = item.neededByDate.toISOString();
      if (item.createdAt instanceof Date) item.createdAt = item.createdAt.toISOString();
      if (item.updatedAt instanceof Date) item.updatedAt = item.updatedAt.toISOString();
      // remove any nested non-plain values (functions, getters)
      return item;
    });
  }

  // Adjuntos or other nested fields: try to stringify dates/decimals conservatively
  if (Array.isArray(safe.adjuntos)) {
    safe.adjuntos = safe.adjuntos.map((a: any) => {
      const copy = { ...a };
      if (copy.createdAt instanceof Date) copy.createdAt = copy.createdAt.toISOString();
      if (copy.updatedAt instanceof Date) copy.updatedAt = copy.updatedAt.toISOString();
      return copy;
    });
  }

  return safe;
}

export default async function EditPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const res = await getSolicitudInsumosById(id);

  if (!res.success || !res.data) {
    return <div>No encontrado</div>;
  }

  const solicitud = res.data;
  const serialized = serializeSolicitud(solicitud);
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
  // Obtener categorías desde la tabla CategoriaInsumos (si falla, usar fallback)
  const categoriasResp = await getCategoriasInsumos();
  // Usar exclusivamente las categorias desde la base de datos (vacío si no hay)
  const CATEGORIES = categoriasResp.success && Array.isArray(categoriasResp.data) ? categoriasResp.data.map((c: any) => ({ id: String(c.id), label: c.nombre })) : [];

  const URGENCIES = [
    { id: "BAJA", label: "Baja" },
    { id: "NORMAL", label: "Normal" },
    { id: "ALTA", label: "Alta" },
    { id: "URGENTE", label: "Urgente" },
  ] as const;

  // The form component is client; we pass initial data via props
  return (
    <div className=" p-4  pt-6">
      {/* Render client CreateSolicitudForm in edit mode by passing defaultValues and selectShips (plain data from server). */}
      <CreateSolicitudForm defaultValues={serialized} isEditMode selectShips={selectShips} categories={CATEGORIES as any} urgencies={URGENCIES as any} permisos={permisos} />
    </div>
  );
}
