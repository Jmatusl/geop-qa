"use client";

import { useWorkerCertifications, WorkerCertification, useRenewableCertifications, useCertificationToken } from "@/lib/hooks/use-certifications";
import { Person } from "@/lib/hooks/use-persons"; // Se necesita person para pasar a la query o recibir directamente
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, QrCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CertificationsGridProps {
    personId: string;
    onRenew?: (cert: WorkerCertification) => void;
}

export function CertificationsGrid({ personId, onRenew }: CertificationsGridProps) {
    const { data: certifications, isLoading } = useWorkerCertifications(personId);
    const { data: renewableList } = useRenewableCertifications(personId);

    if (isLoading) return <div>Cargando...</div>;

    // ¿Agrupar por Resolución? O simplemente tarjetas planas.
    // Las tarjetas planas son más fáciles para una "Grilla".

    if (!certifications || certifications.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No hay certificaciones vigentes o registradas.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((cert) => {
                const isCurrent = cert.status === "VIGENTE";
                return (
                    <Card key={cert.id} className={`overflow-hidden border-l-4 ${isCurrent ? "border-l-green-500" : "border-l-gray-300"}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{cert.certificationMaster.name}</CardTitle>
                                    <CardDescription>{cert.certificationMaster.code}</CardDescription>
                                </div>
                                <Badge variant={isCurrent ? "default" : "secondary"} className={isCurrent ? "bg-green-600" : ""}>
                                    {cert.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Resolución</span>
                                    <span className="font-medium">{cert.workerResolution.resolutionNumber}</span>
                                </div>
                                <div>
                                    <span className="font-medium">{format(new Date(cert.workerResolution.issueDate), "dd MMM yyyy", { locale: es })}</span>
                                </div>
                                {cert.renewedFrom && (
                                    <div className="col-span-2 mt-2 pt-2 border-t border-dashed bg-blue-50/50 dark:bg-blue-950/20 -mx-2 px-2 rounded-b-sm border-blue-100 dark:border-blue-900/30">
                                        <div className="flex items-center gap-2 text-[10px] text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider mb-1">
                                            <RefreshCw className="h-3 w-3" />
                                            Trazabilidad Histórica
                                        </div>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 flex flex-col gap-0.5">
                                            <span className="font-medium">↳ Renueva a Resolución: {cert.renewedFrom.workerResolution.resolutionNumber}</span>
                                            <span className="text-[10px] opacity-70">Certificado original: {cert.renewedFrom.certificationMaster.code}</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <span className="text-xs text-muted-foreground block">Vencimiento</span>
                                    <span className={`font-medium ${isCurrent ? "" : "text-red-500"}`}>
                                        {format(new Date(cert.expiryDate), "dd MMM yyyy", { locale: es })}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <div className="px-6 pb-4 pt-0 flex gap-2">
                            {onRenew && renewableList?.some(r => r.id === cert.id) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                    onClick={() => onRenew(cert)}
                                >
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                    Renovar
                                </Button>
                            )}
                            <CertificationQRCode personId={personId} certificationId={cert.id} />
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

function CertificationQRCode({ personId, certificationId }: { personId: string, certificationId: string }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1">
                    <QrCode className="mr-2 h-3.5 w-3.5" />
                    Validación
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
                <QRCodeContent personId={personId} certificationId={certificationId} />
            </PopoverContent>
        </Popover>
    );
}

function QRCodeContent({ personId, certificationId }: { personId: string, certificationId: string }) {
    const { data: tokenData, isLoading, error } = useCertificationToken(personId, certificationId);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-4 min-w-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-[10px] mt-2 text-muted-foreground uppercase font-semibold">Generando Token...</p>
        </div>
    );

    if (error || !tokenData) return (
        <div className="p-2 text-xs text-red-500 text-center">
            Error al generar QR
        </div>
    );

    const validationUrl = `${window.location.origin}/validar/${tokenData.token}`;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-2 rounded-lg border shadow-sm">
                <QRCodeSVG
                    value={validationUrl}
                    size={160}
                    level="H"
                    includeMargin={false}
                />
            </div>
            <div className="text-center space-y-1">
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">Escanear para Validar</p>
                <p className="text-[9px] text-muted-foreground">Vence: {new Date(tokenData.expiresAt).toLocaleTimeString()}</p>
            </div>
        </div>
    );
}
