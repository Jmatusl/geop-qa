"use client";

import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { SessionList } from "@/components/profile/session-list";
import { User, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <User className="h-8 w-8 text-[#283c7f]" />
                    Mi Perfil
                </h1>
                <p className="text-muted-foreground">
                    Administre sus datos personales y la seguridad de su cuenta.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda: Datos y Contraseña */}
                <div className="lg:col-span-2 space-y-6">
                    <ProfileForm />
                    <ChangePasswordForm />
                </div>

                {/* Columna Derecha: Sesiones */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/10 dark:border-blue-900/30">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-900 dark:text-blue-400 text-sm">Consejo de Seguridad</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                                    Si nota actividad sospechosa, cambie su contraseña inmediatamente y cierre todas las sesiones activas.
                                </p>
                            </div>
                        </div>
                    </div>
                    <SessionList />
                </div>
            </div>
        </div>
    );
}
