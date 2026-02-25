import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { getActSystemConfig } from "./actions";
import ActSistemaConfigClient from "./components/ActSistemaConfigClient";

export const metadata = {
  title: "Configuración — Requerimientos Actividades | GEOP Río Dulce",
};

export default async function ActSistemaConfigPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const [config, users] = await Promise.all([
    getActSystemConfig(),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  return (
    <div className="w-full lg:py-6">
      <ActSistemaConfigClient initialConfig={config} users={users} />
    </div>
  );
}
