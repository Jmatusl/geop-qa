import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ModuleNotificationsManager } from "@/components/notifications/ModuleNotificationsManager";
import { Settings, Bell } from "lucide-react";

export const metadata = {
  title: "Notificaciones por Módulo | GEOP",
  description: "Configuración centralizada de notificaciones operativas",
};

export default async function NotificationsManagerPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          Notificaciones por Módulo
        </h1>
        <p className="text-muted-foreground">
          Gestione las alertas por correo electrónico de cada módulo operativo del sistema.
        </p>
      </div>

      {/* Componente Principal */}
      <ModuleNotificationsManager />
    </div>
  );
}
