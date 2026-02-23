"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRUT } from "@/lib/utils/chile-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatDate, getRemainingTime, formatDuration } from "@/lib/utils/date-utils";
import { CheckCircle2, Building2, Briefcase, FileCheck, FileText, Calendar, Clock, Hash } from "lucide-react";

interface CredentialViewProps {
  person: {
    firstName: string;
    lastName: string;
    rut: string;
    imagePath: string | null;
    jobTitle: string;
    area: string;
    certifications: Array<{
      name: string;
      code: string;
      status: string;
      inscriptionNumber: string | null;
      resolutionNumber: string | null;
      validityStartDate: string | null;
      validityEndDate: string | null;
      validityMonths: number | null;
      durationText: string;
    }>;
  };
  theme: any;
}

export function CredentialView({ person, theme }: CredentialViewProps) {
  // Parse theme config safely
  const themeConfig = theme?.config ? (typeof theme.config === "string" ? JSON.parse(theme.config) : theme.config) : {};

  // Default styles
  const primaryColor = themeConfig.primaryColor || "#283c7f";
  const logoUrl = themeConfig.logoUrl || "/logo.png"; // Fallback to default asset
  const orgName = themeConfig.orgName || "GEOP - Sotex";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl overflow-hidden border-0">
        {/* Header */}
        <div className="h-32 relative flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="absolute top-4 right-4">
            <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm">OFICIAL</Badge>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="relative -mt-16 flex justify-center">
          <div className="p-1.5 bg-white rounded-full shadow-md">
            <Avatar className="h-32 w-32 border-4 border-white shadow-sm">
              <AvatarImage src={person.imagePath || ""} alt="Foto de perfil" className="object-cover" />
              <AvatarFallback className="text-2xl bg-slate-100 text-slate-400">
                {person.firstName[0]}
                {person.lastName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Person Details */}
        <div className="text-center mt-4 px-6">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {person.firstName} {person.lastName}
          </h1>
          <p className="text-lg font-medium text-gray-600 mt-1">{formatRUT(person.rut)}</p>

          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
            <Building2 className="h-4 w-4" />
            <span>{person.area}</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-gray-500 mb-6">
            <Briefcase className="h-4 w-4" />
            <span>{person.jobTitle}</span>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-100 text-green-700 font-medium text-sm shadow-sm ring-1 ring-green-600/20">
            <CheckCircle2 className="h-4 w-4" />
            <span>VIGENTE</span>
          </div>
        </div>

        <div className="px-6 py-6">
          <Separator className="mb-6" />

          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Certificaciones Activas</h3>

          {person.certifications.length > 0 ? (
            <div className="space-y-4">
              {person.certifications.map((cert, index) => (
                <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] bg-[#283c7f]/10 text-[#283c7f] dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                        Certificación
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{cert.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono leading-none py-0.5">
                      {cert.code}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <FileCheck className="h-3 w-3" /> Inscripción
                      </span>
                      <p className="text-xs font-semibold dark:text-gray-200">{cert.inscriptionNumber || "Pendiente"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Res. Exenta
                      </span>
                      <p className="text-xs font-semibold dark:text-gray-200">{cert.resolutionNumber || "N/A"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Vigencia
                      </span>
                      <p className="text-[10px] dark:text-gray-300">
                        {formatDate(cert.validityStartDate)} - {cert.validityEndDate ? formatDate(cert.validityEndDate) : "Indef."}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Duración
                      </span>
                      <p className="text-[10px] font-semibold dark:text-gray-200">{formatDuration(cert.validityMonths)}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${cert.validityEndDate ? "bg-green-500" : "bg-blue-500"}`} />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Vencimiento</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100/50 dark:bg-blue-900/30 text-[#283c7f] dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 border-0 text-[10px] py-0 px-2 h-5"
                    >
                      {getRemainingTime(cert.validityEndDate)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">Sin certificaciones activas registradas.</p>
          )}
        </div>

        <CardFooter className="bg-gray-50 px-6 py-4 flex flex-col gap-2">
          <div className="text-xs text-gray-400 text-center w-full">Validado el {format(new Date(), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</div>
          <div className="flex justify-center mt-2">
            <span className="text-[10px] text-gray-300 font-medium">{orgName}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
