/**
 * Modal: Crear Nueva Cotización
 * Archivo: app/insumos/[id]/components/CreateQuotationModal.tsx
 *
 * Permite seleccionar ítems y proveedores para crear una cotización.
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  CalendarDays,
  Building2,
  Info,
  Lock,
  Package2,
  UserPlus,
  Phone,
  Mail,
  CreditCard,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createQuotation, getActiveSuppliers } from "../actions";
import { SupplierForm } from "@/components/mantencion/supplier-form";

/* ── Tipos ─────────────────────────────────────────────────── */
type SupplyItem = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  statusCode: string;
  category: { name: string } | null;
};

type Supplier = {
  id: string;
  rut: string;
  businessLine: string | null;
  legalName: string | null;
  fantasyName: string | null;
  contactEmail: string | null;
  phone: string | null;
};

interface CreateQuotationModalProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  items: SupplyItem[];
}

/* ── Mapa de estado de ítem → etiqueta visible ── */
const ITEM_STATUS_LABEL: Record<string, { label: string; className: string }> =
  {
    PENDIENTE: {
      label: "Disponible",
      className:
        "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400",
    },
    COTIZADO: {
      label: "Cotizado",
      className:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
    },
    AUTORIZADO: {
      label: "Autorizado",
      className:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
    },
    APROBADO: {
      label: "Aprobado",
      className:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    RECHAZADO: {
      label: "Rechazado",
      className:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
    },
    ENTREGADO: {
      label: "Entregado",
      className:
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    },
    NO_DISPONIBLE: {
      label: "No Disponible",
      className:
        "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
    },
  };

/* ── Componente ─────────────────────────────────────────────── */
export function CreateQuotationModal({
  open,
  onClose,
  requestId,
  items,
}: CreateQuotationModalProps) {
  /* ── Estado del formulario ── */
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [expirationDate, setExpirationDate] = useState("");
  const [obsProveedor, setObsProveedor] = useState("");
  const [obsInternas, setObsInternas] = useState("");
  const [showCotized, setShowCotized] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);

  /* ── Cargar proveedores al abrir ── */
  useEffect(() => {
    if (!open) return;
    setLoadingSuppliers(true);
    getActiveSuppliers()
      .then((data) => setSuppliers(data as Supplier[]))
      .catch(() => toast.error("Error al cargar proveedores"))
      .finally(() => setLoadingSuppliers(false));
  }, [open]);

  /* ── Preseleccionar ítems pendientes al abrir ── */
  useEffect(() => {
    if (open) {
      const pendingIds = items
        .filter((i) => i.statusCode === "PENDIENTE")
        .map((i) => i.id);
      setSelectedItemIds(pendingIds);
    }
  }, [open, items]);

  /* ── Resetear al cerrar ── */
  useEffect(() => {
    if (!open) {
      setSelectedItemIds([]);
      setSelectedSupplierIds([]);
      setExpirationDate("");
      setObsProveedor("");
      setObsInternas("");
      setShowCotized(false);
      setSupplierSearch("");
      setShowNewSupplierModal(false);
    }
  }, [open]);

  /* ── Precargar fecha límite desde configuración al abrir ── */
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const resp = await fetch(`/api/v1/insumos-config`);
        if (resp.ok) {
          const j = await resp.json();
          const days = typeof j?.data?.defaultDeadlineDays === 'number' 
            ? j.data.defaultDeadlineDays 
            : 7;
          const dt = new Date();
          dt.setDate(dt.getDate() + days);
          setExpirationDate(dt.toISOString().slice(0, 10));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [open]);

  const refreshSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const data = await getActiveSuppliers();
      setSuppliers(data as Supplier[]);
      return data as Supplier[];
    } catch {
      toast.error("Error al cargar proveedores");
      return [] as Supplier[];
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  /* ── Ítems visibles según filtro ── */
  const visibleItems = useMemo(
    () =>
      showCotized
        ? items
        : items.filter((i) => i.statusCode === "PENDIENTE"),
    [items, showCotized]
  );

  const allItemsSelected =
    visibleItems.length > 0 &&
    visibleItems.every((i) => selectedItemIds.includes(i.id));

  const pendingCount = useMemo(
    () => items.filter((i) => i.statusCode === "PENDIENTE").length,
    [items]
  );
  const quotedCount = items.length - pendingCount;
  const quotationToCreateCount = selectedSupplierIds.length;

  /* ── Proveedores filtrados ── */
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.rut.toLowerCase().includes(q) ||
        (s.legalName ?? "").toLowerCase().includes(q) ||
        (s.businessLine ?? "").toLowerCase().includes(q) ||
        (s.fantasyName ?? "").toLowerCase().includes(q) ||
        (s.contactEmail ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, supplierSearch]);

  /* ── Handlers ── */
  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSupplier = useCallback((id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleAllItems = useCallback(() => {
    if (allItemsSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(visibleItems.map((i) => i.id));
    }
  }, [allItemsSelected, visibleItems]);

  /* ── Validación ── */
  const canSubmit =
    selectedItemIds.length > 0 &&
    selectedSupplierIds.length > 0 &&
    expirationDate.length > 0 &&
    !submitting;

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const result = await createQuotation(requestId, {
      supplierIds: selectedSupplierIds,
      itemIds: selectedItemIds,
      expirationDate,
      observationsForSupplier: obsProveedor || undefined,
      internalObservations: obsInternas || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      toast.success(
        `${selectedSupplierIds.length} cotización(es) creada(s) correctamente`
      );
      onClose();
    } else {
      toast.error(result.error ?? "Error al crear la cotización");
    }
  }, [
    canSubmit,
    requestId,
    selectedSupplierIds,
    selectedItemIds,
    expirationDate,
    obsProveedor,
    obsInternas,
    onClose,
  ]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[80vw]! max-w-[80vw]! max-h-[92vh] p-0 flex flex-col">
        {/* ── Cabecera ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 shrink-0">
          <DialogTitle className="text-xl font-bold">
            Enviar Ítems a Cotización
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Seleccione los ítems y proveedores para crear las cotizaciones
            correspondientes.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-7 overflow-y-auto flex-1">{/* Contenido scrollable */}
          {/* ══ SECCIÓN 1: CONFIGURACIÓN ══ */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm">
                Configuración de la Cotización
              </h3>
            </div>

            {/* Fecha (fila propia — mitad del ancho) */}
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="exp-date" className="text-xs font-semibold">
                  Fecha Límite de Respuesta
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Textareas en 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Observaciones proveedor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  Observaciones para el Proveedor
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 h-4 px-1.5 font-normal text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700"
                  >
                    Opcional
                  </Badge>
                </Label>
                <Textarea
                  value={obsProveedor}
                  onChange={(e) => setObsProveedor(e.target.value)}
                  placeholder="..."
                  rows={4}
                  className="resize-none border-blue-400 focus-visible:ring-blue-400 text-sm"
                  autoComplete="off"
                />
                <div className="flex items-start gap-2 border-l-2 border-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-r-md text-xs text-blue-700 dark:text-blue-400">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Visible para el proveedor:</strong> Este texto se
                    incluirá en el correo y PDF de cotización que recibirá el
                    proveedor externo.
                  </span>
                </div>
              </div>

              {/* Observaciones internas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  Observaciones Internas
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 h-4 px-1.5 font-normal text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                  >
                    Opcional
                  </Badge>
                </Label>
                <Textarea
                  value={obsInternas}
                  onChange={(e) => setObsInternas(e.target.value)}
                  placeholder="..."
                  rows={4}
                  className="resize-none border-amber-400 focus-visible:ring-amber-400 text-sm"
                  autoComplete="off"
                />
                <div className="flex items-start gap-2 border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-r-md text-xs text-amber-700 dark:text-amber-400">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Solo para gestores:</strong> Comentario privado que
                    únicamente verán otros usuarios gestores del sistema. No se
                    envía al proveedor.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ══ SECCIÓN 2: ÍTEMS ══ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm">
                  Ítems Disponibles para Cotización
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedItemIds.filter((id) => visibleItems.some((item) => item.id === id)).length} / {visibleItems.length}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {quotedCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCotized((v) => !v)}
                    className="text-xs h-7"
                  >
                    {showCotized ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                        Ocultar cotizados
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Mostrar cotizados ({quotedCount})
                      </>
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllItems}
                  className="text-xs h-7"
                >
                  {allItemsSelected ? "Deseleccionar" : "Seleccionar todos"}
                </Button>
              </div>
            </div>

            {/* Tabla */}
            <div className="border border-border rounded-lg overflow-hidden">
              {visibleItems.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                  {showCotized
                    ? "No hay ítems en esta solicitud"
                    : "Todos los ítems ya están cotizados"}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="w-10 px-4 py-2.5">
                        <Checkbox
                          checked={allItemsSelected}
                          onCheckedChange={toggleAllItems}
                        />
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ítem Solicitado
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Cantidad
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Unidad
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const statusCfg = ITEM_STATUS_LABEL[item.statusCode] ?? {
                        label: item.statusCode,
                        className:
                          "bg-slate-100 text-slate-600 border-slate-200",
                      };
                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-accent/40",
                            isSelected &&
                              "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/30"
                          )}
                          onClick={() => toggleItem(item.id)}
                        >
                          <td className="px-4 py-2.5">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItem(item.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium max-w-56">
                            <p className="truncate">{item.itemName}</p>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-sm font-mono text-foreground min-w-7">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground uppercase">
                            {item.unit}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                statusCfg.className
                              )}
                            >
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </section>

          {/* ══ SECCIÓN 3: PROVEEDORES ══ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm">
                  Seleccionar Proveedores
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedSupplierIds.length} seleccionado
                  {selectedSupplierIds.length !== 1 ? "s" : ""}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="h-7 text-xs"
                  onClick={() => setShowNewSupplierModal(true)}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Nuevo Proveedor
                </Button>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por RUT, razón social o email..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="pl-9 pr-9 text-sm"
                autoComplete="off"
              />
              {supplierSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSupplierSearch("")}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {supplierSearch && filteredSuppliers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {filteredSuppliers.length} resultado{filteredSuppliers.length !== 1 ? "s" : ""} encontrado{filteredSuppliers.length !== 1 ? "s" : ""}
              </p>
            )}

            {/* Grid de proveedores */}
            {loadingSuppliers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No se encontraron proveedores
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-0.5">
                {filteredSuppliers.map((supplier) => {
                  const isSelected = selectedSupplierIds.includes(supplier.id);
                  const displayName =
                    supplier.businessLine ||
                    supplier.legalName ||
                    supplier.fantasyName ||
                    "Sin nombre";
                  return (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => toggleSupplier(supplier.id)}
                      className={cn(
                        "relative text-left rounded-lg border-2 p-3.5 transition-all duration-200",
                        isSelected
                          ? "border-[#283c7f] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-sm ring-2 ring-blue-200/60"
                          : "border-border bg-background hover:border-[#283c7f]/50 hover:bg-accent/50 hover:shadow-sm"
                      )}
                    >
                      {/* Checkbox esquina superior derecha */}
                      <span
                        className={cn(
                          "absolute top-2.5 right-2.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-[#283c7f] border-[#283c7f]"
                            : "border-border bg-background"
                        )}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 10 8"
                            className="w-2.5 h-2.5 fill-white"
                          >
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="white"
                              strokeWidth="1.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>

                      {/* Ícono empresa */}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-md flex items-center justify-center mb-2",
                          isSelected
                            ? "bg-[#283c7f] text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>

                      {/* Nombre */}
                      <p className="text-xs font-bold uppercase pr-5 leading-snug line-clamp-2 min-h-8">
                        {displayName}
                      </p>

                      {/* RUT */}
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <CreditCard className="w-3 h-3 shrink-0" />
                        <span className="font-mono">{supplier.rut}</span>
                      </div>

                      {/* Email */}
                      {supplier.contactEmail && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-2 text-xs rounded-md px-2 py-1",
                            isSelected
                              ? "bg-white/80 dark:bg-slate-900/60 text-blue-700 dark:text-blue-300"
                              : "bg-muted/60 text-muted-foreground"
                          )}
                        >
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate pr-5 uppercase">
                            {supplier.contactEmail}
                          </span>
                        </div>
                      )}

                      {/* Teléfono */}
                      {supplier.phone && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-1 text-xs rounded-md px-2 py-1",
                            isSelected
                              ? "bg-white/80 dark:bg-slate-900/60 text-blue-700 dark:text-blue-300"
                              : "bg-muted/60 text-muted-foreground"
                          )}
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {quotationToCreateCount > 0 && (
            <section className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Resumen de Cotizaciones a Crear</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Se creará {quotationToCreateCount} cotización{quotationToCreateCount !== 1 ? "es" : ""} para {selectedItemIds.length} ítem{selectedItemIds.length !== 1 ? "s" : ""} seleccionado{selectedItemIds.length !== 1 ? "s" : ""}.
                  </p>
                </div>
                <Badge className="bg-[#283c7f] text-white">
                  {quotationToCreateCount} proveedor{quotationToCreateCount !== 1 ? "es" : ""}
                </Badge>
              </div>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#283c7f] hover:bg-[#1e2f63] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                Creando...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2 text-white" />
                Crear Cotización
                {selectedSupplierIds.length > 1
                  ? ` (${selectedSupplierIds.length})`
                  : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={showNewSupplierModal} onOpenChange={setShowNewSupplierModal}>
        <DialogContent className="max-w-[80vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Proveedor</DialogTitle>
            <DialogDescription>
              Registre un proveedor y quedará disponible para seleccionar en esta cotización.
            </DialogDescription>
          </DialogHeader>

          <SupplierForm
            mode="create"
            onCancel={() => setShowNewSupplierModal(false)}
            onSuccess={async (createdSupplier) => {
              const refreshed = await refreshSuppliers();
              const createdId = createdSupplier?.id as string | undefined;

              if (createdId) {
                const existsInList = refreshed.some((supplier) => supplier.id === createdId);
                if (existsInList) {
                  setSelectedSupplierIds((prev) =>
                    prev.includes(createdId) ? prev : [...prev, createdId]
                  );
                }
              }

              setShowNewSupplierModal(false);
              toast.success("Proveedor agregado y seleccionado");
            }}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
