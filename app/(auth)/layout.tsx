import { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative min-h-screen flex items-center justify-center">
            {/* Fondo con gradiente */}
            <div className="absolute inset-0 -z-10">
                <Image
                    src="/fondo_login.png"
                    alt="Fondo"
                    fill
                    className="object-cover"
                    priority
                    quality={100}
                />
            </div>

            {/* Contenido */}
            <div className="w-full max-w-md px-4">
                {children}
            </div>
        </div>
    );
}
