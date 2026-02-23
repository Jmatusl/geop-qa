import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getRequestDetail } from "./actions";
import { getConsolidatedCatalogs } from "../../consolidado/actions";
import RequestDetailClient from "./components/RequestDetailClient";
import RequestDetailDesktop from "./components/RequestDetailDesktop";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: PageProps) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { id } = await params;

  const [request, catalogs] = await Promise.all([getRequestDetail(id), getConsolidatedCatalogs()]);

  if (!request) {
    notFound();
  }

  return (
    <div className="w-full">
      {/* Versión móvil */}
      <div className="lg:hidden">
        <RequestDetailClient request={request} catalogs={catalogs} currentUser={session.user} />
      </div>
      {/* Versión escritorio */}
      <div className="hidden lg:block">
        <RequestDetailDesktop request={request} catalogs={catalogs} currentUser={session.user} />
      </div>
    </div>
  );
}
