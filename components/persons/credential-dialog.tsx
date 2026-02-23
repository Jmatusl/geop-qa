"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CredentialDialogProps {
    personId: string;
    className?: string;
}

export function CredentialDialog({ personId, className }: CredentialDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tokenData, setTokenData] = useState<{ token: string; expiresAt: string } | null>(null);

    const generateToken = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/persons/${personId}/token`, {
                method: "POST",
            });

            if (!response.ok) throw new Error("Error al generar token");

            const data = await response.json();
            setTokenData(data);
        } catch (error) {
            toast.error("No se pudo generar la credencial");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const url = tokenData
        ? `${window.location.origin}/validar/${tokenData.token}`
        : "";

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url);
        toast.success("Enlace copiado al portapapeles");
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={className} onClick={generateToken}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Credencial Digital
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Credencial Digital</DialogTitle>
                    <DialogDescription>
                        Escanea este código QR o comparte el enlace para validar la identidad y certificaciones del trabajador.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span>Generando credencial...</span>
                        </div>
                    ) : tokenData ? (
                        <>
                            <div className="bg-white p-4 rounded-lg shadow-sm border">
                                <QRCodeSVG value={url} size={200} level="M" />
                            </div>
                            <p className="text-sm text-center text-muted-foreground">
                                Válido hasta: {new Date(tokenData.expiresAt).toLocaleDateString()}
                            </p>

                            <div className="flex items-center space-x-2 w-full mt-4">
                                <div className="grid flex-1 gap-2">
                                    <Label htmlFor="link" className="sr-only">
                                        Enlace
                                    </Label>
                                    <Input
                                        id="link"
                                        defaultValue={url}
                                        readOnly
                                        className="h-9"
                                    />
                                </div>
                                <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard}>
                                    <span className="sr-only">Copiar</span>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-red-500">
                            Error al cargar datos. Intente nuevamente.
                            <Button variant="link" onClick={generateToken}>Reintentar</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
