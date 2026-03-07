"use client";

/**
 * COMPONENTE: ModalRegistrarEntrega
 * PROPÓSITO: Modal para registrar la entrega final con firma digital, foto de evidencia
 * y observaciones. Réplica fiel del legacy "ModalEntregar". Diseño compacto.
 */

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Camera, Trash2, RotateCcw, Upload, AlertCircle, PackageCheck, X } from "lucide-react";
import Image from "next/image";
import { formatRUT } from "@/lib/utils/chile-utils";

// ── Esquema de validación ─────────────────────────────────────────────────────

const schema = z.object({
  receptorNombre: z.string({ required_error: "El nombre es requerido" }).min(3, "Mínimo 3 caracteres").max(100, "Máximo 100 caracteres"),
  receptorRut: z.string().optional(),
  firmaReceptor: z.string({ required_error: "La firma es requerida" }).min(1, "Debe firmar para confirmar la recepción"),
  fotoEvidencia: z.string().optional(),
  observaciones: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

export type RegistrarEntregaFormValues = z.infer<typeof schema>;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ItemEntrega {
  id: string;
  articleCode: string;
  articleName: string;
  quantity: string;
  deliveredQuantity: string;
  unit: string;
}

interface ModalRegistrarEntregaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folio: string;
  requesterName: string;
  items: ItemEntrega[];
  onSubmit: (data: RegistrarEntregaFormValues) => Promise<void>;
  loading?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ModalRegistrarEntrega({ open, onOpenChange, folio, requesterName, items, onSubmit, loading = false }: ModalRegistrarEntregaProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [firmaGuardada, setFirmaGuardada] = useState(false);

  const form = useForm<RegistrarEntregaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      receptorNombre: requesterName,
      receptorRut: "",
      firmaReceptor: "",
      fotoEvidencia: "",
      observaciones: "",
    },
  });

  // ── Manejo de firma ────────────────────────────────────────────────────────
  const limpiarFirma = () => {
    sigCanvas.current?.clear();
    form.setValue("firmaReceptor", "");
    setFirmaGuardada(false);
  };

  const guardarFirma = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    const firmaBase64 = sigCanvas.current.toDataURL("image/png");
    form.setValue("firmaReceptor", firmaBase64, { shouldValidate: true });
    setFirmaGuardada(true);
  };

  // ── Manejo de foto ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      form.setValue("fotoEvidencia", base64);
      setFotoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const capturarFoto = () => {
    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.onchange = (e) => handleFileChange(e as any);
    cameraInput.click();
  };

  const eliminarFoto = () => {
    form.setValue("fotoEvidencia", "");
    setFotoPreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: RegistrarEntregaFormValues) => {
    if (!firmaGuardada) return;
    await onSubmit(data);
  };

  const totalUnidades = items.reduce((sum, i) => sum + Number(i.deliveredQuantity), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw]! max-w-4xl! max-h-[92vh] p-0 overflow-hidden flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Header fijo */}
        <div className="px-4 py-3 border-b flex-none">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-600" />
              <DialogTitle className="text-sm font-black">Registrar Entrega</DialogTitle>
              <Badge variant="outline" className="ml-auto font-bold text-[#283c7f] border-[#283c7f]/40 text-[10px]">
                {folio}
              </Badge>
            </div>
            <DialogDescription className="text-[11px] mt-0.5">Complete los datos para confirmar la entrega al receptor.</DialogDescription>
          </DialogHeader>
        </div>

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="space-y-3">
            {/* Resumen de ítems — tabla compacta sin card wrapper */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                Ítems a entregar —{" "}
                <span className="text-foreground">
                  {items.length} ítems / {totalUnidades} unidades
                </span>
              </p>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-[10px] font-black uppercase h-7 px-2">Artículo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase h-7 px-2">ID</TableHead>
                      <TableHead className="text-[10px] font-black uppercase h-7 px-2">Cant.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="h-8">
                        <TableCell className="text-xs font-medium px-2 py-1">{item.articleName}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground font-mono px-2 py-1">{item.articleCode}</TableCell>
                        <TableCell className="text-xs font-bold px-2 py-1">
                          {item.deliveredQuantity} {item.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Formulario */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
                {/* RUT + Nombre del receptor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="receptorRut"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">RUT (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            className="h-8 text-xs"
                            placeholder="12.345.678-9"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(formatRUT(e.target.value))}
                            disabled={loading}
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receptorNombre"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">Nombre del receptor *</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-xs" placeholder="Nombre completo" {...field} disabled={loading} autoComplete="off" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Firma digital */}
                <FormField
                  control={form.control}
                  name="firmaReceptor"
                  render={() => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold">Firma del receptor *</FormLabel>
                      <div className="border rounded-lg overflow-hidden bg-card">
                        <div className="border-b border-dashed bg-white dark:bg-slate-950">
                          <SignatureCanvas
                            ref={sigCanvas}
                            canvasProps={{
                              className: "w-full",
                              height: 120,
                              style: { cursor: "crosshair", touchAction: "none" },
                            }}
                            backgroundColor="rgb(255,255,255)"
                          />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                          <Button type="button" variant="outline" size="sm" onClick={limpiarFirma} disabled={loading} className="h-7 text-[11px] dark:text-white">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Limpiar
                          </Button>
                          <Button type="button" size="sm" onClick={guardarFirma} disabled={loading} className="h-7 text-[11px] bg-slate-900 hover:bg-slate-700 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-white" />
                            {firmaGuardada ? "✓ Guardada" : "Guardar firma"}
                          </Button>
                          {firmaGuardada && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Confirmada
                            </span>
                          )}
                          <span className="ml-auto text-[10px] text-muted-foreground">Mouse o pantalla táctil</span>
                        </div>
                      </div>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                {/* Foto de evidencia + Observaciones en una fila */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Foto */}
                  <FormField
                    control={form.control}
                    name="fotoEvidencia"
                    render={() => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">Foto de evidencia (opcional)</FormLabel>
                        {fotoPreview ? (
                          <div className="space-y-2">
                            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                              <Image src={fotoPreview} alt="Evidencia de entrega" fill className="object-contain" />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={eliminarFoto} disabled={loading} className="h-7 text-[11px] dark:text-white">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={capturarFoto} disabled={loading} className="h-8 text-[11px] dark:text-white">
                              <Camera className="h-3.5 w-3.5 mr-1.5 text-[#283c7f] dark:text-blue-400" />
                              Cámara
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} disabled={loading} className="h-8 text-[11px] dark:text-white">
                              <Upload className="h-3.5 w-3.5 mr-1.5 text-[#283c7f] dark:text-blue-400" />
                              Galería
                            </Button>
                            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          </div>
                        )}
                        <FormDescription className="text-[10px]">Máx. 5MB</FormDescription>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Observaciones */}
                  <FormField
                    control={form.control}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">Observaciones (opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Notas adicionales sobre la entrega..." className="text-xs resize-none h-[88px]" {...field} disabled={loading} />
                        </FormControl>
                        <FormDescription className="text-[10px]">Máx. 1000 caracteres</FormDescription>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Alerta importante */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    <span className="font-bold">Importante: </span>
                    Al confirmar, se registrará la entrega final. Esta acción no se puede deshacer.
                  </p>
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Footer fijo */}
        <div className="px-4 py-2.5 border-t bg-muted/20 flex-none">
          <DialogFooter className="flex-row sm:justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1 sm:flex-none dark:text-white">
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={loading || !firmaGuardada} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-white" />
              {loading ? "Registrando..." : "Confirmar Entrega"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
