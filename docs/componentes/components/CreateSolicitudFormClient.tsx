"use client";

import { useRouter } from "next/navigation";
import CreateSolicitudForm from "./CreateSolicitudForm";

interface Props {
  selectShips: {
    isAllowed: boolean;
    shipId?: number | null;
    userOnShip?: any[];
    shipSelect?: { id: number; name: string }[];
  };
  categories: Array<{ id: string; label: string }>;
  urgencies: Array<{ id: string; label: string }>;
  permisos?: {
    gestionaCotizaciones?: boolean;
    apruebaCotizaciones?: boolean;
    autorizaCotizaciones?: boolean;
  };
}

export default function CreateSolicitudFormClient({ selectShips, categories, urgencies, permisos }: Props) {
  const router = useRouter();

  return (
    <CreateSolicitudForm
      onCancel={() => router.push("/dashboard/mantencion/solicitud-insumos")}
      onSuccess={() => router.push("/dashboard/mantencion/solicitud-insumos")}
      selectShips={selectShips}
      categories={categories as any}
      urgencies={urgencies as any}
      permisos={permisos}
    />
  );
}
