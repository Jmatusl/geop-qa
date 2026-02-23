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
import { Plus, Loader2, Check, ChevronsUpDown, Search, X, Save } from "lucide-react";
import { useAssignJobPosition } from "@/lib/hooks/use-persons";
import { useAllJobPositions } from "@/lib/hooks/use-job-positions";
import { useState } from "react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  jobPositionId: z.string().min(1, "Debe seleccionar un cargo"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
});

interface JobAssignmentDialogProps {
  personId: string;
}

export function JobAssignmentDialog({ personId }: JobAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const { data: jobs, isLoading: isLoadingJobs } = useAllJobPositions();
  const { mutate: assign, isPending } = useAssignJobPosition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobPositionId: "",
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
          <Plus className="mr-2 h-4 w-4" /> Asignar Cargo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] w-full" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Asignar Nuevo Cargo</DialogTitle>
          <DialogDescription>Seleccione el nuevo cargo y la fecha de inicio del trabajador.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="jobPositionId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cargo</FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" aria-expanded={openCombobox} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                          {field.value ? jobs?.find((job) => job.id === field.value)?.name : "Seleccionar cargo..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cargo..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron cargos.</CommandEmpty>
                          <CommandGroup>
                            {isLoadingJobs ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : (
                              jobs?.map((job) => (
                                <CommandItem
                                  value={job.name}
                                  key={job.id}
                                  onSelect={() => {
                                    form.setValue("jobPositionId", job.id);
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", job.id === field.value ? "opacity-100" : "opacity-0")} />
                                  {job.name}
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
                Asignar Cargo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
