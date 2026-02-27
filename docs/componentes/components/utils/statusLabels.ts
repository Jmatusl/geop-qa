export const statusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_COTIZACION: "En Cotización",
  RECEIVED: "Recibida",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export function getStatusLabel(status?: string | null) {
  if (!status) return "N/A";
  return statusLabels[status] || status;
}
