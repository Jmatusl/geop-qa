import { redirect } from "next/navigation";

/**
 * Redirección a la configuración global de notificaciones
 * 
 * Esta ruta redirige a /mantenedores/notificaciones donde se encuentra
 * la configuración global de notificaciones para todos los módulos operativos.
 * 
 * Para preferencias personales, usar /perfil/notificaciones
 */
export default function NotificacionesPageRedirect() {
  redirect("/mantenedores/notificaciones");
}
