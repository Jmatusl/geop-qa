"use client";

import { useEffect, useState } from "react";
import IngresoClient from "../../ingreso/components/IngresoClient";
import IngresoDesktop from "../../ingreso/components/IngresoDesktop";

interface AdaptiveIngresoFormProps {
  catalogs: any;
  currentUser: any;
  initialData: any;
  requirementId: string;
  isEditing: boolean;
  permissions: any;
}

export default function AdaptiveIngresoForm(props: AdaptiveIngresoFormProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Render placeholder durante SSR para evitar hidratación mismatch
  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Cargando formulario...</div>
      </div>
    );
  }

  // Renderizar solo el componente apropiado según el tamaño de pantalla
  return isDesktop ? <IngresoDesktop {...props} /> : <IngresoClient {...props} />;
}
