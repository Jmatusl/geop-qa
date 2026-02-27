import { QueryClient } from "@tanstack/react-query";
import { sendCotizacionApprovalEmailAction } from "@/actions/emailActions";
import { updateProveedor } from "@/actions/proveedorActions";
import { appendCotizacionEmailLog, registrarEnvioCorreoProveedor } from "@/actions/solicitud-insumos/cotizacionActions";
import { revalidatePath } from "next/cache";

type Props = {
  cotizacionId: number;
  proveedorNombre: string;
  proveedorId: number | null;
  recipientEmail: string;
  purchaseOrderNumber?: string;
  cotizacionFolio?: string;
  totalEstimado?: number;
  proveedoresList?: any[];
  setEmailInputs?: (updater: (prev: { [key: string]: string }) => { [key: string]: string }) => void;
  queryClient?: QueryClient;
};

export async function sendCotizacionApprovalEmail({
  cotizacionId,
  proveedorNombre,
  proveedorId,
  recipientEmail,
  purchaseOrderNumber,
  cotizacionFolio,
  totalEstimado,
  proveedoresList,
  setEmailInputs,
  queryClient,
}: Props): Promise<{ success: boolean; message?: string }> {
  // Enviar email usando la server action existente
  try {
    const result = await sendCotizacionApprovalEmailAction({
      cotizacionId,
      recipientEmail,
      proveedorNombre,
      cotizacionFolio,
      totalEstimado,
    });

    if (!result || !result.success) {
      return { success: false, message: result?.message ?? "Error al enviar el email" };
    }

    // Registrar en CotizacionLog que se envió el correo de aprobación
    const recipients = String(recipientEmail)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const subject = `Cotización Aprobada: ${cotizacionFolio || ""} - ${proveedorNombre}`;
    const htmlContent = result.htmlContent || "";

    try {
      await registrarEnvioCorreoProveedor(cotizacionId, recipients, subject, htmlContent);
    } catch (err) {
      console.error("Error registering email send in log:", err);
      // No fallamos si no se puede registrar en log
    }

    // Persistir log de envío en cotizacion.emailLog
    try {
      const recipients = String(recipientEmail)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const subject = `Cotización Aprobada: ${cotizacionFolio || ""} - ${proveedorNombre}`;

      // Llamada a server action para persistir log en la cotización
      await appendCotizacionEmailLog({
        cotizacionId,
        log: {
          subject,
          recipients,
          purchaseOrderNumber: purchaseOrderNumber || null,
          messageId: result.messageId ?? null,
          createdAt: new Date().toISOString(),
          status: "enviado",
        },
      } as any);

      // Invalidar cache de cotización
      try {
        queryClient?.invalidateQueries({ queryKey: ["cotizacion", cotizacionId] });
        queryClient?.invalidateQueries({ queryKey: ["cotizaciones"] });
      } catch (e) {
        // ignore
      }

      // Revalidar paths en servidor
      try {
        revalidatePath("/dashboard/mantencion/solicitud-insumos");
      } catch (e) {
        // ignore - revalidatePath puede fallar en contextos no-servidor
      }
    } catch (err) {
      console.error("Error persisting cotizacion email log:", err);
      // no hacemos fail del envío por esto
    }

    // Si se envió correctamente, intentar persistir los emails en proveedor.emailActividades
    if (proveedorId && proveedoresList) {
      try {
        const prov = proveedoresList.find((p) => p.id === proveedorId) as any | undefined;
        const existingRaw = prov?.emailActividades?.emails ?? [];

        const existingEmailsSet = new Set<string>(
          existingRaw
            .map((e: any) => (typeof e === "string" ? e : e?.email || ""))
            .filter(Boolean)
            .map((s: string) => s.toLowerCase())
        );

        const selectedEmails = String(recipientEmail)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const missing = selectedEmails.filter((se) => !existingEmailsSet.has(se.toLowerCase()));

        if (missing.length > 0) {
          const normalizedExisting = existingRaw.map((e: any) => (typeof e === "string" ? { email: e, default: false, enable: true, createdAt: new Date().toISOString(), lastUse: null } : { ...e }));

          const newEntries = missing.map((m, idx) => ({
            email: m,
            default: idx === 0,
            enable: true,
            createdAt: new Date().toISOString(),
            lastUse: null,
          }));

          const payload = { emails: [...normalizedExisting, ...newEntries], updatedAt: new Date().toISOString() };

          // Llamada a la server action que actualiza el proveedor
          await updateProveedor(proveedorId, { emailActividades: payload } as any);

          // invalidar cache si se pasó queryClient
          try {
            queryClient?.invalidateQueries({ queryKey: ["proveedor", proveedorId] });
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.error("Error actualizando emails del proveedor:", err);
        // No fallamos el envío por problemas al persistir
      }
    }

    // Limpiar input si se pasó el setter
    try {
      if (setEmailInputs && proveedorId !== null) {
        setEmailInputs((prev) => ({ ...prev, [`${proveedorId}`]: "" }));
      }
    } catch (e) {
      // ignore
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error sending approval email:", err);
    return { success: false, message: err?.message ?? String(err) };
  }
}
