"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // En un caso real, aquí podrías registrar el error en un servicio como Sentry
        console.error('Error capturado:', error);
    }, [error]);

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        throw error;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icono de Alerta */}
                <div className="relative flex justify-center">
                    <div className="absolute inset-0 bg-red-400/20 blur-3xl rounded-full" />
                    <div className="relative h-24 w-24 rounded-3xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-center justify-center shadow-2xl group">
                        <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-500 group-hover:animate-bounce transition-all" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Algo salió mal
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-balance">
                        Ha ocurrido un error inesperado en el sistema. Estamos trabajando para solucionarlo.
                    </p>
                    {error.digest && (
                        <p className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 py-1 px-2 rounded inline-block">
                            ID Error: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Button
                        onClick={() => reset()}
                        className="w-full sm:w-auto bg-[#283c7f] hover:bg-[#1f2f65] text-white gap-2 shadow-lg shadow-blue-900/10 transform transition-all active:scale-95"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Reintentar
                    </Button>
                    <Link href="/" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto gap-2 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 shadow-sm">
                            <Home className="h-4 w-4" />
                            Ir al inicio
                        </Button>
                    </Link>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-slate-900">
                    <p className="text-xs text-slate-500 font-medium">
                        Si el error persiste, contacte al soporte técnico.
                    </p>
                </div>
            </div>
        </div>
    );
}
