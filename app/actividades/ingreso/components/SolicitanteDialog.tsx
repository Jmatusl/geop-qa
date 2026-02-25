"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { solicitanteSchema, type SolicitanteData } from "@/lib/validations/actividades";
import { crearSolicitanteUser } from "../actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save, UserPlus } from "lucide-react";

interface SolicitanteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: { id: string; firstName: string; lastName: string; email: string }) => void;
}

export function SolicitanteDialog({ open, onOpenChange, onSuccess }: SolicitanteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<SolicitanteData>({
    resolver: zodResolver(solicitanteSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  const onSubmit = (data: SolicitanteData) => {
    startTransition(async () => {
      const result = await crearSolicitanteUser(data);
      if (result.success && result.id) {
        toast.success(`Solicitante "${result.firstName} ${result.lastName}" creado exitosamente`);
        onSuccess({
          id: result.id,
          firstName: result.firstName!,
          lastName: result.lastName!,
          email: result.email!,
        });
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error ?? "Error al crear solicitante");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#283c7f] dark:text-blue-400" />
            <DialogTitle className="uppercase font-bold tracking-tight">Nuevo Solicitante</DialogTitle>
          </div>
          <DialogDescription>Registre un nuevo solicitante para incluirlo en el requerimiento actual.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-2 gap-3">
              {/* Nombre */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Juan" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Apellido */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Apellido *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Pérez" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Correo Electrónico *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="Ej: juan.perez@empresa.cl" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="dark:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Save className="mr-2 h-4 w-4 text-white" />}
                Guardar Solicitante
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
