"use client";

import { useState, useRef } from "react";
import { Loader2, Paperclip, Trash2, ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { resizeImage } from "@/lib/utils/image-utils";
import { addWREvidences, deleteWREvidence } from "../actions";

interface Evidence {
  id: string;
  publicUrl: string;
  storagePath: string;
  mimeType: string | null;
}

interface WREvidenceSectionProps {
  wrId: string;
  initialEvidences: Evidence[];
  isMobile?: boolean;
}

const MAX_IMAGES = 8;
const MAX_HEIGHT_PX = 1080;

export function WREvidenceSection({ wrId, initialEvidences, isMobile = false }: WREvidenceSectionProps) {
  const [evidences, setEvidences] = useState<Evidence[]>(initialEvidences);
  const [isUploading, setIsUploading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(!isMobile); // En desktop siempre visible
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = evidences.length;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (evidences.length + files.length > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} archivos permitidos totales`);
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
      toast.error("Error al procesar una o más imágenes.");
      setIsResizing(false);
      return;
    }

    setIsResizing(false);
    setIsUploading(true);

    try {
      // 1. Subir archivos a R2 via proxy (app/api/mantencion/upload)
      const fd = new FormData();
      processedFiles.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      const newUrls = result.urls as string[];

      // 2. Vincular con WR
      const linkRes = await addWREvidences(wrId, newUrls);

      if (!linkRes.success || !linkRes.evidences) throw new Error(linkRes.error);

      setEvidences((prev) => [...linkRes.evidences, ...prev]);
      toast.success("Archivos adjuntados correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al subir archivos");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (evidenceId: string) => {
    setIsDeleting(evidenceId);
    try {
      const res = await deleteWREvidence(wrId, evidenceId);
      if (!res.success) throw new Error(res.error);

      setEvidences((prev) => prev.filter((e) => e.id !== evidenceId));
      toast.success("Evidencia eliminada");
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    } finally {
      setIsDeleting(null);
    }
  };

  const isBusy = isResizing || isUploading;

  // Render para cada item
  const renderItem = (e: Evidence) => {
    const isPdf = e.mimeType?.includes("pdf") || e.publicUrl.endsWith(".pdf");
    const isDeletingThis = isDeleting === e.id;

    // Obtener signed URL
    const url = `/api/v1/storage/signed-url?key=${encodeURIComponent(e.storagePath)}&redirect=true`;

    return (
      <div key={e.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center">
        {isPdf ? (
          <div className="flex flex-col items-center justify-center p-2 text-red-500 gap-1 opacity-70">
            <FileText className="h-10 w-10" />
            <span className="text-[10px] uppercase font-bold text-center leading-tight line-clamp-2 break-all bg-white px-1 mt-1 rounded text-red-700">PDF</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
        )}

        {/* Capa Hover / Texto info */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`absolute inset-0 bg-black/55 flex flex-col items-center justify-end pb-2 px-1 transition-opacity ${isMobile ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}
        >
          <span className="text-white text-[9px] text-center font-medium w-full truncate">Ver original</span>
        </a>

        {/* Boton Eliminar */}
        <button
          type="button"
          disabled={isDeletingThis}
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            handleDelete(e.id);
          }}
          className={`absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-md transition-opacity ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"} disabled:opacity-50`}
        >
          {isDeletingThis ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Trash2 className="h-2.5 w-2.5" />}
        </button>
      </div>
    );
  };

  // VISTA MÓVIL
  if (isMobile) {
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Evidencias ({totalCount})</p>

          <div className="relative">
            {totalCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 z-10" />}
            <button
              type="button"
              onClick={() => setShowEvidencePanel((v) => !v)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                totalCount > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"
              }`}
            >
              <ImageIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showEvidencePanel && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {totalCount > 0 && <div className="grid grid-cols-3 gap-2">{evidences.map(renderItem)}</div>}
            {totalCount < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 transition-all disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {isBusy ? "Subiendo..." : "+ Añadir Archivo"}
              </button>
            )}
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
          </div>
        )}
      </div>
    );
  }

  // VISTA DESKTOP
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#1e3a6e] dark:text-blue-400 uppercase tracking-wider">Evidencias Adjuntas</p>
        <span className="text-xs text-muted-foreground tabular-nums font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
          {totalCount} / {MAX_IMAGES}
        </span>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={totalCount >= MAX_IMAGES || isBusy}
        className="w-full border-2 border-dashed border-border rounded-xl py-4 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-[#283c7f] hover:bg-[#283c7f]/5 dark:hover:bg-blue-900/10 hover:text-[#283c7f] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {isBusy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Subiendo archivos...</span>
          </>
        ) : (
          <>
            <Paperclip className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Adjuntar archivos</span>
            <span className="text-[10px] opacity-60">JPG, PNG, PDF · máx. {MAX_IMAGES}</span>
          </>
        )}
      </button>

      {totalCount > 0 && <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">{evidences.map(renderItem)}</div>}

      <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
