import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PersonalNotificationPreferences } from "@/components/notifications/PersonalNotificationPreferences";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Mis Notificaciones | GEOP",
  description: "Configure sus preferencias personales de notificaciones",
};

export default async function PersonalNotificationsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          Mis Notificaciones
        </h1>
        <p className="text-muted-foreground">
          Personalice qué notificaciones desea recibir según sus permisos en cada módulo operativo.
        </p>
      </div>

      {/* Componente Principal */}
      <PersonalNotificationPreferences />
    </div>
  );
}
