import OperacionesMasivasClient from "./OperacionesMasivasClient";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";

export default function OperacionesPage() {
  return (
    <div className="w-full space-y-4 p-4 lg:p-6">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Operaciones" }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operaciones Masivas</h1>
        <p className="text-sm text-muted-foreground">Accesos rápidos a operaciones del módulo de bodega.</p>
      </div>
      <OperacionesMasivasClient />
    </div>
  );
}
