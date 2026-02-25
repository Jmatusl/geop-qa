import { redirect } from "next/navigation";

export default function MantencionPage() {
  // TODO: Agregar lógica de redirección basada en roles de usuario en el futuro
  // For now, redirect to the consolidated view or entry form
  redirect("/mantencion/consolidado");
}
