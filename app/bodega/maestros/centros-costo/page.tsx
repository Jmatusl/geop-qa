"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronLeft } from "lucide-react";

import { BodegaSimpleMaster, useBodegaSimpleMasters, useCreateBodegaSimpleMaster, useUpdateBodegaSimpleMaster, useDeleteBodegaSimpleMaster } from "@/lib/hooks/bodega/use-bodega-simple-masters";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { getSimpleMasterColumns, SortDirection } from "@/components/bodega/simple-master-columns";
import { SimpleMasterForm } from "@/components/bodega/simple-master-form";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const RESOURCE = "centros-costo" as const;

// ---------------------------------------------------------------------------
// Panel de edición autónomo con fetch manual (useState + useEffect).
// Se evita useQuery para no tener race conditions con gcTime/Strict Mode.
// ---------------------------------------------------------------------------
function EditPanel({ editId, onBack, onSaved }: { editId: string; onBack: () => void; onSaved: () => void }) {
  const [item, setItem] = useState<BodegaSimpleMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const updateMutation = useUpdateBodegaSimpleMaster(RESOURCE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    setItem(null);

    fetch(`/api/v1/bodega/maestros/centros-costo/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          // La API retorna { success: true, data: {...} }
          setItem(json.data as BodegaSimpleMaster);
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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Editar Centro de Costo</h1>
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
            <p className="text-destructive">No se pudo cargar el centro de costo.</p>
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
              <SimpleMasterForm
                key={editId}
                initialData={item ?? undefined}
                isLoading={updateMutation.isPending}
                onCancel={onBack}
                onSubmit={async (data) => {
                  try {
                    await updateMutation.mutateAsync({ id: editId, data });
                    onSaved();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "No se pudo guardar el registro");
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
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700 dark:text-white">
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
export default function BodegaCentrosCostoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const editId = searchParams.get("id") || searchParams.get("edit");

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BodegaSimpleMaster | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({
    key: null,
    direction: null,
  });

  const { data: queryData, isLoading, isFetching, refetch } = useBodegaSimpleMasters(RESOURCE, search);
  const createMutation = useCreateBodegaSimpleMaster(RESOURCE);
  const deleteMutation = useDeleteBodegaSimpleMaster(RESOURCE);

  const items = queryData?.data || [];
  const meta = { total: items.length, page: 1, limit: 100, totalPages: 1 };

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

  const goEdit = (item: BodegaSimpleMaster) => {
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
      onError: (err) => {
        toast.error(err.message ?? "No se pudo eliminar el registro");
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
      <BaseMaintainer<BodegaSimpleMaster>
        title="Centros de Costo"
        description="Administra los centros de costo para clasificar movimientos e ingresos de bodega."
        addNewLabel="Centro de Costo"
        searchPlaceholder="Buscar por código o nombre..."
        getColumns={(handlers) =>
          getSimpleMasterColumns({
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
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        onSearchChange={(value) => setSearch(value)}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching}
        renderForm={(_mode, _initialData, onCancel, onSuccess) => (
          <SimpleMasterForm
            key="new"
            isLoading={createMutation.isPending}
            onCancel={onCancel}
            onSubmit={async (data) => {
              try {
                await createMutation.mutateAsync(data);
                onSuccess();
                refetch();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo crear el registro");
              }
            }}
          />
        )}
      />

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar centro de costo "${deleteTarget?.name || ""}"?`}
        description="Esta acción no se puede deshacer. Los movimientos que referencien este centro de costo no serán afectados."
      />
    </>
  );
}
