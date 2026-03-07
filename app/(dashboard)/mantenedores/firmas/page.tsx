"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSignatures, useDeleteSignature, Signature, useSignature } from "@/lib/hooks/use-signatures";
import { getSignaturesColumns, SortDirection } from "./columns";
import { SignatureForm } from "@/components/maintainer/signature-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white dark:text-white">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Componente EditPanel Autónomo ──────────────────────────────────────────────
function EditPanel({ editId, onBack, onSaved }: { editId: string; onBack: () => void; onSaved: () => void }) {
  const [item, setItem] = useState<Signature | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    setItem(null);

    fetch(`/api/v1/signatures/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar la firma");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setItem(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Editar Firma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Modifique los campos de la firma digital.</p>
        </div>
      </div>

      {loading && (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
        </div>
      )}
      {fetchError && !loading && <p className="text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">No se pudo cargar la firma solicitada.</p>}
      {!fetchError && !loading && <SignatureForm key={editId} mode="edit" initialData={item || undefined} onCancel={onBack} onSuccess={onSaved} />}
    </div>
  );
}

// ── Página Principal ────────────────────────────────────────────────────────
export default function SignaturesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });
  const [deleteTarget, setDeleteTarget] = useState<Signature | null>(null);

  const { data: items = [], isLoading, isFetching, refetch } = useSignatures(search);
  const { mutate: deleteItem } = useDeleteSignature();

  const goBackAndRefresh = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.replace(`?${params.toString()}`);
    refetch();
  };

  // ── Vista de Edición (Ruta por query param)
  if (editId) {
    return (
      <div className="w-full">
        <EditPanel
          editId={editId}
          onBack={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("edit");
            router.replace(`?${params.toString()}`);
          }}
          onSaved={goBackAndRefresh}
        />
      </div>
    );
  }

  // ── Vista de Tabla + Creación (BaseMaintainer maneja creación internamente)
  const sortedItems = [...items].sort((a: Signature, b: Signature) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    const { key, direction } = sortConfig;
    let valA: any = "";
    let valB: any = "";

    if (key === "name") {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (key === "isActive") {
      valA = a.isActive ? 1 : 0;
      valB = b.isActive ? 1 : 0;
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

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

  const checkDelete = () => {
    if (!deleteTarget) return;
    deleteItem(deleteTarget.id, {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
        toast.success("Firma eliminada exitosamente");
      },
      onError: (err: any) => {
        toast.error(err.message || "Error al eliminar");
      },
    });
  };

  return (
    <div className="w-full">
      <BaseMaintainer<Signature>
        title="Mantenedor de Firmas"
        description="Gestione las firmas digitales globales del sistema."
        addNewLabel="Nueva Firma"
        searchPlaceholder="Buscar por nombre..."
        getColumns={(handlers) =>
          getSignaturesColumns({
            ...handlers,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={setDeleteTarget}
        data={sortedItems}
        isLoading={isLoading}
        meta={{
          total: sortedItems.length,
          page: 1,
          limit: sortedItems.length,
          totalPages: 1,
        }}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onSearchChange={setSearch}
        onPreEdit={(item) => {
          // PreEdit inyecta el param en la URL y causa un re-render que levanta EditPanel
          const params = new URLSearchParams(searchParams.toString());
          params.set("edit", item.id);
          router.replace(`?${params.toString()}`);
        }}
        renderForm={(mode, initialData, onCancel, onSuccess) => (
          // El modo "create" lo maneja internamente el BaseMaintainer.
          // Edit nunca se debe alcanzar aquí porque el render condicional levanta EditPanel antes.
          <SignatureForm
            key="create-form"
            mode="create"
            initialData={undefined}
            onCancel={onCancel}
            onSuccess={() => {
              refetch();
              onSuccess();
            }}
          />
        )}
      />

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={checkDelete}
        title={`¿Eliminar firma ${deleteTarget?.name}?`}
        description="Esta acción eliminará permitivamente la firma del sistema."
      />
    </div>
  );
}
