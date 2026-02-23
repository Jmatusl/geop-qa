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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateMenu, useUpdateMenu, MenuItem, useMenuTree } from "@/lib/hooks/use-menus";
import { useAllRoles } from "@/lib/hooks/use-roles";
import { Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { flattenTree } from "@/lib/utils";

const menuFormSchema = z.object({
    key: z.string().min(2, "Mínimo 2 caracteres").max(100),
    title: z.string().min(2, "Mínimo 2 caracteres").max(100),
    icon: z.string().optional(),
    path: z.string().optional(),
    parentId: z.string().optional(),
    order: z.coerce.number().optional(),
    enabled: z.boolean().default(true),
    showIcon: z.boolean().default(true),
    roles: z.array(z.string()).optional(), // Array de IDs de rol
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

interface MenuFormProps {
    mode: 'create' | 'edit';
    initialData?: MenuItem | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function MenuForm({ mode, initialData, onCancel, onSuccess }: MenuFormProps) {
    const { mutate: createMenu, isPending: isCreating } = useCreateMenu();
    const { mutate: updateMenu, isPending: isUpdating } = useUpdateMenu();

    // Cargar datos auxiliares
    const { data: menuTree } = useMenuTree();
    const { data: roles, isLoading: rolesLoading } = useAllRoles();

    // Aplanar árbol para el select de padres
    const flatMenus = menuTree ? flattenTree(menuTree) : [];

    const form = useForm<MenuFormValues>({
        resolver: zodResolver(menuFormSchema),
        defaultValues: {
            title: initialData?.title || "",
            path: initialData?.path || "",
            icon: initialData?.icon || "",
            parentId: initialData?.parentId || "ROOT", // "ROOT" podría requerir lógica distinta, comprobar.
            roles: initialData?.roles || [],
            order: initialData?.order || 0,
            enabled: initialData?.enabled ?? true,
            showIcon: initialData?.showIcon ?? true,
            key: initialData?.key || "",
        },
    });

    useEffect(() => {
        if (initialData && mode === 'edit') {
            form.reset({
                title: initialData.title,
                path: initialData.path || "",
                icon: initialData.icon || "",
                parentId: initialData.parentId || "ROOT",
                roles: initialData.roles || [],
                order: initialData.order,
                enabled: initialData.enabled,
                showIcon: initialData.showIcon,
                key: initialData.key,
            });
        }
    }, [initialData, mode, form]);

    const onSubmit = (data: MenuFormValues) => {
        const payload = {
            ...data,
            parentId: data.parentId === "ROOT" ? null : data.parentId,
        };

        if (mode === 'create') {
            createMenu(payload, {
                onSuccess: () => {
                    onSuccess();
                    form.reset();
                },
            });
        } else {
            updateMenu({ id: initialData?.id, ...payload }, {
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
                    <CardTitle>{mode === 'create' ? 'Crear Item de Menú' : 'Editar Item de Menú'}</CardTitle>
                    <CardDescription>Configure la estructura y acceso del menú.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Título</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: Usuarios" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="key"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Clave (Key única)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: users_list" {...field} disabled={mode === 'edit'} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="path"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ruta (Path)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="/mantenedores/usuarios" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormDescription>Dejar vacío si es un grupo (padre).</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="icon"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre Icono (Lucide)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: Users" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="parentId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Padre</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Seleccione padre" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="max-h-[200px]">
                                                    <SelectItem value="ROOT">-- Raíz --</SelectItem>
                                                    {flatMenus.map((item) => (
                                                        <SelectItem
                                                            key={item.id}
                                                            value={item.id}
                                                            disabled={item.id === initialData?.id} // No ser padre de sí mismo
                                                        >
                                                            <span style={{ marginLeft: `${item.depth * 10}px` }}>
                                                                {item.depth > 0 ? "↳ " : ""}{item.title}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="order"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Orden</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} autoComplete="off" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="md:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="roles"
                                        render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel className="text-base">Roles Permitidos</FormLabel>
                                                    <FormDescription>
                                                        Seleccione los roles que pueden ver este ítem. Si no selecciona ninguno, será visible para todos.
                                                    </FormDescription>
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    {rolesLoading && <p className="text-sm text-muted-foreground">Cargando roles...</p>}
                                                    {roles?.map((role) => (
                                                        <FormField
                                                            key={role.id}
                                                            control={form.control}
                                                            name="roles"
                                                            render={({ field }) => {
                                                                return (
                                                                    <FormItem
                                                                        key={role.id}
                                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                                    >
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(role.code)} // Usamos CODE para permisos, no ID (más portable)
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                        ? field.onChange([...(field.value || []), role.code])
                                                                                        : field.onChange(
                                                                                            field.value?.filter(
                                                                                                (value) => value !== role.code
                                                                                            )
                                                                                        )
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal cursor-pointer">
                                                                            {role.name}
                                                                        </FormLabel>
                                                                    </FormItem>
                                                                )
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="showIcon"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Mostrar Icono
                                                </FormLabel>
                                                <FormDescription>
                                                    Si se activa, se mostrará el icono junto al título.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="enabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Habilitado
                                                </FormLabel>
                                                <FormDescription>
                                                    Si se deshabilita, no aparecerá en el sidebar.
                                                </FormDescription>
                                            </div>
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
        </div >
    );
}
