import { getPendingRequests } from "./actions";
import PendientesClient from "./components/PendientesClient";
import PendientesDesktop from "./components/PendientesDesktop";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const requests = await getPendingRequests();

  return (
    <div className="w-full">
      <div className="lg:hidden">
        <PendientesClient initialData={requests} />
      </div>
      <div className="hidden lg:block">
        <PendientesDesktop initialData={requests} />
      </div>
    </div>
  );
}
