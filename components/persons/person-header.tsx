"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePerson } from "@/lib/hooks/use-persons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronLeft, User, Briefcase, Award, Loader2, Camera } from "lucide-react";
import { CredentialDialog } from "./credential-dialog";
import { ProfileImageDialog } from "./profile-image-dialog";
import { formatRUT } from "@/lib/utils/chile-utils";

interface PersonHeaderProps {
  id: string;
}

export function PersonHeader({ id }: PersonHeaderProps) {
  const { data: person, isLoading, error } = usePerson(id);
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="w-full h-32 flex items-center justify-center border rounded-lg bg-card text-card-foreground shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando ficha...</span>
      </div>
    );
  }

  if (error || !person) {
    return <div className="w-full p-4 border rounded-lg border-red-200 bg-red-50 text-red-900">Error al cargar la ficha del trabajador.</div>;
  }

  // Determine active tab based on pathname
  // /persons/[id] -> Info
  // /persons/[id]/job-history -> Laboral
  // /persons/[id]/certifications -> Certificaciones

  // Simple logic: if ends with [id], it's info.
  const isJobHistory = pathname.endsWith("/job-history");
  const isCertifications = pathname.endsWith("/certifications");
  const isInfo = !isJobHistory && !isCertifications;

  const activeJob = person.jobPositions?.find((j) => j.isActive)?.jobPosition;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/persons" className="hover:text-foreground flex items-center">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a Trabjadores
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">
          {person.firstName} {person.lastName}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <ProfileImageDialog
          personId={person.id}
          currentImage={person.imagePath}
          trigger={
            <div className="relative group cursor-pointer">
              <Avatar className="h-24 w-24 border-4 border-etecma shadow-sm group-hover:opacity-90 transition-opacity">
                <AvatarImage src={person.imagePath || ""} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {person.firstName[0]}
                  {person.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          }
        />

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {person.firstName} {person.lastName}
            </h1>
            <Badge variant={person.isActive ? "default" : "destructive"} className={person.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
              {person.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-4 text-sm mt-2">
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {activeJob?.name || "Sin Cargo Asignado"}
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="font-mono">{formatRUT(person.rut)}</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{person.email}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <CredentialDialog personId={person.id} />
        </div>
      </div>

      <div className="flex items-center space-x-1 border-b">
        <Link
          href={`/persons/${id}`}
          className={cn(
            "flexitems-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            isInfo ? "border-[#283c7f] text-[#283c7f] bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
          )}
        >
          <User className="h-4 w-4 mr-2 inline-block" />
          Información Personal
        </Link>
        <Link
          href={`/persons/${id}/job-history`}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            isJobHistory ? "border-[#283c7f] text-[#283c7f] bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
          )}
        >
          <Briefcase className="h-4 w-4 mr-2 inline-block" />
          Historial Laboral
        </Link>
        <Link
          href={`/persons/${id}/certifications`}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            isCertifications ? "border-[#283c7f] text-[#283c7f] bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
          )}
        >
          <Award className="h-4 w-4 mr-2 inline-block" />
          Certificaciones
        </Link>
      </div>
    </div>
  );
}
