"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { DataSheetGrid, Column, keyColumn } from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { cn } from "@/lib/utils";
import ItemsSheetGridCustom from "./ItemsSheetGridCustom";

// Helpers
const toStr = (v: unknown) => (v == null ? "" : String(v));
const trimToUndef = (v: unknown) => {
  const s = toStr(v).trim();
  return s ? s : undefined;
};

// Re-utilizamos pequeños componentes de edición (auto-focus, setRowData)
const TextInput = ({ rowData, setRowData, column, focus, active, stopEditing }: any) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if ((focus ?? active) && ref.current) {
      ref.current.focus();
      try {
        ref.current.select();
      } catch {}
    }
  }, [focus, active]);

  const focusNow = () => {
    if (ref.current) {
      ref.current.focus();
      try {
        ref.current.select();
      } catch {}
    }
  };

  const currentValue = (() => {
    const val = rowData?.[column.key];
    return typeof val === "string" ? val : String(val || "");
  })();

  const isInvalid = (() => {
    if (!rowData) return false;
    if (column.key === "name") return currentValue.trim().length === 0;
    if (column.key === "unit") return currentValue.trim().length === 0;
    return false;
  })();

  return (
    <input
      ref={ref}
      type="text"
      value={currentValue}
      onChange={(e) => setRowData({ ...(rowData ?? {}), [column.key]: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onMouseDown={(e) => {
        // Evitar que el grid maneje el evento y provocar focus inmediato
        e.stopPropagation();
        focusNow();
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onBlur={() => stopEditing?.()}
      className={cn("w-full h-full border-0 outline-0 bg-transparent px-2", isInvalid && "ring-1 ring-red-400/60")}
    />
  );
};

const NumberInput = ({ rowData, setRowData, column, focus, active, stopEditing }: any) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if ((focus ?? active) && ref.current) {
      ref.current.focus();
      try {
        ref.current.select();
      } catch {}
    }
  }, [focus, active]);

  const focusNow = () => {
    if (ref.current) {
      ref.current.focus();
      try {
        ref.current.select();
      } catch {}
    }
  };

  const currentValue = (() => {
    const val = rowData?.[column.key];
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
    return "";
  })();

  return (
    <input
      ref={ref}
      type="number"
      step="1"
      min="0"
      value={currentValue}
      onChange={(e) => {
        const v = e.target.value;
        const n = Number.parseInt(v, 10);
        const safe = Number.isFinite(n) ? Math.max(0, n) : 0;
        setRowData({ ...(rowData ?? {}), [column.key]: safe });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        focusNow();
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onBlur={() => stopEditing?.()}
      className="w-full h-full border-0 outline-0 bg-transparent px-2"
    />
  );
};

const CategorySelect = ({ rowData, setRowData, focus, active, stopEditing }: any) => {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if ((focus ?? active) && ref.current) ref.current.focus();
  }, [focus, active]);

  return (
    <select
      ref={ref}
      value={rowData?.category ?? "consumible"}
      onChange={(e) => {
        setRowData({ ...(rowData ?? {}), category: e.target.value as any });
        stopEditing?.();
      }}
      onMouseDown={(e) => {
        // Abrir el <select> con un solo click
        e.stopPropagation();
        e.preventDefault();
        ref.current?.focus();
        setTimeout(() => ref.current?.click(), 0);
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      className="w-full h-full border-0 outline-0 bg-transparent px-2"
    >
      <option value="consumible">Consumible</option>
      <option value="repuesto">Repuesto</option>
      <option value="herramienta">Herramienta</option>
      <option value="equipo">Equipo</option>
      <option value="otro">Otro</option>
    </select>
  );
};

const UrgencySelect = ({ rowData, setRowData, focus, active, stopEditing }: any) => {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if ((focus ?? active) && ref.current) ref.current.focus();
  }, [focus, active]);

  return (
    <select
      ref={ref}
      value={rowData?.urgency ?? "NORMAL"}
      onChange={(e) => {
        setRowData({ ...(rowData ?? {}), urgency: e.target.value as any });
        stopEditing?.();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        ref.current?.focus();
        setTimeout(() => ref.current?.click(), 0);
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      className="w-full h-full border-0 outline-0 bg-transparent px-2"
    >
      <option value="BAJA">Baja</option>
      <option value="NORMAL">Normal</option>
      <option value="ALTA">Alta</option>
      <option value="URGENTE">Urgente</option>
    </select>
  );
};

const createTextInputWrapper = (key: string) => (props: any) => <TextInput {...props} column={{ key }} />;
const createNumberInputWrapper = (key: string) => (props: any) => <NumberInput {...props} column={{ key }} />;

// Styles
const gridStyles = `
  .dsg-container { overflow: visible !important; height: auto !important; }
  .dsg-container .dsg-viewport { overflow: visible !important; height: auto !important; }
`;

export type ItemRow = {
  name: string;
  category: "consumible" | "repuesto" | "herramienta" | "equipo" | "otro";
  quantity: number;
  unit: string;
  packageSize?: string;
  technicalSpec?: string;
  urgency: "BAJA" | "NORMAL" | "ALTA" | "URGENTE";
  notes?: string;
};

interface ItemsGridProps {
  initialData?: ItemRow[];
  visibleColumns?: Partial<Record<keyof ItemRow | string, boolean>>;
  onChange?: (rows: ItemRow[]) => void;
  minWidth?: number;
}

export default function ItemsGrid({ initialData = [], visibleColumns: visible = {}, onChange, minWidth }: ItemsGridProps) {
  const [rows, setRows] = useState<ItemRow[]>(initialData);

  useEffect(() => setRows(initialData), [initialData]);

  const nameInputComponent = createTextInputWrapper("name");
  const quantityInputComponent = createNumberInputWrapper("quantity");
  const unitInputComponent = createTextInputWrapper("unit");
  const packageSizeInputComponent = createTextInputWrapper("packageSize");
  const technicalSpecInputComponent = createTextInputWrapper("technicalSpec");
  const notesInputComponent = createTextInputWrapper("notes");

  const getMinWidth = useCallback(() => {
    const columnWidths: Record<string, number> = {
      name: 300,
      category: 140,
      quantity: 100,
      unit: 150,
      packageSize: 170,
      urgency: 120,
      technicalSpec: 280,
      notes: 220,
    };
    let total = 0;
    Object.entries(visible).forEach(([k, v]) => {
      if (v) total += columnWidths[k] ?? 100;
    });
    return Math.max(total + 100, minWidth ?? 800);
  }, [visible, minWidth]);

  const columns: Column<ItemRow>[] = useMemo(() => {
    const cols: Partial<Column<ItemRow, any, any>>[] = [];

    if (visible?.name ?? true) {
      cols.push(
        keyColumn("name", {
          title: "Nombre del Item",
          component: nameInputComponent,
          minWidth: 300,
          keepFocus: true,
          copyValue: ({ rowData }: any) => rowData?.name ?? "",
          pasteValue: ({ rowData, value }: any) => ({ ...rowData, name: (value ?? "").toString() }),
        })
      );
    }

    if (visible?.category ?? false) {
      cols.push(
        keyColumn("category", {
          title: "Categoría",
          component: CategorySelect,
          minWidth: 140,
          keepFocus: true,
        })
      );
    }

    if (visible?.quantity ?? true) {
      cols.push(
        keyColumn("quantity", {
          title: "Cantidad",
          component: quantityInputComponent,
          minWidth: 100,
          keepFocus: true,
          pasteValue: ({ rowData, value }: any) => {
            const str = String(value ?? "")
              .trim()
              .replace(/\s/g, "");
            const normalized = str.replace(",", ".");
            const num = Number(normalized);
            return { ...rowData, quantity: isNaN(num) ? rowData.quantity : num };
          },
          copyValue: ({ rowData }: any) => String(rowData.quantity ?? ""),
        })
      );
    }

    if (visible?.unit ?? true) {
      cols.push(
        keyColumn("unit", {
          title: "Unidad",
          component: unitInputComponent,
          minWidth: 150,
          keepFocus: true,
          copyValue: ({ rowData }: any) => rowData?.unit ?? "",
          pasteValue: ({ rowData, value }: any) => ({ ...rowData, unit: (value ?? "").toString() }),
        })
      );
    }

    if (visible?.packageSize ?? false) {
      cols.push(
        keyColumn("packageSize", {
          title: "Tamaño Paquete",
          component: packageSizeInputComponent,
          minWidth: 170,
          keepFocus: true,
        })
      );
    }

    if (visible?.urgency ?? true) {
      cols.push(
        keyColumn("urgency", {
          title: "Urgencia",
          component: UrgencySelect,
          minWidth: 120,
          keepFocus: true,
          copyValue: ({ rowData }: any) => rowData.urgency ?? "",
          pasteValue: ({ rowData, value }: any) => {
            const v = (value || "").toString().trim().toUpperCase();
            const map: Record<string, ItemRow["urgency"]> = {
              BAJA: "BAJA",
              LOW: "BAJA",
              L: "BAJA",
              NORMAL: "NORMAL",
              N: "NORMAL",
              MEDIA: "NORMAL",
              MEDIUM: "NORMAL",
              ALTA: "ALTA",
              HIGH: "ALTA",
              H: "ALTA",
              URGENTE: "URGENTE",
              URGENT: "URGENTE",
              U: "URGENTE",
            };
            return { ...rowData, urgency: map[v] ?? rowData.urgency };
          },
          prePasteValues: (values: string[]) => values.map((v) => (v || "").toString().trim().toUpperCase()),
        })
      );
    }

    if (visible?.technicalSpec ?? false) {
      cols.push(
        keyColumn("technicalSpec", {
          title: "Especificaciones Técnicas",
          component: technicalSpecInputComponent,
          minWidth: 280,
          keepFocus: true,
        })
      );
    }

    if (visible?.notes ?? false) {
      cols.push(
        keyColumn("notes", {
          title: "Notas",
          component: notesInputComponent,
          minWidth: 220,
          keepFocus: true,
        })
      );
    }

    return cols as Column<ItemRow>[];
  }, [visible]);

  const onGridChange = useCallback(
    (value: ItemRow[], operations?: any) => {
      // Evitar recrear la misma referencia innecesariamente
      setRows(value);
      try {
        onChange?.(value);
      } catch (e) {
        console.error("ItemsGrid onChange handler error:", e);
      }
    },
    [onChange]
  );

  return (
    <div>
      <ItemsSheetGridCustom />
      <style dangerouslySetInnerHTML={{ __html: gridStyles }} />
      <div className="w-full" style={{ minWidth: `${getMinWidth()}px` }}>
        <DataSheetGrid
          value={rows}
          onChange={onGridChange}
          columns={columns}
          addRowsComponent={false}
          disableContextMenu={false}
          lockRows={false}
          autoAddRow={false}
          createRow={() => ({ name: "", category: "consumible" as const, quantity: 1, unit: "", packageSize: "", technicalSpec: "", urgency: "NORMAL" as const, notes: "" })}
          style={{ height: "auto", width: "100%", minWidth: `${getMinWidth()}px`, overflow: "visible" }}
        />
      </div>
    </div>
  );
}
