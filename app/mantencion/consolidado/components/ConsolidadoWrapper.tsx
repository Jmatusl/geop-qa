"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Cargar componente solo en cliente para evitar problemas de hidratación con Radix UI
const ConsolidadoClient = dynamic(() => import("./ConsolidadoClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full space-y-6 p-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-150 w-full" />
    </div>
  ),
});

interface ConsolidadoWrapperProps {
  initialData: any[];
  workRequirements: any[];
  catalogs: {
    statuses: any[];
    installations: any[];
    wrStatuses: any[];
    suppliers: any[];
  };
}

export default function ConsolidadoWrapper(props: ConsolidadoWrapperProps) {
  return <ConsolidadoClient {...props} />;
}
