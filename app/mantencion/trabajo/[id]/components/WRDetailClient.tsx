"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, Save, Loader2, FileText, DollarSign, ClipboardList, Wrench, CheckCircle2, ExternalLink, Truck, Building, Hash, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { updateWorkRequirementAdminData } from "../actions";
import Link from "next/link";
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

export default function WRDetailClient({ wr, catalogs, currentUser }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados locales para edición administrativa
  const [statusId, setStatusId] = useState(wr.statusId);
  const [ocNumber, setOcNumber] = useState(wr.ocNumber || "");
  const [ocValue, setOcValue] = useState(wr.ocValue ? wr.ocValue.toString() : "");
  const [invoiceNumber, setInvoiceNumber] = useState(wr.invoiceNumber || "");
  const [invoiceValue, setInvoiceValue] = useState(wr.invoiceValue ? wr.invoiceValue.toString() : "");
  const [requisitionNumber, setRequisitionNumber] = useState(wr.requisitionNumber || "");

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateWorkRequirementAdminData(wr.id, {
        statusId,
        ocNumber,
        ocValue: ocValue ? parseFloat(ocValue) : undefined,
        invoiceNumber,
        invoiceValue: invoiceValue ? parseFloat(invoiceValue) : undefined,
        requisitionNumber,
      });

      if (res.success) {
        toast.success("RT guardado");
        router.refresh();
      } else {
        toast.error("Error al actualizar: " + res.error);
      }
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      {/* ══ HEADER MÓVIL (Patrón Ingreso) ══ */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-border flex items-center h-14 shadow-sm">
        <button onClick={() => router.back()} className="h-14 w-12 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 active:opacity-70 transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Truck className="h-4 w-4 text-[#283c7f] dark:text-blue-400 shrink-0" />
          <span className="text-sm font-extrabold uppercase tracking-wide truncate text-slate-900 dark:text-white">EXTERNO #{wr.folio}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 pr-3 shrink-0">{format(new Date(wr.createdAt), "dd/MM/yy")}</span>
      </header>

      {/* ══ INFO DEL PROVEEDOR ══ */}
      <section className="bg-white dark:bg-slate-900 border-b border-border px-4 py-4 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-base font-bold text-slate-800 dark:text-white uppercase leading-tight">{wr.title}</h1>
          <Badge
            variant="outline"
            style={{
              backgroundColor: wr.status.colorHex ? `${wr.status.colorHex}15` : undefined,
              color: wr.status.colorHex || undefined,
              borderColor: wr.status.colorHex ? `${wr.status.colorHex}40` : undefined,
            }}
            className="font-black uppercase text-[10px] tracking-widest px-2 shrink-0"
          >
            {wr.status.name}
          </Badge>
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{wr.provider.legalName || wr.provider.fantasyName}</p>
        <p className="text-[11px] text-muted-foreground font-mono mb-2">{wr.provider.rut}</p>

        {wr.description && <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic mt-2">"{wr.description}"</div>}
      </section>

      {/* ══ GESTIÓN ADMINISTRATIVA ══ */}
      <section className="bg-white dark:bg-slate-900 border-y border-border px-4 py-5 shadow-sm mb-4 space-y-5">
        <p className="text-[11px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          Control Administrativo
        </p>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de RT</label>
          <Select value={statusId} onValueChange={setStatusId}>
            <SelectTrigger className="h-11 rounded-lg text-sm bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {catalogs.wrStatuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.colorHex }} />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Hash className="h-3 w-3 text-blue-500" /> N° OC
            </label>
            <Input placeholder="N°" value={ocNumber} onChange={(e) => setOcNumber(e.target.value)} className="h-10 rounded-lg text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-500" /> Valor OC
            </label>
            <Input type="number" placeholder="Monto" value={ocValue} onChange={(e) => setOcValue(e.target.value)} className="h-10 rounded-lg text-sm text-right font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <FileText className="h-3 w-3 text-amber-500" /> Factura
            </label>
            <Input placeholder="N°" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-10 rounded-lg text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-600" /> Valor Fac.
            </label>
            <Input type="number" placeholder="Monto" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} className="h-10 rounded-lg text-sm text-right font-mono" />
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <ClipboardList className="h-3 w-3 text-purple-500" /> Requisición (Solped)
          </label>
          <Input placeholder="N° de Requisición SAP" value={requisitionNumber} onChange={(e) => setRequisitionNumber(e.target.value)} className="h-10 rounded-lg text-sm" />
        </div>

        <div className="pt-2 border-t border-border mt-2">
          <WREvidenceSection wrId={wr.id} initialEvidences={wr.evidences || []} isMobile={true} />
        </div>
      </section>

      {/* ══ SOLICITUDES ASOCIADAS ══ */}
      <section className="bg-white dark:bg-slate-900 border-y border-border px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5" />
            Solicitudes (<span className="text-amber-500">{wr.requests.length}</span>)
          </p>
        </div>

        <div className="divide-y divide-border pt-2">
          {wr.requests.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <span className="text-xs italic">No hay solicitudes asociadas.</span>
            </div>
          ) : (
            wr.requests.map((rel: any) => (
              <div key={rel.id} className="py-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-sm">
                        #{rel.request.folioPrefix}-{rel.request.folio}
                      </span>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: rel.request.status.colorHex ? `${rel.request.status.colorHex}15` : undefined,
                          color: rel.request.status.colorHex || undefined,
                          borderColor: rel.request.status.colorHex ? `${rel.request.status.colorHex}30` : undefined,
                        }}
                        className="text-[9px] h-4 px-1.5 font-black uppercase"
                      >
                        {rel.request.status.name}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{rel.request.equipment.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {rel.request.installation.name}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full h-9 rounded-lg gap-2 text-xs font-bold" asChild>
                  <Link href={`/mantencion/gestion/${rel.request.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver Requerimiento Original
                  </Link>
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ══ BARRA INFERIOR DE ACCIÓN (Móvil) ══ */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-border shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)] flex gap-3 z-50">
        <Button variant="outline" className="shrink-0 h-12 rounded-xl px-4" onClick={() => router.back()} disabled={isPending}>
          Volver
        </Button>
        <Button
          className="flex-1 h-12 bg-[#283c7f] hover:bg-[#1e2d5f] text-white font-bold rounded-xl shadow-lg gap-2 text-sm uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
