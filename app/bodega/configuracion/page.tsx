import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { Warehouse, Tag, SlidersHorizontal, Package, Ruler, FileSpreadsheet, Wrench } from "lucide-react";
import { BodegaConfigDashboard } from "@/components/bodega/config-dashboard";

export const metadata = {
  title: "Configuración | Bodega",
  description: "Panel de control y mantenedores del módulo de bodega.",
};

const configurationCategories = [
  {
    title: "Catálogos Operativos",
    description: "Tablas maestras utilizadas en movimientos e ingresos.",
    items: [
      {
        title: "Bodegas",
        description: "Almacenes y ubicaciones físicas del inventario.",
        href: "/bodega/maestros/bodegas",
        iconName: "Warehouse",
        color: "text-blue-600",
        bg: "bg-blue-100 dark:bg-blue-900/40",
        border: "border-blue-200 dark:border-blue-800",
      },
      {
        title: "Artículos",
        description: "Catálogo de repuestos y materiales de bodega.",
        href: "/bodega/maestros/articulos",
        iconName: "Package",
        color: "text-indigo-600",
        bg: "bg-indigo-100 dark:bg-indigo-900/40",
        border: "border-indigo-200 dark:border-indigo-800",
      },
      {
        title: "Centros de Costo",
        description: "Clasificación contable para movimientos de bodega.",
        href: "/bodega/maestros/centros-costo",
        iconName: "Tag",
        color: "text-emerald-600",
        bg: "bg-emerald-100 dark:bg-emerald-900/40",
        border: "border-emerald-200 dark:border-emerald-800",
      },
      {
        title: "Unidades de Medida",
        description: "Unidades para cuantificar artículos (UNI, KG, MT...).",
        href: "/bodega/maestros/unidades-medida",
        iconName: "Ruler",
        color: "text-teal-600",
        bg: "bg-teal-100 dark:bg-teal-900/40",
        border: "border-teal-200 dark:border-teal-800",
      },
    ],
  },
  {
    title: "Parámetros de Operación",
    description: "Reglas y motivos que rigen el flujo de movimientos.",
    items: [
      {
        title: "Motivos de Ajuste",
        description: "Justificaciones válidas para ajustes de stock.",
        href: "/bodega/maestros/motivos-ajuste",
        iconName: "SlidersHorizontal",
        color: "text-orange-600",
        bg: "bg-orange-100 dark:bg-orange-900/40",
        border: "border-orange-200 dark:border-orange-800",
      },
      {
        title: "Reglas del Sistema",
        description: "FIFO, evidencia obligatoria, flujo de aprobación y notificaciones.",
        href: "/bodega/configuracion/sistema",
        iconName: "Wrench",
        color: "text-rose-600",
        bg: "bg-rose-100 dark:bg-rose-900/40",
        border: "border-rose-200 dark:border-rose-800",
      },
    ],
  },
  {
    title: "Herramientas de Datos",
    description: "Importación masiva y utilidades administrativas.",
    items: [
      {
        title: "Importar Cuadratura",
        description: "Carga inventario inicial desde archivo Excel.",
        href: "/bodega/maestros/importar-cuadratura",
        iconName: "FileSpreadsheet",
        color: "text-purple-600",
        bg: "bg-purple-100 dark:bg-purple-900/40",
        border: "border-purple-200 dark:border-purple-800",
      },
    ],
  },
];

export default async function BodegaConfiguracionPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return <BodegaConfigDashboard categories={configurationCategories} />;
}
