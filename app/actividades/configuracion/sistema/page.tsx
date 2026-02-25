import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getActSystemConfig } from "./actions";
import ActSistemaConfigClient from "./components/ActSistemaConfigClient";

export const metadata = {
  title: "Configuración — Requerimientos Actividades | GEOP Río Dulce",
};

export default async function ActSistemaConfigPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const config = await getActSystemConfig();

  return (
    <div className="w-full lg:py-6">
      <ActSistemaConfigClient initialConfig={config} />
    </div>
  );
}
