import { getMntSystemConfig } from "./actions";
import SistemaConfigClient from "./components/SistemaConfigClient";
import { validateMenuAccess } from "@/lib/auth/access";
import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SistemaConfigPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const isAuthorized = await validateMenuAccess(session.user.id, "/mantencion/configuracion");
  if (!isAuthorized) redirect("/desautorizado");

  const config = await getMntSystemConfig();

  return (
    <div className="w-full">
      <SistemaConfigClient initialConfig={config} />
    </div>
  );
}
