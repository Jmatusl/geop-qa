"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { AuthShell } from './auth-shell';
import uiConfigFallback from '@/lib/config/ui-config-fallback.json';

const formSchema = z.object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmar contraseña es requerido")
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

interface ResetViewProps {
    token: string;
    config?: any | null;
    isValidToken?: boolean;
}

export function ResetView({ token, config, isValidToken = true }: ResetViewProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Deep merge with fallback
    const fullConfig = {
        ...uiConfigFallback,
        ...(config || {}),
        reset_page: {
            ...uiConfigFallback.reset_page,
            ...(config?.reset_page || {}),
        }
    };

    const rp = fullConfig.reset_page;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
            confirmPassword: ""
        }
    });

    if (!isValidToken) {
        return (
            <AuthShell config={config}>
                <Card className="w-full max-w-md shadow-2xl border-slate-300 dark:border-slate-700 z-10">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/30">
                                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-red-600">Enlace No Válido</CardTitle>
                        <CardDescription className="pt-2">
                            El enlace para restablecer la contraseña ha expirado o no es válido. Por favor, solicita uno nuevo.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-4">
                        <Link href="/recover" className="w-full">
                            <Button className="w-full bg-[#283c7f] hover:bg-[#1f2f65] gap-2">
                                Solicitar Nuevo Enlace
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </AuthShell>
        );
    }

    const onSubmit = async (data: FormValues) => {
        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: data.password,
                    confirmPassword: data.confirmPassword
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setSuccess(true);
                toast.success('Contraseña actualizada correctamente');
                setTimeout(() => router.push('/login'), 3000);
            } else {
                toast.error(result.error || 'Error al restablecer contraseña');
            }
        } catch {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell config={config}>
            <Card className="w-full max-w-md shadow-2xl border-slate-300 dark:border-slate-700 z-10">
                {success ? (
                    <>
                        <CardHeader className="text-center pb-2">
                            <div className="flex justify-center mb-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold">¡Contraseña Cambiada!</CardTitle>
                            <CardDescription className="pt-2">
                                Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-center pt-4">
                            <Link href="/login" className="w-full">
                                <Button className="w-full bg-[#283c7f] hover:bg-[#1f2f65] gap-2">
                                    Ir al Inicio de Sesión
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardFooter>
                    </>
                ) : (
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-xl font-bold text-center">{rp.titulo}</CardTitle>
                            <CardDescription className="text-center">
                                {rp.subtitulo}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label>Nueva Contraseña</Label>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Mínimo 8 caracteres"
                                                            {...field}
                                                            autoComplete="new-password"
                                                            disabled={loading}
                                                            className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            tabIndex={-1}
                                                        >
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
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
                                                <Label>Confirmar Contraseña</Label>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            placeholder="Repite la contraseña"
                                                            {...field}
                                                            autoComplete="new-password"
                                                            disabled={loading}
                                                            className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            tabIndex={-1}
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white font-semibold h-11 mt-2"
                                        disabled={loading}
                                    >
                                        {loading ? 'Procesando...' : 'Restablecer Contraseña'}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </>
                )}
            </Card>
        </AuthShell>
    );
}
