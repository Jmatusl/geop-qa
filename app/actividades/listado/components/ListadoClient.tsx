"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequirements } from "@/lib/hooks/actividades/use-requirements";
import { StatusBadge } from "@/components/actividades/StatusBadge";
import { PriorityBadge } from "@/components/actividades/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Search, Plus, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface ListadoClientProps {
  permissions: { autoriza: boolean; chequea: boolean; revisa: boolean; recepciona: boolean };
}

export default function ListadoClient({ permissions }: ListadoClientProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data, isLoading } = useRequirements({ q: q || undefined, pageSize: 20 });
  const requirements = data?.data ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header móvil */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <ClipboardList className="h-5 w-5 text-[#283c7f]" />
          <span className="font-extrabold uppercase tracking-wide text-sm text-slate-900 dark:text-white">REQUERIMIENTOS</span>
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(), "dd-MM-yy", { locale: es })}</p>
      </div>

      {/* Búsqueda */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por título o folio..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 divide-y divide-border">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          : requirements.map((req) => (
              <button key={req.id} onClick={() => router.push(`/actividades/${req.id}`)} className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {req.folioPrefix}-{String(req.folio).padStart(4, "0")}
                  </span>
                  <StatusBadge name={req.status.name} colorHex={req.status.colorHex} />
                </div>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug mb-1">{req.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge name={req.priority.name} colorHex={req.priority.colorHex} />
                  <span className="text-xs text-muted-foreground">{req.activityType.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(req.createdAt), "dd/MM/yy", { locale: es })}</span>
                </div>
              </button>
            ))}

        {!isLoading && requirements.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin requerimientos encontrados</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <Button className="rounded-full h-14 w-14 shadow-lg bg-[#283c7f] hover:bg-[#1e3065] text-white" asChild>
          <Link href="/actividades/ingreso">
            <Plus className="h-6 w-6 text-white" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
