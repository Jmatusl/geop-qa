import { getConsolidatedRequests, getExtendedConsolidatedCatalogs, getWorkRequirements } from "./actions";
import ConsolidadoWrapper from "./components/ConsolidadoWrapper";

export const dynamic = "force-dynamic";

export default async function ConsolidadoPage() {
  const [requests, catalogs, workRequirements] = await Promise.all([getConsolidatedRequests(), getExtendedConsolidatedCatalogs(), getWorkRequirements()]);

  return (
    <div className="w-full p-4">
      <ConsolidadoWrapper initialData={requests} workRequirements={workRequirements} catalogs={catalogs} />
    </div>
  );
}
