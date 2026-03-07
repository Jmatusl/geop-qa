"use client";

import { useBodegaArticleMovements, BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, History, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticleHistoryModalProps {
  article: BodegaArticle | null;
  onClose: () => void;
}

export function ArticleHistoryModal({ article, onClose }: ArticleHistoryModalProps) {
  const { data: movements, isLoading } = useBodegaArticleMovements(article?.id || "", !!article);

  return (
    <Sheet open={!!article} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-50 p-2 dark:bg-blue-900/20">
              <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <SheetTitle className="text-xl">Historial de Movimientos</SheetTitle>
              <SheetDescription>
                Crónica de stock para:{" "}
                <span className="font-bold text-[#283c7f] dark:text-blue-400">
                  {article?.code} - {article?.name}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !movements || movements.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-muted-foreground">
              <p>No se registran movimientos para este artículo.</p>
            </div>
          ) : (
            <div className="relative space-y-8 pb-10 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-linear-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:via-slate-800">
              {movements.map((m, i) => (
                <div key={m.id} className="relative flex items-start gap-6 pl-12">
                  <div
                    className={cn(
                      "absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white shadow-sm dark:border-slate-900",
                      m.tipo === "INGRESO" ? "bg-emerald-500 text-white" : m.tipo === "SALIDA" ? "bg-red-500 text-white" : "bg-blue-500 text-white",
                    )}
                  >
                    {m.tipo === "INGRESO" ? <ArrowDownLeft className="h-5 w-5" /> : m.tipo === "SALIDA" ? <ArrowUpRight className="h-5 w-5" /> : <History className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 space-y-2 rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={m.tipo === "INGRESO" ? "success" : m.tipo === "SALIDA" ? "destructive" : ("secondary" as any)}>{m.tipo}</Badge>
                        <span className="font-mono text-xs font-bold">{m.folio}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(m.fecha), "dd/MM/yy HH:mm", { locale: es })}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Cant.</span>
                        <p className={cn("text-base font-extrabold", m.tipo === "INGRESO" ? "text-emerald-600" : "text-red-600")}>
                          {m.tipo === "INGRESO" ? "+" : "-"}
                          {m.cantidad}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Bodega</span>
                        <p className="text-xs font-medium truncate">{m.bodega}</p>
                      </div>
                    </div>

                    {(m.motivo || m.observaciones) && (
                      <div className="rounded-lg bg-slate-50 p-2 text-[11px] italic text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {m.motivo && <span className="font-bold not-italic mr-1">{m.motivo}:</span>}
                        {m.observaciones}
                      </div>
                    )}

                    <div className="flex items-center gap-1 pt-1 text-[9px] text-muted-foreground">
                      <User className="h-2.5 w-2.5" />
                      <span>{m.usuario}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
