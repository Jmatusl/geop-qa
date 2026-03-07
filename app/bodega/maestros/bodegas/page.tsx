"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronLeft } from "lucide-react";

import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { WarehouseForm } from "@/components/bodega/warehouse-form";
import { BodegaWarehouse, useBodegaWarehouses, useCreateBodegaWarehouse, useUpdateBodegaWarehouse, useDeleteBodegaWarehouse } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { getWarehouseColumns, SortDirection } from "./columns";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Panel de edición autónomo con fetch manual (useState + useEffect).
// Se evita useQuery para no tener race conditions con gcTime/Strict Mode.
// ---------------------------------------------------------------------------
function EditPanel({ editId, onBack, onSaved }: { editId: string; onBack: () => void; onSaved: () => void }) {
  const [item, setItem] = useState<BodegaWarehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const updateMutation = useUpdateBodegaWarehouse();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    setItem(null);

    fetch(`/api/v1/bodega/bodegas/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar");
        return res.json() as Promise<BodegaWarehouse>;
      })
      .then((data) => {
        if (!cancelled) {
          setItem(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editId]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-accent rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Editar Bodega</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete los campos requeridos para el registro.</p>
        </div>
      </div>

      <div className="w-full">
        {loading && (
          <div className="flex h-[300px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {fetchError && !loading && (
          <div className="flex h-[300px] w-full items-center justify-center">
            <p className="text-destructive">No se pudo cargar la bodega.</p>
          </div>
        )}

        {/* El form se monta de inmediato; el useEffect interno con reset() puebla los campos */}
        {!fetchError && (
          <>
            {loading && (
              <div className="flex h-[300px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && (
              <WarehouseForm
                key={editId}
                initialData={item ?? undefined}
                isLoading={updateMutation.isPending}
                onCancel={onBack}
                onSubmit={async (data) => {
                  try {
                    await updateMutation.mutateAsync({ id: editId, ...data });
                    onSaved();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "No se pudo guardar la bodega");
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diálogo de confirmación de eliminación
// ---------------------------------------------------------------------------
function DeleteAlertDialog({ open, onOpenChange, onConfirm, title, description }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; title: string; description: string }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="dark:text-white">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function BodegaBodegasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const editId = searchParams.get("id") || searchParams.get("edit");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BodegaWarehouse | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({
    key: null,
    direction: null,
  });

  const { data: configData } = useBodegaConfig();
  // La lista solo se necesita en modo tabla
  const { data: queryData, isLoading, isFetching, refetch } = useBodegaWarehouses(page, pageSize, search);
  const createMutation = useCreateBodegaWarehouse();
  const deleteMutation = useDeleteBodegaWarehouse();

  const configGeneral = (configData?.BODEGA_GENERAL_CONFIG ?? {}) as Record<string, unknown>;
  const ocultarTransito = !!configGeneral.ocultar_transito;

  const rawItems = queryData?.data || [];
  const items = useMemo(() => {
    if (ocultarTransito) return rawItems.filter((w: BodegaWarehouse) => w.code !== "TRANSITO");
    return rawItems;
  }, [rawItems, ocultarTransito]);

  const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;
    return [...items].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";
      switch (key) {
        case "code":
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "location":
          valA = (a.location || "").toLowerCase();
          valB = (b.location || "").toLowerCase();
          break;
        case "isActive":
          valA = a.isActive ? 1 : 0;
          valB = b.isActive ? 1 : 0;
          break;
        default:
          return 0;
      }
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        if (current.direction === "asc") return { key, direction: "desc" };
        if (current.direction === "desc") return { key: null, direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const goBack = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    params.delete("edit");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const goEdit = (item: BodegaWarehouse) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", item.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        refetch();
      },
    });
  };

  // -------------------------------------------------------------------------
  // Vista edición — independiente, con fetch manual propio
  // -------------------------------------------------------------------------
  if (editId) {
    return (
      <EditPanel
        editId={editId}
        onBack={goBack}
        onSaved={() => {
          refetch();
          goBack();
        }}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Vista tabla + crear — gestionada por BaseMaintainer
  // -------------------------------------------------------------------------
  return (
    <>
      <BaseMaintainer<BodegaWarehouse>
        title="Maestro de Bodegas"
        description="Administra bodegas físicas y puntos de almacenamiento"
        addNewLabel="Nueva Bodega"
        searchPlaceholder="Buscar por código, nombre o ubicación"
        getColumns={(handlers) =>
          getWarehouseColumns({
            onEdit: goEdit,
            onDelete: handlers.onDelete,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={(item) => setDeleteTarget(item)}
        data={sortedItems}
        isLoading={isLoading}
        meta={meta}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching}
        renderForm={(_mode, _initialData, onCancel, onSuccess) => (
          <WarehouseForm
            key="new"
            isLoading={createMutation.isPending}
            onCancel={onCancel}
            onSubmit={async (data) => {
              try {
                await createMutation.mutateAsync(data);
                onSuccess();
                refetch();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo crear la bodega");
              }
            }}
          />
        )}
      />

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar bodega ${deleteTarget?.name || ""}?`}
        description="Esta acción no se puede deshacer."
      />
    </>
  );
}
