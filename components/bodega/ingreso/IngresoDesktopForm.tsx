"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUpDown, Check, FileText, Info, Package, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBodegaArticles } from "@/lib/hooks/bodega/use-bodega-articles";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useCreateBodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { useCreateBodegaMovement } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaSimpleMasters } from "@/lib/hooks/bodega/use-bodega-simple-masters";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";

interface Props {
  onCancel: () => void;
}

interface ItemRow {
  id: string;
  articleId: string;
  quantity: string;
  unitPrice: string;
}

function createEmptyRow(): ItemRow {
  return {
    id: crypto.randomUUID(),
    articleId: "",
    quantity: "",
    unitPrice: "",
  };
}

function formatNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CL").format(Number(digits));
}

function parseFormattedNumber(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

export default function IngresoDesktopForm({ onCancel }: Props) {
  const { data: configData } = useBodegaConfig();
  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data: articlesData } = useBodegaArticles(1, 500, "");
  const { data: costCentersData } = useBodegaSimpleMasters("centros-costo", "");
  const createMovement = useCreateBodegaMovement();
  const createArticle = useCreateBodegaArticle();

  const [warehouseId, setWarehouseId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [documentRef, setDocumentRef] = useState("");
  const [showAdvancedRef, setShowAdvancedRef] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [dispatchGuide, setDispatchGuide] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [openArticleRowId, setOpenArticleRowId] = useState<string | null>(null);
  const [createArticleRowId, setCreateArticleRowId] = useState<string | null>(null);
  const [newArticleCode, setNewArticleCode] = useState("");
  const [newArticleName, setNewArticleName] = useState("");
  const [newArticleUnit, setNewArticleUnit] = useState("UN");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const configGeneral = (configData?.BODEGA_GENERAL_CONFIG ?? {}) as Record<string, unknown>;
  const evidenceRequired = configGeneral.ingresos_evidencia_obligatoria === true;

  const warehouses = (warehousesData?.data ?? []).filter((warehouse) => warehouse.isActive);
  const articles = (articlesData?.data ?? []).filter((article) => article.isActive);
  const costCenters = costCentersData?.data ?? [];

  const selectedCostCenter = useMemo(() => costCenters.find((center) => center.id === costCenterId), [costCenterId, costCenters]);

  const addRow = () => setRows((current) => [...current, createEmptyRow()]);

  const updateRow = (rowId: string, field: keyof Omit<ItemRow, "id">, value: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, [field]: value };
      }),
    );
  };

  const removeRow = (rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const validateForm = (): string | null => {
    if (!warehouseId) return "Debe seleccionar destino";
    if (!costCenterId) return "Debe seleccionar centro de costo";
    if (!description.trim() || description.trim().length < 10) return "La justificación/observaciones debe tener al menos 10 caracteres";
    if (rows.length === 0) return "Debe agregar al menos un artículo";
    if (evidenceRequired && attachments.length === 0) return "La foto de evidencia es obligatoria para registrar el ingreso";

    const hasInvalidRows = rows.some((row) => !row.articleId || Number(row.quantity) <= 0);
    if (hasInvalidRows) return "Revise artículos y cantidades de todas las filas";

    return null;
  };

  const resetForm = () => {
    setWarehouseId("");
    setCostCenterId("");
    setDocumentRef("");
    setShowAdvancedRef(false);
    setQuoteNumber("");
    setDispatchGuide("");
    setGeneralNotes("");
    setDescription("");
    setRows([]);
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateArticle = async () => {
    const code = newArticleCode.trim().toUpperCase();
    const name = newArticleName.trim();
    const unit = newArticleUnit.trim().toUpperCase();

    if (!code || !name) {
      toast.error("Debe ingresar código y nombre del artículo");
      return;
    }

    try {
      const created = await createArticle.mutateAsync({
        code,
        name,
        unit: unit || "UN",
        minimumStock: 0,
        isActive: true,
      });

      const createdArticle = (created as { data?: { id: string } })?.data;
      if (createArticleRowId && createdArticle?.id) {
        updateRow(createArticleRowId, "articleId", createdArticle.id);
      }

      setCreateArticleRowId(null);
      setNewArticleCode("");
      setNewArticleName("");
      setNewArticleUnit("UN");
    } catch {
      // Error notificado por el hook
    }
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      for (const row of rows) {
        const quantity = parseFormattedNumber(row.quantity);
        const unitPrice = parseFormattedNumber(row.unitPrice || "0");

        await createMovement.mutateAsync({
          movementType: "INGRESO",
          warehouseId,
          articleId: row.articleId,
          quantity,
          reason: "INGRESO_BODEGA",
          externalReference: documentRef || null,
          observations: [
            `Referencia: ${documentRef || "N/A"}`,
            quoteNumber ? `N° Cotización: ${quoteNumber}` : null,
            dispatchGuide ? `Guía Despacho: ${dispatchGuide}` : null,
            generalNotes ? `Observaciones Generales: ${generalNotes}` : null,
            `Centro de Costo: ${selectedCostCenter?.name || "N/A"}`,
            `Justificación/Observaciones: ${description.trim()}`,
            unitPrice > 0 ? `Precio Unitario: ${unitPrice}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
        });
      }

      toast.success("Ingreso registrado correctamente");
      resetForm();
    } catch {
      // Error notificado por el hook
    }
  };

  return (
    <div className="w-full space-y-4 pb-24">
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="border-b bg-slate-50/60 dark:bg-slate-900/40 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-950/30">
                <Package className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Ingreso Bodega</h2>
                <p className="text-xs font-bold uppercase text-muted-foreground">Configuración general del registro</p>
              </div>
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                (*) Campos obligatorios
              </div>
            </div>
            <Button type="button" variant="outline" className="gap-2 uppercase font-bold tracking-wide dark:text-white" onClick={() => fileInputRef.current?.click()}>
              <FileText className="h-4 w-4 text-blue-600" />
              {attachments.length > 0 ? `Archivos (${attachments.length})` : "Adjuntar archivo"}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              setAttachments(files);
            }}
          />
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Destino *
                <ArrowUpDown className="h-3 w-3" />
              </Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                C. Costo *
                <SlidersHorizontal className="h-3 w-3" />
              </Label>
              <Select value={costCenterId} onValueChange={setCostCenterId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Doc. Referencia
                <FileText className="h-3 w-3" />
              </Label>
              <div className="flex items-center gap-2">
                <Input autoComplete="off" value={documentRef} onChange={(event) => setDocumentRef(event.target.value)} placeholder="Ej: OC-2024..." />
                <Button type="button" size="icon" className="h-10 w-10 bg-[#2f56d6] text-white hover:bg-[#2248bf]" onClick={() => setShowAdvancedRef((current) => !current)}>
                  {showAdvancedRef ? <X className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </Button>
              </div>
            </div>
          </div>

          {showAdvancedRef ? (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/35 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">N° Cotización</Label>
                  <Input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} placeholder="COT---" autoComplete="off" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">Guía Despacho</Label>
                  <Input value={dispatchGuide} onChange={(event) => setDispatchGuide(event.target.value)} placeholder="GD---" autoComplete="off" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">Observaciones Generales</Label>
                <Textarea value={generalNotes} onChange={(event) => setGeneralNotes(event.target.value)} placeholder="Notas del ingreso (opcional)..." className="min-h-18" autoComplete="off" />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Justificación / Observaciones *</Label>
              <span className="text-xs text-muted-foreground">{description.length} / 300</span>
            </div>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 300))}
              placeholder="Ingrese descripción detallada..."
              className="min-h-10"
              autoComplete="off"
            />
          </div>

          {evidenceRequired && attachments.length === 0 ? (
            <div className="flex items-center gap-2 text-sm font-bold text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>La foto de evidencia es obligatoria para registrar el ingreso.</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="border-b py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Artículos Incluidos</h3>
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider">
                  {rows.length} registros
                </Badge>
              </div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Agregue repuestos y cantidades</p>
            </div>
            <div className="flex items-center gap-3">
              {rows.length === 0 ? <span className="text-[10px] font-bold uppercase text-destructive">Debe agregar al menos un artículo</span> : null}
              <Button type="button" variant="outline" className="gap-2 border-dashed uppercase font-bold tracking-wide dark:text-white" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Agregar fila
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[56px_minmax(0,1fr)_180px_180px_90px] items-center border-b px-4 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            <span>#</span>
            <span>Artículo *</span>
            <span>Cantidad *</span>
            <span>Precio Unit.</span>
            <span className="text-center">Acción</span>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Package className="h-10 w-10" />
              <p className="text-sm font-bold uppercase tracking-wider">Sin artículos cargados</p>
            </div>
          ) : (
            rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[56px_minmax(0,1fr)_180px_180px_90px] items-center gap-4 border-b px-4 py-3">
                <span className="text-sm font-bold">{index + 1}</span>

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_36px] items-center gap-2">
                  <Popover open={openArticleRowId === row.id} onOpenChange={(open) => setOpenArticleRowId(open ? row.id : null)}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="h-9 w-full min-w-0 justify-between dark:text-white">
                        {row.articleId
                          ? (() => {
                              const selected = articles.find((article) => article.id === row.articleId);
                              return selected ? `${selected.code} - ${selected.name}` : "Seleccionar artículo";
                            })()
                          : "Seleccionar artículo"}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-105 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar artículo..." />
                        <CommandEmpty>Sin resultados</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {articles.map((article) => (
                            <CommandItem
                              key={article.id}
                              value={`${article.code} ${article.name}`}
                              onSelect={() => {
                                updateRow(row.id, "articleId", article.id);
                                setOpenArticleRowId(null);
                              }}
                            >
                              {article.code} - {article.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 dark:text-white" onClick={() => setCreateArticleRowId(row.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Input
                  type="text"
                  inputMode="numeric"
                  value={row.quantity}
                  onChange={(event) => updateRow(row.id, "quantity", formatNumberInput(event.target.value))}
                  autoComplete="off"
                  placeholder="0"
                />

                <Input
                  type="text"
                  inputMode="numeric"
                  value={row.unitPrice}
                  onChange={(event) => updateRow(row.id, "unitPrice", formatNumberInput(event.target.value))}
                  autoComplete="off"
                  placeholder="0"
                />

                <div className="flex justify-center">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {rows.length > 0 ? (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">
                Tabla: {rows.length} registros
              </Badge>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2 border-dashed text-[10px] font-bold uppercase tracking-widest dark:text-white" onClick={addRow}>
                <Plus className="h-3 w-3" />
                Agregar fila
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-350 items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="font-bold uppercase tracking-wider">Atajos: Enter nueva fila · Tab navegar</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="font-bold uppercase tracking-wider">Trazabilidad por movimiento activada</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" className="min-w-52.5 gap-2 dark:text-white" onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancelar registro
            </Button>
            <Button type="button" className="min-w-57.5 gap-2 bg-[#283c7f] text-white hover:bg-[#1e2d5f]" disabled={createMovement.isPending} onClick={handleSubmit}>
              <Check className="h-4 w-4 text-white" />
              Finalizar registro
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!createArticleRowId} onOpenChange={(open) => !open && setCreateArticleRowId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear artículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input value={newArticleCode} onChange={(event) => setNewArticleCode(event.target.value)} placeholder="ART-001" autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={newArticleName} onChange={(event) => setNewArticleName(event.target.value)} placeholder="Nombre artículo" autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Input value={newArticleUnit} onChange={(event) => setNewArticleUnit(event.target.value)} placeholder="UN" autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="dark:text-white" onClick={() => setCreateArticleRowId(null)}>
              Cancelar
            </Button>
            <Button type="button" className="bg-[#283c7f] text-white hover:bg-[#1e2d5f]" onClick={handleCreateArticle} disabled={createArticle.isPending}>
              Crear artículo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
