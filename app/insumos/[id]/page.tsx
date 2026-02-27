/**
 * Página: Detalle de Solicitud de Insumos
 * Archivo: app/insumos/[id]/page.tsx
 *
 * Orquestador Server Component — obtiene datos y pasa props.
 */

import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getSupplyRequestById } from "./actions";
import SupplyRequestDetail from "./components/SupplyRequestDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplyRequestDetailPage({ params }: PageProps) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { id } = await params;

  const request = await getSupplyRequestById(id);

  if (!request) {
    notFound();
  }

  return (
    <div className="w-full">
      <SupplyRequestDetail request={request} currentUser={session.user} />
    </div>
  );
}
