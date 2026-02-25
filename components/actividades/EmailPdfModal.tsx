"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Mail, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AlternativeEmailsModal } from "./AlternativeEmailsModal";

interface ActivityEmail {
  email: string;
  enabled: boolean;
}

interface EmailPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string;
  requirementFolio: string;
  requirementFolioPrefix: string;
  providerEmail: string;
  providerName: string;
  providerId: string;
  providerAlternativeEmails?: ActivityEmail[];
}

/**
 * Modal de previsualización y envío de PDF de requerimiento de actividad
 * Muestra el PDF generado, permite agregar correos y enviar al proveedor
 */
export function EmailPdfModal({
  open,
  onOpenChange,
  requirementId,
  requirementFolio,
  requirementFolioPrefix,
  providerEmail,
  providerName,
  providerId,
  providerAlternativeEmails = [],
}: EmailPdfModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);

  // Sincronizar correo del proveedor cuando se abre el modal
  useEffect(() => {
    if (open && providerEmail) {
      setEmails([providerEmail]);
    }
  }, [open, providerEmail]);

  // URL del PDF para iframe
  const pdfUrl = `/api/v1/actividades/${requirementId}/pdf?preview=true`;

  /**
   * Validar un correo electrónico
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Guardar un correo alternativo en la BD (si no existe)
   */
  const saveAlternativeEmail = async (email: string) => {
    // Verificar si el correo ya existe en los alternativos
    const emailExists = providerAlternativeEmails?.some(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return; // Ya existe
    }

    try {
      await fetch(
        `/api/v1/mantencion/suppliers/${providerId}/alternative-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );
    } catch (error) {
      console.error("Error al guardar correo alternativo", error);
    }
  };

  /**
   * Descargar el PDF directamente
   */
  const handleDownload = async () => {
    try {
      toast.loading("Descargando PDF...");
      const response = await fetch(`/api/v1/actividades/${requirementId}/pdf`);
      if (!response.ok) throw new Error("Error al descargar PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Requerimiento-${requirementFolioPrefix}-${requirementFolio}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      toast.dismiss();
      toast.error("Error al descargar PDF");
      console.error(error);
    }
  };

  /**
   * Enviar el PDF por correo
   */
  const handleSendEmail = async () => {
    // Validar que hay correos
    if (emails.length === 0) {
      toast.error("Debe ingresar al menos un correo destinatario");
      return;
    }

    // Validar que todos los correos sean válidos
    const invalidEmails = emails.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      toast.error(`Correos inválidos: ${invalidEmails.join(", ")}`);
      return;
    }

    // Guardar nuevos correos en BD (auto-save)
    for (const email of emails) {
      const isProviderEmail = email.toLowerCase() === providerEmail.toLowerCase();
      const isInAlternatives = providerAlternativeEmails?.some(
        (e) => e.email.toLowerCase() === email.toLowerCase()
      );
      
      if (!isProviderEmail && !isInAlternatives) {
        await saveAlternativeEmail(email);
      }
    }

    setIsSending(true);
    try {
      toast.loading("Enviando correo...");

      const response = await fetch(`/api/v1/actividades/${requirementId}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: emails,
          providerName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al enviar correo");
      }

      toast.dismiss();
      toast.success(`Correo enviado exitosamente a ${emails.length} destinatario(s)`);
      onOpenChange(false);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Error al enviar correo");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-[80vw]! h-[90vh]! max-w-[80vw]! max-h-[90vh]! p-0! m-0! gap-0! rounded-lg! flex flex-col"
          showCloseButton={true}
        >
          <div className="flex-1 overflow-hidden flex flex-col gap-4 p-6">
            <DialogHeader className="pb-2">
              <DialogTitle>Previsualización - Requerimientos de Actividad por Proveedor</DialogTitle>
              <DialogDescription>Revise el documento antes de descargar</DialogDescription>
            </DialogHeader>

            {/* Header con Proveedor y Botón Descargar */}
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                Requerimiento para: {providerName}
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                className="gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            </div>

            {/* Email Input Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAlternativesModal(true)}
                  className="shrink-0"
                  title="Agregar correo desde alternativos"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Input
                  value={emails.join(", ")}
                  onChange={(e) => {
                    const newEmails = e.target.value
                      .split(",")
                      .map((email) => email.trim())
                      .filter((email) => email);
                    setEmails(newEmails);
                  }}
                  placeholder="Ingrese email para enviar PDF"
                  className="flex-1"
                />

                <Button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSending || emails.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 px-6"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground ml-11 -mt-1">
                Puede agregar más de un correo separados por coma &quot;,&quot;
              </p>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 min-h-0">
              <iframe src={pdfUrl} className="w-full h-full" title="Vista previa del PDF" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Correos Alternativos */}
      <AlternativeEmailsModal
        open={showAlternativesModal}
        onOpenChange={setShowAlternativesModal}
        existingEmails={emails}
        providerId={providerId}
        onSelectEmails={(selectedEmails) => {
          setEmails(selectedEmails);
        }}
      />
    </>
  );
}
