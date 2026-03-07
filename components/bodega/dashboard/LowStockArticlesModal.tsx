"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowRight, Package } from "lucide-react";

interface LowStockArticle {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  minimumStock: number;
  availableStock: number;
  unit: string;
  warehouseId: string;
  warehouseName: string;
}

interface LowStockArticlesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId?: string;
}

export function LowStockArticlesModal({ open, onOpenChange, warehouseId }: LowStockArticlesModalProps) {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["bodega", "reportes", "low-stock", warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.append("warehouseId", warehouseId);
      const res = await fetch(`/api/v1/bodega/reportes/low-stock?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar artículos con bajo stock");
      const json = await res.json();
      return json.data as LowStockArticle[];
    },
    enabled: open,
  });

  const handleGoToArticle = (articleId: string) => {
    onOpenChange(false);
    router.push(`/bodega/maestros/articulos?id=${articleId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Stock Bajo Mínimo</DialogTitle>
              <DialogDescription className="text-sm font-medium">Artículos cuya disponibilidad está por debajo del límite de seguridad definido.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Analizando inventario...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[300px] p-6 text-center">
              <p className="text-red-600 font-bold mb-2">Error al cargar datos</p>
              <p className="text-xs text-slate-500 italic">Por favor intenta nuevamente más tarde.</p>
            </div>
          ) : data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3">
              <Package className="w-12 h-12 text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No hay artículos bajo stock mínimo en este momento.</p>
            </div>
          ) : (
            <div className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 h-12">Artículo / Código</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Bodega</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center h-12">Disponible</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center h-12">Mínimo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-6 h-12">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((item) => (
                    <TableRow key={item.id} className="group border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs uppercase tracking-tight text-slate-900 dark:text-slate-100">{item.articleName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">SKU: {item.articleCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase">
                          {item.warehouseName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs text-red-600 dark:text-red-400">
                        {item.availableStock} {item.unit}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-slate-500">
                        {item.minimumStock} {item.unit}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                          onClick={() => handleGoToArticle(item.articleId)}
                        >
                          Gestionar <ArrowRight className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
