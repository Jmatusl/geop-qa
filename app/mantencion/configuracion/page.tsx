import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { validateMenuAccess } from "@/lib/auth/access";
import { Settings2, Building2, MapPin, HardHat, Briefcase, Factory, Wrench, Users, Truck, Workflow, Settings } from "lucide-react";
import { ConfigurationDashboard } from "@/components/mantencion/config-dashboard-client";

export const metadata = {
  title: "Configuración | Mantenimiento",
  description: "Panel de control y mantenedores del módulo de mantenimiento.",
};

const configurationCategories = [
  {
    title: "Maestros Operativos",
    description: "Configuración física y lógica de las operaciones.",
    items: [
      {
        title: "Instalaciones",
        description: "Naves, plantas o embarcaciones.",
        href: "/mantencion/configuracion/instalaciones",
        iconName: "Building2",
        color: "text-blue-600",
        bg: "bg-blue-100 dark:bg-blue-900/40",
        border: "border-blue-200 dark:border-blue-800",
      },
      {
        title: "Áreas de Producción",
        description: "Clasificación general operativa.",
        href: "/mantencion/configuracion/areas-produccion",
        iconName: "Factory",
        color: "text-indigo-600",
        bg: "bg-indigo-100 dark:bg-indigo-900/40",
        border: "border-indigo-200 dark:border-indigo-800",
      },
      {
        title: "Centros de Cultivo",
        description: "Locaciones geográficas del cultivo.",
        href: "/mantencion/configuracion/centros-cultivo",
        iconName: "MapPin",
        color: "text-teal-600",
        bg: "bg-teal-100 dark:bg-teal-900/40",
        border: "border-teal-200 dark:border-teal-800",
      },
      {
        title: "Lugares Físicos",
        description: "Ubicaciones dentro de una instalación.",
        href: "/mantencion/configuracion/lugares",
        iconName: "MapPin",
        color: "text-cyan-600",
        bg: "bg-cyan-100 dark:bg-cyan-900/40",
        border: "border-cyan-200 dark:border-cyan-800",
      },
    ],
  },
  {
    title: "Catálogo Técnico",
    description: "Definición de sistemas y hardware mantenible.",
    items: [
      {
        title: "Áreas Técnicas",
        description: "Mecánica, Eléctrica, etc.",
        href: "/mantencion/configuracion/areas",
        iconName: "Workflow",
        color: "text-purple-600",
        bg: "bg-purple-100 dark:bg-purple-900/40",
        border: "border-purple-200 dark:border-purple-800",
      },
      {
        title: "Sistemas",
        description: "Sub-divisiones técnicas.",
        href: "/mantencion/configuracion/sistemas",
        iconName: "Settings2",
        color: "text-rose-600",
        bg: "bg-rose-100 dark:bg-rose-900/40",
        border: "border-rose-200 dark:border-rose-800",
      },
      {
        title: "Equipos",
        description: "Máquinas y dispositivos.",
        href: "/mantencion/configuracion/equipos",
        iconName: "Wrench",
        color: "text-orange-600",
        bg: "bg-orange-100 dark:bg-orange-900/40",
        border: "border-orange-200 dark:border-orange-800",
      },
    ],
  },
  {
    title: "Esquema Organizacional",
    description: "Roles, cuentas y terceros del flujo.",
    items: [
      {
        title: "Cargos Operativos",
        description: "Funciones y perfiles de empleados.",
        href: "/mantencion/configuracion/cargos",
        iconName: "Briefcase",
        color: "text-green-600",
        bg: "bg-green-100 dark:bg-green-900/40",
        border: "border-green-200 dark:border-green-800",
      },
      {
        title: "Responsables",
        description: "Aprueban o revisan trabajos.",
        href: "/mantencion/configuracion/responsables",
        iconName: "HardHat",
        color: "text-amber-600",
        bg: "bg-amber-100 dark:bg-amber-900/40",
        border: "border-amber-200 dark:border-amber-800",
      },
      {
        title: "Solicitantes",
        description: "Crean requerimientos de mantención.",
        href: "/mantencion/configuracion/solicitantes",
        iconName: "Users",
        color: "text-emerald-600",
        bg: "bg-emerald-100 dark:bg-emerald-900/40",
        border: "border-emerald-200 dark:border-emerald-800",
      },
      {
        title: "Proveedores",
        description: "Maestranzas y terceros externos.",
        href: "/mantencion/configuracion/proveedores",
        iconName: "Truck",
        color: "text-slate-600",
        bg: "bg-slate-100 dark:bg-slate-700/40",
        border: "border-slate-200 dark:border-slate-700",
      },
    ],
  },
  {
    title: "Parámetros del Módulo",
    description: "Configuración técnica y lógica del sistema.",
    items: [
      {
        title: "Reglas del Sistema",
        description: "Notificaciones, aprobación y storage.",
        href: "/mantencion/configuracion/sistema",
        iconName: "Settings",
        color: "text-indigo-600",
        bg: "bg-indigo-100 dark:bg-indigo-900/40",
        border: "border-indigo-200 dark:border-indigo-800",
      },
    ],
  },
];

export default async function ConfiguracionMantencionPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const isAuthorized = await validateMenuAccess(session.userId, "/mantencion/configuracion");
  if (!isAuthorized) redirect("/desautorizado");

  return <ConfigurationDashboard categories={configurationCategories} />;
}
