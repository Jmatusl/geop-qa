"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personSchema } from "@/lib/validations/person";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdatePerson, Person } from "@/lib/hooks/use-persons";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { z } from "zod";
import { useEffect } from "react";
import { formatRUT } from "@/lib/utils/chile-utils";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Use full schema for editing
type PersonFormValues = z.infer<typeof personSchema>;

interface PersonFormEditProps {
  person: Person;
}

export function PersonFormEdit({ person }: PersonFormEditProps) {
  const { mutate: update, isPending: isUpdating } = useUpdatePerson();

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      rut: formatRUT(person.rut || ""),
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      email: person.email || "",
      phone: person.phone || "",
      address: person.address || "",
      nationality: person.nationality || "",
      birthDate: person.birthDate || null, // Date picker to be added ideally
      civilStatus: person.civilStatus || "",
      shirtSize: person.shirtSize || "",
      pantsSize: person.pantsSize || "",
      shoeSize: person.shoeSize?.toString() || "",
      emergencyContactName: person.emergencyContactName || "",
      emergencyContactPhone: person.emergencyContactPhone || "",
      bankName: person.bankName || "",
      accountType: person.accountType || "",
      accountNumber: person.accountNumber || "",
      isActive: person.isActive,
    },
  });

  const onSubmit = (data: PersonFormValues) => {
    const payload = {
      ...data,
      birthDate: data.birthDate instanceof Date ? data.birthDate.toISOString() : data.birthDate,
      shoeSize: data.shoeSize ? Number(data.shoeSize) : null,
    };
    update(
      { id: person.id, ...payload },
      {
        // Success handled by hook toast
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
            <CardDescription>Datos principales del trabajador.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="rut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(formatRUT(e.target.value));
                      }}
                      value={field.value || ""}
                      autoComplete="off"
                      className="w-full"
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
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input placeholder="Chilena" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input type="date" {...field} value={field.value ? String(field.value).split("T")[0] : ""} onChange={(e) => field.onChange(e.target.value)} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto y Domicilio</CardTitle>
            <CardDescription>Información para ubicar al trabajador.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Personal</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos Adicionales (Tallas)</CardTitle>
            <CardDescription>Información de vestuario y calzado.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="shirtSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talla Ropa</FormLabel>
                  <FormControl>
                    <Input placeholder="M / L / XL" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input placeholder="42 / 44" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input placeholder="40" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos Bancarios</CardTitle>
            <CardDescription>Información para transferencias y pagos.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <FormControl>
                    <Input placeholder="Banco Estado" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input placeholder="Vista / Corriente" {...field} value={field.value || ""} autoComplete="off" className="w-full" />
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
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto de Emergencia</CardTitle>
            <CardDescription>Persona a contactar en caso de emergencia.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Contacto</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono Contacto</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} autoComplete="off" className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isUpdating} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4 text-white" /> Guardar Cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
