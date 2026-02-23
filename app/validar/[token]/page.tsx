"use client";

import { useEffect, useState } from "react"; // React hooks
import { useParams } from "next/navigation"; // Next.js navigation
import { format } from "date-fns"; // Date formatting
import { es } from "date-fns/locale"; // Spanish locale
import { Loader2, CheckCircle2, XCircle, AlertTriangle, FileText, Download, ExternalLink, ChevronDown, ChevronUp, Info, FolderOpen, UserCircle, Briefcase } from "lucide-react"; // Icons

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRUT } from "@/lib/utils/chile-utils";
import { cn } from "@/lib/utils";

const PdfMockup = () => (
  <div className="w-[80%] h-[92%] bg-white dark:bg-slate-900 rounded-sm shadow-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 group-hover:scale-[1.02] transition-transform duration-500 relative overflow-hidden">
    {/* Header del documento */}
    <div className="space-y-2 mb-2">
      <div className="h-1.5 w-1/4 bg-primary/20 rounded" />
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
      <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>

    {/* Cuerpo del documento */}
    <div className="space-y-2.5">
      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded" />
      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded" />
      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded" />
      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded" />
      <div className="h-1 w-4/5 bg-slate-50 dark:bg-slate-800/40 rounded" />

      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded mt-4" />
      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded" />
      <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/40 rounded" />
      <div className="h-1 w-3/4 bg-slate-50 dark:bg-slate-800/40 rounded" />
    </div>

    {/* Firma / Timbre */}
    <div className="mt-auto flex justify-between items-end">
      <div className="space-y-1.5">
        <div className="h-1 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-1 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
      <div className="w-12 h-12 rounded-full border-2 border-primary/5 flex items-center justify-center -rotate-12 opacity-40">
        <div className="w-9 h-9 rounded-full border border-primary/10 flex items-center justify-center flex-col">
          <span className="text-[4px] font-black text-primary/30 uppercase leading-none">Certificado</span>
          <span className="text-[3px] font-bold text-primary/20 uppercase leading-none">Sotex</span>
        </div>
      </div>
    </div>

    {/* Esquina doblada decorativa */}
    <div className="absolute top-0 right-0 w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-bl-lg border-l border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm" />
  </div>
);

// Type definitions matching the API response
interface Certification {
  id: string;
  name: string;
  code: string;
  inscriptionNumber: string;
  status: "VIGENTE" | "VENCIDA" | "ANULADA";
  expiryDate: string;
  isActive: boolean;
  resolutionNumber: string;
  issueDate: string;
  startDate: string;
  attachments: string[]; // URLs de archivos
}

interface WorkerPublicData {
  rut: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  jobPosition: string;
  area: string;
  workGroup: string;
  certifications: Certification[];
  status: "ACTIVO" | "INACTIVO";
  viewMode?: "CARD" | "FOLDER";
}

export default function PublicValidationPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<WorkerPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/v1/public/validar/${token}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Credencial no encontrada o token inválido");
          if (response.status === 410) throw new Error("Esta credencial ha expirado");
          throw new Error("Error al validar la credencial");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando credencial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-red-700">Validación Fallida</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">{error}</CardContent>
          <CardFooter className="justify-center">
            <p className="text-xs text-gray-400">Sistema de Certificaciones</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const fullName = `${data.firstName} ${data.lastName}`;
  const viewMode = data.viewMode || "CARD";

  const renderCardView = () => (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen md:min-h-auto md:rounded-[2.5rem] shadow-2xl overflow-hidden border-x border-slate-200 dark:border-slate-800 flex flex-col items-center py-3 px-3">
      {/* Header Logo */}
      <div className="w-full flex items-center justify-center mb-2 px-4">
        <img src="/credencial/logo_credencial.png" alt="Logo" className="h-12 w-auto object-contain" />
      </div>

      {/* Avatar Section */}
      <div className="flex justify-center mb-2">
        <div className="h-40 w-40 border-4 border-[#d60e75] dark:border-[#d60e75] shadow-2xl rounded-full overflow-hidden bg-slate-200 relative">
          <Avatar className="h-full w-full rounded-full border-none">
            <AvatarImage src={data.imageUrl} alt={fullName} className="object-cover" />
            <AvatarFallback className="text-5xl font-black bg-slate-100 text-slate-400">
              {data.firstName[0]}
              {data.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            {data.status === "ACTIVO" ? (
              <Badge className="bg-green-600 hover:bg-green-600 border-2 border-white text-[10px] px-3 py-0.5 uppercase font-bold tracking-wider">Activo</Badge>
            ) : (
              <Badge variant="destructive" className="border-2 border-white text-[10px] px-3 py-0.5 uppercase font-bold tracking-wider">
                Inactivo
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Identity Section */}
      <div className="text-center space-y-0 px-2 mb-2">
        <h1 className="text-[32px] font-black tracking-tight text-[#d60e75] dark:text-[#d60e75] uppercase leading-none">{data.firstName}</h1>
        <h2 className="text-[26px] font-bold text-[#d60e75] dark:text-[#d60e75] uppercase leading-[0.9]">{data.lastName}</h2>
        <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-200 tracking-wide mt-1">{formatRUT(data.rut)}</p>
      </div>

      <div className="w-full space-y-2">
        {/* Job Info Card */}
        <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cargo e Información</p>
          <p className="text-xl font-bold text-[#283c7f] dark:text-blue-400 leading-tight mb-0.5">{data.jobPosition}</p>
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {data.area} <span className="mx-1 text-slate-300">•</span> {data.workGroup}
          </p>
        </div>

        {/* Certifications Section */}
        <div className="px-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Certificaciones Vigentes</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          {data.certifications.length > 0 ? (
            <div className="space-y-3">
              {data.certifications.map((cert, index) => (
                <div key={index} className="relative group">
                  <div className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-[#d60e75]/30">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xl font-black text-[#d60e75] uppercase leading-tight">{cert.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reg: {cert.code}</p>
                          <p className="text-xs font-black text-[#283c7f] dark:text-blue-400 uppercase tracking-wider">Insc: {cert.inscriptionNumber}</p>
                        </div>
                      </div>
                      <Badge
                        className={`text-[11px] font-black tracking-tighter uppercase px-2 py-0.5 border-none ${
                          cert.status === "VENCIDA" ? "bg-red-600 hover:bg-red-600" : cert.status === "ANULADA" ? "bg-slate-600 hover:bg-slate-600" : "bg-green-600 hover:bg-green-600"
                        }`}
                      >
                        {cert.status}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-50 dark:border-slate-800">
                      <div className="text-xs text-slate-400">
                        <p className="uppercase font-bold tracking-wide text-[11px]">Resolución</p>
                        <p className="font-mono text-[#283c7f] dark:text-blue-400 font-bold text-sm">{cert.resolutionNumber}</p>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p className="uppercase font-bold tracking-wide text-[11px]">Vencimiento</p>
                        <p className="text-slate-900 dark:text-white font-bold text-sm">{format(new Date(cert.expiryDate), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Sin certificaciones vigentes</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-500/70">Este trabajador no posee acreditaciones activas en este momento.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer validation */}
      <div className="mt-6 pb-2 w-full">
        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/30 py-2.5 rounded-2xl border-2 border-green-100 dark:border-green-900/30">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-[12px] font-black uppercase tracking-widest">Credencial Verificada por Sistema</span>
        </div>
      </div>
    </div>
  );

  const renderFolderView = () => (
    <div className="w-full flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-10">
      {/* Toolbar Superior */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Archivos</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsHeaderExpanded(!isHeaderExpanded)} className="gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
          {isHeaderExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {isHeaderExpanded ? "Ocultar Perfil" : "Ver Perfil"}
        </Button>
      </div>

      {/* Header Colapsable */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800",
          isHeaderExpanded ? "max-h-[500px] py-6 opacity-100" : "max-h-0 py-0 opacity-0",
        )}
      >
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="relative mb-4">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarImage src={data.imageUrl} alt={fullName} />
              <AvatarFallback>
                <UserCircle className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <Badge
              className={cn(
                "absolute -bottom-2 translate-x-1/2 right-1/2 border-2 border-white uppercase font-bold",
                data.status === "ACTIVO" ? "bg-[#d60e75] hover:bg-[#d60e75]" : "bg-slate-500 hover:bg-slate-500",
              )}
            >
              {data.status === "ACTIVO" ? "ACTIVO" : "INACTIVO"}
            </Badge>
          </div>
          <div className="text-center w-full max-w-sm">
            <h3 className="text-2xl font-black text-[#d60e75] dark:text-[#d60e75] uppercase leading-tight">{fullName}</h3>
            <p className="text-base font-mono font-bold text-slate-500 mt-1">{formatRUT(data.rut)}</p>

            {data.certifications.length > 0 && (
              <div className="mt-6 space-y-5">
                {/* Fechas de Vigencia */}
                <div className="flex justify-center gap-12">
                  <div className="text-center">
                    <p className="text-[11px] font-black text-[#d60e75] uppercase tracking-wider mb-1">Inicio Vigencia</p>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">{format(new Date(data.certifications[0].startDate), "dd-MM-yyyy")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-[#d60e75] uppercase tracking-wider mb-1">Término Vigencia</p>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">{format(new Date(data.certifications[0].expiryDate), "dd-MM-yyyy")}</p>
                  </div>
                </div>

                {/* Badge Sernapesca */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 px-6 py-3 rounded-2xl inline-block w-full">
                  <p className="text-sm font-black text-[#283c7f] dark:text-blue-400 uppercase tracking-tight">
                    NRO REGISTRO SERNAPESCA: <span className="text-2xl ml-2 font-black">{data.certifications[0].inscriptionNumber}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Archivos */}
      <div className="container mx-auto px-4 mt-6">
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl">
          <Info className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300">Los enlaces de descarga son temporales por seguridad y caducan en 60 minutos.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.certifications.flatMap((cert) =>
            (cert.attachments || []).map((fileUrl, fileIndex) => {
              const urlParams = new URLSearchParams(fileUrl.split("?")[1]);
              const key = urlParams.get("key") || "";
              const fileName = key.split("/").pop() || `Documento_${fileIndex + 1}`;
              const isImage = /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(fileName);

              return (
                <a key={`${cert.id}-${fileIndex}`} href={fileUrl} target="_blank" rel="noopener noreferrer" className="block group">
                  <Card className="overflow-hidden border-none shadow-sm group-hover:shadow-md transition-all group-hover:ring-2 group-hover:ring-primary/20">
                    <div className="aspect-4/3 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative border-b border-slate-200 dark:border-slate-700 overflow-hidden">
                      {isImage ? <img src={fileUrl} alt={fileName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <PdfMockup />}

                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />

                      {/* Status de la certificación asociada */}
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant={cert.status === "VIGENTE" ? "default" : "destructive"} className="text-[9px] px-1.5 py-0 shadow-sm">
                          {cert.status}
                        </Badge>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 border border-slate-200 dark:border-slate-800 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                          <ExternalLink className="h-4 w-4 text-[#d60e75]" />
                          <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Pinche aquí para ver documento</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4 bg-white dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Insc: {cert.inscriptionNumber}</p>
                          <p className="text-xs font-black text-primary uppercase tracking-wider line-clamp-1">{cert.name}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2 break-all">{fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            }),
          )}
        </div>

        {data.certifications.every((c) => !c.attachments || c.attachments.length === 0) && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">No hay documentos cargados</h3>
            <p className="text-sm text-slate-400">Esta certificación no cuenta con archivos adjuntos.</p>
          </div>
        )}
      </div>

      {/* Footer de Verificación */}
      <div className="mt-10 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-full text-[11px] font-black text-green-600 dark:text-green-500 uppercase tracking-widest">
          <CheckCircle2 className="h-3 w-3" />
          Validado por Sistema
        </div>
        <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-[0.2em]">Sotex Acreditaciones Digitales</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start">
      {viewMode === "CARD" ? renderCardView() : renderFolderView()}

      {/* Background decoration (solo visible si no está en modo FOLDER full width) */}
      {viewMode === "CARD" && <div className="fixed top-0 left-0 w-full h-[30vh] bg-[#283c7f] z-[-1] opacity-[0.03] pointer-events-none" />}
    </div>
  );
}
