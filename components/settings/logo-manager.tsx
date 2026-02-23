"use client";

import { useState, useRef } from "react";
import { ImageIcon, Upload, Link as LinkIcon, X, Pencil, Monitor, Moon, Sun, Check, AlertCircle, Maximize2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { resizeImage, fileToBase64, isValidUrl } from "@/lib/utils/image-utils";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LogoConfig {
  image: string;
  sourceType: "url" | "base64";
  base64?: string;
}

interface LogoManagerProps {
  title: string;
  description: string;
  value: {
    light_mode: LogoConfig;
    dark_mode: LogoConfig;
    width_class: string;
    height_class: string;
    margin_top_class: string;
    height_container: string;
    show?: boolean;
  };
  onChange: (newValue: any) => void;
  action?: React.ReactNode;
}

export function LogoManager({ title, description, value, onChange, action }: LogoManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<"light" | "dark">("light");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLogo = (editMode === "light" ? value?.light_mode : value?.dark_mode) || { image: "", sourceType: "url" };

  const parseValue = (val: string) => {
    if (!val) return { isClass: false, value: "" };
    const isClass = val.toString().includes("-") || val.toString().includes(" ");
    return { isClass, value: val.toString() };
  };

  const getPreviewStyle = (prop: string, val: any) => {
    const { isClass, value: strVal } = parseValue(val);
    if (isClass) return {};
    const num = parseInt(strVal);
    if (isNaN(num)) return {};
    return { [prop]: num };
  };

  const getPreviewClass = (val: any) => {
    const { isClass, value: strVal } = parseValue(val);
    return isClass ? strVal : "";
  };

  const handleUpdateLogo = (updates: Partial<LogoConfig>) => {
    const key = editMode === "light" ? "light_mode" : "dark_mode";
    onChange({
      ...value,
      [key]: { ...currentLogo, ...updates },
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Redimensionar a 256px de ancho máximo
      const resizedFile = await resizeImage(file, 256);
      const base64 = await fileToBase64(resizedFile);

      handleUpdateLogo({
        image: base64, // Seguimos usando image para la previsualización directa
        base64: base64, // Y guardamos explícitamente en el campo extra
        sourceType: "base64",
      });
      toast.success("Imagen procesada y cargada exitosamente");
    } catch (error) {
      toast.error("Error al procesar la imagen");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    handleUpdateLogo({
      image: "",
      base64: "",
      sourceType: "url",
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Panel de Control y Configuración */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                {typeof value?.show !== "undefined" && (
                  <div className="flex items-center gap-2 mr-2 px-2 py-1 bg-muted rounded-full border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{value.show ? "Visible" : "Oculto"}</span>
                    <Switch checked={value.show} onCheckedChange={(checked) => onChange({ ...value, show: checked })} className="data-[state=checked]:bg-green-500" />
                  </div>
                )}
                <Badge variant="outline" className="h-6">
                  Branding
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Label className="text-xs uppercase text-muted-foreground font-bold">Clases CSS de Imagen</Label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Ancho (width_class)</Label>
                    <Input value={value?.width_class || ""} onChange={(e) => onChange({ ...value, width_class: e.target.value })} placeholder="ej: w-48" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Alto (height_class)</Label>
                    <Input value={value?.height_class || ""} onChange={(e) => onChange({ ...value, height_class: e.target.value })} placeholder="ej: h-12" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Margen Superior (margin_top_class)</Label>
                    <Input value={value?.margin_top_class || ""} onChange={(e) => onChange({ ...value, margin_top_class: e.target.value })} placeholder="ej: mt-1" className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-xs uppercase text-muted-foreground font-bold">Contenedor</Label>
                <div className="space-y-1">
                  <Label className="text-[10px]">Padding/Alto Contenedor (height_container)</Label>
                  <Input value={value?.height_container || ""} onChange={(e) => onChange({ ...value, height_container: e.target.value })} placeholder="ej: h-22 px-4" className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground font-bold">Configuración por Modo</Label>
                <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full border">
                  <span className={cn("text-[10px] font-bold transition-colors", currentLogo?.sourceType === "url" ? "text-primary" : "text-muted-foreground")}>URL</span>
                  <Switch checked={currentLogo?.sourceType === "base64"} onCheckedChange={(checked) => handleUpdateLogo({ sourceType: checked ? "base64" : "url" })} />
                  <span className={cn("text-[10px] font-bold transition-colors", currentLogo?.sourceType === "base64" ? "text-primary" : "text-muted-foreground")}>B64</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={editMode === "light" ? "secondary" : "ghost"}
                  className={cn("flex-1 justify-start gap-2 h-12 border", editMode === "light" && "border-primary/50 bg-primary/5 ring-1 ring-primary/20")}
                  onClick={() => setEditMode("light")}
                >
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md text-amber-600">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-none">Modo Claro</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{value?.light_mode?.sourceType === "url" ? "URL Externa" : "Base64 Local"}</p>
                  </div>
                  {editMode === "light" && <Check className="h-3 w-3 ml-auto text-primary" />}
                </Button>
                <Button
                  variant={editMode === "dark" ? "secondary" : "ghost"}
                  className={cn("flex-1 justify-start gap-2 h-12 border", editMode === "dark" && "border-primary/50 bg-primary/5 ring-1 ring-primary/20")}
                  onClick={() => setEditMode("dark")}
                >
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md text-indigo-600">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-none">Modo Oscuro</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{value?.dark_mode?.sourceType === "url" ? "URL Externa" : "Base64 Local"}</p>
                  </div>
                  {editMode === "dark" && <Check className="h-3 w-3 ml-auto text-primary" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Area de Preview e Interacción Directa */}
          <div className="w-full md:w-[320px] flex flex-col gap-4">
            <div
              className={cn(
                "relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden group transition-all duration-300",
                previewMode === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800",
              )}
            >
              {/* Toggle de Preview Mode */}
              <div className="absolute top-2 right-2 flex bg-background/80 backdrop-blur-sm border rounded-full p-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className={cn("p-1 rounded-full transition-colors", previewMode === "light" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}
                  onClick={() => setPreviewMode("light")}
                >
                  <Sun className="h-3 w-3" />
                </button>
                <button
                  className={cn("p-1 rounded-full transition-colors", previewMode === "dark" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}
                  onClick={() => setPreviewMode("dark")}
                >
                  <Moon className="h-3 w-3" />
                </button>
              </div>

              {/* Logo Display */}
              {(currentLogo?.sourceType === "base64" ? currentLogo?.base64 || currentLogo?.image : currentLogo?.image) ? (
                <div className="relative p-6 group/img cursor-pointer" onClick={() => setIsEditing(true)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentLogo?.sourceType === "base64" ? currentLogo?.base64 || currentLogo?.image : currentLogo?.image}
                    alt="Logo Preview"
                    style={{
                      ...getPreviewStyle("width", value?.width_class),
                      ...getPreviewStyle("height", value?.height_class),
                    }}
                    className={cn(
                      getPreviewClass(value?.width_class),
                      getPreviewClass(value?.height_class),
                      "max-w-[280px] max-h-[120px] object-contain transition-transform group-hover/img:scale-105",
                    )}
                  />
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg">
                    <Pencil className="h-6 w-6 text-white drop-shadow-md" />
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:text-primary transition-colors h-full w-full"
                  onClick={() => setIsEditing(true)}
                >
                  <div className="p-4 rounded-full bg-muted/50 border border-muted-foreground/10 group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-xs font-medium">Click para configurar logo</p>
                </div>
              )}

              {/* Footer del Preview Card */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-background/50 backdrop-blur-md border-t flex items-center justify-between translate-y-full group-hover:translate-y-0 transition-transform">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Vista: {previewMode === "light" ? "Claro" : "Oscuro"}</span>
                {currentLogo.image && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-10 gap-2 font-semibold hover:bg-primary hover:text-primary-foreground transition-all active:scale-[0.98] mt-auto"
              onClick={() => setIsEditing(true)}
            >
              <Upload className="h-4 w-4" />
              <span>Gestionar Logo ({editMode.toUpperCase()})</span>
            </Button>
            {action && <div>{action}</div>}
          </div>
        </div>

        {/* Sección de "Vista Real" (Representación en Header) */}
        <Collapsible className="mt-8 border rounded-xl overflow-hidden bg-muted/20">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Monitor className="h-3 w-3" />
                Representación en la Interfaz
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px] h-4">
                  Visualizar cambios en vivo
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-3">
              <div className={cn("rounded-xl border shadow-lg overflow-hidden transition-colors duration-500", previewMode === "light" ? "bg-white" : "bg-slate-950 border-slate-800")}>
                <div className={cn("h-16 flex items-center px-6 gap-4 border-b", previewMode === "light" ? "border-slate-100" : "border-slate-900")}>
                  <div style={getPreviewStyle("height", value?.height_container)} className={cn(getPreviewClass(value?.height_container), "flex items-center min-w-[40px]")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        (previewMode === "light"
                          ? value?.light_mode?.sourceType === "base64"
                            ? value?.light_mode.base64 || value?.light_mode.image
                            : value?.light_mode?.image
                          : value?.dark_mode?.sourceType === "base64"
                            ? value?.dark_mode.base64 || value?.dark_mode.image
                            : value?.dark_mode?.image) || "/placeholder.png"
                      }
                      alt="Mock"
                      style={{
                        ...getPreviewStyle("width", value?.width_class),
                        ...getPreviewStyle("height", value?.height_class),
                        ...getPreviewStyle("marginTop", value?.margin_top_class),
                      }}
                      className={cn(
                        getPreviewClass(value?.width_class),
                        getPreviewClass(value?.height_class),
                        getPreviewClass(value?.margin_top_class),
                        "max-w-[180px] max-h-[48px] object-contain grayscale-[0.2] group-hover:grayscale-0 transition-all",
                      )}
                    />
                  </div>
                  <div className="flex-1 flex justify-end gap-3 opacity-30">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="p-4 space-y-2 opacity-15">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground italic">Esta es una simulación de cómo se verá el logo en la barra superior de la aplicación.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* MODAL DE EDICIÓN */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Logo - Modo {editMode === "light" ? "Claro" : "Oscuro"}</DialogTitle>
              <DialogDescription>Elige el origen de la imagen y configura su valor.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-dashed">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Origen del Logo</Label>
                  <p className="text-[11px] text-muted-foreground">{currentLogo?.sourceType === "url" ? "Usar una dirección web externa" : "Cargar imagen y guardar internamente"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className={cn("h-4 w-4 transition-colors", currentLogo?.sourceType === "url" ? "text-primary" : "text-muted-foreground")} />
                  <Switch checked={currentLogo?.sourceType === "base64"} onCheckedChange={(checked) => handleUpdateLogo({ sourceType: checked ? "base64" : "url" })} />
                  <Upload className={cn("h-4 w-4 transition-colors", currentLogo?.sourceType === "base64" ? "text-primary" : "text-muted-foreground")} />
                </div>
              </div>

              {currentLogo?.sourceType === "url" ? (
                <div className="space-y-2">
                  <Label>URL de la Imagen</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={currentLogo.image}
                        onChange={(e) => handleUpdateLogo({ image: e.target.value })}
                        placeholder="https://ejemplo.com/logo.png"
                        className={cn(!isValidUrl(currentLogo.image) && currentLogo.image && "border-destructive")}
                      />
                      {!isValidUrl(currentLogo.image) && currentLogo.image && <AlertCircle className="absolute right-3 top-2.5 h-4 w-4 text-destructive" />}
                    </div>
                    {currentLogo.image && (
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateLogo({ image: "" })}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!isValidUrl(currentLogo.image) && currentLogo.image && <p className="text-[10px] text-destructive font-medium">Por favor ingrese una URL válida.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer group",
                      isUploading ? "bg-muted animate-pulse" : "hover:bg-primary/5 hover:border-primary/50",
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">{isUploading ? "Procesando..." : "Haga clic para subir"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Límite automático: 256px de ancho</p>
                    </div>
                  </div>
                  {currentLogo.image && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="w-10 h-10 rounded border bg-white overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentLogo?.sourceType === "base64" ? currentLogo?.base64 || currentLogo?.image : currentLogo?.image} alt="Thumb" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-green-700 dark:text-green-400">{currentLogo?.sourceType === "base64" ? "Imagen Cargada Localmente" : "URL Externa Configurada"}</p>
                        <p className="text-[10px] text-green-600/70 truncate">{currentLogo?.sourceType === "base64" ? "Guardado en formato optimizado (WebP/Base64)" : currentLogo?.image}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleReset}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button className="w-full" onClick={() => setIsEditing(false)}>
                <Check className="h-4 w-4 mr-2" />
                Finalizar Configuración
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
