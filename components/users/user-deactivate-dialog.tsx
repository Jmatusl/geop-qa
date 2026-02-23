"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAllDeactivationReasons } from "@/lib/hooks/use-deactivation-reasons";
import { Loader2, AlertTriangle } from "lucide-react";

interface UserDeactivateDialogProps {
    user: { id: string, firstName: string, lastName: string } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reasonId: string, comment: string) => void;
    isPending?: boolean;
}

export function UserDeactivateDialog({
    user,
    open,
    onOpenChange,
    onConfirm,
    isPending
}: UserDeactivateDialogProps) {
    const [reasonId, setReasonId] = useState<string>("");
    const [comment, setComment] = useState<string>("");
    const { data: reasons, isLoading: reasonsLoading } = useAllDeactivationReasons();

    const handleConfirm = () => {
        if (!reasonId) return;
        onConfirm(reasonId, comment);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Desactivar Usuario
                    </DialogTitle>
                    <DialogDescription>
                        ¿Está seguro que desea desactivar a <strong>{user?.firstName} {user?.lastName}</strong>?
                        El usuario ya no podrá iniciar sesión.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Motivo de Baja <span className="text-red-500">*</span></Label>
                        <Select value={reasonId} onValueChange={setReasonId}>
                            <SelectTrigger id="reason">
                                <SelectValue placeholder="Seleccione un motivo" />
                            </SelectTrigger>
                            <SelectContent>
                                {reasonsLoading ? (
                                    <SelectItem value="loading" disabled>Cargando motivos...</SelectItem>
                                ) : (
                                    reasons?.map((reason) => (
                                        <SelectItem key={reason.id} value={reason.id}>
                                            {reason.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="comment">Comentario Adicional (Opcional)</Label>
                        <Textarea
                            id="comment"
                            placeholder="Ingrese detalles adicionales sobre la baja..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!reasonId || isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Desactivar Cuenta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
