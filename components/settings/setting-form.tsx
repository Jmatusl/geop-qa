"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateSetting, useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Validar que el string sea un JSON válido
const jsonStringSchema = z.string().refine((val) => {
    try {
        JSON.parse(val);
        return true;
    } catch {
        return false;
    }
}, { message: "Debe ser un JSON válido" });

const settingFormSchema = z.object({
    key: z.string().min(3, "Mínimo 3 caracteres").max(100).regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos"),
    description: z.string().optional(),
    valueString: jsonStringSchema, // Usamos un campo string temporal para editar el JSON
    isActive: z.boolean().default(true),
});

type SettingFormValues = z.infer<typeof settingFormSchema>;

interface SettingFormProps {
    mode: 'create' | 'edit';
    initialData?: AppSetting | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function SettingForm({ mode, initialData, onCancel, onSuccess }: SettingFormProps) {
    const { mutate: createSetting, isPending: isCreating } = useCreateSetting();
    const { mutate: updateSetting, isPending: isUpdating } = useUpdateSetting();

    const form = useForm<SettingFormValues>({
        resolver: zodResolver(settingFormSchema),
        defaultValues: {
            key: "",
            description: "",
            valueString: "{}", // Default empty json object
            isActive: true,
        },
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            form.reset({
                key: initialData.key,
                description: initialData.description || "",
                valueString: JSON.stringify(initialData.value, null, 2), // Pretty print
                isActive: initialData.isActive,
            });
        }
    }, [mode, initialData, form]);

    const onSubmit = (data: SettingFormValues) => {
        const payload = {
            key: data.key,
            description: data.description,
            value: JSON.parse(data.valueString), // Convertir string a objeto real antes de enviar
            isActive: data.isActive
        };

        if (mode === 'create') {
            createSetting(payload, {
                onSuccess: () => {
                    onSuccess();
                    form.reset();
                },
            });
        } else {
            updateSetting({ id: initialData?.id, ...payload }, {
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
                    <CardTitle>{mode === 'create' ? 'Nueva Configuración' : 'Editar Configuración'}</CardTitle>
                    <CardDescription>Defina claves y valores del sistema (Formato JSON).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="key"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Clave (Key)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SYSTEM_MAINTENANCE_MODE" {...field} disabled={mode === 'edit'} autoComplete="off" />
                                            </FormControl>
                                            <FormDescription>Único, mayúsculas y guiones bajos recomendado.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-8">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Activo
                                                </FormLabel>
                                                <FormDescription>
                                                    Si está inactivo, el sistema podría ignorar esta configuración.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="valueString"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (JSON)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder='{"enabled": true}'
                                                className="font-mono text-xs min-h-[200px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>Debe ser un objeto JSON válido.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Explique para qué sirve esta configuración..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
