import { getConsolidatedRequests, getExtendedConsolidatedCatalogs, getWorkRequirements } from "./actions";
import ConsolidadoClient from "./components/ConsolidadoClient";

export const dynamic = "force-dynamic";

export default async function ConsolidadoPage() {
  const [requests, catalogs, workRequirements] = await Promise.all([getConsolidatedRequests(), getExtendedConsolidatedCatalogs(), getWorkRequirements()]);

  return (
    <div className="w-full">
      <ConsolidadoClient initialData={requests} workRequirements={workRequirements} catalogs={catalogs} />
    </div>
  );
}
