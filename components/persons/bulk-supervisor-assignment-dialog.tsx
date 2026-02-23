"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Check, ChevronsUpDown, Loader2, UserPlus, X, Save } from "lucide-react";
import { useAllPersons, useBulkAssignSupervisor, Person } from "@/lib/hooks/use-persons";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  supervisorId: z.string().min(1, "Debe seleccionar un supervisor"),
  personIds: z.array(z.string()).min(1, "Debe seleccionar al menos un trabajador"),
});

export function BulkSupervisorAssignmentDialog() {
  const [open, setOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { data: persons, isLoading: isLoadingPersons } = useAllPersons();
  const { mutate: bulkAssign, isPending } = useBulkAssignSupervisor();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supervisorId: "",
      personIds: [],
    },
  });

  const hasPermission = user?.roles.some((r) => r === "ADMIN" || r === "SUPERVISOR");

  // Filter supervisors: Users with role ADMIN or SUPERVISOR
  const supervisors = useMemo(() => {
    return persons?.filter((p) => p.user?.userRoles.some((ur) => ur.role.code === "ADMIN" || ur.role.code === "SUPERVISOR")) || [];
  }, [persons]);

  // Filter workers for the table
  const filteredWorkers = useMemo(() => {
    if (!persons) return [];
    return persons.filter((p) => {
      // Omitir administradores
      const isAdmin = p.user?.userRoles.some((ur) => ur.role.code === "ADMIN");
      if (isAdmin) return false;

      const matchesSearch =
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || p.rut.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [persons, searchTerm]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    bulkAssign(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  }

  const toggleWorker = (id: string) => {
    const current = form.getValues("personIds");
    if (current.includes(id)) {
      form.setValue(
        "personIds",
        current.filter((i) => i !== id),
      );
    } else {
      form.setValue("personIds", [...current, id]);
    }
  };

  const toggleAll = () => {
    const current = form.getValues("personIds");
    if (current.length === filteredWorkers.length) {
      form.setValue("personIds", []);
    } else {
      form.setValue(
        "personIds",
        filteredWorkers.map((p) => p.id),
      );
    }
  };

  if (!hasPermission) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-[#283c7f] border-[#283c7f] hover:bg-[#283c7f] hover:text-white">
          <UserPlus className="mr-2 h-4 w-4" /> Asignación Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] w-full h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Asignación Masiva de Supervisor</DialogTitle>
          <DialogDescription>Seleccione un supervisor y luego marque los trabajadores que dependerán de él.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col overflow-hidden pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisorId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Supervisor de Destino</FormLabel>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" aria-expanded={openCombobox} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            {field.value
                              ? supervisors.find((p) => p.id === field.value)
                                ? `${supervisors.find((p) => p.id === field.value)?.firstName} ${supervisors.find((p) => p.id === field.value)?.lastName}`
                                : "Seleccionar supervisor..."
                              : "Seleccionar supervisor..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                        <Command>
                          <CommandInput placeholder="Buscar supervisor..." />
                          <CommandList>
                            <CommandEmpty>No se encontraron supervisores.</CommandEmpty>
                            <CommandGroup>
                              {isLoadingPersons ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                supervisors.map((p) => (
                                  <CommandItem
                                    value={`${p.firstName} ${p.lastName} ${p.rut}`}
                                    key={p.id}
                                    onSelect={() => {
                                      form.setValue("supervisorId", p.id);
                                      setOpenCombobox(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>
                                        {p.firstName} {p.lastName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{p.rut}</span>
                                    </div>
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

              <div className="flex flex-col justify-end">
                <FormLabel className="mb-2">Filtrar Trabajadores</FormLabel>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre o RUT..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox checked={filteredWorkers.length > 0 && form.watch("personIds").length === filteredWorkers.length} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Cargo Actual</TableHead>
                      <TableHead>Rol de Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPersons ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredWorkers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No se encontraron trabajadores.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkers.map((worker) => (
                        <TableRow key={worker.id} className="cursor-pointer" onClick={() => toggleWorker(worker.id)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={form.watch("personIds").includes(worker.id)} onCheckedChange={() => toggleWorker(worker.id)} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {worker.firstName} {worker.lastName}
                          </TableCell>
                          <TableCell>{worker.rut}</TableCell>
                          <TableCell>{worker.jobPositions?.[0]?.jobPosition?.name || "Sin cargo"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {worker.user?.userRoles.length ? (
                                worker.user.userRoles.map((ur) => (
                                  <span key={ur.role.code} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {ur.role.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sin acceso</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">{form.watch("personIds").length} trabajadores seleccionados</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button type="submit" disabled={isPending || !form.watch("supervisorId") || form.watch("personIds").length === 0} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Confirmar Asignación
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
