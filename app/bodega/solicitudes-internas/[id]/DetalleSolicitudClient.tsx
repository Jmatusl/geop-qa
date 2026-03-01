"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface RequestItemDto {
  id: string;
  articleCode: string;
  articleName: string;
  quantity: string;
  deliveredQuantity: string;
  observations: string | null;
}

interface RequestLogDto {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  creatorName: string | null;
}

interface RequestDetailDto {
  id: string;
  folio: string;
  title: string;
  description: string | null;
  statusCode: string;
  statusName: string;
  warehouseName: string;
  requesterName: string;
  items: RequestItemDto[];
  logs: RequestLogDto[];
}

interface Props {
  request: RequestDetailDto;
}

export default function DetalleSolicitudClient({ request }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [observation, setObservation] = useState("");

  const canApproveActions = request.statusCode === "PENDIENTE";
  const canStockActions = request.statusCode === "APROBADA" || request.statusCode === "PARCIAL";

  const stats = useMemo(() => {
    const total = request.items.reduce((acc, item) => acc + Number(item.quantity), 0);
    const delivered = request.items.reduce((acc, item) => acc + Number(item.deliveredQuantity), 0);
    return { total, delivered };
  }, [request.items]);

  const executeAction = async (path: string, body: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.error || "No se pudo ejecutar la acción");
        return;
      }

      toast.success("Acción ejecutada correctamente");
      router.refresh();
    } catch (error) {
      console.error("Error ejecutando acción de solicitud interna:", error);
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{request.folio}</h1>
            <p className="text-sm text-muted-foreground mt-1">{request.title}</p>
            {request.description ? <p className="text-sm mt-2">{request.description}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canApproveActions ? (
              <Button variant="outline" onClick={() => router.push(`/bodega/solicitudes-internas/${request.id}/editar`)}>
                Editar
              </Button>
            ) : null}

            {canApproveActions ? (
              <>
                <Button
                  disabled={isSubmitting}
                  onClick={() =>
                    executeAction(`/api/v1/bodega/solicitudes-internas/${request.id}/aprobar`, {
                      observations: observation || null,
                    })
                  }
                >
                  Aprobar
                </Button>
                <Button
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={() =>
                    executeAction(`/api/v1/bodega/solicitudes-internas/${request.id}/rechazar`, {
                      reason: observation || "Rechazo de solicitud",
                    })
                  }
                >
                  Rechazar
                </Button>
              </>
            ) : null}

            {canStockActions ? (
              <>
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() =>
                    executeAction(`/api/v1/bodega/solicitudes-internas/${request.id}/preparar`, {
                      observations: observation || null,
                    })
                  }
                >
                  Preparar
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() =>
                    executeAction(`/api/v1/bodega/solicitudes-internas/${request.id}/entregar`, {
                      observations: observation || null,
                      deliverAll: true,
                    })
                  }
                >
                  Entregar
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="text-muted-foreground">Estado</p>
            <p className="font-medium">{request.statusName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bodega</p>
            <p className="font-medium">{request.warehouseName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Solicitante</p>
            <p className="font-medium">{request.requesterName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avance</p>
            <p className="font-medium">{`${stats.delivered} / ${stats.total}`}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-1">Observación de acción</p>
          <Textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Ingrese observación para aprobar/rechazar/preparar/entregar" className="w-full" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-800/80">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-tight flex items-center gap-2 italic dark:text-white">
              Artículos Solicitados
              <Badge variant="outline" className="text-[9px] py-0 bg-transparent text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-full font-bold px-2 italic">
                {request.items.length} REGISTROS
              </Badge>
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tighter italic">DETALLE DE LOS ARTÍCULOS PEDIDOS</p>
          </div>
        </div>
        <div className="overflow-x-auto p-4 lg:p-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50">
              <tr className="border-b dark:border-slate-800 border-border">
                <th className="text-left text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest py-3 px-2">Artículo</th>
                <th className="text-left text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest py-3 px-2">Cantidad</th>
                <th className="text-left text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest py-3 px-2">Entregada</th>
                <th className="text-left text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest py-3 px-2">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {request.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-2">{`${item.articleCode} - ${item.articleName}`}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">{item.deliveredQuantity}</td>
                  <td className="py-2">{item.observations || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-4">
        <h2 className="text-base font-semibold mb-3">Bitácora</h2>
        <div className="space-y-2">
          {request.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros en bitácora.</p>
          ) : (
            request.logs.map((log) => (
              <div key={log.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-sm text-muted-foreground">{log.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  {log.creatorName ? ` · ${log.creatorName}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
