"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { masterActivitySchema, type MasterActivityData } from "@/lib/validations/actividades";
import { crearMasterActivity } from "../actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save } from "lucide-react";

interface MasterActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newMaster: { id: string; name: string }) => void;
  catalogs: {
    areas: { id: string; name: string }[];
    users: { id: string; firstName: string; lastName: string }[];
  };
}

export function MasterActivityDialog({ open, onOpenChange, onSuccess, catalogs }: MasterActivityDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<MasterActivityData>({
    resolver: zodResolver(masterActivitySchema),
    defaultValues: {
      name: "",
      description: "",
      defaultAreaId: "",
      defaultApplicantUserId: "",
      defaultDescription: "",
      isActive: true,
    },
  });

  const onSubmit = (data: MasterActivityData) => {
    startTransition(async () => {
      const result = await crearMasterActivity(data);
      if (result.success) {
        toast.success("Actividad maestra creada exitosamente");
        onSuccess({ id: result.id!, name: result.name! });
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error ?? "Error al crear actividad maestra");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="uppercase font-bold tracking-tight">Nueva Actividad Maestra</DialogTitle>
          <DialogDescription>Defina una actividad recurrente para el catálogo global del sistema.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold uppercase">Nombre de la Actividad *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Mantención de Motores Auxiliares" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción (Maestra) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold uppercase">Descripción General</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Breve nota sobre qué implica esta actividad..." rows={2} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Área por Defecto */}
              <FormField
                control={form.control}
                name="defaultAreaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Área por Defecto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar área..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {catalogs.areas.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Solicitante por Defecto */}
              <FormField
                control={form.control}
                name="defaultApplicantUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Solicitante por Defecto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {catalogs.users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción por Defecto (Para el requerimiento) */}
              <FormField
                control={form.control}
                name="defaultDescription"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-bold uppercase">Descripción por Defecto (Para Requerimiento)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Texto base que aparecerá al crear una solicitud..." rows={3} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Habilitado */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Habilitado</FormLabel>
                      <p className="text-xs text-muted-foreground">Si está desmarcado, no aparecerá en el selector de actividades.</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar en Maestro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
