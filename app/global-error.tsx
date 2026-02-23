"use client";

import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        throw error;
    }

    return (
        <html lang="es">
            <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6 antialiased font-sans">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="flex justify-center">
                        <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center border-4 border-white shadow-xl">
                            <ShieldAlert className="h-12 w-12 text-red-600" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Error Crítico del Sistema
                        </h1>
                        <p className="text-slate-600 max-w-xs mx-auto">
                            Se ha producido un error estructural en la aplicación. Por favor, intente recargar la página completa.
                        </p>
                    </div>

                    <Button
                        onClick={() => reset()}
                        className="bg-[#283c7f] hover:bg-[#1f2f65] text-white px-8 py-6 h-auto text-lg font-bold rounded-2xl shadow-2xl shadow-blue-900/20 w-full"
                    >
                        <RefreshCcw className="mr-2 h-5 w-5" />
                        Recargar Aplicación
                    </Button>
                </div>
            </body>
        </html>
    );
}
