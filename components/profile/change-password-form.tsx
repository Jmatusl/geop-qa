"use client";

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
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import { Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres")
        .regex(/[A-Z]/, "Debe contener una mayúscula")
        .regex(/[a-z]/, "Debe contener una minúscula")
        .regex(/[0-9]/, "Debe contener un número"),
    confirmPassword: z.string().min(1, "Confirme la contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ChangePasswordForm() {
    const { mutate: updateProfile, isPending } = useUpdateProfile();
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        },
    });

    const onSubmit = (data: PasswordFormValues) => {
        updateProfile({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword
        }, {
            onSuccess: () => {
                form.reset();
                setIsOpen(false);
            }
        });
    };

    if (!isOpen) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Seguridad</CardTitle>
                    <CardDescription>Cambie su contraseña regularmente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={() => setIsOpen(true)}>
                        <KeyRound className="mr-2 h-4 w-4" /> Cambiar Contraseña
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>Ingrese su contraseña actual para validar el cambio.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña Actual</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} autoComplete="current-password" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nueva Contraseña</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} autoComplete="new-password" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Contraseña</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} autoComplete="new-password" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="dark:text-white">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Actualizar Contraseña
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
