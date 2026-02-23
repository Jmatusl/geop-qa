"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCertificationMasters, useCreateResolution, useUpdateResolution } from "@/lib/hooks/use-certifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { addDays, addMonths, addYears, format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink, Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const resolutionSchema = z.object({
  resolutionNumber: z.string().min(1, "Requerido").toUpperCase(),
  issueDate: z.string().min(1, "Requerido"),

  // Validity (Now Header)
  validityStartDate: z.string().min(1, "Requerido"),
  durationValue: z.coerce.number().min(0, "Mínimo 0"),
  durationUnit: z.string().min(1, "Requerido"),
  validityEndDate: z.string().optional(),

  // Authorization fields (Optional)
  authorizedByName: z.string().optional(),
  authorizedByRole: z.string().optional(),
  authorizedByInstitution: z.string().optional(),
  documentUrl: z.string().url("Ingrese una URL válida").or(z.literal("")).optional(),

  certifications: z
    .array(
      z.object({
        masterId: z.string().min(1, "Seleccione certificación"),
        inscriptionNumber: z.string().min(1, "Requerido"),
        renewedFromId: z.string().optional(),
        renewedFromLabel: z.string().optional(),
      }),
    )
    .min(1, "Agregue al menos una certificación")
    .superRefine((items, ctx) => {
      const seen = new Set();
      items.forEach((item, index) => {
        if (seen.has(item.masterId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Certificación duplicada",
            path: [index, "masterId"],
          });
        }
        if (item.masterId) {
          seen.add(item.masterId);
        }
      });
    }),
});

type ResolutionFormValues = z.infer<typeof resolutionSchema>;

export function ResolutionForm({
  personId,
  onSuccess,
  defaultCertifications,
  initialData,
  resolutionId,
  initialFileUrl,
}: {
  personId: string;
  onSuccess: () => void;
  defaultCertifications?: { masterId: string; inscriptionNumber?: string; renewedFromId?: string; renewedFromLabel?: string }[];
  initialData?: ResolutionFormValues;
  resolutionId?: string;
  initialFileUrl?: string;
}) {
  const { data: masters } = useCertificationMasters();
  const { mutate: create, isPending: isCreating } = useCreateResolution();
  const { mutate: update, isPending: isUpdating } = useUpdateResolution();
  const isPending = isCreating || isUpdating;

  const [file, setFile] = useState<File | null>(null);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);

  const form = useForm<ResolutionFormValues>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: initialData || {
      resolutionNumber: "",
      issueDate: new Date().toISOString().split("T")[0],
      validityStartDate: new Date().toISOString().split("T")[0],
      durationValue: 3,
      durationUnit: "YEARS",
      validityEndDate: "",
      authorizedByName: "",
      authorizedByRole: "",
      authorizedByInstitution: "",
      documentUrl: "",
      certifications: defaultCertifications || [
        {
          masterId: "",
          inscriptionNumber: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  // Watch for header date calc
  const startDate = useWatch({ control: form.control, name: "validityStartDate" });
  const durationValue = useWatch({ control: form.control, name: "durationValue" });
  const durationUnit = useWatch({ control: form.control, name: "durationUnit" });
  const endDate = useWatch({ control: form.control, name: "validityEndDate" });

  // Flag to avoid overwriting initial load with automatic calculation
  const [isFirstMount, setIsFirstMount] = useState(true);

  useEffect(() => {
    if (startDate && durationValue !== undefined && durationValue !== null && durationUnit) {
      // Skip overwriting during mount if we have initialData
      if (isFirstMount && initialData?.validityEndDate) {
        setIsFirstMount(false);
        return;
      }

      const val = Number(durationValue);
      setIsFirstMount(false);
      if (durationUnit === "PERMANENT") {
        form.setValue("validityEndDate", "");
      } else if (val === 0) {
        form.setValue("validityEndDate", "");
      } else {
        try {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            let end: Date;
            switch (durationUnit) {
              case "DAYS":
                end = addDays(start, val);
                break;
              case "MONTHS":
                end = addMonths(start, val);
                break;
              case "YEARS":
                end = addYears(start, val);
                break;
              default:
                end = addYears(start, val);
            }
            form.setValue("validityEndDate", format(end, "yyyy-MM-dd"));
          }
        } catch (e) {}
      }
    }
  }, [startDate, durationValue, durationUnit, form]);

  useEffect(() => {
    if (endDate) {
      const date = new Date(endDate);
      if (!isNaN(date.getTime())) {
        const now = new Date();
        const isPast = date < now;
        const distance = formatDistanceToNow(date, { locale: es, addSuffix: true });
        setRemainingTime(isPast ? `Expiró ${distance}` : `Expira ${distance}`);
      } else {
        setRemainingTime(null);
      }
    } else {
      setRemainingTime(null);
    }
  }, [endDate]);

  const onSubmit = (data: ResolutionFormValues) => {
    // Validación manual de archivo para creación (si no es edición o no tiene archivo inicial)
    if (!file && !resolutionId && !initialFileUrl) {
      toast.error("Debe adjuntar el Documento de Respaldo (PDF/Imagen) para continuar.");
      return;
    }

    const formData = new FormData();
    formData.append("personId", personId);
    formData.append("resolutionNumber", data.resolutionNumber.toUpperCase());
    formData.append("issueDate", data.issueDate);
    formData.append("validityStartDate", data.validityStartDate);

    if (data.validityEndDate) {
      formData.append("validityEndDate", data.validityEndDate);
    }

    formData.append("durationValue", String(data.durationValue));
    formData.append("durationUnit", data.durationUnit);

    // Authorization
    if (data.authorizedByName) formData.append("authorizedByName", data.authorizedByName);
    if (data.authorizedByRole) formData.append("authorizedByRole", data.authorizedByRole);
    if (data.authorizedByInstitution) formData.append("authorizedByInstitution", data.authorizedByInstitution);
    if (data.documentUrl) formData.append("documentUrl", data.documentUrl);

    // Certifications (Simplified)
    formData.append("certifications", JSON.stringify(data.certifications));

    if (file) {
      formData.append("file", file);
    }

    if (resolutionId) {
      update(
        { id: resolutionId, data: formData },
        {
          onSuccess: () => onSuccess(),
        },
      );
    } else {
      create(formData, {
        onSuccess: () => onSuccess(),
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="resolutionNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resolución Exenta</FormLabel>
                <FormControl>
                  <Input placeholder="DN -" {...field} autoComplete="off" className="uppercase" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Emisión</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Validity Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 items-start">
          <FormField
            control={form.control}
            name="validityStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inicio Vigencia</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormLabel>Duración</FormLabel>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="durationValue"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="number" min="0" disabled={form.watch("durationUnit") === "PERMANENT"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationUnit"
                render={({ field }) => (
                  <FormItem className="w-[120px]">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DAYS">Días</SelectItem>
                        <SelectItem value="MONTHS">Meses</SelectItem>
                        <SelectItem value="YEARS">Años</SelectItem>
                        <SelectItem value="PERMANENT">Indefinida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <FormField
            control={form.control}
            name="validityEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Término Vigencia</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                {remainingTime && <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1">Status: {remainingTime}</p>}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2 border-t pt-4">
          <FormLabel>Documento de Respaldo (PDF/Imagen)</FormLabel>
          <div className="flex flex-col gap-2">
            {initialFileUrl && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Documento actual:</span>
                <a
                  href={`/api/v1/storage/signed-url?key=${initialFileUrl}&redirect=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium underline"
                >
                  <ExternalLink className="h-3 w-3" /> Ver Evidencia
                </a>
              </div>
            )}
            <FormControl>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
            </FormControl>
          </div>
          <p className="text-xs text-muted-foreground">Requerido para validación.</p>
        </div>

        <FormField
          control={form.control}
          name="documentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Documento de Respaldo (Enlace Externo)</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com/documento.pdf" {...field} />
              </FormControl>
              <p className="text-[10px] text-muted-foreground">Opcional: Si el documento ya está alojado en un sitio externo.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Authorization Section (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
          <FormField
            control={form.control}
            name="authorizedByName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Autorizado Por (Nombre)</FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authorizedByRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo Autorizador</FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authorizedByInstitution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institución</FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Certifications List */}
        <div className="space-y-4 border rounded-md p-4 bg-muted/10">
          <div className="flex justify-between items-center bg-muted/20 p-2 rounded">
            <h4 className="text-sm font-semibold select-none">Certificaciones Asociadas</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  masterId: "",
                  inscriptionNumber: "",
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar Item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <CertificationItemRow key={field.id} index={index} form={form} masters={masters || []} onRemove={() => remove(index)} />
            ))}
          </div>

          {form.formState.errors.certifications && <p className="text-sm text-red-500 font-medium px-2">{form.formState.errors.certifications.message}</p>}
          {form.formState.errors.certifications?.root && <p className="text-sm text-red-500">{form.formState.errors.certifications.root.message}</p>}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white min-w-[200px]">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Save className="mr-2 h-4 w-4 text-white" />}
            {isPending ? (resolutionId ? "Actualizando..." : "Registrando...") : resolutionId ? "Guardar Cambios" : "Confirmar Resolución"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Subcomponent simplified (no dates)
function CertificationItemRow({ index, form, masters, onRemove }: { index: number; form: any; masters: any[]; onRemove: () => void }) {
  return (
    <Card className="p-4 relative hover:border-slate-400 transition-colors">
      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-red-600" onClick={onRemove} title="Eliminar fila">
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-start pr-8">
        {/* 1. Certification Type - Col Span 8 */}
        <div className="lg:col-span-8">
          <FormField
            control={form.control}
            name={`certifications.${index}.masterId`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs flex items-center gap-2">
                  <span>Tipo de Certificación</span>
                  {form.getValues(`certifications.${index}.renewedFromId`) && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      Renueva: {form.getValues(`certifications.${index}.renewedFromLabel`) || "Anterior"}
                    </span>
                  )}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {masters.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 2. Inscription Number - Col Span 4 */}
        <div className="lg:col-span-4">
          <FormField
            control={form.control}
            name={`certifications.${index}.inscriptionNumber`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">N° Inscripción</FormLabel>
                <FormControl>
                  <Input placeholder="12345" {...field} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Card>
  );
}
