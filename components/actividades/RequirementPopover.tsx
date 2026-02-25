"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Calendar, ClipboardList, CheckCircle, Loader2, AlertCircle, Paperclip } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RequirementPopoverProps {
  id: string;
  folio: number;
  folioPrefix: string;
  title: string;
  description: string;
  createdAt: string;
  status: { name: string; colorHex: string };
  priority: { name: string; colorHex: string };
  applicant?: { firstName: string; lastName: string } | null;
  activitiesCount: number;
  attachmentsCount: number;
  isApproved: boolean;
}

export function RequirementPopover({ id, folio, folioPrefix, title, description, createdAt, status, priority, applicant, activitiesCount, attachmentsCount, isApproved }: RequirementPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const folioDisplay = `${folioPrefix}-${String(folio).padStart(4, "0")}`;

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [open]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setOpen(true), 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 200);
  };

  const desc = description.length > 120 ? description.substring(0, 120) + "..." : description;

  return (
    <>
      <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {/* Folio — clickeable para navegar a detalle */}
        <button
          ref={triggerRef}
          onClick={() => router.push(`/actividades/${id}`)}
          className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          aria-label={`Ver detalle del requerimiento ${folioDisplay}`}
        >
          {folioDisplay}
        </button>
      </div>

      {/* Popover con posicionamiento fixed */}
      {open && (
        <div
          role="dialog"
          aria-label={`Resumen ${folioDisplay}`}
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          className="fixed z-[9999] w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-border p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setOpen(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{folioDisplay}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" />
                {format(new Date(createdAt), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <StatusBadge name={status.name} colorHex={status.colorHex} />
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{title}</p>

          {/* Cuerpo */}
          <div className="space-y-2 text-sm">
            {applicant && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {applicant.firstName} {applicant.lastName}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <PriorityBadge name={priority.name} colorHex={priority.colorHex} />
              {activitiesCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClipboardList className="h-3 w-3" /> {activitiesCount} actividad{activitiesCount !== 1 ? "es" : ""}
                </span>
              )}
              {attachmentsCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> {attachmentsCount}
                </span>
              )}
            </div>
          </div>

          {/* Aprobación */}
          {isApproved && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-xs font-semibold text-green-800 dark:text-green-300">Aprobado</span>
            </div>
          )}

          {/* Descripción truncada */}
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2">{desc}</p>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-1 border-t">
            <Button variant="outline" size="sm" className="h-7 text-xs dark:text-white" asChild>
              <Link href={`/actividades/${id}`}>Ver detalle</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
