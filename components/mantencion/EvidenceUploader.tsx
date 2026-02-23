"use client";

/**
 * Componente reutilizable para adjuntar fotografías/evidencias.
 * Patrón: botón ícono compacto + panel desplegable con thumbnails.
 * Igual al flujo de /mantencion/ingreso.
 */

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Paperclip, Trash2 } from "lucide-react";
import { resizeImage } from "@/lib/utils/image-utils";
import { toast } from "sonner";

const MAX_IMAGES = 8;
const MAX_HEIGHT_PX = 1080;

export interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

interface EvidenceUploaderProps {
  /** Lista actual de previews (manejada externamente) */
  previews: PreviewFile[];
  /** Callback cuando se agregan archivos nuevos */
  onAdd: (newFiles: PreviewFile[]) => void;
  /** Callback cuando se elimina un preview */
  onRemove: (id: string) => void;
  /** Límite máximo de imágenes (default: 8) */
  maxImages?: number;
}

export default function EvidenceUploader({ previews, onAdd, onRemove, maxImages = MAX_IMAGES }: EvidenceUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (previews.length + files.length > maxImages) {
      toast.error(`Máximo ${maxImages} imágenes`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsResizing(true);
    try {
      const newPreviews: PreviewFile[] = [];
      for (const file of files) {
        const processed = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        newPreviews.push({
          id: `${Date.now()}-${Math.random()}`,
          file: processed,
          previewUrl: URL.createObjectURL(processed),
          name: file.name,
          sizeKb: Math.round(processed.size / 1024),
        });
      }
      onAdd(newPreviews);
      // Abrir panel automáticamente al agregar
      setShowPanel(true);
    } catch {
      toast.error("Error al procesar imagen.");
    } finally {
      setIsResizing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (id: string) => {
    const preview = previews.find((p) => p.id === id);
    if (preview) URL.revokeObjectURL(preview.previewUrl);
    onRemove(id);
    if (previews.length <= 1) setShowPanel(false);
  };

  const hasFiles = previews.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* ── Botón ícono compacto ── */}
      <div className="relative inline-flex">
        {hasFiles && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-900 z-10 flex items-center justify-center">
            {previews.length}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (hasFiles) setShowPanel((v) => !v);
            else fileInputRef.current?.click();
          }}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
            hasFiles ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"
          }`}
          aria-label={hasFiles ? "Ver adjuntos" : "Adjuntar foto"}
        >
          {isResizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Panel expandible ── */}
      {showPanel && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Grid de thumbnails */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                  {/* Info overlay */}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-end pb-1.5 px-1">
                    <span className="text-white text-[9px] line-clamp-1 text-center font-medium w-full">{p.name}</span>
                    <span className="text-white/60 text-[9px]">{p.sizeKb} KB</span>
                  </div>
                  {/* Botón eliminar sempre visible */}
                  <button type="button" onClick={() => handleRemove(p.id)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white shadow-md active:scale-95">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botón añadir más */}
          {previews.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isResizing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <Paperclip className="h-4 w-4" />
              Añadir foto
            </button>
          )}
        </div>
      )}

      {/* Input oculto */}
      <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
