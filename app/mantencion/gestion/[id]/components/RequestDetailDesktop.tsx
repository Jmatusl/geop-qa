"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeft,
  Save,
  Plus,
  Loader2,
  ExternalLink,
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
  Wrench,
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
import { handleNumericInput, blockInvalidNumericKeys } from "@/lib/utils/number-utils";
import { resizeImage } from "@/lib/utils/image-utils";

/* ─── Tipos ─── */
interface Props {
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
const TERCERIZAR_NAME = "Tercerizar";

export default function RequestDetailDesktop({ request, catalogs, currentUser }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  /* ─── Bitácora ─── */
  const [nota, setNota] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [showEvidenciasExistentes, setShowEvidenciasExistentes] = useState(false);

  /* ─── Adjuntos nueva nota ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);

  /* ─── Gastos ─── */
  const [expDesc, setExpDesc] = useState("");
  const [expAmountDisplay, setExpAmountDisplay] = useState("");
  const [expAmountRaw, setExpAmountRaw] = useState(0);
  const [expType, setExpType] = useState("SPARE_PART");
  const [expQtyDisplay, setExpQtyDisplay] = useState("1");
  const [expQtyRaw, setExpQtyRaw] = useState(1);

  /* ─── Fecha estimada ─── */
  const [estDate, setEstDate] = useState(request.estimatedEndDate ? format(new Date(request.estimatedEndDate), "yyyy-MM-dd") : "");
  const [estReason, setEstReason] = useState("");
  const [showDateEdit, setShowDateEdit] = useState(false);

  /* ─── Modal Tercerización ─── */
  const [tercModal, setTercModal] = useState(false);
  const [tercStatusId, setTercStatusId] = useState("");
  const [tercReason, setTercReason] = useState("");
  const [tercPreviews, setTercPreviews] = useState<PreviewFile[]>([]);
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

  /* ─── Estado ─── */
  const handleStatusChange = (newStatusId: string) => {
    const status = catalogs.statuses.find((s) => s.id === newStatusId);
    if (status?.name === TERCERIZAR_NAME) {
      setTercStatusId(newStatusId);
      setTercReason("");
      setTercPreviews([]);
      setTercModal(true);
      return;
    }
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

  const handleTercFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setTercResizing(true);
    try {
      const newP: PreviewFile[] = [];
      for (const file of Array.from(e.target.files)) {
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

  /* ─── Guardar nota ─── */
  const handleGuardarNota = () => {
    if (!nota.trim()) return;
    startTransition(async () => {
      let urls: string[] = [];
      if (previews.length > 0) {
        setIsUploading(true);
        try {
          const fd = new FormData();
          previews.forEach((p) => fd.append("files", p.file));
          const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
          const result = await res.json();
          if (res.ok) urls = result.urls;
        } catch {
          toast.error("Error al subir imágenes");
        } finally {
          setIsUploading(false);
        }
      }
      if (urls.length > 0) {
        await addEvidence(request.id, urls);
      }
      const res = await addIteration(request.id, nota, tecnico);
      if (res.success) {
        toast.success("Nota guardada");
        setNota("");
        setTecnico("");
        setPreviews([]);
        setShowEvidencePanel(false);
        router.refresh();
      } else toast.error("Error al guardar nota");
    });
  };

  /* ─── Adjuntos bitácora ─── */
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsResizing(true);
    try {
      const newPreviews: PreviewFile[] = [];
      for (const file of Array.from(e.target.files)) {
        const processed = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        newPreviews.push({ id: `${Date.now()}-${Math.random()}`, file: processed, previewUrl: URL.createObjectURL(processed), name: file.name, sizeKb: Math.round(processed.size / 1024) });
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
      const r = prev.find((p) => p.id === id);
      if (r) URL.revokeObjectURL(r.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    if (previews.length <= 1) setShowEvidencePanel(false);
  };

  /* ─── Guardar gasto ─── */
  const handleGuardarGasto = () => {
    if (!expDesc.trim() || !expAmountRaw) return;
    startTransition(async () => {
      const res = await addExpense({ requestId: request.id, description: expDesc, amount: expAmountRaw, type: expType, quantity: expQtyRaw || 1 });
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

  const totalGastos = useMemo(() => request.expenses.reduce((a: number, e: any) => a + Number(e.amount) * Number(e.quantity), 0), [request.expenses]);
  const isBusy = isPending || isUploading || isResizing;

  /* ─────────────────────────────────────────── */
  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-slate-950 pb-10">
      {/* Título y descripción de la página */}
      <div className="px-6 pt-6 pb-1">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Gestión de Requerimiento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro de bitácora, seguimiento de estado y control de gastos del requerimiento{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            #{request.folioPrefix}-{request.folio}
          </span>
          .
        </p>
      </div>

      {/* ══ HEADER SUPERIOR (patrón ingreso) ══ */}
      <div className="bg-white dark:bg-slate-900 border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        {/* Izquierda */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-[#283c7f] dark:text-blue-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[#283c7f] dark:text-blue-400 text-lg">
                  #{request.folioPrefix}-{request.folio}
                </span>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: request.status.colorHex ? `${request.status.colorHex}18` : undefined,
                    color: request.status.colorHex || undefined,
                    borderColor: request.status.colorHex ? `${request.status.colorHex}50` : undefined,
                  }}
                  className="font-black uppercase text-[11px] tracking-widest px-2.5 h-5"
                >
                  {request.status.name}
                </Badge>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                {request.equipment.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {request.equipment.brand} {request.equipment.model} · {request.installation.name}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Derecha: selector de estado (patrón ingreso — 60% del ancho, controles a la derecha) */}
        <div className="flex items-center gap-3 w-[40%] justify-end">
          <Select value={request.statusId} onValueChange={handleStatusChange} disabled={isBusy}>
            <SelectTrigger className="h-10 w-[200px] rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-800 border-border">
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
          <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{format(new Date(request.createdAt), "dd/MM/yyyy · HH:mm")}</span>
        </div>
      </div>

      {/* ══ CUERPO — Un solo contenedor grande ══ */}
      <div className="py-5">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm">
          {/* ── Grilla principal: 3 zonas ── */}
          <div className="grid grid-cols-[1fr_1px_380px] min-h-[520px]">
            {/* ──── ZONA IZQUIERDA: Síntoma + Bitácora ──── */}
            <div className="flex flex-col">
              {/* Síntoma */}
              <div className="px-5 py-4 border-b border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Síntoma reportado</p>
                <div className="relative px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="absolute top-0 left-2 text-4xl leading-none text-slate-200 dark:text-slate-600 font-serif select-none">&ldquo;</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-4 pb-1 px-1 italic">{request.description || "Sin descripción."}</p>
                  <span className="absolute bottom-0 right-2 text-4xl leading-none text-slate-200 dark:text-slate-600 font-serif select-none">&rdquo;</span>
                </div>
              </div>

              {/* Header bitácora */}
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bitácora de trabajo</p>
                <Badge variant="secondary" className="font-bold text-[10px]">
                  {request.iterations.length} entrada{request.iterations.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Formulario nueva nota */}
              <div className="px-5 py-4 border-b border-border space-y-2.5">
                <div className="flex items-center gap-2">
                  <Input placeholder="Técnico / proveedor (opcional)" value={tecnico} onChange={(e) => setTecnico(e.target.value)} className="h-9 rounded-lg text-sm flex-1" autoComplete="off" />
                  {/* Botón adjuntar */}
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
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${previews.length > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"}`}
                      aria-label="Adjuntar foto"
                    >
                      {isResizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" className="bg-[#283c7f] hover:bg-[#1e3a6e] text-white font-bold rounded-lg gap-1.5 px-5 shrink-0" onClick={handleGuardarNota} disabled={isBusy || !nota.trim()}>
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-white" />}
                    Guardar nota
                  </Button>
                </div>
                <Textarea
                  placeholder="Describa la acción realizada, hallazgo o próximo paso..."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="min-h-[80px] rounded-lg text-sm w-full resize-none"
                />
                {/* Grid adjuntos */}
                {showEvidencePanel && previews.length > 0 && (
                  <div className="grid grid-cols-8 gap-1.5">
                    {previews.map((p) => (
                      <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-border group">
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

              {/* Toggle evidencias existentes */}
              {request.evidences.length > 0 && (
                <div className="border-b border-border">
                  <button
                    className="w-full flex items-center justify-between px-5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    onClick={() => setShowEvidenciasExistentes(!showEvidenciasExistentes)}
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{request.evidences.length} foto(s) adjuntas al requerimiento</span>
                    </div>
                    {showEvidenciasExistentes ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                  {showEvidenciasExistentes && (
                    <div className="grid grid-cols-8 gap-1.5 px-5 pb-3">
                      {request.evidences.map((ev: any, idx: number) => (
                        <a key={ev.id} href={ev.publicUrl} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden border border-border group relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ev.publicUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-3 w-3 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feed de notas */}
              <div className="flex-1 overflow-y-auto divide-y divide-border max-h-[320px]">
                {request.iterations.length > 0 ? (
                  request.iterations.map((iter: any, idx: number) => (
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
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground italic">Sin notas aún. Use el formulario de arriba.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ──── DIVISOR ──── */}
            <div className="bg-border" />

            {/* ──── ZONA DERECHA: Info + Fecha + Gastos resumen ──── */}
            <div className="flex flex-col divide-y divide-border">
              {/* Información del equipo */}
              <div className="px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Datos del requerimiento</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Equipo</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{request.equipment.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {request.equipment.brand} {request.equipment.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Instalación</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{request.installation.name}</p>
                    <p className="text-[11px] text-muted-foreground">{request.equipment.system?.area?.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tipo</p>
                      <Badge variant="outline" className="text-xs font-semibold">
                        {request.type?.name || "—"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Solicitante</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{request.applicant?.name || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fecha estimada */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Fecha estimada de cierre</p>
                  </div>
                  <button onClick={() => setShowDateEdit(!showDateEdit)} className="text-[10px] font-bold text-blue-500 hover:underline">
                    {showDateEdit ? "cancelar" : "editar"}
                  </button>
                </div>
                {showDateEdit ? (
                  <div className="space-y-2">
                    <Input type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} className="h-8 rounded-lg text-sm w-full" />
                    <Input placeholder="Motivo del cambio..." value={estReason} onChange={(e) => setEstReason(e.target.value)} className="h-8 rounded-lg text-sm w-full" autoComplete="off" />
                    <Button size="sm" className="w-full bg-[#283c7f] text-white font-bold rounded-lg gap-1.5" onClick={handleActualizarFecha} disabled={isBusy}>
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-white" />}
                      Guardar
                    </Button>
                  </div>
                ) : (
                  <p className="text-xl font-black tabular-nums text-amber-700 dark:text-amber-400">
                    {request.estimatedEndDate ? format(new Date(request.estimatedEndDate), "dd/MM/yyyy") : <span className="text-sm font-normal text-muted-foreground italic">Sin definir</span>}
                  </p>
                )}
              </div>

              {/* Gastos resumen */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-green-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Total gastos</p>
                </div>
                <p className="text-2xl font-black tabular-nums text-slate-800 dark:text-white">${totalGastos.toLocaleString("es-CL")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{request.expenses.length} ítem(s)</p>
              </div>
            </div>
          </div>

          {/* ── Tabs en anchura completa (border-top dentro del card) ── */}
          <div className="border-t border-border">
            <Tabs defaultValue="gastos">
              <div className="px-5 pt-3 border-b border-border">
                <TabsList className="bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 h-8">
                  <TabsTrigger
                    value="gastos"
                    className="rounded-md text-xs font-bold uppercase tracking-wide px-4 h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                  >
                    Gastos {request.expenses.length > 0 && <span className="ml-1 text-amber-500">({request.expenses.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipo"
                    className="rounded-md text-xs font-bold uppercase tracking-wide px-4 h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                  >
                    Ficha Técnica
                  </TabsTrigger>
                  <TabsTrigger
                    value="historial"
                    className="rounded-md text-xs font-bold uppercase tracking-wide px-4 h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                  >
                    Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ─ Gastos ─ */}
              <TabsContent value="gastos" className="p-5 mt-0">
                <div className="grid grid-cols-[1fr_260px] gap-8">
                  {/* Formulario */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registrar nuevo gasto</p>
                    <Input
                      placeholder='Descripción (ej: Sello mecánico 2")'
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="h-9 text-sm w-full rounded-lg"
                      autoComplete="off"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={expType} onValueChange={setExpType}>
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SPARE_PART">Repuesto</SelectItem>
                          <SelectItem value="LABOR">Mano de Obra</SelectItem>
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
                        placeholder="$ Valor unit."
                        value={expAmountDisplay}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        onKeyDown={blockInvalidNumericKeys}
                        className="h-9 rounded-lg text-sm font-mono text-right"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-2"
                        onClick={handleGuardarGasto}
                        disabled={isBusy || !expDesc.trim() || !expAmountRaw}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Agregar gasto
                      </Button>
                    </div>
                  </div>
                  {/* Listado */}
                  <div>
                    {request.expenses.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline mb-2">
                          <p className="text-[10px] font-black uppercase text-slate-400">{request.expenses.length} gasto(s)</p>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">${totalGastos.toLocaleString("es-CL")}</p>
                        </div>
                        {request.expenses.map((exp: any) => (
                          <div key={exp.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">
                                {exp.type === "SPARE_PART" ? "Repuesto" : exp.type === "LABOR" ? "M. obra" : "Externo"} · x{exp.quantity}
                              </p>
                            </div>
                            <p className="text-xs font-black tabular-nums shrink-0">${(Number(exp.amount) * Number(exp.quantity)).toLocaleString("es-CL")}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-6">Sin gastos aún.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ─ Ficha técnica ─ */}
              <TabsContent value="equipo" className="mt-0">
                <div className="grid grid-cols-[220px_1fr] divide-x divide-border">
                  <div className="p-4 space-y-3">
                    {request.equipment.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={request.equipment.imageUrl} alt={request.equipment.name} className="w-full h-full object-cover" />
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
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors text-decoration-none"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">{request.equipment.datasheetName || "Ficha PDF"}</span>
                      </a>
                    )}
                  </div>
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
                        <p className="text-xs italic text-slate-600 dark:text-slate-400 leading-relaxed">{request.equipment.technicalComments}</p>
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

              {/* ─ Historial ─ */}
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
                          <div className="flex items-center justify-between gap-2">
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
      </div>

      {/* ══ MODAL TERCERIZACIÓN ══ */}
      <Dialog
        open={tercModal}
        onOpenChange={(open) => {
          if (!open && !isPending) setTercModal(false);
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-800 dark:text-white">Justificación de Tercerización</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Este cambio de estado requiere justificación obligatoria.</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1">
                Justificación <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Indique el motivo por el que se terceriza este requerimiento..."
                value={tercReason}
                onChange={(e) => setTercReason(e.target.value)}
                className="min-h-[100px] rounded-xl text-sm resize-none w-full"
                autoFocus
              />
              {!tercReason.trim() && <p className="text-[11px] text-red-500 mt-1">Campo obligatorio</p>}
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5 block">
                Documentos / Fotos <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
              </label>
              {tercPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {tercPreviews.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
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
              <button
                type="button"
                onClick={() => tercFileRef.current?.click()}
                disabled={tercResizing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 transition-all disabled:opacity-50"
              >
                {tercResizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {tercPreviews.length > 0 ? `${tercPreviews.length} archivo(s) · Agregar más` : "Adjuntar respaldo"}
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
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── FichaRow ─── */
function FichaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right truncate">{value || <span className="text-muted-foreground italic font-normal">—</span>}</span>
    </div>
  );
}
