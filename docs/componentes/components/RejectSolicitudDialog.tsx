"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";
import { rejectSolicitudInsumos } from "@/actions/solicitud-insumos/solicitudActions";

interface Props {
  solicitudId: number;
  solicitudFolio: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RejectSolicitudDialog({ solicitudId, solicitudFolio, open, onOpenChange }: Props) {
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!observations.trim()) {
      toast.error("Debe ingresar el motivo del rechazo");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await rejectSolicitudInsumos(solicitudId, observations);

      if (result.success) {
        toast.success(result.message);
        setObservations("");
        onOpenChange(false);

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
      toast.error("Error al rechazar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Rechazar Solicitud
          </DialogTitle>
          <DialogDescription className="pt-2 dark:text-slate-400">
            Está a punto de rechazar la solicitud <strong className="dark:text-slate-200">{solicitudFolio}</strong>. Esta acción rechazará automáticamente todas las cotizaciones pendientes asociadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="observations" className="text-sm font-semibold dark:text-slate-300 uppercase text-[11px] tracking-tight">
              Motivo del rechazo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="observations"
              placeholder="Ingrese el motivo por el cual se rechaza esta solicitud..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              className="resize-none dark:bg-slate-950 dark:border-slate-800"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Este comentario quedará registrado en el historial de la solicitud.</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setObservations("");
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isSubmitting || !observations.trim()}>
            {isSubmitting ? "Rechazando..." : "Rechazar Solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
