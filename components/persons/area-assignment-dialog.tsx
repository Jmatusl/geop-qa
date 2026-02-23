"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Loader2, Check, ChevronsUpDown, X, Save } from "lucide-react";
import { useAssignArea } from "@/lib/hooks/use-persons";
import { useAllAreas } from "@/lib/hooks/use-areas";
import { useState } from "react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  areaId: z.string().min(1, "Debe seleccionar un área"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
});

interface AreaAssignmentDialogProps {
  personId: string;
}

export function AreaAssignmentDialog({ personId }: AreaAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const { data: areas, isLoading: isLoadingAreas } = useAllAreas();
  const { mutate: assign, isPending } = useAssignArea();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      areaId: "",
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    assign(
      { personId, ...values },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Asignar Área
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] w-full" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Asignar Nueva Área</DialogTitle>
          <DialogDescription>Seleccione el área y la fecha de inicio del trabajador.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="areaId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Área</FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" aria-expanded={openCombobox} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                          {field.value ? areas?.find((area) => area.id === field.value)?.name : "Seleccionar área..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder="Buscar área..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron áreas.</CommandEmpty>
                          <CommandGroup>
                            {isLoadingAreas ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : (
                              areas?.map((area) => (
                                <CommandItem
                                  value={area.name}
                                  key={area.id}
                                  onSelect={() => {
                                    form.setValue("areaId", area.id);
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", area.id === field.value ? "opacity-100" : "opacity-0")} />
                                  {area.name}
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Inicio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Asignar Área
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
