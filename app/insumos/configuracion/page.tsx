import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getInsumosSystemConfig } from "./actions";
import InsumosConfigClient from "./components/InsumosConfigClient";

export const metadata = {
  title: "Configuración — Insumos | GEOP Río Dulce",
};

export default async function InsumosConfigPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const config = await getInsumosSystemConfig();

  return (
    <div className="w-full lg:py-6">
      <InsumosConfigClient initialConfig={config} />
    </div>
  );
}
