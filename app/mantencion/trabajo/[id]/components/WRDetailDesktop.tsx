"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, Save, Loader2, FileText, DollarSign, ClipboardList, Wrench, CheckCircle2, ExternalLink, Truck, Building, Hash, Paperclip, File, Download, Eye, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { updateWorkRequirementAdminData } from "../actions";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { handleNumericInput, blockInvalidNumericKeys, formatCLP, parseCLP } from "@/lib/utils/number-utils";
import WRPDFModal from "./WRPDFModal";
import { WREvidenceSection } from "./WREvidenceSection";

interface Props {
  wr: any;
  catalogs: {
    statuses: any[];
    installations: any[];
    wrStatuses: any[];
    suppliers: any[];
  };
  currentUser: any;
}

export default function WRDetailDesktop({ wr, catalogs, currentUser }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados locales para edición administrativa
  const [title, setTitle] = useState(wr.title || "");
  const [description, setDescription] = useState(wr.description || "");
  const [statusId, setStatusId] = useState(wr.statusId);
  const [ocNumber, setOcNumber] = useState(wr.ocNumber || "");
  const [ocValue, setOcValue] = useState(wr.ocValue ? formatCLP(wr.ocValue) : "");
  // Mantener valores numéricos sin formato por separado
  const [rawOcValue, setRawOcValue] = useState(wr.ocValue || 0);

  const [invoiceNumber, setInvoiceNumber] = useState(wr.invoiceNumber || "");
  const [invoiceValue, setInvoiceValue] = useState(wr.invoiceValue ? formatCLP(wr.invoiceValue) : "");
  const [rawInvoiceValue, setRawInvoiceValue] = useState(wr.invoiceValue || 0);

  const [requisitionNumber, setRequisitionNumber] = useState(wr.requisitionNumber || "");

  // Estados para PDF
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateWorkRequirementAdminData(wr.id, {
        title,
        description,
        statusId,
        ocNumber,
        ocValue: rawOcValue || undefined,
        invoiceNumber,
        invoiceValue: rawInvoiceValue || undefined,
        requisitionNumber,
      });

      if (res.success) {
        toast.success("Requerimiento de Trabajo actualizado");
        router.refresh();
      } else {
        toast.error("Error al actualizar: " + res.error);
      }
    });
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/work-requirements/${wr.id}/pdf`);
      if (!response.ok) throw new Error("Error al generar PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Solicitud-Trabajo-${wr.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      toast.error("Error al exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-slate-950 pb-10">
      {/* Título y descripción de la página */}
      <div className="px-6 pt-6 pb-1">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase">Requerimiento de Trabajo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestión administrativa y seguimiento de orden enviada a proveedor.</p>
      </div>

      {/* ══ HEADER SUPERIOR (patrón ingreso) ══ */}
      <div className="bg-white dark:bg-slate-900 border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        {/* Izquierda (60% libre) */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-black text-[#283c7f] dark:text-blue-400 text-lg uppercase tracking-tighter">#{wr.folio}</span>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: wr.status.colorHex ? `${wr.status.colorHex}15` : undefined,
                    color: wr.status.colorHex || undefined,
                    borderColor: wr.status.colorHex ? `${wr.status.colorHex}40` : undefined,
                  }}
                  className="font-black uppercase text-[11px] tracking-widest px-2.5 h-5"
                >
                  {wr.status.name}
                </Badge>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight uppercase">
                {wr.title}
                <span className="ml-2 text-xs font-normal text-muted-foreground normal-case">
                  {wr.provider.legalName || wr.provider.fantasyName} · {wr.provider.rut}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Derecha: controles (PDF y Estado) */}
        <div className="flex items-center gap-4 justify-end min-w-[280px]">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-2 font-bold text-xs border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-800/50"
              onClick={() => setIsPDFModalOpen(true)}
            >
              <Eye className="w-4 h-4" />
              Previsualizar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-2 font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar PDF Directo
            </Button>
          </div>

          <div className="h-8 w-px bg-border mx-1" />

          <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap hidden xl:inline">
            Creado: {format(new Date(wr.createdAt), "dd/MM/yyyy")} por {wr.createdBy.firstName}
          </span>
          <div className="h-8 w-px bg-border hidden xl:block" />
          <div className="w-56">
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="h-10 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 w-full transition-shadow hover:shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {catalogs.wrStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2 font-medium">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: s.colorHex }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <WRPDFModal isOpen={isPDFModalOpen} onClose={() => setIsPDFModalOpen(false)} wr={wr} />

      {/* ══ CUERPO — Un solo contenedor grande y apilado ══ */}
      <div className="py-5">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden flex flex-col divide-y divide-border">
          {/* 1. Datos del Proveedor (Ancho Completo) */}
          <div className="p-6">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Datos del Proveedor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-5 gap-x-6 bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-lg border border-border/50">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400">Razón Social</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={wr.provider.legalName || "No registrado"}>
                    {wr.provider.legalName || "No registrado"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400">Nombre Fantasía</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={wr.provider.fantasyName || "No registrado"}>
                    {wr.provider.fantasyName || "No registrado"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400">RUT</p>
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{wr.provider.rut}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400">Giro Comercial</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={wr.provider.businessLine || "No registrado"}>
                    {wr.provider.businessLine || "No registrado"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400">Email Contacto</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={wr.provider.contactEmail || "No registrado"}>
                    {wr.provider.contactEmail || "No registrado"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400">Teléfono</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{wr.provider.phone || "No registrado"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Control Administrativo y Estados (Grid Form) */}
          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Gestión Administrativa y Estados
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 max-w-5xl">
              {/* Row 1 */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">Folio</label>
                <Input value={wr.folio} readOnly className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 font-medium h-10 shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">N° Requisición</label>
                <Input
                  value={requisitionNumber}
                  onChange={(e) => setRequisitionNumber(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-10 shadow-sm transition-shadow focus:shadow-md"
                />
              </div>

              {/* Row 2 */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-10 shadow-sm transition-shadow focus:shadow-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">Proveedor</label>
                <Select disabled value={wr.providerId}>
                  <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 h-10 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={wr.providerId}>
                      {wr.provider.rut} - {wr.provider.legalName || wr.provider.fantasyName}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 3 - N° OC and Valor OC */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">N° OC</label>
                <div className="relative">
                  <Input
                    value={ocNumber}
                    onChange={(e) => setOcNumber(e.target.value.toUpperCase())}
                    className="pr-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-10 shadow-sm transition-shadow focus:shadow-md uppercase"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 px-0.5">
                  <File className="h-3.5 w-3.5" />
                  <span>Sin adjunto</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">Valor OC</label>
                <Input
                  type="text"
                  value={ocValue}
                  onChange={(e) => {
                    const { displayValue, raw } = handleNumericInput(e.target.value);
                    setOcValue(displayValue);
                    setRawOcValue(raw);
                  }}
                  onKeyDown={blockInvalidNumericKeys}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-10 font-mono shadow-sm transition-shadow focus:shadow-md text-right"
                />
              </div>

              {/* Row 4 - N° Factura and Valor Facturado */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">N° Factura</label>
                <div className="relative">
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                    className="pr-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-10 shadow-sm transition-shadow focus:shadow-md uppercase"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 px-0.5">
                  <File className="h-3.5 w-3.5" />
                  <span>Sin adjunto</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">Valor Facturado</label>
                <Input
                  type="text"
                  value={invoiceValue}
                  onChange={(e) => {
                    const { displayValue, raw } = handleNumericInput(e.target.value);
                    setInvoiceValue(displayValue);
                    setRawInvoiceValue(raw);
                  }}
                  onKeyDown={blockInvalidNumericKeys}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-10 font-mono shadow-sm transition-shadow focus:shadow-md text-right"
                />
              </div>

              {/* Descripcion full width */}
              <div className="space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">Descripción</label>
                  <span className={`text-[10px] font-mono ${description.length >= 400 ? "text-red-500" : "text-slate-400"}`}>{description.length} / 400</span>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 400) {
                      setDescription(e.target.value);
                    }
                  }}
                  className="min-h-[120px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 resize-y shadow-sm transition-shadow focus:shadow-md"
                />
              </div>
            </div>

            {/* Fila separada: Guardar Cambios alineado a la derecha */}
            <div className="flex justify-end mt-8 pt-6 border-t border-border">
              <Button
                className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white font-bold rounded-xl px-8 h-12 shadow-sm gap-2 transition-all active:scale-[0.98]"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Guardar Cambios
              </Button>
            </div>
          </div>

          {/* 3. Evidencias Adjuntas */}
          <div className="p-6 bg-slate-50/10 dark:bg-slate-900 border-t border-border">
            <WREvidenceSection wrId={wr.id} initialEvidences={wr.evidences || []} />
          </div>

          {/* 4. Solicitudes de Mantención (Originales) - Sin TABS */}
          <div className="p-0 bg-white dark:bg-slate-900 border-t border-border">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-amber-600" />
                Solicitudes Originales Asociadas (<span className="text-amber-500">{wr.requests.length}</span>)
              </p>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-b-xl">
              {wr.requests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Wrench className="h-8 w-8 text-slate-200" />
                  <p className="text-sm italic">No hay solicitudes técnicas agrupadas en este Requerimiento.</p>
                </div>
              ) : (
                wr.requests.map((rel: any) => (
                  <div key={rel.id} className="p-6 flex items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-amber-100 dark:border-amber-900/30">
                        <CheckCircle2 className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-base">
                            #{rel.request.folioPrefix}-{rel.request.folio}
                          </span>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: rel.request.status.colorHex ? `${rel.request.status.colorHex}15` : undefined,
                              color: rel.request.status.colorHex || undefined,
                              borderColor: rel.request.status.colorHex ? `${rel.request.status.colorHex}30` : undefined,
                            }}
                            className="text-[10px] h-5 px-2 font-black uppercase"
                          >
                            {rel.request.status.name}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{rel.request.equipment.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {rel.request.installation.name} · {rel.request.equipment.brand} {rel.request.equipment.model}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs font-bold shrink-0 h-9 bg-white dark:bg-slate-800 shadow-sm transition-shadow hover:shadow" asChild>
                      <Link href={`/mantencion/gestion/${rel.request.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver Solicitud Original
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
