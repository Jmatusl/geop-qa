"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  RefreshCw,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Eye,
  MoreHorizontal,
  FileText,
  Calendar,
  MapPin,
  User,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Paperclip,
  Trash2,
  Boxes,
  ClipboardList,
  ShieldCheck,
  Check,
  Plus,
  ChevronsUpDown,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SupplierForm } from "@/components/mantencion/supplier-form";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { updateRequestStatus, createWorkRequirement } from "../actions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { resizeImage } from "@/lib/utils/image-utils";
import { useAllSuppliers } from "@/lib/hooks/mantencion/use-suppliers";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { Switch } from "@/components/ui/switch";

interface ConsolidadoClientProps {
  initialData: any[];
  workRequirements: any[];
  catalogs: {
    statuses: any[];
    installations: any[];
    wrStatuses: any[];
    suppliers: any[];
  };
}

interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

const TERCERIZAR_NAME = "Tercerizar";
const MAX_HEIGHT_PX = 1080;

export default function ConsolidadoClient({ initialData, workRequirements, catalogs }: ConsolidadoClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [wrs, setWrs] = useState(workRequirements);
  const [activeTab, setActiveTab] = useState("requests");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Sincronizar proveedores con TanStack Query para reflejar cambios externos (Configuración)
  const { data: localSuppliers = catalogs.suppliers } = useAllSuppliers(catalogs.suppliers);

  const [isPending, startTransition] = useTransition();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Custom Toggles
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOnlyWithoutWr, setShowOnlyWithoutWr] = useState(false);

  /* ─── Modal Tercerización ─── */
  const [tercModal, setTercModal] = useState(false);
  const [tercRequestId, setTercRequestId] = useState("");
  const [tercStatusId, setTercStatusId] = useState("");
  const [tercReason, setTercReason] = useState("");
  const [tercPreviews, setTercPreviews] = useState<PreviewFile[]>([]);
  const [tercResizing, setTercResizing] = useState(false);
  const [tercUploading, setTercUploading] = useState(false);
  const tercFileRef = useRef<HTMLInputElement>(null);

  /* ─── Modal Requerimiento de Trabajo (RT) ─── */
  const [wrModal, setWrModal] = useState(false);
  const [wrProviderId, setWrProviderId] = useState("");
  const [wrTitle, setWrTitle] = useState("");
  const [wrDescription, setWrDescription] = useState("");
  const [wrPreviews, setWrPreviews] = useState<PreviewFile[]>([]);
  const [wrResizing, setWrResizing] = useState(false);
  const [wrUploading, setWrUploading] = useState(false);
  const wrFileRef = useRef<HTMLInputElement>(null);

  // Estadísticas rápidas
  const [wrAddProviderOpen, setWrAddProviderOpen] = useState(false);
  const [wrAddSupplierModal, setWrAddSupplierModal] = useState(false);

  const selectedSupplier = useMemo(() => {
    return localSuppliers.find((s) => s.id === wrProviderId);
  }, [localSuppliers, wrProviderId]);

  const selectedRequests = useMemo(() => {
    const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    return data.filter((r) => selectedIds.includes(r.id));
  }, [data, rowSelection]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      pending: data.filter((r) => r.status.name === "SOLICITADO" || r.status.name === "PENDIENTE").length,
      inProcess: data.filter((r) => ["APROBADO", "EN_PROCESO", "TERCERIZAR"].includes(r.status.name)).length,
      finished: data.filter((r) => r.status.name === "FINALIZADO").length,
    };
  }, [data]);

  const typeOptions = useMemo(() => {
    const types = new Set(data.map((item) => item.type.name));
    return Array.from(types).map((t) => ({ label: t, value: t }));
  }, [data]);

  const systemOptions = useMemo(() => {
    const systems = new Set(data.map((item) => item.equipment.system?.name).filter(Boolean));
    return Array.from(systems).map((s) => ({ label: s, value: s }));
  }, [data]);

  const columns = useMemo(
    () => [
      {
        id: "select",
        size: 45,
        header: ({ table }: any) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }: any) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "actions",
        header: "Acciones",
        size: 70,
        enableHiding: false,
        cell: ({ row }: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 border shadow-none bg-slate-50 dark:bg-slate-800">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] rounded-md">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/mantencion/gestion/${row.original.id}`} className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" /> Ver Ficha Técnica
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.original.id, row.original.statusId, row.original.status.name)} className="cursor-pointer">
                <RefreshCw className="mr-2 h-4 w-4" /> Actualizar Estado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500 cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" /> Anular Solicitud
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
      {
        accessorKey: "folio",
        header: "Folio",
        size: 80,
        enableHiding: false,
        cell: ({ row }: any) => (
          <Link href={`/mantencion/gestion/${row.original.id}`} className="font-mono font-bold text-blue-600 hover:underline">
            #{row.original.folioPrefix}-{row.getValue("folio")}
          </Link>
        ),
      },
      {
        id: "equipment_name",
        header: "Nombre del Equipo",
        size: 280,
        accessorFn: (row: any) => row.equipment.name,
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="font-semibold text-sm line-clamp-1">{row.original.equipment.name}</span>
            {row.original.equipment.brand && <span className="text-[10px] text-muted-foreground uppercase">{row.original.equipment.brand}</span>}
          </div>
        ),
      },
      {
        id: "system_name",
        header: "Sistema",
        size: 130,
        accessorFn: (row: any) => row.equipment.system?.name,
        cell: ({ row }: any) => <span className="text-xs font-medium">{row.original.equipment.system?.name || "N/A"}</span>,
      },
      {
        id: "wr_folio",
        header: "Folio RT",
        size: 100,
        accessorFn: (row: any) => row.mntWorkRequirementRelations?.[0]?.workRequirement?.folio,
        cell: ({ row }: any) => {
          const wr = row.original.mntWorkRequirementRelations?.[0]?.workRequirement;
          if (!wr) return <span className="text-muted-foreground italic text-xs">N/A</span>;
          return (
            <Link href={`/mantencion/trabajo/${wr.id}`} className="hover:opacity-80 transition-opacity">
              <Badge variant="secondary" className="font-mono bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 cursor-pointer">
                {wr.folio}
              </Badge>
            </Link>
          );
        },
      },
      {
        id: "wr_provider",
        header: "Proveedor RT",
        size: 220,
        accessorFn: (row: any) => row.mntWorkRequirementRelations?.[0]?.workRequirement?.provider?.legalName || row.mntWorkRequirementRelations?.[0]?.workRequirement?.provider?.fantasyName,
        cell: ({ row }: any) => {
          const provider = row.original.mntWorkRequirementRelations?.[0]?.workRequirement?.provider;
          if (!provider) return <span className="text-muted-foreground italic text-xs">N/A</span>;
          const name = provider.legalName || provider.fantasyName;
          return (
            <span className="text-[11px] font-bold uppercase truncate max-w-[180px] block" title={name}>
              {name}
            </span>
          );
        },
      },
      {
        id: "applicant_name",
        header: "Solicitante",
        size: 160,
        accessorFn: (row: any) => row.applicant?.name,
        cell: ({ row }: any) => <span className="text-xs">{row.original.applicant?.name || "N/A"}</span>,
      },
      {
        id: "type_name",
        header: "Tipo de Requerimiento",
        size: 180,
        accessorFn: (row: any) => row.type.name,
        cell: ({ row }: any) => <span className="text-[11px] uppercase font-medium">{row.original.type.name}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Fecha de Ingreso",
        size: 140,
        cell: ({ row }: any) => <span className="text-[11px] tabular-nums text-slate-500">{format(new Date(row.original.createdAt), "dd/MM/yyyy, HH:mm")}</span>,
      },
      {
        id: "installation_name",
        header: "Instalación",
        size: 150,
        accessorFn: (row: any) => row.installation.name,
        cell: ({ row }: any) => <span className="text-xs font-semibold">{row.original.installation.name}</span>,
      },
      {
        id: "status_name",
        header: "Estado",
        size: 140,
        accessorFn: (row: any) => row.status.name,
        cell: ({ row }: any) => {
          const status = row.original.status;
          return (
            <Badge
              variant="outline"
              style={{
                backgroundColor: status.colorHex ? `${status.colorHex}15` : undefined,
                color: status.colorHex || undefined,
                borderColor: status.colorHex ? `${status.colorHex}40` : undefined,
              }}
              className="font-bold border uppercase text-[10px] tracking-wider rounded-md h-6 px-2"
            >
              {status.name}
            </Badge>
          );
        },
      },
      {
        id: "days",
        header: "Días Req.",
        size: 90,
        cell: ({ row }: any) => {
          const start = new Date(row.original.createdAt);
          const end = row.original.resolvedAt ? new Date(row.original.resolvedAt) : new Date();
          const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
          return <span className="text-xs font-bold font-mono">{diffDays}</span>;
        },
      },
      {
        id: "solution_date",
        header: "F. Solución",
        size: 110,
        cell: ({ row }: any) => {
          if (!row.original.resolvedAt) return <span className="text-muted-foreground italic text-[11px]">N/A</span>;
          return <span className="text-[11px] font-mono">{format(new Date(row.original.resolvedAt), "dd/MM/yy")}</span>;
        },
      },
    ],
    [catalogs.statuses],
  );

  // Columnas de la tabla de Requerimientos de Trabajo (RT)
  const columnsWR = useMemo(
    () => [
      {
        accessorKey: "folio",
        header: "Folio RT",
        cell: ({ row }: any) => (
          <Link href={`/mantencion/trabajo/${row.original.id}`} className="font-mono font-bold text-blue-600 hover:underline">
            {row.getValue("folio")}
          </Link>
        ),
      },
      {
        accessorKey: "provider.legalName",
        header: "Proveedor",
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{row.original.provider.legalName || row.original.provider.fantasyName}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{row.original.provider.rut}</span>
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Título",
        cell: ({ row }: any) => <span className="text-sm line-clamp-1 max-w-[200px]">{row.getValue("title")}</span>,
      },
      {
        accessorKey: "status.name",
        header: "Estado",
        cell: ({ row }: any) => {
          const s = row.original.status;
          return (
            <Badge variant="outline" style={{ backgroundColor: `${s.colorHex}15`, color: s.colorHex, borderColor: `${s.colorHex}40` }} className="font-black uppercase text-[10px]">
              {s.name}
            </Badge>
          );
        },
      },
      {
        accessorKey: "ocNumber",
        header: "N° OC",
        cell: ({ row }: any) => <span className="text-xs">{row.getValue("ocNumber") || "S/O"}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Creada",
        cell: ({ row }: any) => (
          <div className="flex flex-col text-[11px]">
            <span className="font-medium">{format(new Date(row.original.createdAt), "dd/MM/yyyy")}</span>
            <span className="text-muted-foreground">{format(new Date(row.original.createdAt), "HH:mm")}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }: any) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/mantencion/trabajo/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Toggle: Mostrar completados y cancelados
      const isCompletedOrCancelled = ["FINALIZADO", "CANCELADO"].includes(item.status.name);
      if (!showCompleted && isCompletedOrCancelled) return false;

      // Toggle: Solo sin Solicitud de Trabajo (WR)
      const hasWr = item.mntWorkRequirementRelations && item.mntWorkRequirementRelations.length > 0;
      if (showOnlyWithoutWr && hasWr) return false;

      return true;
    });
  }, [data, showCompleted, showOnlyWithoutWr]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const tableWR = useReactTable({
    data: wrs,
    columns: columnsWR,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pendingData = useMemo(() => {
    return data.filter((item) => item.status.name === "SOLICITADO" || item.status.name === "PENDIENTE");
  }, [data]);

  const tablePending = useReactTable({
    data: pendingData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleStatusUpdate = async (id: string, statusId: string, statusName: string) => {
    // Si el estado es Tercerizar → abrir modal
    if (statusName === TERCERIZAR_NAME) {
      setTercRequestId(id);
      setTercStatusId(statusId);
      setTercReason("");
      setTercPreviews([]);
      setTercModal(true);
      return;
    }

    startTransition(async () => {
      const result = await updateRequestStatus(id, statusId);
      if (result.success) {
        toast.success(`Estado actualizado a ${statusName}`);
        // Actualizamos localmente para feedback inmediato
        setData((prev) => prev.map((r) => (r.id === id ? { ...r, statusId, status: catalogs.statuses.find((s) => s.id === statusId) } : r)));
      } else {
        toast.error(`Error al actualizar: ${result.error}`);
      }
    });
  };

  /* ─── Confirmar Tercerización ─── */
  const handleConfirmarTercerizar = () => {
    if (!tercReason.trim()) {
      toast.error("La justificación es obligatoria");
      return;
    }
    startTransition(async () => {
      let imageUrls: string[] = [];
      if (tercPreviews.length > 0) {
        setTercUploading(true);
        try {
          const fd = new FormData();
          tercPreviews.forEach((p) => fd.append("files", p.file));
          const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
          const result = await res.json();
          if (res.ok) imageUrls = result.urls;
        } catch {
          toast.error("Error al subir imágenes");
        } finally {
          setTercUploading(false);
        }
      }
      const res = await updateRequestStatus(tercRequestId, tercStatusId, undefined, tercReason, imageUrls);
      if (res.success) {
        toast.success("Requerimiento tercerizado");
        setTercModal(false);
        // Actualizamos localmente
        setData((prev) => prev.map((r) => (r.id === tercRequestId ? { ...r, statusId: tercStatusId, status: catalogs.statuses.find((s) => s.id === tercStatusId) } : r)));
      } else {
        toast.error("Error al tercerizar");
      }
    });
  };

  const handleTercFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setTercResizing(true);
    try {
      const newP: PreviewFile[] = [];
      for (const file of Array.from(e.target.files)) {
        const processed = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        newP.push({
          id: `${Date.now()}-${Math.random()}`,
          file: processed,
          previewUrl: URL.createObjectURL(processed),
          name: file.name,
          sizeKb: Math.round(processed.size / 1024),
        });
      }
      setTercPreviews((p) => [...p, ...newP]);
    } catch {
      toast.error("Error al procesar archivo");
    } finally {
      setTercResizing(false);
      if (tercFileRef.current) tercFileRef.current.value = "";
    }
  };

  /* ─── Crear Requerimiento de Trabajo (WR) ─── */
  const handleCreateWorkRequirementAction = (ids: string[]) => {
    if (ids.length === 0) {
      toast.error("Seleccione al menos un requerimiento");
      return;
    }
    setWrProviderId("");
    setWrTitle("");
    setWrDescription("");
    setWrPreviews([]);
    setWrModal(true);
  };

  const handleConfirmCreateWR = () => {
    if (!wrProviderId || !wrTitle) {
      toast.error("Proveedor y Título son obligatorios");
      return;
    }

    const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    if (selectedIds.length === 0) {
      toast.error("No hay requerimientos seleccionados");
      return;
    }

    startTransition(async () => {
      let imageUrls: string[] = [];
      if (wrPreviews.length > 0) {
        setWrUploading(true);
        try {
          const fd = new FormData();
          wrPreviews.forEach((p) => fd.append("files", p.file));
          const res = await fetch("/api/mantencion/upload", { method: "POST", body: fd });
          const result = await res.json();
          if (res.ok) imageUrls = result.urls;
        } catch {
          toast.error("Error al subir imágenes");
        } finally {
          setWrUploading(false);
        }
      }

      const res = await createWorkRequirement({
        providerId: wrProviderId,
        title: wrTitle,
        description: wrDescription,
        requestIds: selectedIds,
      });

      if (res.success) {
        toast.success(`Requerimiento de Trabajo creado: ${res.wr?.folio}`);
        setWrModal(false);
        setRowSelection({});
        setActiveTab("wrs");
        window.location.reload();
      } else {
        toast.error(`Error: ${res.error}`);
      }
    });
  };

  const handleWRFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setWrResizing(true);
    try {
      const newP: PreviewFile[] = [];
      for (const file of Array.from(e.target.files)) {
        const processed = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        newP.push({
          id: `${Date.now()}-${Math.random()}`,
          file: processed,
          previewUrl: URL.createObjectURL(processed),
          name: file.name,
          sizeKb: Math.round(processed.size / 1024),
        });
      }
      setWrPreviews((p) => [...p, ...newP]);
    } catch {
      toast.error("Error al procesar archivo");
    } finally {
      setWrResizing(false);
      if (wrFileRef.current) wrFileRef.current.value = "";
    }
  };

  const handleExport = async () => {
    const activeData =
      activeTab === "requests"
        ? table.getFilteredSelectedRowModel().rows.map((r) => r.original)
        : activeTab === "wrs"
          ? tableWR.getCoreRowModel().rows.map((r) => r.original)
          : tablePending.getCoreRowModel().rows.map((r) => r.original);

    // Si no hay filas seleccionadas en solicitudes, exportamos todas las filtradas
    const dataToExport = activeTab === "requests" && activeData.length === 0 ? table.getFilteredRowModel().rows.map((r) => r.original) : activeData;

    if (dataToExport.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/v1/mantencion/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab === "requests" ? "requests" : "wrs",
          data: dataToExport,
        }),
      });

      if (!response.ok) throw new Error("Error al exportar");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${activeTab}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Excel generado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al generar el archivo Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats Cards */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            Consolidado de Mantenimiento
          </h1>
          <p className="text-muted-foreground">Seguimiento maestro de todos los requerimientos y estados operativos.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Requerimientos" value={stats.total} icon={<FileText className="h-5 w-5" />} color="text-slate-600" />
          <StatCard label="Por Aprobar" value={stats.pending} icon={<Clock className="h-5 w-5" />} color="text-amber-500" bgColor="bg-amber-100/50" />
          <StatCard label="En Gestión" value={stats.inProcess} icon={<Wrench className="h-5 w-5" />} color="text-blue-500" bgColor="bg-blue-100/50" />
          <StatCard label="Finalizados" value={stats.finished} icon={<CheckCircle2 className="h-5 w-5" />} color="text-emerald-500" bgColor="bg-emerald-100/50" />
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="requests" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="bg-white dark:bg-slate-900 border border-border/60 p-1 rounded-md h-12 shadow-sm">
            <TabsTrigger value="requests" className="rounded-sm px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold transition-all gap-2 h-10">
              <Boxes className="h-4 w-4" /> Solicitudes de Mantención
            </TabsTrigger>
            <TabsTrigger value="wrs" className="rounded-sm px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold transition-all gap-2 h-10">
              <ClipboardList className="h-4 w-4" /> Requerimiento de Trabajo
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-sm px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold transition-all gap-2 h-10">
              <ShieldCheck className="h-4 w-4" /> Por Aprobar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- PESTAÑA 1: SOLICITUDES --- */}
        <TabsContent value="requests" className="space-y-4 focus-visible:outline-none">
          <Card className="rounded-md border-none shadow-sm bg-white dark:bg-slate-900 border-border overflow-visible">
            <CardContent className="p-4 space-y-4">
              {/* Header con Toggles */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-50 dark:border-slate-800">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Consolidado de Solicitudes</h2>
                  <p className="text-[11px] text-muted-foreground font-medium">Listado maestro de requerimientos operacionales.</p>
                </div>
                <div className="flex flex-col gap-3 items-end">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completados y cancelados</span>
                    <Switch checked={showCompleted} onCheckedChange={setShowCompleted} className="scale-75 origin-right" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sin Solicitud de Trabajo</span>
                    <Switch checked={showOnlyWithoutWr} onCheckedChange={setShowOnlyWithoutWr} className="scale-75 origin-right" />
                  </div>
                </div>
              </div>

              {/* Toolbar: Buscar + Filtros Facetados */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative w-full lg:w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nombre de equipo..."
                      className="pl-10 h-10 border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50 dark:bg-slate-800/20 text-sm"
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                  </div>

                  {table.getColumn("type_name") && <DataTableFacetedFilter column={table.getColumn("type_name")} title="Tipo de Req." options={typeOptions} />}
                  {table.getColumn("system_name") && <DataTableFacetedFilter column={table.getColumn("system_name")} title="Sistema" options={systemOptions} />}
                  {table.getColumn("installation_name") && (
                    <DataTableFacetedFilter column={table.getColumn("installation_name")} title="Instalación" options={catalogs.installations.map((i) => ({ label: i.name, value: i.name }))} />
                  )}
                  {table.getColumn("status_name") && (
                    <DataTableFacetedFilter column={table.getColumn("status_name")} title="Estado" options={catalogs.statuses.map((s) => ({ label: s.name, value: s.name }))} />
                  )}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm relative">
                {isPending && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-950/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
                <ScrollArea className="w-full" scrollHideDelay={0}>
                  <Table className="min-w-[1700px] table-fixed w-full border-separate border-spacing-0">
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/80 sticky top-0 z-20">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-border/60">
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              style={{ width: `${header.getSize()}px`, minWidth: `${header.getSize()}px` }}
                              className="h-10 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 whitespace-nowrap border-b"
                            >
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="h-12 hover:bg-slate-50/30 dark:hover:bg-slate-800/40 border-b-border/40 transition-colors">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                style={{ width: `${cell.column.getSize()}px`, minWidth: `${cell.column.getSize()}px` }}
                                className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-b text-xs"
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={table.getAllColumns().length} className="h-48 text-center text-muted-foreground italic border-b">
                            No se encontraron requerimientos para los filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" className="h-2.5 bg-slate-200 dark:bg-slate-800 mt-2" />
                </ScrollArea>
              </div>

              {/* BARRA INFERIOR DE ACCIONES Y PAGINACION */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[12px] font-medium text-muted-foreground mr-2">
                    {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} seleccionadas. (Total: {data.length})
                  </div>
                  <Button variant="outline" size="sm" onClick={() => table.toggleAllRowsSelected(true)} className="h-9 rounded-md px-4 text-xs font-bold">
                    Seleccionar Todo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => table.toggleAllRowsSelected(false)} className="h-9 rounded-md px-4 text-xs font-bold text-red-500">
                    Deseleccionar
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 rounded-md px-4 text-xs font-bold gap-2 border-dashed ml-2" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    Exportar a Excel
                  </Button>

                  {table.getFilteredSelectedRowModel().rows.length > 0 && (
                    <Button
                      onClick={() => handleCreateWorkRequirementAction(Object.keys(rowSelection))}
                      className="bg-[#283c7f] hover:bg-blue-800 text-white font-black rounded-md gap-2 h-10 px-6 shadow-lg shadow-blue-900/10 animate-in zoom-in-95 duration-300"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Crear requerimiento de trabajo
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-6 self-end lg:self-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filas:</span>
                    <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
                      <SelectTrigger className="h-9 w-[70px] rounded-md text-xs font-bold">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top" className="rounded-md">
                        {[10, 20, 30, 40, 50].map((ps) => (
                          <SelectItem key={ps} value={`${ps}`}>
                            {ps}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA 2: REQUERIMIENTOS DE TRABAJO --- */}
        <TabsContent value="wrs" className="focus-visible:outline-none">
          <div className="rounded-md border bg-white dark:bg-slate-900 shadow-md overflow-hidden relative">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                {tableWR.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-border/60">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-14 text-[11px] font-bold uppercase tracking-widest text-slate-500 px-4">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {tableWR.getRowModel().rows?.length ? (
                  tableWR.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b-border/40 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnsWR.length} className="h-48 text-center text-muted-foreground">
                      No hay requerimientos de trabajo registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" size="sm" className="h-9 rounded-md px-4 text-xs font-bold gap-2 border-dashed" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Exportar a Excel
            </Button>
          </div>
        </TabsContent>

        {/* --- PESTAÑA 3: POR APROBAR --- */}
        <TabsContent value="pending" className="focus-visible:outline-none">
          <div className="rounded-3xl border bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                {tablePending.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-border/60">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-14 text-[11px] font-bold uppercase tracking-widest text-slate-500 px-4">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {tablePending.getRowModel().rows?.length ? (
                  tablePending.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b-border/40 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center text-muted-foreground">
                      No hay requerimientos pendientes de aprobación.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══ MODAL CREAR REQUERIMIENTO DE TRABAJO ══ */}
      <Dialog
        open={wrModal}
        onOpenChange={(open) => {
          if (!open && !isPending && !wrUploading) setWrModal(false);
        }}
      >
        <DialogContent className="w-[95vw] sm:w-[80vw] sm:max-w-[80vw] max-h-[85vh] flex flex-col rounded-md p-0 overflow-hidden border-none shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="p-4 pb-1 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-800 dark:text-white">Crear requerimiento de trabajo</DialogTitle>
                <p className="text-[13px] text-muted-foreground mt-0.5">Rellena los campos para generar la orden externa.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pt-0 px-4 space-y-2 custom-scrollbar">
            {selectedRequests.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-blue-500" /> Solicitudes vinculadas ({selectedRequests.length})
                </Label>
                <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                  {selectedRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 shadow-sm">
                      <span className="font-mono font-bold text-blue-600 text-xs shrink-0">
                        #{req.folioPrefix}-{req.folio}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">({format(new Date(req.createdAt), "dd/MM/yy")})</span>
                      <span className="text-[11px] font-medium truncate max-w-[120px] text-slate-700 dark:text-slate-300" title={req.equipment?.name}>
                        {req.equipment?.name || "Sin Equipo"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4 lg:col-span-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    Proveedor <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 w-full">
                    <Popover open={wrAddProviderOpen} onOpenChange={setWrAddProviderOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={wrAddProviderOpen} className="flex-1 h-12 rounded-md justify-between border-slate-200 font-normal py-0 px-4">
                          {selectedSupplier ? (
                            <div className="flex flex-col items-start leading-tight">
                              <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[400px]">{selectedSupplier.legalName || selectedSupplier.fantasyName}</span>
                              <span className="text-[10px] uppercase text-muted-foreground">{selectedSupplier.rut}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Buscar proveedor por RUT, Razón Social, Giro...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[500px]" align="start" onWheel={(e) => e.stopPropagation()}>
                        <Command className="rounded-md border shadow-md">
                          <CommandInput placeholder="Filtrar por RUT, Razón Social, Giro..." className="h-12" />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                            <CommandGroup heading="Maestro de Proveedores">
                              {localSuppliers.map((sup) => (
                                <CommandItem
                                  key={sup.id}
                                  value={`${sup.rut} ${sup.legalName} ${sup.fantasyName} ${sup.businessLine}`}
                                  onSelect={() => {
                                    setWrProviderId(sup.id);
                                    setWrAddProviderOpen(false);
                                  }}
                                  className="flex flex-col items-start py-3 px-4 cursor-pointer gap-1 border-b border-slate-50 last:border-0"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{sup.legalName || sup.fantasyName}</span>
                                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm text-slate-500">{sup.rut}</span>
                                  </div>
                                  {sup.businessLine && <span className="text-[10px] text-muted-foreground uppercase leading-none">{sup.businessLine}</span>}
                                  <Check className={cn("absolute right-4 h-4 w-4 text-blue-600", wrProviderId === sup.id ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-md group hover:border-blue-500 hover:bg-blue-50"
                      onClick={() => setWrAddSupplierModal(true)}
                      title="Registrar nuevo proveedor"
                    >
                      <Plus className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input placeholder="Título de la orden de trabajo..." className="h-12 rounded-md text-sm" value={wrTitle} onChange={(e) => setWrTitle(e.target.value)} />
                </div>

                <div>
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Descripción</Label>
                  <Textarea
                    placeholder="Detalles adicionales e instrucciones para el proveedor..."
                    className="rounded-md text-sm min-h-[120px] resize-none"
                    value={wrDescription}
                    onChange={(e) => setWrDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 block">Adjuntos / Cotizaciones</Label>
                <div className="grid grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                  {wrPreviews.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-border group">
                      <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setWrPreviews((prev) => prev.filter((x) => x.id !== p.id))}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-md text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => wrFileRef.current?.click()}
                    disabled={wrResizing}
                    className="aspect-square flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all disabled:opacity-50"
                  >
                    {wrResizing ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <Paperclip className="h-5 w-5 text-slate-400" />}
                    <span className="text-[10px] font-bold text-slate-500">Subir</span>
                  </button>
                </div>
                <input ref={wrFileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleWRFiles} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex gap-3 border-t shrink-0">
            <Button variant="outline" className="flex-1 h-12 rounded-md dark:text-white" onClick={() => setWrModal(false)} disabled={isPending || wrUploading}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button
              className="flex-1 h-12 rounded-md bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-black gap-2 shadow-lg"
              onClick={handleConfirmCreateWR}
              disabled={!wrProviderId || !wrTitle || isPending || wrUploading || wrResizing}
            >
              {isPending || wrUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Crear requerimiento de trabajo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle Técnico Eliminado - Ahora es página individual */}

      {/* ══ MODAL TERCERIZACIÓN ══ */}
      <Dialog
        open={tercModal}
        onOpenChange={(open) => {
          if (!open && !isPending) setTercModal(false);
        }}
      >
        <DialogContent className="max-w-lg rounded-md text-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-800 dark:text-white">Justificación de Tercerización</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Este cambio de estado requiere justificación obligatoria.</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1">
                Justificación <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Indique el motivo por el que se terceriza este requerimiento..."
                value={tercReason}
                onChange={(e) => setTercReason(e.target.value)}
                className="min-h-[100px] rounded-md text-sm resize-none w-full"
                autoFocus
              />
              {!tercReason.trim() && <p className="text-[11px] text-red-500 mt-1">Campo obligatorio</p>}
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5 block">
                Documentos / Fotos <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
              </label>
              {tercPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {tercPreviews.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-border">
                      <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setTercPreviews((prev) => prev.filter((x) => x.id !== p.id))}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-md text-white shadow-md"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => tercFileRef.current?.click()}
                disabled={tercResizing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border-2 border-dashed border-border text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/40 transition-all disabled:opacity-50"
              >
                {tercResizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {tercPreviews.length > 0 ? `${tercPreviews.length} archivo(s) · Agregar más` : "Adjuntar respaldo"}
              </button>
              <input ref={tercFileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleTercFiles} />
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-md dark:text-white" onClick={() => setTercModal(false)} disabled={isPending || tercUploading}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button
              className="flex-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
              onClick={handleConfirmarTercerizar}
              disabled={!tercReason.trim() || isPending || tercUploading || tercResizing}
            >
              {isPending || tercUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL REGISTRO DE PROVEEDORES ══ */}
      <Dialog
        open={wrAddSupplierModal}
        onOpenChange={(open) => {
          if (!open && !isPending) setWrAddSupplierModal(false);
        }}
      >
        <DialogContent className="w-[95vw] sm:w-[80vw] sm:max-w-[80vw] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-md p-8 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">Registrar nuevo proveedor</DialogTitle>
          <SupplierForm
            mode="create"
            onCancel={() => setWrAddSupplierModal(false)}
            onSuccess={(newSupplier: any) => {
              setWrAddSupplierModal(false);
              toast.success("Proveedor registrado exitosamente. Se ha seleccionado automáticamente.");
              if (newSupplier) {
                setWrProviderId(newSupplier.id);
              }
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, color, bgColor = "bg-slate-100/50" }: any) {
  return (
    <Card className="rounded-md border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 group">
      <CardContent className="p-4 lg:p-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-md ${bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          <div className={`${color}`}>{icon}</div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-black tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
