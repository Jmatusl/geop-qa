"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, Send, Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wr: any;
}

export default function WRPDFModal({ isOpen, onClose, wr }: Props) {
  const [email, setEmail] = useState(wr.provider.contactEmail || "");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error("El correo electrónico es requerido");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/v1/work-requirements/${wr.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el correo");
      }

      toast.success("Correo enviado correctamente");
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const pdfUrl = `/api/v1/work-requirements/${wr.id}/pdf?preview=true`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-[80vw] sm:max-w-[80vw] w-[80vw] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Custom Header based on mockup */}
        <div className="bg-white dark:bg-slate-900 px-8 py-6 border-b border-slate-100 dark:border-slate-800 shrink-0 relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </Button>

          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Previsualización - Solicitud de Trabajo</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">Revise el documento antes de descargar o enviar por email</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-w-4xl">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-black text-slate-700 dark:text-slate-200">
                Email de envío Solicitud de Trabajo
              </Label>
              <div className="flex gap-3">
                <Input
                  id="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSending}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 transition-shadow hover:shadow-sm focus:shadow-md"
                />
                <Button onClick={handleSend} disabled={isSending} className="bg-[#283c7f] hover:bg-[#1e2d60] text-white px-8 h-11 flex gap-2 font-bold shadow-sm">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-white" />}
                  Enviar por Email
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Puede editar el email de envío para personalizar este envío. Email por defecto:{" "}
                <span className="underline decoration-emerald-300 dark:decoration-emerald-700">{wr.provider.contactEmail || "desarrollo@sotex.cl"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 overflow-hidden flex justify-center">
          <div className="w-full h-full max-w-5xl bg-white dark:bg-slate-900 rounded-lg shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Preview" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
