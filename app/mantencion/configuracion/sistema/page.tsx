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

  // Obtener usuarios para el selector de Aprobación Cruzada
  const { prisma } = await import("@/lib/prisma");
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="w-full">
      <SistemaConfigClient initialConfig={config} users={users} />
    </div>
  );
}
