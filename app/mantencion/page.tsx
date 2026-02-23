import { redirect } from "next/navigation";

export default function MantencionPage() {
  // TODO: Add role-based redirect logic here in the future
  // For now, redirect to the consolidated view or entry form
  redirect("/mantencion/consolidado");
}
