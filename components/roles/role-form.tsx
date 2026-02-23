"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Usaremos textarea para descripción
import { useCreateRole, useUpdateRole, Role } from "@/lib/hooks/use-roles";
import { Loader2, Save, X, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const roleFormSchema = z.object({
    code: z.string().min(2, "Mínimo 2 caracteres").max(50, "Máximo 50 caracteres"),
    name: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
    description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
    mode: 'create' | 'edit';
    initialData?: Role | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function RoleForm({ mode, initialData, onCancel, onSuccess }: RoleFormProps) {
    const { mutate: createRole, isPending: isCreating } = useCreateRole();
    const { mutate: updateRole, isPending: isUpdating } = useUpdateRole();

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
        },
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            form.reset({
                code: initialData.code,
                name: initialData.name,
                description: initialData.description || "",
            });
        }
    }, [mode, initialData, form]);

    const onSubmit = (data: RoleFormValues) => {
        if (mode === 'create') {
            createRole(data, {
                onSuccess: () => {
                    onSuccess();
                    form.reset();
                },
            });
        } else {
            updateRole({ id: initialData?.id, ...data }, {
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
                        <Shield className="h-5 w-5 text-[#283c7f]" />
                        {mode === 'create' ? 'Crear Nuevo Rol' : 'Editar Rol'}
                    </CardTitle>
                    <CardDescription>Defina los roles y sus descripciones para el sistema.</CardDescription>
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
                                                    placeholder="ADMIN"
                                                    {...field}
                                                    disabled={mode === 'edit'}
                                                    autoComplete="off"
                                                />
                                            </FormControl>
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
                                                <Input placeholder="Administrador" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-1 md:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Descripción</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Descripción detallada del rol y sus responsabilidades..."
                                                        className="resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
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
