// ------------------------------------------------------------
// ItemsSheetGridCustom.tsx — actualizado
"use client";

import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { DataSheetGrid, keyColumn, createTextColumn, type Column, type CellProps, type ContextMenuItem, createContextMenuComponent, renderContextMenuItem } from "react-datasheet-grid";

import "react-datasheet-grid/dist/style.css";

// ------------------------------------------------------------
// Tipos alineados con el formulario
// ------------------------------------------------------------
export type ItemRow = {
  id?: number;
  name: string;
  category: string;
  // nuevo: referencia al id de CategoriaInsumos (normalizado). Opcional para compatibilidad.
  categoriaInsumosId?: number | null;
  quantity: number | null; // la validación final exige > 0
  unit: string;
  packageSize?: string;
  technicalSpec?: string;
  neededByDate?: string | Date | null;
  urgency: "BAJA" | "NORMAL" | "ALTA" | "URGENTE";
  notes?: string;
};

export type SelectOption<T extends string | number> = { id: T; label: string };

export type ItemsSheetGridCustomProps = {
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
  // categoría inicial para nuevas filas (no modifica filas existentes)
  initialCategory?: ItemRow["category"];
  // catálogos externos
  categories?: SelectOption<ItemRow["category"]>[];
  urgencies?: SelectOption<ItemRow["urgency"]>[];
};

// Catálogos para selects
// Removed local CATEGORIES and URGENCIES

// ------------------------------------------------------------
// Helpers — numérico entero positivo
// ------------------------------------------------------------
export const positiveIntColumn = createTextColumn<number | null>({
  placeholder: "1",
  alignRight: true,
  continuousUpdates: true,
  deletedValue: null,
  parseUserInput: (value) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned === "") return null;
    const n = parseInt(cleaned, 10);
    if (!Number.isFinite(n)) return null;
    return n < 1 ? 1 : n;
  },
  formatInputOnFocus: (v) => (v == null ? "" : String(v)),
  formatBlurredInput: (v) => (v == null ? "" : String(v)),
  formatForCopy: (v) => (v == null ? "" : String(v)),
  parsePastedValue: (v) => {
    const cleaned = v.replace(/[^0-9]/g, "");
    if (cleaned === "") return null;
    const n = parseInt(cleaned, 10);
    if (!Number.isFinite(n)) return null;
    return n < 1 ? 1 : n;
  },
});

// ------------------------------------------------------------
// Helper — Select nativo (ID puede ser string o number)
// ------------------------------------------------------------
type SelectColData<TId extends string | number> = {
  options: { id: TId; label: string }[];
  placeholder?: string;
};

function makeNativeSelectColumn<TId extends string | number>(colData: SelectColData<TId>): Partial<Column<TId, SelectColData<TId>>> {
  function SelectCell(props: CellProps<TId, SelectColData<TId>>): JSX.Element {
    const { rowData, setRowData, stopEditing, focus, columnData } = props;
    const value = rowData == null ? "" : String(rowData);

    const toId = (v: string, current: TId): TId => {
      if (v === "") return current;
      const sample = columnData.options[0]?.id;
      if (typeof sample === "number") return Number(v) as unknown as TId;
      return v as unknown as TId;
    };

    return (
      <select
        className="w-full h-full border-0 outline-0 bg-transparent dark:bg-slate-900/10 dark:text-slate-100 px-2 cursor-pointer transition-colors"
        autoFocus={focus}
        value={value}
        onChange={(e) => {
          setRowData(toId(e.target.value, rowData as TId));
          stopEditing({ nextRow: true });
        }}
        onBlur={() => stopEditing({ nextRow: false })}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            stopEditing({ nextRow: false });
          }
        }}
      >
        <option value="" className="dark:bg-slate-950 dark:text-slate-400">
          {columnData.placeholder ?? "Seleccione…"}
        </option>
        {columnData.options.map((opt) => (
          <option key={String(opt.id)} value={String(opt.id)} className="dark:bg-slate-950 dark:text-slate-200">
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return {
    width: 160,
    minWidth: 120,
    component: SelectCell,
    columnData: colData,
    copyValue: ({ rowData }) => {
      const o = colData.options.find((x) => x.id === rowData);
      return o ? o.label : null;
    },
    pasteValue: ({ rowData, value }) => {
      const trimmed = value.trim();
      const byId = colData.options.find((x) => String(x.id) === trimmed);
      if (byId) return byId.id as TId;
      const byLabel = colData.options.find((x) => x.label.toLowerCase() === trimmed.toLowerCase());
      if (byLabel) return byLabel.id as TId;
      return rowData;
    },
    isCellEmpty: ({ rowData }) => rowData == null,
    disableKeys: true,
    keepFocus: true,
  };
}

// ------------------------------------------------------------
// Menú contextual y AddRows en español
// ------------------------------------------------------------
const SpanishContextMenu = createContextMenuComponent((item: ContextMenuItem): JSX.Element => {
  switch (item.type) {
    case "COPY":
      return <>Copiar</>;
    case "PASTE":
      return <>Pegar</>;
    case "CUT":
      return <>Cortar</>;
    case "INSERT_ROW_BELLOW":
      return <>Insertar fila debajo</>;
    case "DELETE_ROW":
      return <>Eliminar fila</>;
    case "DUPLICATE_ROW":
      return <>Duplicar fila</>;
    case "DELETE_ROWS":
      return (
        <>
          Eliminar filas {item.fromRow + 1}–{item.toRow + 1}
        </>
      );
    case "DUPLICATE_ROWS":
      return (
        <>
          Duplicar filas {item.fromRow + 1}–{item.toRow + 1}
        </>
      );
    default:
      return renderContextMenuItem(item);
  }
});

function EmptyAddRows(): JSX.Element {
  return <></>;
}

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------
export default function ItemsSheetGridCustom({ defaultData, visibleColumns, onValuesChange, initialCategory, categories, urgencies }: ItemsSheetGridCustomProps): JSX.Element {
  const [data, setData] = useState<ItemRow[]>(
    defaultData ?? [
      { name: "", category: initialCategory ?? "consumible", quantity: 1, unit: "", packageSize: "", technicalSpec: "", urgency: "NORMAL", notes: "" },
      { name: "", category: initialCategory ?? "consumible", quantity: 1, unit: "", packageSize: "", technicalSpec: "", urgency: "NORMAL", notes: "" },
      { name: "", category: initialCategory ?? "consumible", quantity: 1, unit: "", packageSize: "", technicalSpec: "", urgency: "NORMAL", notes: "" },
    ],
  );

  const columns = useMemo(() => {
    const nameCol = {
      ...keyColumn<ItemRow, "name">(
        "name",
        createTextColumn<string>({
          placeholder: "Nombre del item",
          continuousUpdates: true,
          deletedValue: "",
          parseUserInput: (v) => v,
          formatBlurredInput: (v) => v ?? "",
          formatInputOnFocus: (v) => v ?? "",
          formatForCopy: (v) => v ?? "",
          parsePastedValue: (v) => v,
        }),
      ),
      title: "Nombre",
      grow: 2,
      minWidth: 220,
    } as const;

    const categoryCol = {
      ...keyColumn<ItemRow, "category">("category", makeNativeSelectColumn<ItemRow["category"]>({ options: categories ?? [], placeholder: "Categoría" })),
      title: "Categoría",
      minWidth: 150,
      grow: 1,
    } as const;

    const quantityCol = {
      ...keyColumn<ItemRow, "quantity">("quantity", positiveIntColumn),
      title: "Cantidad",
      basis: 110,
      minWidth: 90,
      grow: 0,
    } as const;

    const unitCol = {
      ...keyColumn<ItemRow, "unit">(
        "unit",
        createTextColumn<string>({
          placeholder: "Unidad",
          continuousUpdates: true,
          deletedValue: "",
          parseUserInput: (v) => v,
          formatBlurredInput: (v) => v ?? "",
          formatInputOnFocus: (v) => v ?? "",
          formatForCopy: (v) => v ?? "",
          parsePastedValue: (v) => v,
        }),
      ),
      title: "Unidad",
      minWidth: 140,
      grow: 1,
    } as const;

    const packageSizeCol = {
      ...keyColumn<ItemRow, "packageSize">(
        "packageSize",
        createTextColumn<string | undefined>({
          placeholder: "Tamaño/Presentación",
          continuousUpdates: true,
          deletedValue: "",
          parseUserInput: (v) => v,
          formatBlurredInput: (v) => v ?? "",
          formatInputOnFocus: (v) => v ?? "",
          formatForCopy: (v) => v ?? "",
          parsePastedValue: (v) => v,
        }),
      ),
      title: "Pack/Tamaño",
      minWidth: 180,
      grow: 1,
    } as const;

    const technicalSpecCol = {
      ...keyColumn<ItemRow, "technicalSpec">(
        "technicalSpec",
        createTextColumn<string | undefined>({
          placeholder: "Especificación técnica",
          continuousUpdates: true,
          deletedValue: "",
          parseUserInput: (v) => v,
          formatBlurredInput: (v) => v ?? "",
          formatInputOnFocus: (v) => v ?? "",
          formatForCopy: (v) => v ?? "",
          parsePastedValue: (v) => v,
        }),
      ),
      title: "Esp. Técnica",
      minWidth: 220,
      grow: 2,
    } as const;

    const urgencyCol = {
      ...keyColumn<ItemRow, "urgency">("urgency", makeNativeSelectColumn<ItemRow["urgency"]>({ options: urgencies ?? [], placeholder: "Seleccione" })),
      title: "Urgencia",
      minWidth: 150,
      grow: 1,
    } as const;

    const notesCol = {
      ...keyColumn<ItemRow, "notes">(
        "notes",
        createTextColumn<string | undefined>({
          placeholder: "Notas/Observaciones",
          continuousUpdates: true,
          deletedValue: "",
          parseUserInput: (v) => v,
          formatBlurredInput: (v) => v ?? "",
          formatInputOnFocus: (v) => v ?? "",
          formatForCopy: (v) => v ?? "",
          parsePastedValue: (v) => v,
        }),
      ),
      title: "Notas",
      minWidth: 220,
      grow: 2,
    } as const;

    return [nameCol, categoryCol, quantityCol, unitCol, packageSizeCol, urgencyCol, technicalSpecCol, notesCol];
  }, [categories, urgencies, visibleColumns]);

  useEffect(() => {
    onValuesChange?.(data);
  }, [data, onValuesChange]);

  useEffect(() => {
    if (defaultData) setData(defaultData);
  }, [defaultData]);

  const filteredColumns = useMemo(() => {
    const vis = visibleColumns ?? {};
    const [nameCol, categoryCol, quantityCol, unitCol, packageSizeCol, urgencyCol, technicalSpecCol, notesCol] = columns;
    return [
      vis.name === false ? null : nameCol,
      vis.category === false ? null : categoryCol,
      vis.quantity === false ? null : quantityCol,
      vis.unit === false ? null : unitCol,
      vis.packageSize === false ? null : packageSizeCol,
      vis.urgency === false ? null : urgencyCol,
      vis.technicalSpec === false ? null : technicalSpecCol,
      vis.notes === false ? null : notesCol,
    ].filter(Boolean) as typeof columns;
  }, [columns, visibleColumns]);

  const createRow = (): ItemRow => ({
    name: "",
    category: initialCategory ?? "consumible",
    categoriaInsumosId: initialCategory && /^\d+$/.test(String(initialCategory)) ? Number(initialCategory) : undefined,
    quantity: 1,
    unit: "UNI",
    packageSize: "",
    technicalSpec: "",
    urgency: "NORMAL",
    notes: "",
  });

  return (
    <div className="border border-border dark:border-slate-800 rounded-md overflow-hidden dsg-dark-theme shadow-sm">
      <style>{`
        .dsg-dark-theme {
          --dsg-selection-border-color: #3b82f6;
          --dsg-selection-background-color: rgba(59, 130, 246, 0.1);
        }
        .dark .dsg-dark-theme {
          --dsg-background-color: #020617;
          --dsg-header-background-color: #0f172a;
          --dsg-header-text-color: #94a3b8;
          --dsg-cell-border-color: #1e293b;
          --dsg-cell-text-color: #f1f5f9;
        }
        .dark .react-datasheet-grid__container {
          background-color: var(--dsg-background-color);
        }
        .dark .react-datasheet-grid__header {
          background-color: var(--dsg-header-background-color);
        }
        .dark .react-datasheet-grid__row {
          background-color: var(--dsg-background-color);
        }
      `}</style>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 dark:bg-slate-900/50">
        <div className="text-sm font-medium text-foreground dark:text-slate-300">Items solicitados</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setData((d: ItemRow[]) => [...d, createRow()])}
            className="h-9 gap-1.5 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar fila</span>
          </Button>

          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setData((d: ItemRow[]) => (d.length > 0 ? d.slice(0, -1) : d))}
            disabled={data.length === 0}
            className="h-9 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 dark:border-slate-800 disabled:opacity-50 transition-colors"
            title="Eliminar la última fila"
          >
            <Minus className="h-4 w-4" />
            <span>Eliminar última fila</span>
          </Button>
        </div>
      </div>
      <div>
        <DataSheetGrid<ItemRow>
          value={data}
          onChange={setData}
          columns={filteredColumns}
          contextMenuComponent={(props) => <SpanishContextMenu {...props} />}
          addRowsComponent={EmptyAddRows}
          createRow={createRow}
          autoAddRow
          height={420}
        />
      </div>
    </div>
  );
}
