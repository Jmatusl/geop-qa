"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useState } from "react";
import {
  DataSheetGrid,
  keyColumn,
  createTextColumn,
  type Column,
  type CellProps,
  type AddRowsComponentProps,
  type ContextMenuComponentProps,
  type ContextMenuItem,
  createContextMenuComponent,
  renderContextMenuItem,
} from "react-datasheet-grid";

// ¡Importa el estilo una sola vez en tu app!
import "react-datasheet-grid/dist/style.css";

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------

type Unidad = { id: number; label: string };

type Urgencia = { id: number; label: string };

export type ItemRow = {
  nombreItem: string;
  cantidad: number | null;
  unidadId: number | null;
  urgenciaId: number | null;
};

type ItemsSheetGridCustomPropos = {
  defaultData?: ItemRow[];
  visibleColumns?: {
    nombreItem?: boolean;
    cantidad?: boolean;
    unidadId?: boolean;
    urgenciaId?: boolean;
  };
  onValuesChange?: (rows: ItemRow[]) => void;
};

// ------------------------------------------------------------
// Constantes (simulan catálogos de BD)
// ------------------------------------------------------------

const UNIDADES: Unidad[] = [
  { id: 1, label: "Unidad" },
  { id: 2, label: "Kg" },
  { id: 3, label: "Litro" },
  { id: 4, label: "Metro" },
];

const URGENCIAS: Urgencia[] = [
  { id: 1, label: "Baja" },
  { id: 2, label: "Normal" },
  { id: 3, label: "Alta" },
  { id: 4, label: "Urgencia" },
];

// ------------------------------------------------------------
// Helpers — Select nativo con IDs (sin react-select)
//  * DEVUELVE SIEMPRE JSX.Element (nunca null) para encajar con los
//    tipos de react-datasheet-grid v4.x
// ------------------------------------------------------------

// Columna numérica: enteros positivos, sin notación científica
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

type SelectColData<TId extends string | number> = {
  options: { id: TId; label: string }[];
  placeholder?: string;
};

function makeNativeSelectColumn<TId extends string | number>(colData: SelectColData<TId>): Partial<Column<TId | null, SelectColData<TId>>> {
  function SelectCell(props: CellProps<TId | null, SelectColData<TId>>): JSX.Element {
    const { rowData, setRowData, stopEditing, focus, columnData } = props;
    const value = rowData == null ? "" : String(rowData);

    const toId = (v: string): TId | null => {
      if (v === "") return null;
      const sample = columnData.options[0]?.id;
      if (typeof sample === "number") return Number(v) as unknown as TId;
      return v as unknown as TId;
    };

    return (
      <select
        className="w-full h-full border-0 outline-0 bg-transparent px-2"
        autoFocus={focus}
        value={value}
        onChange={(e) => {
          setRowData(toId(e.target.value));
          // Avanza a la siguiente fila tras elegir
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
        <option value="">{columnData.placeholder ?? "Seleccione…"}</option>
        {columnData.options.map((opt) => (
          <option key={String(opt.id)} value={String(opt.id)}>
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
    // Copiar como etiqueta
    copyValue: ({ rowData }) => {
      const o = colData.options.find((x) => x.id === rowData);
      return o ? o.label : null;
    },
    // Pegar por etiqueta o ID
    pasteValue: ({ rowData, value }) => {
      const trimmed = value.trim();
      const byId = colData.options.find((x) => String(x.id) === trimmed);
      if (byId) return byId.id as TId;
      const byLabel = colData.options.find((x) => x.label.toLowerCase() === trimmed.toLowerCase());
      if (byLabel) return byLabel.id as TId;
      return rowData;
    },
    isCellEmpty: ({ rowData }) => rowData == null,
    // Cuando el select está abierto, queremos que las flechas actúen sobre el select
    // (el grid maneja las flechas cuando no hay widget enfocado)
    disableKeys: true,
    keepFocus: true,
  };
}

// ------------------------------------------------------------
// Menú contextual en español (siempre devuelve JSX.Element)
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

// Botón para "Agregar filas" en español
function AddRows(props: AddRowsComponentProps): JSX.Element {
  return (
    <div style={{ padding: 8 }}>
      <Button className="dsg-button" type="button" onClick={() => props.addRows(1)}>
        + Agregar fila
      </Button>
    </div>
  );
}

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------

export default function ItemsSheetGridCustom({ defaultData, visibleColumns, onValuesChange }: ItemsSheetGridCustomPropos): JSX.Element {
  const [data, setData] = useState<ItemRow[]>(
    defaultData ?? [
      { nombreItem: "Cable UTP", cantidad: 10, unidadId: 1, urgenciaId: 2 },
      { nombreItem: "Aceite motor", cantidad: 2, unidadId: 3, urgenciaId: 3 },
    ]
  );

  // Columnas
  const columns = useMemo(() => {
    // Columna 1: Nombre del ítem (texto libre)
    const nombreCol = {
      ...keyColumn<ItemRow, "nombreItem">(
        "nombreItem",
        createTextColumn<string>({
          placeholder: "Ingrese nombre del item",
          // Edición mientras escribe (y el input aparece al enfocar)
          continuousUpdates: true,
          deletedValue: "",
          parseUserInput: (v) => v,
          formatBlurredInput: (v) => v ?? "",
          formatInputOnFocus: (v) => v ?? "",
          formatForCopy: (v) => v ?? "",
          parsePastedValue: (v) => v,
        })
      ),
      title: "Nombre del Item",
      grow: 2,
      minWidth: 220,
    };

    // Columna 2: Cantidad (entero > 0, solo dígitos)
    const cantidadCol = {
      ...keyColumn<ItemRow, "cantidad">("cantidad", positiveIntColumn),
      title: "Cantidad",
      basis: 110,
      minWidth: 90,
      grow: 0,
    };

    // Columna 3: Unidad (select por ID)
    const unidadCol = {
      ...keyColumn<ItemRow, "unidadId">(
        "unidadId",
        makeNativeSelectColumn<number>({
          options: UNIDADES,
          placeholder: "Seleccione unidad",
        })
      ),
      title: "Unidad",
      minWidth: 150,
      grow: 1,
    };

    // Columna 4: Urgencia (select por ID)
    const urgenciaCol = {
      ...keyColumn<ItemRow, "urgenciaId">(
        "urgenciaId",
        makeNativeSelectColumn<number>({
          options: URGENCIAS,
          placeholder: "Seleccione urgencia",
        })
      ),
      title: "Urgencia",
      minWidth: 150,
      grow: 1,
    };

    return [nombreCol, cantidadCol, unidadCol, urgenciaCol];
  }, []);

  // Notificar cambios hacia el padre cuando cambie la grilla
  useEffect(() => {
    onValuesChange?.(data);
  }, [data, onValuesChange]);

  // Si cambian los datos por defecto, actualizar la grilla (opcional)
  useEffect(() => {
    if (defaultData) setData(defaultData);
  }, [defaultData]);

  // Filtrar columnas visibles según props
  const filteredColumns = useMemo(() => {
    const vis = visibleColumns ?? {};
    const result = [
      vis.nombreItem === false ? null : columns[0],
      vis.cantidad === false ? null : columns[1],
      vis.unidadId === false ? null : columns[2],
      vis.urgenciaId === false ? null : columns[3],
    ].filter((c): c is (typeof columns)[number] => Boolean(c));
    return result;
  }, [columns, visibleColumns]);

  // Crear una fila nueva por defecto
  const createRow = (): ItemRow => ({
    nombreItem: "",
    cantidad: 1,
    unidadId: null,
    urgenciaId: 2, // Normal
  });

  return (
    <div>
      <DataSheetGrid<ItemRow>
        value={data}
        onChange={setData}
        columns={filteredColumns}
        contextMenuComponent={(props) => <SpanishContextMenu {...props} />}
        addRowsComponent={AddRows}
        createRow={createRow}
        autoAddRow
        // Altura ajustable; elimina o cambia según tu layout
        height={420}
      />
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>
  );
}
