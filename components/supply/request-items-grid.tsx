/**
 * Componente: Grid de Items de Solicitud (estilo Excel)
 * Archivo: components/supply/request-items-grid.tsx
 *
 * Grilla estilo Excel para agregar/editar ítems de la solicitud.
 * Columnas: #, Nombre, Categoría, Cantidad, Unidad, Urgencia.
 * Navegación por Tab / Enter entre celdas.
 */

"use client";

import { useState, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import type { SupplyRequestItem } from "@/lib/validations/supply-request";
import type { UnitMaster, MntSupplyCategory } from "@prisma/client";
import { cn } from "@/lib/utils";

interface RequestItemsGridProps {
  items: SupplyRequestItem[];
  categories: MntSupplyCategory[];
  units: UnitMaster[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof SupplyRequestItem, value: any) => void;
  /** Cantidad de ítems que cumplen validación mínima */
  validItemsCount: number;
}

/* ── Celda de texto (input transparente estilo Excel) ──────── */
function CellInput({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
  inputMode,
  className,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  step?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      inputMode={inputMode}
      autoComplete="off"
      spellCheck={false}
      className={cn(
        // Fondo transparente, sin borde por defecto → solo azul al foco
        "w-full h-full bg-transparent border-0 outline-none text-sm px-2 py-1.5",
        "placeholder:text-slate-300 dark:placeholder:text-slate-600",
        "focus:bg-blue-50 dark:focus:bg-blue-950/30",
        "transition-colors",
        className
      )}
    />
  );
}

/* ── Celda de select (estilo hoja de cálculo) ──────────────── */
function CellSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "w-full h-full bg-transparent border-0 outline-none text-sm px-2 py-1.5 cursor-pointer",
        "focus:bg-blue-50 dark:focus:bg-blue-950/30",
        "dark:text-slate-200 dark:bg-transparent",
        "[&>option]:dark:bg-slate-900",
        "transition-colors"
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Combobox de unidad con dropdown elegante ─────────────── */
function CellCombobox({
  value,
  units,
  onChange,
}: {
  /** Texto plano de la unidad (lo que se guarda en BD) */
  value: string;
  units: UnitMaster[];
  onChange: (unit: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const didSelectRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? units.filter(
        (u) =>
          u.symbol.toLowerCase().includes(query.toLowerCase()) ||
          u.name.toLowerCase().includes(query.toLowerCase())
      )
    : units;

  const open = () => {
    if (isOpen) return;
    if (containerRef.current) {
      setDropRect(containerRef.current.getBoundingClientRect());
    }
    setQuery(value); // pre-llenar con valor actual
    didSelectRef.current = false;
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const commit = () => {
    const t = query.trim();
    if (t) onChange(t);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Si el foco se mueve dentro del dropdown no cerrar
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) return;
    close();
    commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Enter" || e.key === "Tab") { close(); commit(); }
  };

  const selectOption = (symbol: string) => {
    didSelectRef.current = true;
    onChange(symbol);
    setQuery(symbol);
    close();
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Input principal — también sirve de buscador cuando está abierto */}
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : value}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={open}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="UNI"
        autoComplete="off"
        spellCheck={false}
        className="w-full h-full bg-transparent border-0 outline-none text-sm px-2 py-1.5 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-blue-50 dark:focus:bg-blue-950/30 transition-colors"
      />

      {isOpen && dropRect && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: dropRect.bottom + 2,
            left: dropRect.left,
            width: Math.max(dropRect.width, 220),
            zIndex: 9999,
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
        >
          {/* Aviso de texto libre cuando no hay coincidencia exacta */}
          {query.trim() && !units.some(
            u => u.symbol.toLowerCase() === query.trim().toLowerCase() ||
                 u.name.toLowerCase() === query.trim().toLowerCase()
          ) && (
            <div className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-b border-slate-100 dark:border-slate-700">
              Guardar como: «{query.trim()}»
            </div>
          )}
          {/* Lista de opciones */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                Sin coincidencias — Enter para guardar.
              </li>
            ) : (
              filtered.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    tabIndex={-1} // no interrumpe el flujo de Tab del formulario
                    onMouseDown={(e) => {
                      e.preventDefault(); // evita que el input principal haga blur
                      selectOption(u.symbol);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                      "hover:bg-blue-50 dark:hover:bg-blue-900/20",
                      u.symbol === value && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-9 text-xs font-bold font-mono",
                        u.symbol === value
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-800 dark:text-slate-100"
                      )}
                    >
                      {u.symbol}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {u.name}
                    </span>
                    {u.symbol === value && (
                      <span className="ml-auto text-blue-500 dark:text-blue-400 text-xs">✓</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────── */
export function RequestItemsGrid({
  items,
  categories,
  units,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  validItemsCount,
}: RequestItemsGridProps) {
  const removeLastItem = () => {
    if (items.length > 0) onRemoveItem(items.length - 1);
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  /** Referencia al contenedor de la grilla para navegación por teclado */
  const gridRef = useRef<HTMLDivElement>(null);

  /**
   * Intercepta Enter en cualquier <input> de la grilla para evitar
   * que dispare el submit del formulario padre y mueve el foco
   * al siguiente input/select dentro de la tabla (comportamiento Excel).
   */
  const handleGridEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    // Solo interceptar inputs; los selects nativos manejan Enter internamente
    if (target.tagName !== "INPUT") return;
    e.preventDefault();
    e.stopPropagation();
    // Obtener todos los inputs y selects navegables de la grilla
    const focusables = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>(
        'input:not([tabindex="-1"]):not([type="hidden"]), select:not([tabindex="-1"])'
      ) ?? []
    );
    const idx = focusables.indexOf(target);
    if (idx >= 0 && idx < focusables.length - 1) {
      focusables[idx + 1].focus();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-slate-50/80 dark:bg-slate-800/50">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-[#284893] dark:text-blue-400">
            Items Solicitados
          </h2>
          <span className="text-xs text-muted-foreground hidden lg:inline">
            (requeridos: nombre, unidad, cantidad &gt; 0)
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              validItemsCount > 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
            )}
          >
            válidos: {validItemsCount}
          </span>
        </div>

        {/* Controles de fila */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={removeLastItem}
            disabled={items.length === 0}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors",
              "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
          >
            <Minus className="h-3.5 w-3.5" />
            Eliminar última fila
          </button>
          <span className="w-px h-3.5 bg-border mx-0.5" />
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors text-[#284893] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar fila
          </button>
        </div>
      </div>

      {/* ── Grilla estilo Excel ────────────────────────────── */}
      <div ref={gridRef} className="overflow-x-auto" onKeyDown={handleGridEnter}>
        <table
          className="w-full border-collapse text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "36px" }} />
            <col style={{ minWidth: "220px" }} />
            <col style={{ width: "180px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "160px" }} />
            <col style={{ width: "110px" }} />
          </colgroup>

          {/* Encabezado */}
          <thead>
            <tr className="bg-[#284893] dark:bg-blue-900/60">
              {["#", "Nombre", "Categoría", "Cantidad", "Unidad", "Urgencia"].map(
                (col, i) => (
                  <th
                    key={col}
                    className={cn(
                      "py-2 text-xs font-semibold text-white dark:text-blue-100",
                      "border-r border-blue-700/40 dark:border-blue-700/30 last:border-r-0",
                      i === 0 ? "text-center" : "text-left px-2",
                      i === 3 && "text-center", // Cantidad centrado
                      i === 5 && "text-center"  // Urgencia centrado
                    )}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>

          {/* Filas */}
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-xs text-muted-foreground"
                >
                  Sin ítems.{" "}
                  <button
                    type="button"
                    onClick={onAddItem}
                    className="font-semibold text-[#284893] dark:text-blue-400 underline underline-offset-2"
                  >
                    + Agregar fila
                  </button>{" "}
                  para comenzar.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const urgencyLevel: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' =
                  (item as any).urgencyLevel ?? 'NORMAL';
                const isEven = index % 2 === 0;

                return (
                  <tr
                    key={index}
                    className={cn(
                      "border-b border-slate-200 dark:border-slate-700/50",
                      "last:border-b-0",
                      urgencyLevel === 'URGENTE'
                        ? "bg-amber-50 dark:bg-amber-900/10"
                        : urgencyLevel === 'ALTA'
                        ? "bg-orange-50 dark:bg-orange-900/10"
                        : urgencyLevel === 'BAJA'
                        ? "bg-sky-50/50 dark:bg-sky-900/10"
                        : isEven
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/60 dark:bg-slate-800/30"
                    )}
                  >
                    {/* # — número de fila */}
                    <td className="border-r border-slate-200 dark:border-slate-700/50 text-center text-xs text-slate-400 dark:text-slate-500 font-mono select-none bg-slate-50/80 dark:bg-slate-800/40">
                      {index + 1}
                    </td>

                    {/* Nombre */}
                    <td className="border-r border-slate-200 dark:border-slate-700/50 p-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-400">
                      <CellInput
                        value={item.itemName}
                        onChange={(v) => onUpdateItem(index, "itemName", v)}
                        placeholder="Nombre del ítem"
                      />
                    </td>

                    {/* Categoría */}
                    <td className="border-r border-slate-200 dark:border-slate-700/50 p-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-400">
                      <CellSelect
                        value={item.categoryId}
                        onChange={(v) => onUpdateItem(index, "categoryId", v)}
                        options={categoryOptions}
                        placeholder="Categoría"
                      />
                    </td>

                    {/* Cantidad */}
                    <td className="border-r border-slate-200 dark:border-slate-700/50 p-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-400">
                      <CellInput
                        type="text"
                        inputMode="decimal"
                        value={item.quantity === 0 ? "" : String(item.quantity)}
                        onChange={(v) => {
                          // Solo permitir números positivos con decimal opcional
                          const clean = v.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
                          const num = parseFloat(clean);
                          onUpdateItem(index, "quantity", isNaN(num) ? 0 : num);
                        }}
                        placeholder="1"
                        className="text-right"
                      />
                    </td>

                    {/* Unidad */}
                    <td className="border-r border-slate-200 dark:border-slate-700/50 p-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-400 overflow-visible">
                      <CellCombobox
                        value={(item as any).unit ?? "UNI"}
                        units={units}
                        onChange={(v) => onUpdateItem(index, "unit" as keyof SupplyRequestItem, v)}
                      />
                    </td>

                    {/* Urgencia */}
                    <td className="p-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-400">
                      <CellSelect
                        value={urgencyLevel}
                        onChange={(v) =>
                          onUpdateItem(
                            index,
                            "urgencyLevel" as keyof SupplyRequestItem,
                            v
                          )
                        }
                        options={[
                          { value: 'BAJA', label: 'Baja' },
                          { value: 'NORMAL', label: 'Normal' },
                          { value: 'ALTA', label: 'Alta' },
                          { value: 'URGENTE', label: 'Urgente' },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer tip ────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
        <p className="text-xs text-muted-foreground">
          Tip: Haga clic en una celda para editar. Use{" "}
          <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1 py-0.5 text-[11px] font-mono bg-white dark:bg-slate-800">
            Tab
          </kbd>{" "}
          /{" "}
          <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1 py-0.5 text-[11px] font-mono bg-white dark:bg-slate-800">
            Enter
          </kbd>{" "}
          para navegar.
        </p>
      </div>
    </div>
  );
}


