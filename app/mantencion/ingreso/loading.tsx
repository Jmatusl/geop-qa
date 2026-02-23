import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Loader2 } from "lucide-react";

export default function LoadingIngreso() {
  return (
    <div className="lg:space-y-4 animate-pulse lg:pb-10">
      {/* Header Skeleton (Desktop) */}
      <div className="hidden lg:flex flex-col gap-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Form Container Skeleton */}
      <div className="w-full">
        {/* Mobile Header Pseudo-Header */}
        <div className="lg:hidden w-full bg-white dark:bg-slate-900 border-b border-border px-3 py-3 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <ClipboardList className="h-5 w-5 text-slate-200 dark:text-slate-800 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Desktop Header Pseudo-Header */}
        <div className="hidden lg:flex w-full bg-white dark:bg-slate-900 lg:rounded-t-xl border border-border px-6 py-5 flex-row items-center justify-end gap-4 shadow-sm">
          <div className="flex flex-row items-center gap-2 w-full lg:w-[60%]">
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 w-40 rounded-xl" />
          </div>
        </div>

        {/* Body Skeleton */}
        <div className="border border-t-0 lg:border lg:border-t-0 border-border lg:rounded-b-xl bg-card dark:bg-slate-900/60 shadow-sm overflow-hidden">
          {/* Section 1: Hierarchy */}
          <div className="border-b border-border px-4 lg:px-6 py-5 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Section 2: Split View */}
          <div className="border-b border-border">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="border-b lg:border-b-0 lg:border-r border-border px-4 lg:px-6 py-5 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="hidden lg:block p-6 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>

          {/* Section 3: Description & Evidence */}
          <div className="px-4 lg:px-6 py-10 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600/40" />
            <p className="text-sm font-medium animate-pulse">Cargando componentes del formulario...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
