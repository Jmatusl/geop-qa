"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Image as ImageIcon, Loader2, Trash2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ArticleFileUploaderProps {
  label: string;
  type: "image" | "pdf";
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  onAfterRemove?: () => Promise<void>;
}

export function ArticleFileUploader({ label, type, value, onChange, folder, onAfterRemove }: ArticleFileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estilos basados en legacy
  const isPdf = type === "pdf";
  const buttonStyles = isPdf
    ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400"
    : "border-[#283c7f] text-[#283c7f] hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400";

  const iconBgStyles = "bg-slate-50 dark:bg-slate-900/50 p-4 rounded-full mb-2";

  const getSignedUrl = async (file: File) => {
    const res = await fetch("/api/v1/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        folder: folder,
      }),
    });

    if (!res.ok) throw new Error("Error al obtener URL de subida");
    return res.json();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "image" && !file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (type === "pdf" && file.type !== "application/pdf") {
      toast.error("El archivo debe ser un PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo debe pesar menos de 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const { url, key } = await getSignedUrl(file);

      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Error al subir archivo");

      onChange(key);
      toast.success(`${label} subida correctamente`);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir el archivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/storage/delete?key=${encodeURIComponent(value)}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar el archivo del servidor");

      onChange(null);

      // Si hay un callback de post-eliminación (ej: actualizar DB), ejecutarlo
      if (onAfterRemove) {
        await onAfterRemove();
      }

      toast.success("Archivo eliminado físicamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al borrar el archivo del servidor");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const getFullUrl = (key: string) => {
    if (key.startsWith("http")) return key;
    return `/api/v1/storage/signed-url?key=${encodeURIComponent(key)}&redirect=true`;
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{label}</h3>
      <div
        className={cn(
          "relative flex aspect-video w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-950",
          value && "border-emerald-500/30",
        )}
      >
        {value ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            {type === "image" ? (
              <div className="relative h-24 w-40 overflow-hidden rounded-lg border bg-slate-50 dark:bg-slate-900">
                <img src={getFullUrl(value)} alt={label} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className={iconBgStyles}>
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
            )}
            <div className="text-sm font-bold text-slate-900 dark:text-white">{type === "image" ? "Imagen Cargada" : "Ficha Técnica Cargada"}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" asChild className="h-8">
                <a href={getFullUrl(value)} target="_blank" rel="noopener noreferrer">
                  Ver
                </a>
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => setShowConfirm(true)} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="mr-1 h-3 w-3" />}
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 p-8 text-center">
            <div className={iconBgStyles}>{type === "image" ? <ImageIcon className="h-8 w-8 text-slate-400" /> : <FileText className="h-8 w-8 text-slate-400" />}</div>
            <div className="mb-4 space-y-0.5">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">{type === "image" ? "Subir Imagen" : "Subir Ficha Técnica"}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{type === "image" ? "Formatos sugeridos: JPG, PNG, WEBP" : "Formato sugerido: PDF"}</div>
            </div>
            <Button type="button" variant="outline" size="sm" className={cn("h-10 px-6 font-bold", buttonStyles)} disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Seleccionar Archivo"}
            </Button>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept={type === "image" ? "image/*" : "application/pdf"} onChange={handleUpload} />
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará físicamente el archivo del servidor de almacenamiento. No podrá ser recuperado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 text-white hover:bg-red-700">
              Sí, eliminar del servidor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
