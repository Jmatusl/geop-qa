"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronLeft, ClipboardList, ImageIcon, Info, Loader2, Paperclip, Search, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { resizeImage } from "@/lib/utils/image-utils";

import { RequerimientoSchema, RequerimientoFormData } from "../schema";
import { crearRequerimiento, buscarEquipos } from "../actions";

/* ─── Tipos ─── */
interface IngresoFormProps {
  data: {
    installations: any[];
    areas: any[];
    systems: any[];
    equipments: any[];
    types: any[];
    applicants: any[];
  };
}

interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

interface EquipmentResult {
  id: string;
  name: string;
  systemId: string;
  systemName: string;
  areaId: string;
  areaName: string;
  installationId: string;
  installationName: string;
  brand: string;
  model: string;
}

const MAX_DESCRIPTION = 300;
const MAX_IMAGES = 8;
const MAX_HEIGHT_PX = 1080;

/* ─── Componente ─── */
export default function IngresoDesktop({ data }: IngresoFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isChangingInstallation, setIsChangingInstallation] = useState(false);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);

  // Búsqueda rápida
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EquipmentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { mnt_request_ingreso: texts } = maintenanceConfig as any;
  const ft = texts?.form;

  /* Formulario */
  const form = useForm<RequerimientoFormData>({
    resolver: zodResolver(RequerimientoSchema),
    defaultValues: {
      installationId: "",
      areaId: "",
      systemId: "",
      equipmentId: "",
      typeId: "",
      applicantId: "",
      description: "",
      evidences: [],
    },
  });

  const watchedDescription = form.watch("description");
  const selectedAreaId = form.watch("areaId");
  const selectedSystemId = form.watch("systemId");
  const selectedTypeId = form.watch("typeId");
  const selectedInstallationId = form.watch("installationId");

  // --- FILTRADO JERÁRQUICO ---
  // 1. Áreas: Solo aquellas que tengan equipos en la instalación seleccionada
  const filteredAreas = selectedInstallationId ? data.areas.filter((a) => data.equipments.some((e) => e.installationId === selectedInstallationId && e.areaId === a.id)) : [];

  // 2. Sistemas: Pertenecen al área seleccionada Y tienen equipos en la instalación seleccionada
  const filteredSystems =
    selectedInstallationId && selectedAreaId
      ? data.systems.filter((s) => s.areaId === selectedAreaId && data.equipments.some((e) => e.installationId === selectedInstallationId && e.systemId === s.id))
      : [];

  // 3. Equipos: Pertenecen al sistema seleccionado Y a la instalación seleccionada
  const filteredEquipments = selectedInstallationId && selectedSystemId ? data.equipments.filter((e) => e.systemId === selectedSystemId && e.installationId === selectedInstallationId) : [];

  // 4. Solicitantes: Por instalación (o Globales si no tienen instalaciones asignadas)
  const filteredApplicants = selectedInstallationId ? data.applicants.filter((a) => a.installations?.length === 0 || a.installations?.some((i: any) => i.id === selectedInstallationId)) : [];

  /* Búsqueda híbrida (Local -> Servidor) */
  useEffect(() => {
    // 1. Convertir datos locales al formato de resultados, filtrados por instalación si existe
    const localData: EquipmentResult[] = data.equipments
      .filter((e) => !selectedInstallationId || e.installationId === selectedInstallationId)
      .map((e) => ({
        id: e.id,
        name: e.name,
        brand: e.brand || "",
        model: e.model || "",
        systemId: e.systemId,
        systemName: e.system?.name || "",
        areaId: e.areaId,
        areaName: e.system?.area?.name || "",
        installationId: e.installationId || "",
        installationName: data.installations.find((inst) => inst.id === e.installationId)?.name || "Desconocida",
      }));

    // 2. Si está vacío, mostrar los primeros 50 locales (ya filtrados por instalación)
    if (searchQuery.trim().length === 0) {
      setSearchResults(localData.slice(0, 50));
      return;
    }

    // 3. Filtrar localmente primero
    const q = searchQuery.toLowerCase();
    const localFiltered = localData.filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.systemName.toLowerCase().includes(q) || e.areaName.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q) || e.model?.toLowerCase().includes(q),
    );

    if (localFiltered.length > 0) {
      setSearchResults(localFiltered);
      setIsSearching(false);
      return;
    }

    // 4. Si no hay nada local y hay >= 2 caracteres, buscar en servidor
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        const res = await buscarEquipos(searchQuery, selectedInstallationId);
        setSearchResults(res);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, data.equipments, data.installations, selectedInstallationId]);

  // Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleEquipmentSelect = (eq: EquipmentResult) => {
    form.setValue("installationId", eq.installationId);
    setTimeout(() => {
      form.setValue("areaId", eq.areaId);
      setTimeout(() => {
        form.setValue("systemId", eq.systemId);
        setTimeout(() => form.setValue("equipmentId", eq.id), 50);
      }, 50);
    }, 50);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Equipo preseleccionado: ${eq.name}`);
  };

  /* Manejo de archivos con redimensión a 1080px */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (previews.length + files.length > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsResizing(true);
    try {
      const newPreviews: PreviewFile[] = [];
      for (const file of files) {
        const processedFile = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        newPreviews.push({
          id: `${Date.now()}-${Math.random()}`,
          file: processedFile,
          previewUrl: URL.createObjectURL(processedFile),
          name: file.name,
          sizeKb: Math.round(processedFile.size / 1024),
        });
      }
      setPreviews((prev) => [...prev, ...newPreviews]);
    } catch {
      toast.error("Error al procesar una o más imágenes.");
    } finally {
      setIsResizing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePreview = (id: string) => {
    setPreviews((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  /* Upload a R2 */
  const uploadFiles = async (): Promise<string[]> => {
    if (previews.length === 0) return [];
    setIsUploading(true);
    try {
      const fd = new FormData();
      previews.forEach((p) => fd.append("files", p.file));
      const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result.urls;
    } catch {
      toast.error("Error al subir las imágenes.");
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  /* Envío */
  const onSubmit = async (values: RequerimientoFormData) => {
    setIsSubmitting(true);
    let urls: string[] = [];
    if (previews.length > 0) {
      urls = await uploadFiles();
      if (urls.length === 0 && previews.length > 0) {
        setIsSubmitting(false);
        return;
      }
    }
    const result = await crearRequerimiento({ ...values, evidences: urls });
    setIsSubmitting(false);
    if (result.success) {
      toast.success(`Requerimiento #${result.folio} ingresado correctamente`);
      router.push("/mantencion/pendientes");
    } else {
      toast.error(result.error || "Error inesperado");
    }
  };

  const isBusy = isSubmitting || isUploading || isResizing;

  /* Fecha de hoy para el header móvil */
  const todayLabel = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit" });

  /* ─── JSX ─── */
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="w-full pb-20 lg:pb-0">
        {/* ── HEADER MÓVIL: barra blanca estilo app ── */}
        <div className="lg:hidden w-full bg-white dark:bg-slate-900 border-b border-border px-3 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <ClipboardList className="h-5 w-5 text-[#1e3a6e] dark:text-blue-400 shrink-0" />
          <span className="flex-1 font-extrabold text-sm uppercase tracking-wide text-slate-800 dark:text-white truncate">Ingreso Requerimiento</span>
          <span className="text-xs font-semibold text-muted-foreground shrink-0">{todayLabel}</span>
        </div>
        <div className="hidden lg:flex w-full bg-white dark:bg-slate-900 lg:rounded-t-xl border border-border px-6 py-5 flex-row items-center justify-end gap-4 shadow-sm">
          <div className="flex flex-row items-center gap-2 w-full lg:w-[60%] relative">
            {isChangingInstallation && (
              <div className="absolute -left-12 flex items-center animate-in fade-in slide-in-from-right-2">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              </div>
            )}
            {/* Instalación en el header */}
            <FormField
              control={form.control}
              name="installationId"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0">
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      setIsChangingInstallation(true);
                      form.setValue("areaId", "");
                      form.setValue("systemId", "");
                      form.setValue("equipmentId", "");
                      form.setValue("applicantId", "");
                      setTimeout(() => setIsChangingInstallation(false), 800);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-border text-slate-900 dark:text-slate-100 focus:ring-blue-500/20 rounded-xl">
                        <Building2 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 shrink-0" />
                        <SelectValue placeholder={ft?.field_installation ?? "Seleccionar Instalación"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {data.installations.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {/* Búsqueda rápida */}
            <Button
              type="button"
              disabled={!selectedInstallationId}
              onClick={() => setSearchOpen(true)}
              className="h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-6 shrink-0 transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:shadow-none"
              title={!selectedInstallationId ? "Seleccione una instalación primero" : "Buscar equipos"}
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar Equipos
            </Button>
          </div>
        </div>

        {/* ── CUERPO ── */}
        <div className="border border-t-0 lg:border lg:border-t-0 border-border lg:rounded-b-xl bg-card dark:bg-slate-900/60 shadow-sm">
          {/* Instalación + Búsqueda — solo móvil */}
          <div className="lg:hidden border-b border-border px-4 py-3">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{ft?.field_installation ?? "Nave / Instalación"}</p>
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="installationId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-0">
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        setIsChangingInstallation(true);
                        form.setValue("areaId", "");
                        form.setValue("systemId", "");
                        form.setValue("equipmentId", "");
                        form.setValue("applicantId", "");
                        setTimeout(() => setIsChangingInstallation(false), 600);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {data.installations.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="relative">
                <Button
                  type="button"
                  disabled={!selectedInstallationId}
                  onClick={() => setSearchOpen(true)}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 dark:text-white disabled:opacity-50"
                  aria-label="Buscar equipo"
                >
                  <Search className="h-4 w-4" />
                </Button>
                {isChangingInstallation && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm border border-border">
                    <Loader2 className="h-2.5 w-2.5 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Área / Sistema / Equipo — full width apilados */}
          <div className="border-b border-border px-4 lg:px-6 py-5 space-y-4">
            <FormField
              control={form.control}
              name="areaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{ft?.field_area ?? "Áreas"}</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("systemId", "");
                      form.setValue("equipmentId", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-10" disabled={!selectedInstallationId}>
                        <SelectValue placeholder={selectedInstallationId ? "Seleccionar" : "Seleccione Instalación"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{ft?.field_system ?? "Sistema"}</FormLabel>
                  <Select
                    disabled={!selectedAreaId}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("equipmentId", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-10" disabled={!selectedAreaId}>
                        <SelectValue placeholder={selectedAreaId ? "Seleccionar" : "Seleccione Área"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSystems.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="equipmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{ft?.field_equipment ?? "Equipo"}</FormLabel>
                  <Select disabled={!selectedSystemId} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full h-10" disabled={!selectedSystemId}>
                        <SelectValue placeholder={selectedSystemId ? "Seleccionar equipo" : "Seleccione Sistema"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredEquipments.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ── Tipo + Solicitante (izq) · Tabla referencia (der) ── */}
          <div className="border-b border-border">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Columna izquierda: Tipo + Solicitante apilados, alineados arriba */}
              <div className="border-b lg:border-b-0 lg:border-r border-border px-4 lg:px-6 py-3 lg:py-5 flex flex-col gap-3 lg:gap-4">
                <FormField
                  control={form.control}
                  name="typeId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{ft?.field_type ?? "Tipo de Requerimiento"}</FormLabel>
                        {/* Botón ⓘ — solo visible en móvil */}
                        <button
                          type="button"
                          onClick={() => setTypesModalOpen(true)}
                          className="lg:hidden text-muted-foreground hover:text-blue-500 transition-colors"
                          aria-label="Ver referencia de tipos"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.types.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Solicitante</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Seleccionar solicitante" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredApplicants.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              {selectedInstallationId ? "Sin solicitantes para esta instalación" : "Seleccione una instalación primero"}
                            </SelectItem>
                          ) : (
                            filteredApplicants.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Columna derecha: Tabla de referencia — solo visible en desktop */}
              <div className="hidden lg:block px-0 py-0">
                <table className="w-full text-sm h-full">
                  <tbody>
                    {data.types.map((t, idx) => (
                      <tr
                        key={t.id}
                        onClick={() => form.setValue("typeId", t.id)}
                        className={`cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                          selectedTypeId === t.id
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : idx % 2 === 0
                              ? "bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                              : "bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <td className={`px-4 py-2.5 font-medium w-44 whitespace-nowrap ${selectedTypeId === t.id ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {t.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{t.description ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal de referencia de tipos — solo en móvil */}
              <Dialog open={typesModalOpen} onOpenChange={setTypesModalOpen}>
                <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                    <DialogTitle className="text-lg font-bold text-center">Tipos de Requerimientos</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-sm">
                      <tbody>
                        {data.types.map((t, idx) => (
                          <tr
                            key={t.id}
                            onClick={() => {
                              form.setValue("typeId", t.id);
                              setTypesModalOpen(false);
                            }}
                            className={`cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                              selectedTypeId === t.id ? "bg-blue-50 dark:bg-blue-900/30" : idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/20" : "bg-white dark:bg-transparent"
                            }`}
                          >
                            <td className={`px-4 py-3 font-medium align-top w-36 ${selectedTypeId === t.id ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>{t.name}</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs leading-relaxed align-top">{t.description ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-border">
                    <Button
                      type="button"
                      onClick={() => setTypesModalOpen(false)}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-xl text-base"
                    >
                      Cerrar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Descripción — oculta en móvil */}
          <div className="hidden lg:block border-b border-border px-4 lg:px-6 py-3 lg:py-5">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {ft?.field_description ?? "Descripción del Síntoma"} ({watchedDescription?.length ?? 0}/{MAX_DESCRIPTION} caracteres)
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Textarea {...field} placeholder="Descripción detallada" className="w-full min-h-[110px] resize-none text-sm" maxLength={MAX_DESCRIPTION} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ── UPLOAD — Zona adjuntos ── */}
          <div className="px-4 lg:px-6 py-3 lg:py-5">
            {/* ─ Vista MÓVIL: botón compacto con panel togglable ─ */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{ft?.field_evidence ?? "Fotos adjuntas"}</p>
                <div className="flex items-center gap-2">
                  {/* Badge de conteo, visible cuando hay archivos */}
                  {previews.length > 0 && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {previews.length}/{MAX_IMAGES}
                    </span>
                  )}
                  {/* Botón compacto — verde cuando tiene archivos */}
                  <div className="relative">
                    {previews.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 z-10" />}
                    <button
                      type="button"
                      onClick={() => setShowEvidencePanel((v) => !v)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                        previews.length > 0
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"
                      }`}
                      aria-label="Ver adjuntos"
                    >
                      {isResizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel expandible */}
              {showEvidencePanel && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Thumbnails */}
                  {previews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {previews.map((p) => (
                        <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-end pb-1.5 px-1">
                            <span className="text-white text-[9px] line-clamp-1 text-center font-medium w-full">{p.name}</span>
                            <span className="text-white/60 text-[9px]">{p.sizeKb} KB</span>
                          </div>
                          {/* Botón eliminar siempre visible en móvil */}
                          <button type="button" onClick={() => removePreview(p.id)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white shadow-md">
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Botón AÑADIR */}
                  {previews.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isResizing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50"
                    >
                      <Paperclip className="h-4 w-4" />+ Añadir foto
                    </button>
                  )}
                </div>
              )}

              {/* Si no hay panel visible y no hay adjuntos, hint pequeño */}
              {!showEvidencePanel && previews.length === 0 && <p className="text-xs text-muted-foreground mt-1">Toca el ícono para adjuntar fotos opcionales</p>}
            </div>

            {/* ─ Vista DESKTOP: zona de drop completa ─ */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{ft?.field_evidence ?? "Fotos adjuntas (opcional)"}</p>
                {previews.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {previews.length}/{MAX_IMAGES}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={previews.length >= MAX_IMAGES || isResizing}
                className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 hover:text-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isResizing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">Procesando imágenes...</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Adjuntar fotos ({previews.length})</span>
                    <span className="text-xs opacity-60">
                      JPG, PNG, PDF · máx. {MAX_IMAGES} archivos · auto-redimensiona a {MAX_HEIGHT_PX}px
                    </span>
                  </>
                )}
              </button>
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {previews.map((p) => (
                    <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-2 px-1">
                        <span className="text-white text-[9px] line-clamp-1 text-center font-medium w-full">{p.name}</span>
                        <span className="text-white/60 text-[9px]">{p.sizeKb} KB</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePreview(p.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
          </div>

          {/* Botón de envío — solo desktop */}
          <div className="hidden lg:flex px-6 py-4 border-t border-border justify-end">
            <Button
              type="submit"
              disabled={isBusy}
              className="h-11 px-8 font-bold bg-[#283c7f] hover:bg-[#1e2d5f] text-white rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isUploading ? "Subiendo..." : isResizing ? "Procesando..." : "Guardando..."}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4 text-white" />
                  {ft?.button_submit ?? "Enviar Requerimiento"}
                </>
              )}
            </Button>
          </div>

          {/* Barra de acción fija inferior — solo móvil */}
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-slate-900 border-t border-border px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-12 px-5 font-semibold rounded-xl dark:text-white shrink-0">
              Volver
            </Button>
            <Button type="submit" disabled={isBusy} className="flex-1 h-12 font-bold bg-[#283c7f] hover:bg-[#1e2d5f] text-white rounded-xl disabled:opacity-50 transition-all active:scale-[0.98]">
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isUploading ? "Subiendo..." : isResizing ? "Procesando..." : "Guardando..."}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4 text-white" />
                  {ft?.button_submit ?? "Enviar Requerimiento"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── MODAL BÚSQUEDA RÁPIDA (Rediseñado) ── */}
        <Dialog
          open={searchOpen}
          onOpenChange={(open) => {
            if (!open) {
              setSearchOpen(false);
              setSearchQuery("");
            } else {
              setSearchOpen(true);
            }
          }}
        >
          <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[80vw] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
            <div className="bg-white dark:bg-slate-900 border-b border-border p-6 relative">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="h-6 w-6 text-blue-600" />
                  Buscar Equipos
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Filtra por nombre del equipo, área, sistema o instalación.</p>
              </DialogHeader>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar equipo, área, sistema o instalación..."
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl outline-none text-base font-medium transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="font-medium">Buscando en base de datos profunda...</p>
                </div>
              )}

              {!isSearching && searchResults.length === 0 && searchQuery.length > 0 && (
                <div className="py-12 text-center text-muted-foreground border-b border-border/50">
                  <Info className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-base font-medium">Sin resultados para &quot;{searchQuery}&quot;</p>
                  <p className="text-xs mt-1">Intenta con términos más generales o verifica la ortografía.</p>
                </div>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => handleEquipmentSelect(eq)}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group relative flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[15px] text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{eq.name}</span>
                        {(eq.brand || eq.model) && (
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 font-medium truncate">
                            ({eq.brand}
                            {eq.brand && eq.model ? " - " : ""}
                            {eq.model})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="text-[13px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Área:</span> {eq.areaName}
                        </p>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <p className="text-[13px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Sistema:</span> {eq.systemName}
                        </p>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <p className="text-[13px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Instalación:</span> <span className="text-blue-600/80 dark:text-blue-400/80 font-medium">{eq.installationName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Click para seleccionar</span>
                      <ChevronLeft className="h-4 w-4 rotate-180 text-blue-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border-t border-border p-4 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 rounded font-mono font-bold text-slate-600 dark:text-slate-400">ESC</kbd>
                  <span>Cerrar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 rounded font-mono font-bold text-slate-600 dark:text-slate-400">⏎</kbd>
                  <span>Seleccionar</span>
                </div>
              </div>
              <span>{searchResults.length === 50 ? "Sugerencias principales" : `${searchResults.length} resultados encontrados`}</span>
            </div>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}
