"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface PreviewEmailCotizacionDialogProps {
  cotizacionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PreviewEmailCotizacionDialog({ cotizacionId, open, onOpenChange }: PreviewEmailCotizacionDialogProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [emailHtml, setEmailHtml] = useState<string | null>(null);

  useEffect(() => {
    if (open && cotizacionId) {
      loadPreview();
    }
  }, [open, cotizacionId]);

  const loadPreview = async () => {
    try {
      setLoading(true);

      // Llamar a la API para obtener el preview
      const response = await fetch(`/api/cotizaciones/preview/${cotizacionId}`);

      if (!response.ok) {
        throw new Error("Error al cargar el preview");
      }

      const data = await response.json();

      if (data.success) {
        setPdfUrl(data.data.pdfUrl);
        setEmailHtml(data.data.emailHtml);
      } else {
        throw new Error(data.message || "Error al cargar el preview");
      }
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error(error.message || "Error al cargar el preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `cotizacion_${cotizacionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Preview del Email y PDF
          </DialogTitle>
          <DialogDescription>Vista previa del correo electrónico y PDF que se enviará al proveedor</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-muted-foreground">Cargando preview...</span>
          </div>
        ) : (
          <Tabs defaultValue="email" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF Adjunto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="flex-1 overflow-auto mt-4">
              {emailHtml ? (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe srcDoc={emailHtml} className="w-full h-[600px] border-0" title="Email Preview" />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No se pudo cargar el preview del email</div>
              )}
            </TabsContent>

            <TabsContent value="pdf" className="flex-1 overflow-auto mt-4">
              {pdfUrl ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2">
                      <Download className="h-4 w-4" />
                      Descargar PDF
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe src={pdfUrl} className="w-full h-[600px] border-0" title="PDF Preview" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No se pudo cargar el preview del PDF</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
