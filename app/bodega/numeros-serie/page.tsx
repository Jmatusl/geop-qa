import NumerosSerieClient from "./NumerosSerieClient";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";

export default function NumerosSeriePage() {
  return (
    <div className="w-full space-y-4 p-4 lg:p-6">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Números de Serie" }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Números de Serie</h1>
        <p className="text-sm text-muted-foreground">Gestión de seriales para artículos con trazabilidad.</p>
      </div>
      <NumerosSerieClient />
    </div>
  );
}
