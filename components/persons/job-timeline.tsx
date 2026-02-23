"use client";

import { Person } from "@/lib/hooks/use-persons";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Briefcase, MapPin, Users, ShieldCheck } from "lucide-react";

interface JobTimelineProps {
  person: Person;
}

export function JobTimeline({ person }: JobTimelineProps) {
  // Sort items by date desc
  const sortedJobs = [...(person.jobPositions || [])].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const sortedAreas = [...(person.areas || [])].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

  const sortedSupervisors = [...(person.supervisors || [])].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

  const formatDate = (dateValue: string | Date | undefined) => {
    if (!dateValue) return "N/A";
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    if (!isValid(date)) return "Fecha Inválida";
    return format(date, "PPP", { locale: es });
  };

  return (
    <div className="space-y-10">
      {/* Cargos */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[#283c7f]" /> Historial de Cargos
        </h3>
        <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 space-y-8 pl-6 pb-2">
          {sortedJobs.length === 0 && <p className="text-muted-foreground text-sm italic">No hay historial de cargos registrado.</p>}
          {sortedJobs.map((item, index) => {
            const isCurrent = item.isActive;
            return (
              <div key={index} className="relative">
                <span className={`absolute -left-[2.15rem] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-950 ${isCurrent ? "bg-[#283c7f]" : "bg-gray-300"}`} />
                <div className="flex flex-col space-y-1">
                  <h4 className="text-base font-medium leading-none">{item.jobPosition.name}</h4>
                  <time className="text-sm text-muted-foreground">
                    {formatDate(item.startDate)} {isCurrent ? " - Presente" : item.endDate ? ` - ${formatDate(item.endDate)}` : ""}
                  </time>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Código: {item.jobPosition.code}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Áreas */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#283c7f]" /> Historial de Áreas
        </h3>
        <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 space-y-8 pl-6 pb-2">
          {sortedAreas.length === 0 && <p className="text-muted-foreground text-sm italic">Sin registros de áreas.</p>}
          {sortedAreas.map((item, index) => {
            // In the schema, PersonArea has no isActive, the most recent one is effectively the current one.
            const isLatest = index === 0;
            return (
              <div key={index} className="relative">
                <span className={`absolute -left-[2.15rem] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-950 ${isLatest ? "bg-green-600" : "bg-gray-300"}`} />
                <div className="flex flex-col space-y-1">
                  <h4 className="text-base font-medium leading-none">{item.area.name}</h4>
                  <time className="text-sm text-muted-foreground">
                    Asignado el: {formatDate(item.assignedAt)} {isLatest && " - Actual"}
                  </time>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supervisores */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#283c7f]" /> Historial de Supervisores
        </h3>
        <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 space-y-8 pl-6 pb-2">
          {sortedSupervisors.length === 0 && <p className="text-muted-foreground text-sm italic">Sin supervisores asignados.</p>}
          {sortedSupervisors.map((item, index) => (
            <div key={index} className="relative">
              <span
                className={`absolute -left-[2.15rem] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-950 ${item.isActive ? "bg-blue-600" : "bg-gray-300"}`}
              />
              <div className="flex flex-col space-y-1">
                <h4 className="text-base font-medium leading-none">
                  {item.supervisor.firstName} {item.supervisor.lastName}
                </h4>
                <time className="text-sm text-muted-foreground">
                  Asignado el: {formatDate(item.assignedAt)} {item.isActive && " - Activo"}
                </time>
                <p className="text-xs text-gray-500">RUT: {item.supervisor.rut}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
