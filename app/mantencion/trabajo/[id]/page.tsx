import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getWorkRequirementDetail } from "./actions";
import { getExtendedConsolidatedCatalogs } from "../../consolidado/actions";
import WRDetailClient from "./components/WRDetailClient";
import WRDetailDesktop from "./components/WRDetailDesktop";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkRequirementDetailPage({ params }: PageProps) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { id } = await params;

  const [wr, catalogs] = await Promise.all([getWorkRequirementDetail(id), getExtendedConsolidatedCatalogs()]);

  if (!wr) {
    notFound();
  }

  return (
    <div className="w-full">
      <div className="lg:hidden">
        <WRDetailClient wr={wr} catalogs={catalogs} currentUser={session.user} />
      </div>
      <div className="hidden lg:block">
        <WRDetailDesktop wr={wr} catalogs={catalogs} currentUser={session.user} />
      </div>
    </div>
  );
}
