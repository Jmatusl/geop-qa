"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { areaSchema } from "@/lib/validations/organization";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreateArea, useUpdateArea, Area } from "@/lib/hooks/use-areas";
import { Loader2, Save, X, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { z } from "zod";

type AreaFormValues = z.infer<typeof areaSchema>;

interface AreaFormProps {
    mode: 'create' | 'edit';
    initialData?: Area | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function AreaForm({ mode, initialData, onCancel, onSuccess }: AreaFormProps) {
    const { mutate: create, isPending: isCreating } = useCreateArea();
    const { mutate: update, isPending: isUpdating } = useUpdateArea();

    const form = useForm<AreaFormValues>({
        resolver: zodResolver(areaSchema),
        defaultValues: {
            code: "",
            name: "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            form.reset({
                code: initialData.code,
                name: initialData.name,
                isActive: initialData.isActive,
            });
        }
    }, [mode, initialData, form]);

    const onSubmit = (data: AreaFormValues) => {
        if (mode === 'create') {
            create(data, {
                onSuccess: () => {
                    onSuccess();
                    form.reset();
                },
            });
        } else {
            update({ id: initialData?.id!, ...data }, {
                onSuccess: () => {
                    onSuccess();
                    form.reset();
                }
            });
        }
    };

    return (
        <div className="w-full">
            <Card className="w-full border shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Building2 className="h-5 w-5 text-[#283c7f]" />
                        {mode === 'create' ? 'Crear Nueva Área' : 'Editar Área'}
                    </CardTitle>
                    <CardDescription>Defina las áreas operativas o departamentos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="AREA-01"
                                                    {...field}
                                                    disabled={mode === 'edit'}
                                                    autoComplete="off"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Código único identificador del área.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Operaciones" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm col-span-1 md:col-span-2">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Estado Activo</FormLabel>
                                                <FormDescription>
                                                    Indica si el área está habilitada para operaciones.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end space-x-4 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={onCancel} className="dark:text-white">
                                    <X className="mr-2 h-4 w-4" /> Cancelar
                                </Button>
                                <Button type="submit" disabled={isCreating || isUpdating} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                                    {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4 text-white" /> Guardar
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
