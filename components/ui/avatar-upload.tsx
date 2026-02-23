"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AvatarUploadProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isLoading?: boolean;
  editable?: boolean;
  priorityInfo?: {
    hasGoogleAvatar?: boolean;
    hasPersonImage?: boolean;
  };
  size?: "sm" | "md" | "lg" | "xl";
}

export function AvatarUpload({ src, alt = "Avatar", fallback = "US", onUpload, onRemove, isLoading = false, editable = true, priorityInfo, size = "lg" }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2MB");
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setIsDeleting(true);
    try {
      await onRemove();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isCustomAvatar = src && src.includes("avatars/"); // Simple check based on our implementation

  return (
    <Dialog open={dialogOpen} onOpenChange={editable ? setDialogOpen : undefined}>
      <DialogTrigger asChild>
        <div className={`relative group ${editable ? "cursor-pointer" : ""}`}>
          <Avatar className={`${sizeClasses[size]}`}>
            <AvatarImage src={src || ""} alt={alt} />
            <AvatarFallback className="text-xl bg-slate-200 dark:bg-slate-700">{fallback}</AvatarFallback>
          </Avatar>

          {editable && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white h-6 w-6" />
            </div>
          )}

          {/* Indicador de carga */}
          {(isLoading || isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </DialogTrigger>

      {editable && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto de Perfil</DialogTitle>
            <DialogDescription>Sube una imagen para personalizar tu perfil. Se priorizará esta imagen sobre la de Google o ficha personal.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={src || ""} alt={alt} />
              <AvatarFallback className="text-3xl bg-slate-100 dark:bg-slate-800">{fallback}</AvatarFallback>
            </Avatar>

            {priorityInfo && !src && (
              <div className="text-sm text-muted-foreground text-center">
                Visto que no tienes avatar personalizado, estamos mostrando:
                {priorityInfo.hasGoogleAvatar ? (
                  <span className="font-semibold block text-blue-600">Tu foto de Google</span>
                ) : priorityInfo.hasPersonImage ? (
                  <span className="font-semibold block text-green-600">Tu foto de Ficha Personal</span>
                ) : (
                  <span className="font-semibold block">Tus iniciales</span>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />

            <Button variant="default" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isDeleting}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Subir nueva foto
            </Button>

            {isCustomAvatar && (
              <Button variant="destructive" onClick={handleRemove} disabled={isUploading || isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Quitar foto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
