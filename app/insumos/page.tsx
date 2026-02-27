/**
 * Página: Redirección a Listado de Insumos
 * Archivo: app/insumos/page.tsx
 * 
 * Redirige automáticamente al listado de solicitudes
 */

import { redirect } from "next/navigation";

export default function InsumosPage() {
  redirect("/insumos/listado");
}
