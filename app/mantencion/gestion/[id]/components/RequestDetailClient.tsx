"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import {
  ChevronLeft,
  Wrench,
  Save,
  Plus,
  Loader2,
  ExternalLink,
  Camera,
  DollarSign,
  Clock,
  History,
  RefreshCw,
  CheckCircle2,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Paperclip,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addIteration, addExpense, updateEstimatedDate, addEvidence } from "../actions";
import { updateRequestStatus } from "../../../consolidado/actions";
import { handleNumericInput, blockInvalidNumericKeys, parseCLP } from "@/lib/utils/number-utils";
import { resizeImage } from "@/lib/utils/image-utils";

/* ─── Tipos ─── */
interface RequestDetailClientProps {
  request: any;
  catalogs: { statuses: any[]; installations: any[] };
  currentUser: any;
}

interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

const MAX_IMAGES = 8;
const MAX_HEIGHT_PX = 1080;

export default function RequestDetailClient({ request, catalogs }: RequestDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  /* ─── Bitácora ─── */
  const [nota, setNota] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [showEvidenciasExistentes, setShowEvidenciasExistentes] = useState(request.evidences.length > 0);

  /* ─── Adjuntos (nuevas fotos para notas) ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);

  /* ─── Gastos (valores como string formateado) ─── */
  const [expDesc, setExpDesc] = useState("");
  const [expAmountDisplay, setExpAmountDisplay] = useState(""); // "1.500.000" para mostrar
  const [expAmountRaw, setExpAmountRaw] = useState(0); // 1500000 para guardar
  const [expType, setExpType] = useState("SPARE_PART");
  const [expQtyDisplay, setExpQtyDisplay] = useState("1");
  const [expQtyRaw, setExpQtyRaw] = useState(1);

  /* ─── Fechas ─── */
  const [estDate, setEstDate] = useState(request.estimatedEndDate ? format(new Date(request.estimatedEndDate), "yyyy-MM-dd") : "");
  const [estReason, setEstReason] = useState("");
  const [showDateEdit, setShowDateEdit] = useState(false);

  /* ─── Modal Tercerización ─── */
  const [tercModal, setTercModal] = useState(false); // modal abierto
  const [tercStatusId, setTercStatusId] = useState(""); // ID del estado Tercerizar pendiente
  const [tercReason, setTercReason] = useState(""); // justificación obligatoria
  const [tercPreviews, setTercPreviews] = useState<PreviewFile[]>([]); // fotos opcionales
  const [tercResizing, setTercResizing] = useState(false);
  const [tercUploading, setTercUploading] = useState(false);
  const tercFileRef = useRef<HTMLInputElement>(null);

  /* ─── Handlers numéricos ─── */
  const handleAmountChange = (raw: string) => {
    const { displayValue, raw: num } = handleNumericInput(raw);
    setExpAmountDisplay(displayValue);
    setExpAmountRaw(num);
  };

  const handleQtyChange = (raw: string) => {
    const { displayValue, raw: num } = handleNumericInput(raw);
    setExpQtyDisplay(displayValue || "1");
    setExpQtyRaw(num || 1);
  };

  /* ─── Handlers de estado ─── */
  const TERCERIZAR_NAME = "Tercerizar"; // nombre exacto del estado en la BD

  const handleStatusChange = (newStatusId: string) => {
    const status = catalogs.statuses.find((s) => s.id === newStatusId);
    // Si el nuevo estado es Tercerizar → abrir modal de justificación
    if (status?.name === TERCERIZAR_NAME) {
      setTercStatusId(newStatusId);
      setTercReason("");
      setTercPreviews([]);
      setTercModal(true);
      return;
    }
    // Otros estados → cambiar directamente
    startTransition(async () => {
      const res = await updateRequestStatus(request.id, newStatusId);
      if (res.success) {
        toast.success(`Estado → ${status?.name || ""}`);
        router.refresh();
      } else toast.error("Error al cambiar estado");
    });
  };

  /* ─── Confirmar Tercerización ─── */
  const handleConfirmarTercerizar = () => {
    if (!tercReason.trim()) {
      toast.error("La justificación es obligatoria");
      return;
    }
    startTransition(async () => {
      let imageUrls: string[] = [];
      if (tercPreviews.length > 0) {
        setTercUploading(true);
        try {
          const fd = new FormData();
          tercPreviews.forEach((p) => fd.append("files", p.file));
          const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
          const result = await res.json();
          if (res.ok) imageUrls = result.urls;
        } catch {
          toast.error("Error al subir imágenes");
        } finally {
          setTercUploading(false);
        }
      }
      const res = await updateRequestStatus(request.id, tercStatusId, undefined, tercReason, imageUrls);
      if (res.success) {
        toast.success("Requerimiento tercerizado");
        setTercModal(false);
        router.refresh();
      } else toast.error("Error al tercerizar");
    });
  };

  /* ─── Adjuntos del modal de tercerización ─── */
  const handleTercFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setTercResizing(true);
    try {
      const newP: PreviewFile[] = [];
      for (const file of files) {
        const processed = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        newP.push({ id: `${Date.now()}-${Math.random()}`, file: processed, previewUrl: URL.createObjectURL(processed), name: file.name, sizeKb: Math.round(processed.size / 1024) });
      }
      setTercPreviews((p) => [...p, ...newP]);
    } catch {
      toast.error("Error al procesar imagen");
    } finally {
      setTercResizing(false);
      if (tercFileRef.current) tercFileRef.current.value = "";
    }
  };

  /* ─── Handler guardar nota ─── */
  const handleGuardarNota = () => {
    if (!nota.trim()) return;
    startTransition(async () => {
      // Subir fotos primero si hay previews pendientes
      let urls: string[] = [];
      if (previews.length > 0) {
        setIsUploading(true);
        try {
          const fd = new FormData();
          previews.forEach((p) => fd.append("files", p.file));
          const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          urls = result.urls;
          // Guardar evidencias en DB
          if (urls.length > 0) await addEvidence(request.id, urls);
        } catch {
          toast.error("Error al subir fotos");
        } finally {
          setIsUploading(false);
        }
      }

      const res = await addIteration(request.id, nota, tecnico);
      if (res.success) {
        toast.success(previews.length > 0 ? "Nota y fotos guardadas" : "Nota guardada");
        setNota("");
        setTecnico("");
        setPreviews([]);
        setShowEvidencePanel(false);
        router.refresh();
      } else {
        toast.error("Error al guardar nota");
      }
    });
  };

  /* ─── Handlers de adjuntos ─── */
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (previews.length + files.length > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes`);
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
      setPreviews((p) => [...p, ...newPreviews]);
      setShowEvidencePanel(true);
    } catch {
      toast.error("Error al procesar imagen.");
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
    if (previews.length <= 1) setShowEvidencePanel(false);
  };

  /* ─── Handler guardar gasto ─── */
  const handleGuardarGasto = () => {
    if (!expDesc.trim() || !expAmountRaw) return;
    startTransition(async () => {
      const res = await addExpense({
        requestId: request.id,
        description: expDesc,
        amount: expAmountRaw,
        type: expType,
        quantity: expQtyRaw || 1,
      });
      if (res.success) {
        toast.success("Gasto registrado");
        setExpDesc("");
        setExpAmountDisplay("");
        setExpAmountRaw(0);
        setExpQtyDisplay("1");
        setExpQtyRaw(1);
        router.refresh();
      } else toast.error("Error al guardar gasto");
    });
  };

  /* ─── Handler actualizar fecha ─── */
  const handleActualizarFecha = () => {
    if (!estDate || !estReason.trim()) {
      toast.error("Ingrese fecha y motivo");
      return;
    }
    startTransition(async () => {
      const res = await updateEstimatedDate(request.id, new Date(estDate), estReason);
      if (res.success) {
        toast.success("Fecha actualizada");
        setEstReason("");
        setShowDateEdit(false);
        router.refresh();
      } else toast.error("Error al actualizar fecha");
    });
  };

  /* ─── Total gastos ─── */
  const totalGastos = useMemo(() => request.expenses.reduce((a: number, e: any) => a + Number(e.amount) * Number(e.quantity), 0), [request.expenses]);

  const isBusy = isPending || isUploading || isResizing;

  /* ──────────────────────────────────────────────────────────────── */
  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-10">
      {/* ══ HEADER MÓVIL ══ */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-border flex items-center gap-0 h-14 lg:hidden">
        <button onClick={() => router.back()} className="h-14 w-12 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 active:opacity-70 transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Wrench className="h-4 w-4 text-[#283c7f] dark:text-blue-400 shrink-0" />
          <span className="text-sm font-extrabold uppercase tracking-wide truncate text-slate-900 dark:text-white">
            MANTENCIÓN #{request.folioPrefix}-{request.folio}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 pr-3 shrink-0">{format(new Date(), "dd-MM-yy")}</span>
      </header>

      {/* ══ HEADER DESKTOP ══ */}
      <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border bg-white dark:bg-slate-900 shadow-sm">
        {/* Izquierda: nav + folio + nombre */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-black text-[#283c7f] dark:text-blue-400 text-xl">
                #{request.folioPrefix}-{request.folio}
              </span>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: request.status.colorHex ? `${request.status.colorHex}18` : undefined,
                  color: request.status.colorHex || undefined,
                  borderColor: request.status.colorHex ? `${request.status.colorHex}50` : undefined,
                }}
                className="font-black uppercase text-[11px] tracking-widest px-3 h-6"
              >
                {request.status.name}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{format(new Date(request.createdAt), "dd/MM/yyyy · HH:mm")}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
              {request.equipment.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {request.equipment.brand} {request.equipment.model} · {request.installation.name}
              </span>
            </h1>
          </div>
        </div>

        {/* Derecha: Selector de estado rápido */}
        <div className="flex items-center gap-3 shrink-0">
          <Select value={request.statusId} onValueChange={handleStatusChange} disabled={isBusy}>
            <SelectTrigger className="h-9 w-[180px] rounded-xl text-sm font-bold border-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: request.status.colorHex }} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {catalogs.statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colorHex }} />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ══ CONTENIDO MÓVIL ══ */}
      <div className="lg:hidden space-y-4">
        {/* ──────────── TARJETA 1: DATOS DEL REQUERIMIENTO ──────────── */}
        <section className="bg-white dark:bg-slate-900 lg:rounded-xl border-y lg:border border-border shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Datos del requerimiento</p>
            <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(request.createdAt), "dd/MM/yy HH:mm")}</span>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Equipo + Ubicación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Equipo</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{request.equipment.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {request.equipment.brand} {request.equipment.model}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Instalación</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{request.installation.name}</p>
                <p className="text-[11px] text-muted-foreground">{request.equipment.system?.area?.name}</p>
              </div>
            </div>

            {/* Síntoma */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Síntoma reportado</p>
              <div className="relative px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="absolute top-0 left-2 text-4xl leading-none text-slate-200 dark:text-slate-600 font-serif select-none">&ldquo;</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-4 pb-1 px-2 italic">{request.description || "Sin descripción."}</p>
                <span className="absolute bottom-0 right-2 text-4xl leading-none text-slate-200 dark:text-slate-600 font-serif select-none">&rdquo;</span>
              </div>
            </div>

            {/* Estado + Fecha estimada */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Estado</p>
                <Select value={request.statusId} onValueChange={handleStatusChange} disabled={isBusy}>
                  <SelectTrigger className="h-10 w-full rounded-lg text-sm font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: request.status.colorHex }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs.statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colorHex }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">
                  Fecha estimada{" "}
                  <button onClick={() => setShowDateEdit(!showDateEdit)} className="text-blue-500 underline normal-case font-bold">
                    {showDateEdit ? "cancelar" : "editar"}
                  </button>
                </p>
                {showDateEdit ? (
                  <div className="space-y-2">
                    <Input type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} className="h-10 rounded-lg text-sm w-full" />
                    <Input placeholder="Motivo del cambio..." value={estReason} onChange={(e) => setEstReason(e.target.value)} className="h-10 rounded-lg text-sm w-full" autoComplete="off" />
                    <Button size="sm" className="w-full bg-[#283c7f] text-white font-bold rounded-lg gap-1.5" onClick={handleActualizarFecha} disabled={isBusy}>
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar fecha
                    </Button>
                  </div>
                ) : (
                  <div className="h-10 flex items-center px-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border">
                    <Clock className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {request.estimatedEndDate ? format(new Date(request.estimatedEndDate), "dd/MM/yyyy") : <span className="font-normal text-muted-foreground italic">Sin definir</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ──────────── TARJETA 2: BITÁCORA + EVIDENCIA ──────────── */}
        <section className="bg-white dark:bg-slate-900 lg:rounded-xl border-y lg:border border-border shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Bitácora de trabajo</p>
            <Badge variant="secondary" className="font-bold text-[10px]">
              {request.iterations.length} entrada{request.iterations.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Formulario de nueva nota */}
          <div className="px-4 py-4 space-y-3 border-b border-border">
            {/* Fila: Técnico/Proveedor + botón adjuntar (mismo nivel) */}
            <div className="flex items-center gap-2">
              <Input placeholder="Técnico / proveedor (opcional)" value={tecnico} onChange={(e) => setTecnico(e.target.value)} className="h-10 rounded-lg text-sm flex-1" autoComplete="off" />
              {/* Botón cámara/imagen — ícono solo, alineado con el input */}
              <div className="relative shrink-0">
                {previews.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-900 z-10 flex items-center justify-center">
                    {previews.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (previews.length > 0) setShowEvidencePanel((v) => !v);
                    else fileInputRef.current?.click();
                  }}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                    previews.length > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"
                  }`}
                  aria-label="Adjuntar foto"
                >
                  {isResizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Textarea de nota */}
            <Textarea
              placeholder="Describa la acción realizada, hallazgo o próximo paso..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="min-h-[90px] rounded-lg text-sm w-full resize-none"
            />

            {/* Panel de previews (toggle) */}
            {showEvidencePanel && previews.length > 0 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-end pb-1.5 px-1">
                        <span className="text-white text-[9px] line-clamp-1 font-medium w-full text-center">{p.name}</span>
                        <span className="text-white/60 text-[9px]">{p.sizeKb} KB</span>
                      </div>
                      <button type="button" onClick={() => removePreview(p.id)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white shadow-md">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {previews.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isResizing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 transition-all"
                  >
                    <Paperclip className="h-4 w-4" />
                    Añadir más fotos
                  </button>
                )}
              </div>
            )}

            {/* Input oculto */}
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleAddFiles} />
          </div>

          {/* Fotos existentes del requerimiento (ya guardadas en DB) */}
          {request.evidences.length > 0 && (
            <div className="border-b border-border">
              <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setShowEvidenciasExistentes(!showEvidenciasExistentes)}>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {request.evidences.length} foto{request.evidences.length !== 1 ? "s" : ""} del requerimiento
                  </span>
                </div>
                {showEvidenciasExistentes ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showEvidenciasExistentes && (
                <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                  {request.evidences.map((ev: any, idx: number) => (
                    <a key={ev.id} href={ev.publicUrl} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-border relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ev.publicUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-active:opacity-100 flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feed de iteraciones */}
          {request.iterations.length > 0 ? (
            <div className="divide-y divide-border">
              {request.iterations.map((iter: any, idx: number) => (
                <div key={iter.id} className="px-4 py-4 flex gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5
                    ${idx === 0 ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
                  >
                    {iter.createdBy.firstName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {iter.createdBy.firstName} {iter.createdBy.lastName}
                        {iter.technicianName && <span className="ml-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">· Téc: {iter.technicianName}</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{format(new Date(iter.createdAt), "dd/MM/yy HH:mm")}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{iter.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center px-4">
              <p className="text-sm text-muted-foreground italic">Sin notas aún. ¡Agregue la primera!</p>
            </div>
          )}
        </section>

        {/* ──────────── TABS SECUNDARIOS ──────────── */}
        <section className="bg-white dark:bg-slate-900 lg:rounded-xl border-y lg:border border-border shadow-sm">
          <Tabs defaultValue="gastos">
            <div className="border-b border-border px-4 pt-3">
              <TabsList className="w-full grid grid-cols-3 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <TabsTrigger
                  value="gastos"
                  className="rounded-md text-[11px] font-bold uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                  Gastos {request.expenses.length > 0 && <span className="ml-0.5 text-amber-500">({request.expenses.length})</span>}
                </TabsTrigger>
                <TabsTrigger
                  value="equipo"
                  className="rounded-md text-[11px] font-bold uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                  Equipo
                </TabsTrigger>
                <TabsTrigger
                  value="historial"
                  className="rounded-md text-[11px] font-bold uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                  Historial
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─ GASTOS ─ */}
            <TabsContent value="gastos" className="p-4 space-y-4 mt-0">
              <div className="space-y-3">
                <Input placeholder='Descripción (ej: Sello mecánico 2")' value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="h-10 rounded-lg text-sm w-full" autoComplete="off" />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={expType} onValueChange={setExpType}>
                    <SelectTrigger className="h-10 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPARE_PART">Repuesto</SelectItem>
                      <SelectItem value="LABOR">Mano Obra</SelectItem>
                      <SelectItem value="EXTERNAL">Externo</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Cantidad — entero sin decimales */}
                  <Input
                    inputMode="numeric"
                    placeholder="Cant."
                    value={expQtyDisplay}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    onKeyDown={blockInvalidNumericKeys}
                    className="h-10 rounded-lg text-sm font-mono text-right"
                  />
                  {/* Valor — entero CLP con separador de miles */}
                  <Input
                    inputMode="numeric"
                    placeholder="$ Valor"
                    value={expAmountDisplay}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    onKeyDown={blockInvalidNumericKeys}
                    className="h-10 rounded-lg text-sm font-mono text-right"
                  />
                </div>
                <Button
                  className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg gap-2 active:scale-[0.98]"
                  onClick={handleGuardarGasto}
                  disabled={isBusy || !expDesc.trim() || !expAmountRaw}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Registrar gasto
                </Button>
              </div>

              {request.expenses.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">{request.expenses.length} gasto(s)</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">${totalGastos.toLocaleString("es-CL")}</p>
                  </div>
                  <div className="space-y-2">
                    {request.expenses.map((exp: any) => (
                      <div key={exp.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">
                            {exp.type === "SPARE_PART" ? "Repuesto" : exp.type === "LABOR" ? "Mano de Obra" : "Externo"} · x{exp.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-black tabular-nums shrink-0">${(Number(exp.amount) * Number(exp.quantity)).toLocaleString("es-CL")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground italic py-4">Sin gastos registrados.</p>
              )}
            </TabsContent>

            {/* ─ EQUIPO ─ */}
            <TabsContent value="equipo" className="mt-0">
              {/* Imagen del equipo */}
              {request.equipment.imageUrl ? (
                <div className="relative w-full aspect-video overflow-hidden border-b border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={request.equipment.imageUrl} alt={request.equipment.imageDescription || request.equipment.name} className="w-full h-full object-cover" />
                  {request.equipment.imageDescription && (
                    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-4 py-3">
                      <p className="text-white text-xs font-medium">{request.equipment.imageDescription}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 border-b border-border bg-slate-50 dark:bg-slate-800/30 gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-xs text-muted-foreground italic">Sin imagen del equipo</p>
                </div>
              )}

              {/* Ficha técnica PDF */}
              {request.equipment.datasheetUrl ? (
                <a
                  href={request.equipment.datasheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 border-b border-border bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:opacity-75"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <ExternalLink className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">{request.equipment.datasheetName || "Ficha Técnica / Datasheet"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">PDF · Toque para abrir</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Info className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-muted-foreground italic">Sin ficha técnica adjunta</p>
                </div>
              )}

              {/* Datos del equipo */}
              <div className="divide-y divide-border">
                <FichaRow label="Nombre" value={request.equipment.name} />
                <FichaRow label="Marca" value={request.equipment.brand} />
                <FichaRow label="Modelo" value={request.equipment.model} />
                <FichaRow label="N° Serie" value={request.equipment.serialNumber} />
                <FichaRow label="N° Parte" value={request.equipment.partNumber} />
                <FichaRow label="Sistema" value={request.equipment.system?.name} />
                <FichaRow label="Área" value={request.equipment.system?.area?.name} />
                {request.equipment.estimatedLife && <FichaRow label="Vida útil" value={request.equipment.estimatedLife} />}
                {request.equipment.commissioningDate && <FichaRow label="Puesta en marcha" value={format(new Date(request.equipment.commissioningDate), "dd/MM/yyyy")} />}
              </div>

              {/* Notas técnicas */}
              {request.equipment.technicalComments && (
                <div className="px-4 py-3 bg-blue-50/40 dark:bg-blue-900/10 border-t border-border">
                  <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-1">Notas técnicas</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">{request.equipment.technicalComments}</p>
                </div>
              )}

              {/* Instrucciones previas */}
              {request.equipment.prevInstructions && (
                <div className="px-4 py-3 bg-amber-50/40 dark:bg-amber-900/10 border-t border-border">
                  <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-1">Instrucciones previas a la intervención</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{request.equipment.prevInstructions}</p>
                </div>
              )}
            </TabsContent>

            {/* ─ HISTORIAL ─ */}
            <TabsContent value="historial" className="mt-0">
              {request.timeline.length > 0 ? (
                <div className="divide-y divide-border">
                  {request.timeline.map((item: any) => (
                    <div key={item.id} className="flex gap-3 px-4 py-3.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                        ${
                          item.action === "CREATED"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                            : item.action === "STATUS_CHANGED"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                              : item.action === "REPROGRAMMED"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {item.action === "CREATED" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : item.action === "STATUS_CHANGED" ? (
                          <RefreshCw className="h-3.5 w-3.5" />
                        ) : item.action === "REPROGRAMMED" ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">{item.action.replace(/_/g, " ")}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(item.createdAt), "dd/MM/yy HH:mm")}</span>
                        </div>
                        {item.comment && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{item.comment}</p>}
                        {item.prevStatus && item.newStatus && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 opacity-60 uppercase font-bold">
                              {item.prevStatus.name}
                            </Badge>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                            <Badge
                              variant="outline"
                              style={{ backgroundColor: `${item.newStatus.colorHex}15`, color: item.newStatus.colorHex, borderColor: `${item.newStatus.colorHex}30` }}
                              className="text-[9px] h-4 px-1.5 uppercase font-black"
                            >
                              {item.newStatus.name}
                            </Badge>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.changedBy.firstName} {item.changedBy.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <History className="h-8 w-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground italic">Sin historial de cambios.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
      {/* fin contenido móvil */}

      {/* ══ CONTENIDO DESKTOP (2 columnas) ══ */}
      <div className="hidden lg:block px-6 py-6 space-y-5">
        {/* ── Fila principal: Izquierda Bitácora + Derecha Info ── */}
        <div className="grid grid-cols-[1fr_340px] gap-5 items-start">
          {/* ─────────── COLUMNA IZQUIERDA: Bitácora ─────────── */}
          <div className="space-y-4">
            {/* Síntoma */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Síntoma reportado</p>
              <div className="relative px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="absolute top-0 left-3 text-4xl leading-none text-slate-200 dark:text-slate-600 font-serif select-none">&ldquo;</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-4 pb-1 px-2 italic">{request.description || "Sin descripción."}</p>
                <span className="absolute bottom-0 right-3 text-4xl leading-none text-slate-200 dark:text-slate-600 font-serif select-none">&rdquo;</span>
              </div>
            </div>

            {/* Bitácora */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bitácora de trabajo</p>
                <Badge variant="secondary" className="font-bold text-[10px]">
                  {request.iterations.length} entrada{request.iterations.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Formulario inline */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Input placeholder="Técnico / proveedor (opcional)" value={tecnico} onChange={(e) => setTecnico(e.target.value)} className="h-9 rounded-lg text-sm flex-1" autoComplete="off" />
                  {/* Botón adjuntar foto — ícono solo */}
                  <div className="relative shrink-0">
                    {previews.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-900 z-10 flex items-center justify-center">
                        {previews.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (previews.length > 0) setShowEvidencePanel((v) => !v);
                        else fileInputRef.current?.click();
                      }}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                        previews.length > 0
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"
                      }`}
                      aria-label="Adjuntar foto"
                    >
                      {isResizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" className="bg-[#283c7f] hover:bg-[#1e3a6e] text-white font-bold rounded-lg gap-1.5 px-4 shrink-0" onClick={handleGuardarNota} disabled={isBusy || !nota.trim()}>
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-white" />}
                    Guardar
                  </Button>
                </div>
                <Textarea
                  placeholder="Describa la acción realizada, hallazgo o próximo paso..."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="min-h-[80px] rounded-lg text-sm w-full resize-none"
                />
                {/* Panel adjuntos desktop */}
                {showEvidencePanel && previews.length > 0 && (
                  <div className="grid grid-cols-6 gap-2">
                    {previews.map((p) => (
                      <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePreview(p.id)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    {previews.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleAddFiles} />
              </div>

              {/* Fotos ya guardadas (toggle) */}
              {request.evidences.length > 0 && (
                <div className="border-b border-border">
                  <button
                    className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setShowEvidenciasExistentes(!showEvidenciasExistentes)}
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{request.evidences.length} foto(s) del requerimiento</span>
                    </div>
                    {showEvidenciasExistentes ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                  {showEvidenciasExistentes && (
                    <div className="grid grid-cols-6 gap-2 px-5 pb-4">
                      {request.evidences.map((ev: any, idx: number) => (
                        <a key={ev.id} href={ev.publicUrl} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden border border-border group relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ev.publicUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feed de iteraciones */}
              {request.iterations.length > 0 ? (
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {request.iterations.map((iter: any, idx: number) => (
                    <div key={iter.id} className="flex gap-3 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${idx === 0 ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
                      >
                        {iter.createdBy.firstName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {iter.createdBy.firstName} {iter.createdBy.lastName}
                            {iter.technicianName && <span className="ml-1.5 text-[10px] font-bold text-blue-500 uppercase">· Téc: {iter.technicianName}</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">{format(new Date(iter.createdAt), "dd/MM/yy HH:mm")}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{iter.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center px-4">
                  <p className="text-sm text-muted-foreground italic">Sin notas aún.</p>
                </div>
              )}
            </div>
          </div>

          {/* ─────────── COLUMNA DERECHA: Panel de info ─────────── */}
          <div className="space-y-4 sticky top-4">
            {/* Datos del requerimiento */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Información</p>
              </div>
              <div className="divide-y divide-border">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Equipo</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{request.equipment.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {request.equipment.brand} {request.equipment.model}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Instalación</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{request.installation.name}</p>
                  <p className="text-[11px] text-muted-foreground">{request.equipment.system?.area?.name}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tipo</p>
                  <Badge variant="outline" className="text-xs font-bold">
                    {request.type?.name || "—"}
                  </Badge>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Solicitante</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">{request.applicant?.name || "—"}</p>
                </div>
              </div>
            </div>

            {/* Fecha estimada */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Fecha Estimada</p>
                </div>
                <button onClick={() => setShowDateEdit(!showDateEdit)} className="text-[10px] font-bold text-blue-500 hover:underline">
                  {showDateEdit ? "cancelar" : "editar"}
                </button>
              </div>
              {showDateEdit ? (
                <div className="p-4 space-y-2">
                  <Input type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} className="h-9 rounded-lg text-sm w-full" />
                  <Input placeholder="Motivo del cambio..." value={estReason} onChange={(e) => setEstReason(e.target.value)} className="h-9 rounded-lg text-sm w-full" autoComplete="off" />
                  <Button size="sm" className="w-full bg-[#283c7f] text-white font-bold rounded-lg gap-1.5" onClick={handleActualizarFecha} disabled={isBusy}>
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-white" />}
                    Guardar fecha
                  </Button>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-400">
                    {request.estimatedEndDate ? format(new Date(request.estimatedEndDate), "dd/MM/yyyy") : <span className="text-sm font-normal text-muted-foreground italic">Sin definir</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Resumen gastos */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border-b border-border flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Gastos</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-2xl font-black tabular-nums text-slate-800 dark:text-white">${totalGastos.toLocaleString("es-CL")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{request.expenses.length} ítem(s) registrado(s)</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs inferiores (ancho completo) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm">
          <Tabs defaultValue="gastos">
            <div className="border-b border-border px-4 pt-3">
              <TabsList className="bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <TabsTrigger
                  value="gastos"
                  className="rounded-md text-xs font-bold uppercase tracking-wide px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                  Gastos {request.expenses.length > 0 && <span className="ml-1 text-amber-500">({request.expenses.length})</span>}
                </TabsTrigger>
                <TabsTrigger
                  value="equipo"
                  className="rounded-md text-xs font-bold uppercase tracking-wide px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                  Ficha Técnica
                </TabsTrigger>
                <TabsTrigger
                  value="historial"
                  className="rounded-md text-xs font-bold uppercase tracking-wide px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                  Historial de Cambios
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─ Gastos desktop ─ */}
            <TabsContent value="gastos" className="p-5 mt-0">
              <div className="grid grid-cols-[1fr_280px] gap-6">
                {/* Form */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registrar nuevo gasto</p>
                  <Input placeholder='Descripción (ej: Sello mecánico 2")' value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="h-9 text-sm w-full rounded-lg" autoComplete="off" />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={expType} onValueChange={setExpType}>
                      <SelectTrigger className="h-9 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SPARE_PART">Repuesto</SelectItem>
                        <SelectItem value="LABOR">Mano Obra</SelectItem>
                        <SelectItem value="EXTERNAL">Externo</SelectItem>
                        <SelectItem value="OTHER">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      inputMode="numeric"
                      placeholder="Cant."
                      value={expQtyDisplay}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      onKeyDown={blockInvalidNumericKeys}
                      className="h-9 rounded-lg text-sm font-mono text-right"
                    />
                    <Input
                      inputMode="numeric"
                      placeholder="$ Valor"
                      value={expAmountDisplay}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onKeyDown={blockInvalidNumericKeys}
                      className="h-9 rounded-lg text-sm font-mono text-right"
                    />
                  </div>
                  <Button className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg gap-2 px-6" onClick={handleGuardarGasto} disabled={isBusy || !expDesc.trim() || !expAmountRaw}>
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Registrar gasto
                  </Button>
                </div>
                {/* Listado */}
                <div>
                  {request.expenses.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">{request.expenses.length} gasto(s)</p>
                        <p className="text-base font-black text-slate-800 dark:text-slate-100 tabular-nums">${totalGastos.toLocaleString("es-CL")}</p>
                      </div>
                      {request.expenses.map((exp: any) => (
                        <div key={exp.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">
                              {exp.type === "SPARE_PART" ? "Repuesto" : exp.type === "LABOR" ? "M. obra" : "Externo"} · x{exp.quantity}
                            </p>
                          </div>
                          <p className="text-xs font-black tabular-nums shrink-0">${(Number(exp.amount) * Number(exp.quantity)).toLocaleString("es-CL")}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">Sin gastos registrados.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ─ Ficha técnica desktop ─ */}
            <TabsContent value="equipo" className="mt-0">
              <div className="grid grid-cols-[240px_1fr] gap-0 divide-x divide-border">
                {/* Miniaturas */}
                <div className="p-4 space-y-3">
                  {request.equipment.imageUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={request.equipment.imageUrl} alt={request.equipment.imageDescription || request.equipment.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg gap-1">
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                      <p className="text-xs text-muted-foreground italic">Sin imagen</p>
                    </div>
                  )}
                  {request.equipment.datasheetUrl && (
                    <a
                      href={request.equipment.datasheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">{request.equipment.datasheetName || "Ficha PDF"}</span>
                    </a>
                  )}
                </div>
                {/* Datos */}
                <div className="divide-y divide-border">
                  <FichaRow label="Nombre" value={request.equipment.name} />
                  <FichaRow label="Marca" value={request.equipment.brand} />
                  <FichaRow label="Modelo" value={request.equipment.model} />
                  <FichaRow label="N° Serie" value={request.equipment.serialNumber} />
                  <FichaRow label="N° Parte" value={request.equipment.partNumber} />
                  <FichaRow label="Sistema" value={request.equipment.system?.name} />
                  <FichaRow label="Área" value={request.equipment.system?.area?.name} />
                  {request.equipment.estimatedLife && <FichaRow label="Vida útil" value={request.equipment.estimatedLife} />}
                  {request.equipment.commissioningDate && <FichaRow label="Puesta en marcha" value={format(new Date(request.equipment.commissioningDate), "dd/MM/yyyy")} />}
                  {request.equipment.technicalComments && (
                    <div className="px-4 py-3 bg-blue-50/40 dark:bg-blue-900/10">
                      <p className="text-[10px] font-black uppercase text-blue-600 mb-1">Notas técnicas</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">{request.equipment.technicalComments}</p>
                    </div>
                  )}
                  {request.equipment.prevInstructions && (
                    <div className="px-4 py-3 bg-amber-50/40 dark:bg-amber-900/10">
                      <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Instrucciones previas</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{request.equipment.prevInstructions}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ─ Historial desktop ─ */}
            <TabsContent value="historial" className="mt-0">
              {request.timeline.length > 0 ? (
                <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
                  {request.timeline.map((item: any) => (
                    <div key={item.id} className="flex gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.action === "CREATED" ? "bg-emerald-100 text-emerald-600" : item.action === "STATUS_CHANGED" ? "bg-blue-100 text-blue-600" : item.action === "REPROGRAMMED" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}
                      >
                        {item.action === "CREATED" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : item.action === "STATUS_CHANGED" ? (
                          <RefreshCw className="h-3.5 w-3.5" />
                        ) : item.action === "REPROGRAMMED" ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black uppercase text-slate-500">{item.action.replace(/_/g, " ")}</span>
                            {item.prevStatus && item.newStatus && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 opacity-60 uppercase font-bold">
                                  {item.prevStatus.name}
                                </Badge>
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                                <Badge
                                  variant="outline"
                                  style={{ backgroundColor: `${item.newStatus.colorHex}15`, color: item.newStatus.colorHex, borderColor: `${item.newStatus.colorHex}30` }}
                                  className="text-[9px] h-4 px-1.5 uppercase font-black"
                                >
                                  {item.newStatus.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{format(new Date(item.createdAt), "dd/MM/yy HH:mm")}</span>
                        </div>
                        {item.comment && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{item.comment}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.changedBy.firstName} {item.changedBy.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <History className="h-8 w-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground italic">Sin historial de cambios.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* fin contenido desktop */}

      {/* ══ MODAL TERCERIZACIÓN ══ */}
      <Dialog
        open={tercModal}
        onOpenChange={(open) => {
          if (!open && !isPending) setTercModal(false);
        }}
      >
        <DialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-800 dark:text-white">Justificación de Tercerización</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Este cambio de estado es irreversible sin autorización.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Justificación — obligatoria */}
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                Justificación
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Indique el motivo por el que se terceriza este requerimiento (empresa, razón técnica, costo, etc.)..."
                value={tercReason}
                onChange={(e) => setTercReason(e.target.value)}
                className="min-h-[100px] rounded-xl text-sm resize-none w-full"
                autoFocus
              />
              {!tercReason.trim() && <p className="text-[11px] text-red-500 mt-1">Campo obligatorio</p>}
            </div>

            {/* Imágenes — opcionales */}
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5 block">
                Documentos / Fotos de respaldo <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
              </label>

              {/* Grid de previews */}
              {tercPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {tercPreviews.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setTercPreviews((prev) => prev.filter((x) => x.id !== p.id))}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white shadow-md"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón agregar */}
              <button
                type="button"
                onClick={() => tercFileRef.current?.click()}
                disabled={tercResizing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50"
              >
                {tercResizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {tercPreviews.length > 0 ? `${tercPreviews.length} foto(s) · Agregar más` : "Adjuntar foto o documento"}
              </button>
              <input ref={tercFileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleTercFiles} />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl dark:text-white" onClick={() => setTercModal(false)} disabled={isPending || tercUploading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
              onClick={handleConfirmarTercerizar}
              disabled={!tercReason.trim() || isPending || tercUploading || tercResizing}
            >
              {isPending || tercUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Confirmar Tercerización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ BARRA FIJA INFERIOR MÓVIL ══ */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-slate-900 border-t border-border p-3 flex items-center gap-3 z-50 shadow-lg shadow-black/10">
        <Button variant="outline" className="shrink-0 h-11 rounded-xl font-bold dark:text-white" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <Button
          className="flex-1 h-11 bg-[#283c7f] hover:bg-[#1e3a6e] text-white font-bold rounded-xl gap-2 active:scale-[0.98] transition-all"
          onClick={handleGuardarNota}
          disabled={isBusy || !nota.trim()}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar nota
        </Button>
      </div>
    </div>
  );
}

function FichaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right truncate">{value || <span className="text-muted-foreground italic font-normal">—</span>}</span>
    </div>
  );
}
