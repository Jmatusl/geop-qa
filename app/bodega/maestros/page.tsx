import Link from "next/link";
import { DatabaseZap, FileSpreadsheet, HardDriveDownload, Warehouse } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  {
    title: "Artículos",
    description: "Gestiona el catálogo de artículos base de bodega.",
    href: "/bodega/maestros/articulos",
    icon: Warehouse,
  },
  {
    title: "Importar Cuadratura",
    description: "Carga inventario inicial o ajuste masivo desde archivo Excel.",
    href: "/bodega/maestros/importar-cuadratura",
    icon: FileSpreadsheet,
  },
  {
    title: "Limpiar Tablas",
    description: "Reinicia datos transaccionales para una nueva cuadratura.",
    href: "/bodega/maestros/limpiar-tablas",
    icon: DatabaseZap,
  },
  {
    title: "Bodegas",
    description: "Mantén la estructura de bodegas operativas del sistema.",
    href: "/bodega/maestros/bodegas",
    icon: HardDriveDownload,
  },
];

export default function BodegaMaestrosPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maestros de Bodega</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configura catálogos y utilidades administrativas del módulo.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.href} className="rounded-xl border border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4" />
                  {action.title}
                </CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={action.href}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
