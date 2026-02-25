"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Paperclip, Trash2, ImageIcon, FileText, Upload, Package, User, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";
import { resizeImage } from "@/lib/utils/image-utils";
import { createReception } from "../actions";

interface ActivityDetail {
  id: string;
  name: string;
  description: string;
  activityType: { name: string } | null;
  responsible: { firstName: string; lastName: string } | null;
  supplier: { fantasyName: string | null; legalName: string; rut: string } | null;
  startDate: Date | null;
  endDate: Date | null;
}

interface ReceptionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityDetail;
  onSuccess?: () => void;
}

const MAX_FILES = 8;
const MAX_HEIGHT_PX = 1080;

interface UploadedEvidence {
  storagePath: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string; // Para mostrar preview local
}

export function ReceptionSheet({ open, onOpenChange, activity, onSuccess }: ReceptionSheetProps) {
  const [isAccepted, setIsAccepted] = useState(true);
  const [comment, setComment] = useState("");
  const [evidences, setEvidences] = useState<UploadedEvidence[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (evidences.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos permitidos`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsResizing(true);
    const processedFiles: File[] = [];

    try {
      for (const file of files) {
        const processedFile = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        processedFiles.push(processedFile);
      }
    } catch {
      toast.error("Error al procesar archivos");
      setIsResizing(false);
      return;
    }

    setIsResizing(false);
    setIsUploading(true);

    try {
      // Subir archivos a R2
      const fd = new FormData();
      processedFiles.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/actividades/upload", { method: "POST", body: fd });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      const uploadedPaths = result.urls as string[];

      // Crear objetos de evidencia con preview
      const newEvidences: UploadedEvidence[] = await Promise.all(
        processedFiles.map(async (file, idx) => {
          const previewUrl = URL.createObjectURL(file);
          return {
            storagePath: uploadedPaths[idx],
            publicUrl: `/api/v1/storage/signed-url?key=${encodeURIComponent(uploadedPaths[idx])}&redirect=true`,
            fileSize: file.size,
            mimeType: file.type,
            previewUrl,
          };
        })
      );

      setEvidences((prev) => [...prev, ...newEvidences]);
      toast.success("Archivos adjuntados correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al subir archivos");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteEvidence = (index: number) => {
    setDeletingIndex(index);
    setTimeout(() => {
      setEvidences((prev) => prev.filter((_, i) => i !== index));
      setDeletingIndex(null);
      toast.success("Archivo eliminado");
    }, 200);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const result = await createReception({
        activityId: activity.id,
        isAccepted,
        comment: comment.trim() || undefined,
        evidences: evidences.map((ev) => ({
          storagePath: ev.storagePath,
          publicUrl: ev.publicUrl,
          fileSize: ev.fileSize,
          mimeType: ev.mimeType,
        })),
      });

      if (!result.success) {
        throw new Error(result.message || "Error al guardar recepción");
      }

      toast.success("Recepción guardada correctamente");
      
      // Limpiar formulario
      setIsAccepted(true);
      setComment("");
      setEvidences([]);
      
      // Cerrar sheet
      onOpenChange(false);
      
      // Callback de éxito
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar recepción");
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isResizing || isUploading || isSaving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="p-6">
          <SheetHeader>
            <SheetTitle>Recepcionar Actividad</SheetTitle>
          </SheetHeader>

          {/* Información de la Actividad */}
          <div className="mt-6 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-600 dark:bg-blue-500 p-2 shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-base text-blue-900 dark:text-blue-100">
                  {activity.name || "Actividad sin nombre"}
                </h3>
                {activity.activityType && (
                  <Badge className="bg-blue-600 text-white text-xs">
                    {activity.activityType.name}
                  </Badge>
                )}
                {activity.description && (
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    {activity.description}
                  </p>
                )}
              </div>
            </div>

            <Separator className="bg-blue-200 dark:bg-blue-800" />

            <div className="grid grid-cols-2 gap-3 text-sm">
              {activity.responsible && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Responsable</p>
                    <p className="text-blue-900 dark:text-blue-100 font-semibold">
                      {activity.responsible.firstName} {activity.responsible.lastName}
                    </p>
                  </div>
                </div>
              )}
              {activity.supplier && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Proveedor</p>
                    <p className="text-blue-900 dark:text-blue-100 font-semibold">
                      {activity.supplier.fantasyName || activity.supplier.legalName}
                    </p>
                  </div>
                </div>
              )}
              {(activity.startDate || activity.endDate) && (
                <div className="flex items-start gap-2 col-span-2">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Período</p>
                    <p className="text-blue-900 dark:text-blue-100 font-semibold">
                      {activity.startDate && format(new Date(activity.startDate), "dd/MM/yyyy", { locale: es })}
                      {activity.startDate && activity.endDate && " — "}
                      {activity.endDate && format(new Date(activity.endDate), "dd/MM/yyyy", { locale: es })}
                      {!activity.startDate && !activity.endDate && "Sin fecha"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-6">
          {/* Estado de Aceptación */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex-1">
              <Label htmlFor="is-accepted" className="text-sm font-medium">
                Estado de Recepción
              </Label>
              <p className="text-xs text-muted-foreground">
                {isAccepted ? "Actividad aceptada" : "Actividad rechazada"}
              </p>
            </div>
            <Switch id="is-accepted" checked={isAccepted} onCheckedChange={setIsAccepted} />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="comment">Observaciones</Label>
            <Textarea
              id="comment"
              placeholder="Ingrese observaciones o comentarios sobre la recepción..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Evidencias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Evidencias ({evidences.length}/{MAX_FILES})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy || evidences.length >= MAX_FILES}
                onClick={() => fileInputRef.current?.click()}
              >
                {isResizing || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="ml-2">Adjuntar</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Grid de Evidencias */}
            {evidences.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {evidences.map((ev, idx) => {
                  const isPdf = ev.mimeType.includes("pdf");
                  const isDeletingThis = deletingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center"
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center p-2 text-red-500 gap-1">
                          <FileText className="h-10 w-10" />
                          <span className="text-[10px] uppercase font-bold">PDF</span>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={ev.previewUrl} alt="Evidencia" className="w-full h-full object-cover" />
                      )}

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        disabled={isDeletingThis}
                        onClick={() => handleDeleteEvidence(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        {isDeletingThis ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isBusy} className="flex-1 bg-[#283c7f] hover:bg-[#1e2f63]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Recepción
            </Button>
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
