"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobPositionSchema } from "@/lib/validations/organization";
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
import { useCreateJobPosition, useUpdateJobPosition, JobPosition } from "@/lib/hooks/use-job-positions";
import { Loader2, Save, X, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { z } from "zod";

type JobPositionFormValues = z.infer<typeof jobPositionSchema>;

interface JobPositionFormProps {
    mode: 'create' | 'edit';
    initialData?: JobPosition | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function JobPositionForm({ mode, initialData, onCancel, onSuccess }: JobPositionFormProps) {
    const { mutate: create, isPending: isCreating } = useCreateJobPosition();
    const { mutate: update, isPending: isUpdating } = useUpdateJobPosition();

    const form = useForm<JobPositionFormValues>({
        resolver: zodResolver(jobPositionSchema),
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

    const onSubmit = (data: JobPositionFormValues) => {
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
                        <Briefcase className="h-5 w-5 text-[#283c7f]" />
                        {mode === 'create' ? 'Crear Nuevo Cargo' : 'Editar Cargo'}
                    </CardTitle>
                    <CardDescription>Defina los cargos que podrán ser asignados a las personas.</CardDescription>
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
                                                    placeholder="ADM-01"
                                                    {...field}
                                                    disabled={mode === 'edit'} // No editable
                                                    autoComplete="off"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Código único identificador del cargo.
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
                                                <Input placeholder="Analista de Sistemas" {...field} autoComplete="off" />
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
                                                    Indica si el cargo está disponible para nuevas asignaciones.
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
