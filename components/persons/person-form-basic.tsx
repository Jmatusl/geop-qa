"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPersonSchema } from "@/lib/validations/person";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePerson, Person } from "@/lib/hooks/use-persons";
import { Loader2, Save, X, User, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { z } from "zod";
import { useEffect } from "react";
// Import Chilean Utils with correct casing
import { formatRUT, validateRUT } from "@/lib/utils/chile-utils";

// Create schema is strict for creation
type PersonFormValues = z.infer<typeof createPersonSchema>;

interface PersonFormProps {
  mode: "create" | "edit"; // We only use this for create in the basic form usually
  initialData?: Person | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PersonFormBasic({ mode, initialData, onCancel, onSuccess }: PersonFormProps) {
  const { mutate: create, isPending: isCreating } = useCreatePerson();

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: {
      rut: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "+569",
      address: "",
    },
  });

  const onSubmit = (data: PersonFormValues) => {
    if (mode === "create") {
      const payload = {
        ...data,
        birthDate: data.birthDate instanceof Date ? data.birthDate.toISOString() : data.birthDate,
        shoeSize: data.shoeSize ? Number(data.shoeSize) : null,
      };
      create(payload, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    }
  };

  return (
    <div className="w-full">
      <Card className="w-full border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-[#283c7f]" />
            Nuevo Trabajador
          </CardTitle>
          <CardDescription>Ingrese los datos básicos para crear la ficha.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Identificación */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Identificación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="rut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUT</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12.345.678-9"
                            {...field}
                            onChange={(e) => {
                              field.onChange(formatRUT(e.target.value));
                            }}
                            value={field.value || ""}
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombres</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Andrés" {...field} value={field.value || ""} autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellidos</FormLabel>
                        <FormControl>
                          <Input placeholder="Pérez González" {...field} value={field.value || ""} autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nacionalidad</FormLabel>
                        <FormControl>
                          <Input placeholder="Chilena" {...field} value={field.value || ""} autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="civilStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado Civil</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Soltero">Soltero/a</SelectItem>
                            <SelectItem value="Casado">Casado/a</SelectItem>
                            <SelectItem value="Viudo">Viudo/a</SelectItem>
                            <SelectItem value="Divorciado">Divorciado/a</SelectItem>
                            <SelectItem value="Conviviente Civil">Conviviente Civil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Nacimiento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ? String(field.value).split("T")[0] : ""} onChange={(e) => field.onChange(e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contacto y Domicilio */}
              <Collapsible className="border rounded-md p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Contacto y Domicilio</h3>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Personal</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="juan.perez@email.com" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input placeholder="+56912345678" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2 lg:col-span-1">
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Providencia 1234" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Datos Adicionales */}
              <Collapsible className="border rounded-md p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Datos Adicionales (Tallas)</h3>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="shirtSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla Ropa</FormLabel>
                          <FormControl>
                            <Input placeholder="M / L / XL" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pantsSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla Pantalón</FormLabel>
                          <FormControl>
                            <Input placeholder="42 / 44" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shoeSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla Calzado</FormLabel>
                          <FormControl>
                            <Input placeholder="40" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Datos Bancarios */}
              <Collapsible className="border rounded-md p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Datos Bancarios</h3>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banco</FormLabel>
                          <FormControl>
                            <Input placeholder="Banco Estado" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Cuenta</FormLabel>
                          <FormControl>
                            <Input placeholder="Vista / Corriente" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° Cuenta</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} value={field.value || ""} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} className="dark:text-white">
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button type="submit" disabled={isCreating} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4 text-white" /> Crear Ficha
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
