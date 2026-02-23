import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getUserNotificationPreferences } from "./actions";
import { NotificacionesClient } from "./components/NotificacionesClient";

export const metadata = {
  title: "Mis Notificaciones | MantenimientoGEOP",
  description: "Configure sus preferencias individuales de alertas y notificaciones.",
};

export default async function NotificacionesPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const initialPrefs = await getUserNotificationPreferences();

  return (
    <div className="w-full">
      <NotificacionesClient initialPrefs={initialPrefs} />
    </div>
  );
}
