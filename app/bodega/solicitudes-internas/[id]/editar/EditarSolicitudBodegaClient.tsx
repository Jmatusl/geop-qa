"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface ArticleOption {
  id: string;
  name: string;
  code: string;
  unit: string;
}

interface ItemForm {
  articleId: string;
  quantity: string;
  observations: string;
}

interface Props {
  requestId: string;
  warehouses: WarehouseOption[];
  articles: ArticleOption[];
  initialData: {
    warehouseId: string;
    title: string;
    description: string;
    priority: string;
    requiredDate: string;
    observations: string;
    items: ItemForm[];
  };
}

export default function EditarSolicitudBodegaClient({ requestId, warehouses, articles, initialData }: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState(initialData.warehouseId);
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [priority, setPriority] = useState(initialData.priority);
  const [requiredDate, setRequiredDate] = useState(initialData.requiredDate);
  const [observations, setObservations] = useState(initialData.observations);
  const [items, setItems] = useState<ItemForm[]>(initialData.items);
  const [draftArticle, setDraftArticle] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");
  const [draftObservation, setDraftObservation] = useState("");

  const articleById = useMemo(() => new Map(articles.map((article) => [article.id, article])), [articles]);

  const addItem = () => {
    if (!draftArticle) {
      toast.error("Debes seleccionar un artículo");
      return;
    }

    const qty = Number(draftQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        articleId: draftArticle,
        quantity: String(qty),
        observations: draftObservation,
      },
    ]);

    setDraftArticle("");
    setDraftQuantity("1");
    setDraftObservation("");
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!warehouseId) {
      toast.error("Debes seleccionar una bodega");
      return;
    }

    if (title.trim().length < 5) {
      toast.error("El título debe tener al menos 5 caracteres");
      return;
    }

    if (items.length === 0) {
      toast.error("Debes agregar al menos un artículo");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        warehouseId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        requiredDate: requiredDate || undefined,
        observations: observations.trim() || null,
        items: items.map((item) => ({
          articleId: item.articleId,
          quantity: Number(item.quantity),
          observations: item.observations.trim() || null,
        })),
      };

      const response = await fetch(`/api/v1/bodega/solicitudes-internas/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error || "No se pudo actualizar la solicitud interna");
        return;
      }

      toast.success("Solicitud actualizada correctamente");
      router.push(`/bodega/solicitudes-internas/${requestId}`);
    } catch (error) {
      console.error("Error actualizando solicitud interna:", error);
      toast.error("Ocurrió un error inesperado al actualizar la solicitud");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Solicitud Interna</h1>
            <p className="text-sm text-muted-foreground">Actualiza datos y artículos de la solicitud.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-20 lg:pb-0">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bodega</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar bodega" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>{`${warehouse.code} - ${warehouse.name}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAJA">Baja</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoComplete="off" className="w-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={observations} onChange={(event) => setObservations(event.target.value)} className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha requerida</Label>
            <Input type="date" value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} className="w-full" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 lg:px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-800/80">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-tight flex items-center gap-2 italic dark:text-white">
                Artículos Incluidos
                <Badge variant="outline" className="text-[9px] py-0 bg-transparent text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-full font-bold px-2 italic">
                  {items.length} REGISTROS
                </Badge>
              </h3>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tighter italic">AGREGUE REPUESTOS Y CANTIDADES</p>
            </div>
          </div>

          <div className="p-4 lg:p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="space-y-2 lg:col-span-2">
                <Label>Artículo</Label>
                <Select value={draftArticle} onValueChange={setDraftArticle}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar artículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {articles.map((article) => (
                      <SelectItem key={article.id} value={article.id}>{`${article.code} - ${article.name}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="1" step="0.001" value={draftQuantity} onChange={(event) => setDraftQuantity(event.target.value)} className="w-full" autoComplete="off" />
              </div>

              <div className="space-y-2">
                <Label>Observación item</Label>
                <Input value={draftObservation} onChange={(event) => setDraftObservation(event.target.value)} className="w-full" autoComplete="off" />
              </div>
            </div>

            <Button type="button" variant="outline" onClick={addItem} className="w-full lg:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Agregar artículo
            </Button>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-950/50">
                  <TableRow className="border-b dark:border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">Artículo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">Cantidad</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">Observación</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-20">
                        Sin artículos agregados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      const article = articleById.get(item.articleId);
                      return (
                        <TableRow key={`${item.articleId}-${index}`}>
                          <TableCell className="text-sm">{article ? `${article.code} - ${article.name}` : item.articleId}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{item.quantity}</TableCell>
                          <TableCell className="text-sm">{item.observations || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 lg:static bg-white dark:bg-slate-900 border-t border-border p-3 lg:p-0">
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Volver
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#283c7f] text-white hover:bg-[#24366f]">
              <Save className="h-4 w-4 mr-2 text-white" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
