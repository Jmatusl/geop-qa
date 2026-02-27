"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  solicitudId: number;
  solicitudFolio: string;
  canReopen: boolean; // Si tiene permiso de apruebaCotizaciones o autorizaCotizaciones
}

export default function RejectedSolicitudAlert({ solicitudId, solicitudFolio, canReopen }: Props) {
  const [isReopening, setIsReopening] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleReopen = async () => {
    if (!confirm(`¿Está seguro de reabrir la solicitud ${solicitudFolio}? Esto permitirá crear nuevas cotizaciones.`)) {
      return;
    }

    setIsReopening(true);
    try {
      const { reopenSolicitudInsumos } = await import("@/actions/solicitud-insumos/solicitudActions");

      const result = await reopenSolicitudInsumos(solicitudId);

      if (result.success) {
        toast.success(result.message);

        // Invalidar queries para actualizar las tablas
        queryClient.invalidateQueries({ queryKey: ["solicitudes-insumos"] });
        queryClient.invalidateQueries({ queryKey: ["solicitud-insumos", solicitudId] });
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });

        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al reabrir la solicitud");
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <Alert variant="destructive" className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 shadow-sm">
      <AlertCircle className="h-4 w-4 dark:text-red-400" />
      <AlertTitle className="font-semibold dark:text-red-400 uppercase tracking-tight text-xs">Solicitud Rechazada</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div className="text-sm text-red-800 dark:text-red-300">
          <p className="font-medium">Esta solicitud ha sido rechazada y tiene las siguientes implicaciones:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 ml-2 opacity-90">
            <li>No se pueden crear nuevas cotizaciones</li>
            <li>Las cotizaciones existentes están en estado rechazado</li>
            <li>No se generará orden de compra para esta solicitud</li>
            <li>La solicitud no puede ser editada en este estado</li>
          </ul>
        </div>

        {canReopen && (
          <div className="pt-2 border-t border-red-200 dark:border-red-900/40">
            <p className="text-sm text-red-700 dark:text-red-400 mb-2">
              <strong>Tiene permisos para reabrir esta solicitud.</strong> Al reabrir:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1 ml-2 mb-3 opacity-90">
              <li>La solicitud volverá al estado "En Cotización"</li>
              <li>Las cotizaciones rechazadas cambiarán a estado "Recibida"</li>
              <li>Podrá evaluar nuevamente las cotizaciones existentes</li>
              <li>Podrá crear nuevas cotizaciones si es necesario</li>
            </ul>
            <Button
              onClick={handleReopen}
              disabled={isReopening}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-900/50 shadow-sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isReopening ? "Reabriendo..." : "Reabrir Solicitud"}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
