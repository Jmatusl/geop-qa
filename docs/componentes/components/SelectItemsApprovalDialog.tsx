"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ItemSelection {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  isAvailable: boolean;
  reason?: string;
}

interface Props {
  cotizacion: any;
  availableItems: Array<{ itemId: number; itemName: string }>;
  alreadyApprovedItems: Array<{ itemId: number; itemName: string; approvedCotizacionId: number }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedItemIds: number[], observations?: string) => Promise<void>;
}

export default function SelectItemsApprovalDialog({ cotizacion, availableItems, alreadyApprovedItems, open, onOpenChange, onConfirm }: Props) {
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>(availableItems.map((item) => item.itemId));
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!cotizacion) return null;

  // Combinar información de items disponibles con datos de la cotización
  const itemsData: ItemSelection[] =
    cotizacion.items?.map((cotItem: any) => {
      const isAlreadyApproved = alreadyApprovedItems.some((item) => item.itemId === cotItem.solicitudItemId);
      const isAvailable = availableItems.some((item) => item.itemId === cotItem.solicitudItemId);
      const approvedItem = alreadyApprovedItems.find((item) => item.itemId === cotItem.solicitudItemId);

      return {
        itemId: cotItem.solicitudItemId,
        itemName: cotItem.name,
        quantity: Number(cotItem.quantity),
        unit: cotItem.unit,
        unitPrice: cotItem.unitPrice ? Number(cotItem.unitPrice) : undefined,
        totalPrice: cotItem.totalPrice ? Number(cotItem.totalPrice) : undefined,
        isAvailable: isAvailable && cotItem.cotizado !== false,
        reason: !cotItem.cotizado ? "No cotizado por el proveedor" : isAlreadyApproved ? `Ya aprobado en cotización ${approvedItem?.approvedCotizacionId}` : undefined,
      };
    }) || [];

  const handleToggleItem = (itemId: number) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const handleToggleAll = () => {
    const allAvailableIds = itemsData.filter((item) => item.isAvailable).map((item) => item.itemId);
    if (selectedItemIds.length === allAvailableIds.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allAvailableIds);
    }
  };

  const handleConfirm = async () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedItemIds, observations);
      onOpenChange(false);
      setObservations("");
    } catch (error) {
      console.error("Error al aprobar items:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCount = itemsData.filter((item) => item.isAvailable).length;
  const selectedCount = selectedItemIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Seleccionar Items a Aprobar - {cotizacion.folio}
          </DialogTitle>
          <DialogDescription>Seleccione los items específicos que desea aprobar de esta cotización</DialogDescription>
        </DialogHeader>

        {/* Información de la Cotización */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Proveedor:</span> {cotizacion.proveedor?.nombre || "N/A"}
            </div>
            <div>
              <span className="font-medium">Items disponibles:</span> {availableCount} de {itemsData.length}
            </div>
          </div>
        </div>

        {/* Advertencias */}
        {alreadyApprovedItems.length > 0 && (
          <div className="flex items-start gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800">Items ya aprobados</p>
              <p className="text-orange-700 mt-1">{alreadyApprovedItems.length} item(s) ya están aprobados en otras cotizaciones y no pueden seleccionarse.</p>
            </div>
          </div>
        )}

        {/* Tabla de Items */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox checked={selectedItemIds.length === availableCount && availableCount > 0} onCheckedChange={handleToggleAll} disabled={availableCount === 0} />
                </TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-[100px]">Cantidad</TableHead>
                <TableHead className="w-[120px]">Precio Unit.</TableHead>
                <TableHead className="w-[120px]">Precio Total</TableHead>
                <TableHead className="w-[120px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsData.map((item) => (
                <TableRow key={item.itemId} className={!item.isAvailable ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox checked={selectedItemIds.includes(item.itemId)} onCheckedChange={() => handleToggleItem(item.itemId)} disabled={!item.isAvailable} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.itemName}</div>
                    {item.reason && <div className="text-xs text-muted-foreground mt-1">{item.reason}</div>}
                  </TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>{item.unitPrice ? `$${item.unitPrice.toLocaleString()}` : "-"}</TableCell>
                  <TableCell>{item.totalPrice ? `$${item.totalPrice.toLocaleString()}` : "-"}</TableCell>
                  <TableCell>
                    {item.isAvailable ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                        No disponible
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observations">Observaciones de aprobación (opcional)</Label>
          <Textarea id="observations" placeholder="Comentarios sobre la aprobación parcial de items..." value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} />
        </div>

        {/* Resumen de selección */}
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm">
            <span className="font-medium text-blue-900">Items seleccionados:</span>
            <span className="ml-2 text-blue-700">
              {selectedCount} de {availableCount} disponibles
            </span>
          </div>
          {selectedCount > 0 && (
            <Badge variant="default" className="bg-blue-600">
              Total: $
              {itemsData
                .filter((item) => selectedItemIds.includes(item.itemId))
                .reduce((sum, item) => sum + (item.totalPrice || 0), 0)
                .toLocaleString()}
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting || selectedCount === 0} className="bg-green-600 hover:bg-green-700">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aprobando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprobar {selectedCount} Item{selectedCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
