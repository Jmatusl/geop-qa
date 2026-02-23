"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Cropper from "react-easy-crop";
import Webcam from "react-webcam";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, RefreshCw, Save, Image as ImageIcon, ImagePlus, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { useUpdatePerson } from "@/lib/hooks/use-persons";
import { useSettings } from "@/lib/hooks/use-settings";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";

// Interfaz para la configuración de imagen (alineada con backend/seed)
interface PersonImageConfig {
  maxSizeKb: number;
  allowedFormats: string[];
  aspectRatio: number;
  targetResolution?: number; // Nueva propiedad opcional
}

interface ProfileImageDialogProps {
  personId: string;
  currentImage?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ProfileImageDialog({ personId, currentImage, open, onOpenChange, trigger }: ProfileImageDialogProps) {
  // Estados Globales y Utils
  const { data: settings } = useSettings();
  const { mutateAsync: updatePerson } = useUpdatePerson();

  // Obtener configuración (Prioridad: DB > Fallback)
  const config: PersonImageConfig = useMemo(() => {
    const dbConfig = settings?.find((s) => s.key === "PERSON_IMAGE_CONFIG")?.value;
    return {
      ...uiConfigFallback.PERSON_IMAGE_CONFIG,
      ...dbConfig,
    };
  }, [settings]);

  // Estados Locales
  const [internalOpen, setInternalOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Referencias
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  // Control de apertura del diálogo
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Manejadores
  const handleTabChange = (value: string) => {
    setMode(value as "upload" | "camera");
    if (value === "upload") {
      setIsCameraActive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // 1. Validaciones usando la configuración dinámica
      if (!config.allowedFormats.includes(file.type)) {
        toast.error(`Formato no válido. Permitidos: ${config.allowedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ")}`);
        return;
      }

      if (file.size > config.maxSizeKb * 1024) {
        toast.error(`El archivo excede el tamaño máximo permitido de ${Math.round(config.maxSizeKb / 1000)}MB.`);
        return;
      }

      // 2. Cargar imagen si pasa validaciones
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImage(reader.result as string);
        // Resetear zoom y crop al cargar nueva imagen
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
    }
  };

  const handleActivateCamera = () => {
    if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      toast.error("Tu navegador bloquea la cámara (Contexto no seguro). Usa localhost o HTTPS.");
      return;
    }
    setIsCameraActive(true);
  };

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setSelectedImage(imageSrc);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  }, [webcamRef]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any, targetRes?: number): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    // Si tenemos un targetResolution, usamos ese tamaño fijo (ej: 512x512)
    // De lo contrario, usamos el tamaño del recorte original
    const outputWidth = targetRes || pixelCrop.width;
    const outputHeight = targetRes || pixelCrop.height;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Dibujar con redimensionamiento (navegador maneja la interpolación, generalmente bicúbica/suave)
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputWidth, outputHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("El Canvas está vacío"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.9,
      ); // Calidad 90%
    });
  };

  const handleSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;

    try {
      setIsUploading(true);

      // Pasar la resolución objetivo (ej: 512) a la función de recorte
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels, config.targetResolution);

      if (!croppedBlob) throw new Error("Error al procesar la imagen");

      // 1. Preparar FormData con el archivo
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");

      // 2. Enviar directamente al servidor
      const response = await fetch(`/api/v1/persons/${personId}/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir la imagen");
      }

      const { imagePath } = await response.json();

      // 3. Notificar éxito (el backend ya actualizó la DB)
      // Invalidar la query si es necesario a través del hook
      await updatePerson({ id: personId, imagePath: imagePath });

      toast.success("Foto de perfil actualizada correctamente");
      resetState();
      setIsOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al guardar la foto");
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Foto de Perfil</DialogTitle>
          <DialogDescription>Sube una foto o toma una captura. Asegúrate de que el rostro sea visible.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!selectedImage ? (
            <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="mr-2 h-4 w-4" /> Subir Archivo
                </TabsTrigger>
                <TabsTrigger value="camera">
                  <Camera className="mr-2 h-4 w-4" /> Usar Cámara
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg mt-4 gap-4">
                <div className="p-4 bg-muted rounded-full">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                    <ImagePlus className="mr-2 h-4 w-4" /> Seleccionar Imagen
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept={config.allowedFormats.join(", ")} onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Máximo {Math.round(config.maxSizeKb / 1000)}MB. Formatos: {config.allowedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ")}.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="camera" className="mt-4 flex flex-col items-center gap-4">
                {!isCameraActive ? (
                  <div className="flex flex-col items-center justify-center w-full aspect-video bg-muted rounded-lg border-2 border-dashed gap-4">
                    <div className="p-4 bg-background rounded-full">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">La cámara requiere permiso del navegador.</p>
                      <Button onClick={handleActivateCamera} variant="default">
                        Activar Cámara
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      mirrored={true}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: "user",
                        width: 1280,
                        height: 720,
                      }}
                      className="w-full h-full object-cover"
                      onUserMedia={() => console.log("Webcam iniciada correctamente")}
                      onUserMediaError={(err) => {
                        console.error("Error webcam:", err);
                        setIsCameraActive(false);
                        toast.error("No se pudo acceder a la cámara. Verifique permisos.");
                      }}
                    />
                  </div>
                )}

                <Button onClick={handleCapture} className="w-full" disabled={!isCameraActive}>
                  <Camera className="mr-2 h-4 w-4" /> Capturar Foto
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  minZoom={0.5}
                  maxZoom={5}
                  aspect={config.aspectRatio} // Uso de configuración dinámica
                  cropShape="rect"
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  restrictPosition={false}
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(0.5, zoom - 0.05))} title="Alejar">
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <Slider value={[zoom]} min={0.5} max={5} step={0.01} onValueChange={(v) => setZoom(v[0])} className="flex-1" />

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(5, zoom + 0.05))} title="Acercar">
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <div className="min-w-[45px] text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{Math.round(zoom * 100)}%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetState}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Nueva Foto
                </Button>
                <Button onClick={handleSave} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Guardar y Aplicar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
