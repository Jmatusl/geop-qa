"use client";

/**
 * PÁGINA — Importar Cuadratura de Bodega
 *
 * Carga masiva de inventario inicial desde archivo Excel.
 * Layout: 2 columnas en desktop (upload + instrucciones), móvil adaptativo.
 * API: /api/v1/bodega/maestros/importar-cuadratura (POST multipart)
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronLeft, FileSpreadsheet, FileText, Info, Loader2, Microscope, Upload, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// Tipos
// ============================================================================

interface ImportResult {
  processedRows: number;
  skippedRows: number;
  createdArticles: number;
  createdWarehouses: number;
  updatedStockRows: number;
  createdCenters: number;
}

// ============================================================================
// Sub-componente: Panel de instrucciones
// ============================================================================

function InstructionsPanel() {
  return (
    <Card className="bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4" />
          Instrucciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="text-xs space-y-2.5 text-blue-700 dark:text-blue-300">
          <li className="flex gap-2">
            <span className="font-bold shrink-0">1.</span>
            El archivo debe contener una hoja llamada <span className="font-bold underline italic">«Cuadratura»</span>.
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">2.</span>
            Los datos deben comenzar en la <span className="font-bold">fila 3</span>.
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">3.</span>
            <span>
              Columna <b>A</b> → Nombre del Artículo.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">4.</span>
            <span>
              Columna <b>B</b> → Cantidad (Stock).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">5.</span>
            <span>
              Columna <b>C</b> → Bodega / Ubicación del Artículo.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">6.</span>
            <span>
              Columna <b>F</b> → Centro de Costo <span className="text-blue-500">(opcional)</span>.
            </span>
          </li>
        </ul>

        <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-100 dark:border-orange-800 mt-4">
          <p className="text-[10px] text-orange-800 dark:text-orange-400 font-bold uppercase tracking-wider mb-1">⚠ Nota Importante</p>
          <p className="text-[11px] text-orange-700 dark:text-orange-300 leading-relaxed">
            Esta herramienta creará artículos, centros de costo y bodegas automáticamente si no existen en el sistema. El stock se acumula (no reemplaza).
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Formato aceptado</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">.xlsx · .xls</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-componente: Resultado de importación
// ============================================================================

function ResultCard({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  return (
    <Card className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            Importación Completada
          </CardTitle>
          <button type="button" onClick={onReset} className="text-emerald-500 hover:text-emerald-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            { label: "Filas procesadas", value: result.processedRows, color: "text-slate-700 dark:text-slate-200" },
            { label: "Filas omitidas", value: result.skippedRows, color: result.skippedRows > 0 ? "text-orange-600" : "text-slate-700 dark:text-slate-200" },
            { label: "Artículos creados", value: result.createdArticles, color: "text-blue-700 dark:text-blue-300" },
            { label: "Bodegas creadas", value: result.createdWarehouses, color: "text-purple-700 dark:text-purple-300" },
            { label: "Stock actualizado", value: result.updatedStockRows, color: "text-emerald-700 dark:text-emerald-300" },
            { label: "Centros de costo", value: result.createdCenters, color: "text-indigo-700 dark:text-indigo-300" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-[#283c7f] hover:bg-[#24366f] text-white">
            <Link href="/bodega">Ir al Dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/bodega/maestros">Volver a Maestros</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function BodegaImportarCuadraturaPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [diagData, setDiagData] = useState<{ sheets: string[]; preview: Record<string, any[][]> } | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const today = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      setFile(dropped);
    } else {
      toast.error("Formato inválido — solo se aceptan .xlsx o .xls");
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecciona un archivo Excel para continuar");
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/bodega/maestros/importar-cuadratura", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        toast.error(json.error || "No fue posible importar el archivo");
        return;
      }

      setResult(json.data as ImportResult);
      toast.success("Importación completada correctamente", {
        description: `${json.data.processedRows} filas procesadas`,
      });
      setFile(null);
      setDiagData(null);
    } catch {
      toast.error("Error crítico al procesar el archivo");
    } finally {
      setIsImporting(false);
    }
  };

  // Diagnóstico: muestra la estructura de filas/columnas del Excel
  const handleDiagnose = async () => {
    if (!file) return;
    setIsDiagnosing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/bodega/maestros/diagnostico-excel", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setDiagData(json);
    } catch {
      toast.error("No se pudo analizar el archivo");
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-24 lg:pb-6">
      {/* ── HEADER MÓVIL ── */}
      <div className="border-b border-border bg-white dark:bg-slate-900 lg:hidden">
        <div className="flex items-center justify-between py-3 px-4">
          <Button type="button" variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl dark:text-white">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <h1 className="text-sm font-extrabold uppercase tracking-wide">Importar Cuadratura</h1>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{today}</span>
        </div>
      </div>

      {/* ── HEADER DESKTOP ── */}
      <div className="hidden lg:flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Cuadratura</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Carga masiva de inventario inicial desde Excel (hoja Cuadratura, columnas A/B/C).</p>
        </div>
      </div>

      {/* ── RESULTADO (cuando existe) ── */}
      {result && <ResultCard result={result} onReset={() => setResult(null)} />}

      {/* ── LAYOUT 2 COLUMNAS ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Columna principal — Upload */}
        <div className="md:col-span-2 space-y-4">
          <Card className="rounded-xl border border-border shadow-sm">
            <CardHeader>
              <CardTitle>Archivo de Cuadratura</CardTitle>
              <CardDescription>Formatos soportados: .xlsx · .xls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Zona de Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                    : file
                      ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10"
                      : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className={`p-4 rounded-full mb-4 ${file ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  <FileText className="h-8 w-8" />
                </div>

                {file ? (
                  <div className="text-center">
                    <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    <div className="text-center mt-3 flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setFile(null);
                          setDiagData(null);
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cambiar archivo
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDiagnose} disabled={isDiagnosing}>
                        {isDiagnosing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Microscope className="h-3.5 w-3.5 mr-1" />}
                        Diagnosticar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">Arrastra el archivo aquí o haz clic para buscar</p>
                    <input type="file" id="file-upload" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                    <label htmlFor="file-upload">
                      <Button asChild variant="outline" className="cursor-pointer">
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Seleccionar Excel
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              {/* Acciones desktop */}
              <div className="hidden lg:flex items-center gap-3 justify-end">
                <Button asChild variant="outline">
                  <Link href="/bodega/maestros">Cancelar</Link>
                </Button>
                <Button onClick={handleImport} disabled={!file || isImporting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[180px]">
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Comenzar Importación
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral — Instrucciones */}
        <div className="space-y-4">
          <InstructionsPanel />
        </div>
      </div>

      {/* ── DIAGNÓSTICO (se muestra cuando hay datos) ── */}
      {diagData && (
        <Card className="rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Diagnóstico del Excel</CardTitle>
            <CardDescription className="text-xs">Hojas disponibles: {diagData.sheets.join(", ")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {diagData.sheets.map((sheet) => {
              const rows = diagData.preview[sheet];
              if (!rows || rows.length === 0) return null;
              return (
                <div key={sheet} className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Hoja: {sheet}</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-[10px] text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="p-2 border-b w-10">Fila</th>
                          {[...Array(10)].map((_, i) => (
                            <th key={i} className="p-2 border-b">
                              Col {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((r, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            {r.map((c: any, colIdx: number) => (
                              <td key={colIdx} className={`p-2 truncate max-w-[150px] ${colIdx === 0 ? "font-bold bg-slate-50 dark:bg-slate-800" : ""}`}>
                                {c !== null ? String(c) : <span className="text-gray-300">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── BARRA FIJA INFERIOR (MÓVIL) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white dark:bg-slate-900 p-4 shadow-lg lg:hidden">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="shrink-0 dark:text-white" onClick={() => router.back()}>
            Volver
          </Button>
          <Button onClick={handleImport} disabled={!file || isImporting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                Importar{file ? ` — ${file.name.slice(0, 20)}...` : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
