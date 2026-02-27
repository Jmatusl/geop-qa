"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Tipos reflejados de ItemsSheetGridCustom para compatibilidad
export type ItemRow = {
  id?: number;
  name: string;
  category: string;
  categoriaInsumosId?: number | null;
  quantity: number | null;
  unit: string;
  packageSize?: string;
  technicalSpec?: string;
  neededByDate?: string | Date | null;
  urgency: "BAJA" | "NORMAL" | "ALTA" | "URGENTE";
  notes?: string;
};

export type HistoricalItem = {
  name: string;
  unit: string;
  category?: string;
  categoriaInsumosId?: number | null;
};

export type SelectOption<T extends string | number> = { id: T; label: string };

export type ItemsTableStableProps = {
  defaultData?: ItemRow[];
  visibleColumns?: {
    name?: boolean;
    category?: boolean;
    quantity?: boolean;
    unit?: boolean;
    packageSize?: boolean;
    urgency?: boolean;
    technicalSpec?: boolean;
    notes?: boolean;
  };
  onValuesChange?: (rows: ItemRow[]) => void;
  initialCategory?: ItemRow["category"];
  categories?: SelectOption<ItemRow["category"]>[];
  urgencies?: SelectOption<ItemRow["urgency"]>[];
  historicalItems?: HistoricalItem[];
};

export default function ItemsTableStable({ defaultData, visibleColumns, onValuesChange, initialCategory, categories = [], urgencies = [], historicalItems = [] }: ItemsTableStableProps) {
  const [data, setData] = useState<ItemRow[]>(() => {
    if (defaultData && defaultData.length > 0) return defaultData;
    const initialCat = initialCategory ?? (categories.length > 0 ? categories[0].id : "consumible");
    return [
      { name: "", category: initialCat, quantity: 1, unit: "UNI", urgency: "NORMAL", technicalSpec: "", packageSize: "", notes: "" },
      { name: "", category: initialCat, quantity: 1, unit: "UNI", urgency: "NORMAL", technicalSpec: "", packageSize: "", notes: "" },
      { name: "", category: initialCat, quantity: 1, unit: "UNI", urgency: "NORMAL", technicalSpec: "", packageSize: "", notes: "" },
    ];
  });

  // Estabilidad de la referencia para evitar loops en el padre
  const lastUpdateRef = useRef<string>("");

  useEffect(() => {
    const currentStr = JSON.stringify(data);
    if (currentStr !== lastUpdateRef.current) {
      lastUpdateRef.current = currentStr;
      onValuesChange?.(data);
    }
  }, [data, onValuesChange]);

  useEffect(() => {
    if (defaultData && JSON.stringify(defaultData) !== JSON.stringify(data)) {
      setData(defaultData);
      lastUpdateRef.current = JSON.stringify(defaultData);
    }
  }, [defaultData]);

  const updateCell = (index: number, field: keyof ItemRow, value: any) => {
    setData((prev) => {
      const next = [...prev];
      if (field === "category") {
        const isNumeric = /^\d+$/.test(String(value));
        next[index] = {
          ...next[index],
          [field]: value,
          categoriaInsumosId: isNumeric ? Number(value) : next[index].categoriaInsumosId,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const addRow = () => {
    const initialCat = initialCategory ?? (categories.length > 0 ? categories[0].id : "consumible");
    setData((prev) => [...prev, { name: "", category: initialCat as any, quantity: 1, unit: "UNI", urgency: "NORMAL", technicalSpec: "", packageSize: "", notes: "" }]);
  };

  const removeLastRow = () => {
    setData((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  };

  const isColVisible = (col: keyof NonNullable<ItemsTableStableProps["visibleColumns"]>) => {
    return visibleColumns?.[col] !== false;
  };

  // Estado para la celda enfocada (navegación tipo Excel)
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: keyof ItemRow } | null>(null);

  // ─── Autocompletar con Portal ────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<HistoricalItem[]>([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Estado de posición para el portal (posición fija calculada con getBoundingClientRect)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // Ref compartido: guardamos el input activo para calcular su posición
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  // Fila activa del autocompletar (para poder seleccionar el ítem correcto desde el portal)
  const activeRowIdxRef = useRef<number>(-1);
  // Indicador de que el portal está montado en el cliente
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /** Recalcula la posición del dropdown basándose en la posición actual del input */
  const updateDropdownPos = (inputEl: HTMLInputElement) => {
    const rect = inputEl.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  const openSuggestions = (value: string, inputEl: HTMLInputElement, rowIdx: number) => {
    if (historicalItems.length === 0 || value.length < 2) {
      setShowSuggestions(false);
      return;
    }
    const filtered = historicalItems.filter((i) => i.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
    if (filtered.length === 0) {
      setShowSuggestions(false);
      return;
    }
    setSuggestions(filtered);
    setActiveSuggestionIdx(0);
    activeInputRef.current = inputEl;
    activeRowIdxRef.current = rowIdx;
    updateDropdownPos(inputEl);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (item: HistoricalItem, rowIdx: number) => {
    setData((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        name: item.name,
        unit: item.unit ? item.unit.toUpperCase() : next[rowIdx].unit,
      };
      if (item.categoriaInsumosId) {
        next[rowIdx].categoriaInsumosId = item.categoriaInsumosId;
        next[rowIdx].category = item.categoriaInsumosId.toString();
      } else if (item.category) {
        next[rowIdx].category = item.category;
        const isNumeric = /^\d+$/.test(String(item.category));
        if (isNumeric) next[rowIdx].categoriaInsumosId = Number(item.category);
      }
      return next;
    });
    setShowSuggestions(false);
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // Mapeo de columnas visibles para navegación lateral
  const columnsOrder = useMemo(() => {
    const order: (keyof ItemRow)[] = [];
    if (isColVisible("name")) order.push("name");
    if (isColVisible("category")) order.push("category");
    if (isColVisible("quantity")) order.push("quantity");
    if (isColVisible("unit")) order.push("unit");
    if (isColVisible("urgency")) order.push("urgency");
    return order;
  }, [visibleColumns]);

  // Manejador de navegación por teclado
  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colKey: keyof ItemRow) => {
    const { key } = e;

    // Lógica especial si el menú de sugerencias está abierto
    if (showSuggestions && colKey === "name") {
      if (key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        return;
      }
      if (key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIdx((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }
      if (key === "Enter") {
        e.preventDefault();
        if (suggestions[activeSuggestionIdx]) {
          handleSelectSuggestion(suggestions[activeSuggestionIdx], rowIdx);
        }
        return;
      }
      if (key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    const colIdx = columnsOrder.indexOf(colKey);

    let nextRow = rowIdx;
    let nextColIdx = colIdx;

    if (key === "ArrowUp") {
      nextRow = Math.max(0, rowIdx - 1);
    } else if (key === "ArrowDown") {
      nextRow = Math.min(data.length - 1, rowIdx + 1);
    } else if (key === "ArrowLeft") {
      const isInput = (e.target as HTMLElement).tagName === "INPUT";
      const selectionStart = (e.target as HTMLInputElement).selectionStart;
      if (!isInput || selectionStart === 0) {
        nextColIdx = Math.max(0, colIdx - 1);
      } else {
        return;
      }
    } else if (key === "ArrowRight") {
      const isInput = (e.target as HTMLElement).tagName === "INPUT";
      const selectionEnd = (e.target as HTMLInputElement).selectionEnd;
      const valLength = (e.target as HTMLInputElement).value?.length ?? 0;
      if (!isInput || selectionEnd === valLength) {
        nextColIdx = Math.min(columnsOrder.length - 1, colIdx + 1);
      } else {
        return;
      }
    } else if (key === "Enter") {
      e.preventDefault();
      nextRow = Math.min(data.length - 1, rowIdx + 1);
    } else {
      return;
    }

    if (nextRow !== rowIdx || nextColIdx !== colIdx) {
      e.preventDefault();
      const nextColKey = columnsOrder[nextColIdx];
      const element = document.querySelector(`[data-row="${nextRow}"][data-col="${nextColKey}"]`) as HTMLElement;
      element?.focus();
      setShowSuggestions(false);
    }
  };

  // Portal del menú de sugerencias — se renderiza en document.body para escapar de cualquier overflow
  const suggestionsPortal =
    isMounted && showSuggestions && dropdownPos && suggestions.length > 0
      ? createPortal(
          <div
            style={{
              position: "fixed",
              top: dropdownPos.top - window.scrollY,
              left: dropdownPos.left - window.scrollX,
              width: Math.max(dropdownPos.width, 280),
              zIndex: 9999,
            }}
            className="bg-white dark:bg-slate-900 border border-border shadow-[0_8px_30px_rgba(0,0,0,0.18)] rounded-b-md overflow-hidden max-h-[300px] overflow-y-auto"
            // Evitar que el click cierre el dropdown antes de seleccionar
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((item, sIdx) => (
              <div
                key={sIdx}
                className={cn(
                  "px-3 py-2 cursor-pointer text-[13px] flex flex-col transition-colors border-b border-border last:border-0",
                  activeSuggestionIdx === sIdx ? "bg-primary/10 dark:bg-primary/20" : "hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
                onMouseDown={() => {
                  handleSelectSuggestion(item, activeRowIdxRef.current);
                }}
                onMouseEnter={() => setActiveSuggestionIdx(sIdx)}
              >
                <span className="font-medium text-foreground dark:text-slate-200">{item.name}</span>
                <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded uppercase">{item.unit}</span>
                  {item.category && <span className="italic">Historial</span>}
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {/* Portal del autocompletar — fuera del árbol DOM de la tabla */}
      {suggestionsPortal}

      <div className="border border-border dark:border-slate-800 rounded-md overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 dark:bg-slate-900/50">
          <div className="text-sm font-medium text-foreground dark:text-slate-300">Items solicitados</div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="button" variant="outline" onClick={addRow} className="h-9 gap-1.5 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800">
              <Plus className="h-4 w-4" />
              <span>Agregar fila</span>
            </Button>

            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={removeLastRow}
              disabled={data.length === 0}
              className="h-9 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 dark:border-slate-800 disabled:opacity-50 transition-colors"
            >
              <Minus className="h-4 w-4" />
              <span>Eliminar última fila</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="border-collapse table-fixed w-full">
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent h-8">
                <TableHead className="w-10 text-center border-r h-8 px-2 text-[12px] font-normal text-muted-foreground/80">#</TableHead>
                {isColVisible("name") && <TableHead className="min-w-[200px] border-r h-8 px-2 text-[12px] font-normal text-muted-foreground/80">Nombre</TableHead>}
                {isColVisible("category") && <TableHead className="w-[180px] border-r h-8 px-2 text-[12px] font-normal text-muted-foreground/80">Categoría</TableHead>}
                {isColVisible("quantity") && <TableHead className="w-24 text-center border-r h-8 px-2 text-[12px] font-normal text-muted-foreground/80">Cantidad</TableHead>}
                {isColVisible("unit") && <TableHead className="w-24 border-r h-8 px-2 text-[12px] font-normal text-muted-foreground/80">Unidad</TableHead>}
                {isColVisible("urgency") && <TableHead className="w-32 h-8 px-2 text-[12px] font-normal text-muted-foreground/80">Urgencia</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-border">
                  <TableCell className="text-center text-[11px] text-muted-foreground/60 border-r bg-slate-50/30 dark:bg-slate-900/10 p-0 h-10">{idx + 1}</TableCell>

                  {isColVisible("name") && (
                    <TableCell
                      className={cn(
                        "p-0 border-r h-10 relative transition-all",
                        focusedCell?.row === idx && focusedCell?.col === "name" && "ring-2 ring-primary ring-inset z-10 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
                      )}
                    >
                      <input
                        data-row={idx}
                        data-col="name"
                        className="w-full h-full pl-2 pr-2 bg-transparent border-0 outline-none dark:text-slate-200 text-[13px]"
                        value={row.name}
                        onFocus={(e) => {
                          setFocusedCell({ row: idx, col: "name" });
                          openSuggestions(row.name, e.currentTarget, idx);
                        }}
                        onBlur={() => {
                          // Delay para permitir el click en el portal antes de cerrarse
                          setTimeout(() => {
                            setFocusedCell(null);
                            setShowSuggestions(false);
                          }, 200);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx, "name")}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCell(idx, "name", val);
                          openSuggestions(val, e.currentTarget, idx);
                        }}
                      />
                    </TableCell>
                  )}

                  {isColVisible("category") && (
                    <TableCell
                      className={cn(
                        "p-0 border-r h-10 relative transition-all",
                        focusedCell?.row === idx && focusedCell?.col === "category" && "ring-2 ring-primary ring-inset z-10 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
                      )}
                    >
                      <select
                        data-row={idx}
                        data-col="category"
                        className="w-full h-full pl-1 pr-2 bg-transparent border-0 outline-none cursor-pointer dark:text-slate-200 dark:bg-slate-950 text-[13px]"
                        value={row.category}
                        onFocus={() => setFocusedCell({ row: idx, col: "category" })}
                        onBlur={() => setFocusedCell(null)}
                        onKeyDown={(e) => handleKeyDown(e, idx, "category")}
                        onChange={(e) => updateCell(idx, "category", e.target.value)}
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="dark:bg-slate-900">
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  )}

                  {isColVisible("quantity") && (
                    <TableCell
                      className={cn(
                        "p-0 border-r h-10 relative transition-all",
                        focusedCell?.row === idx && focusedCell?.col === "quantity" && "ring-2 ring-primary ring-inset z-10 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
                      )}
                    >
                      <input
                        data-row={idx}
                        data-col="quantity"
                        type="number"
                        min="1"
                        className="w-full h-full pl-2 pr-2 text-right bg-transparent border-0 outline-none dark:text-slate-200 text-[13px] [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={row.quantity || ""}
                        onFocus={() => setFocusedCell({ row: idx, col: "quantity" })}
                        onBlur={() => setFocusedCell(null)}
                        onKeyDown={(e) => handleKeyDown(e, idx, "quantity")}
                        onChange={(e) => updateCell(idx, "quantity", e.target.value === "" ? null : parseInt(e.target.value))}
                      />
                    </TableCell>
                  )}

                  {isColVisible("unit") && (
                    <TableCell
                      className={cn(
                        "p-0 border-r h-10 relative transition-all",
                        focusedCell?.row === idx && focusedCell?.col === "unit" && "ring-2 ring-primary ring-inset z-10 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
                      )}
                    >
                      <input
                        data-row={idx}
                        data-col="unit"
                        className="w-full h-full pl-2 pr-2 bg-transparent border-0 outline-none dark:text-slate-200 text-[13px]"
                        value={row.unit}
                        onFocus={() => setFocusedCell({ row: idx, col: "unit" })}
                        onBlur={() => setFocusedCell(null)}
                        onKeyDown={(e) => handleKeyDown(e, idx, "unit")}
                        onChange={(e) => updateCell(idx, "unit", e.target.value.toUpperCase())}
                      />
                    </TableCell>
                  )}

                  {isColVisible("urgency") && (
                    <TableCell
                      className={cn(
                        "p-0 h-10 relative transition-all",
                        focusedCell?.row === idx && focusedCell?.col === "urgency" && "ring-2 ring-primary ring-inset z-10 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
                      )}
                    >
                      <select
                        data-row={idx}
                        data-col="urgency"
                        className="w-full h-full pl-1 pr-2 bg-transparent border-0 outline-none cursor-pointer dark:text-slate-200 dark:bg-slate-950 text-[13px]"
                        value={row.urgency}
                        onFocus={() => setFocusedCell({ row: idx, col: "urgency" })}
                        onBlur={() => setFocusedCell(null)}
                        onKeyDown={(e) => handleKeyDown(e, idx, "urgency")}
                        onChange={(e) => updateCell(idx, "urgency", e.target.value)}
                      >
                        {urgencies.map((urg) => (
                          <option key={urg.id} value={urg.id} className="dark:bg-slate-900">
                            {urg.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-slate-50/50 dark:bg-slate-900/30 text-[10px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            <span>Use las flechas direccionales o Tab para navegar entre celdas. Enter para bajar de fila.</span>
          </div>
          <div className="flex gap-4">
            <span>Filas: {data.length}</span>
          </div>
        </div>
      </div>
    </>
  );
}
