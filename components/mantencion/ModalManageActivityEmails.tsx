"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface ActivityEmail {
  email: string;
  enabled: boolean;
}

interface ModalManageActivityEmailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  currentEmails?: ActivityEmail[];
  onSave?: (emails: ActivityEmail[]) => void;
}

/**
 * Modal para gestionar correos alternativos de actividades del proveedor
 * Permite habilitar/deshabilitar y agregar nuevos correos
 */
export function ModalManageActivityEmails({
  open,
  onOpenChange,
  supplierId,
  currentEmails = [],
  onSave,
}: ModalManageActivityEmailsProps) {
  const [emails, setEmails] = useState<ActivityEmail[]>(currentEmails || []);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar emails cuando se abre el modal
  useEffect(() => {
    if (open) {
      setEmails(currentEmails || []);
    }
  }, [open, currentEmails]);
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Agregar nuevos correos y guardar inmediatamente
  const handleAddEmails = async () => {
    if (!newEmailInput) {
      toast.error("Ingrese un correo electrónico");
      return;
    }

    const newEmails = newEmailInput
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);

    const invalidEmails = newEmails.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      toast.error(`Correos inválidos: ${invalidEmails.join(", ")}`);
      return;
    }

    const duplicates = newEmails.filter((email) =>
      emails.some((e) => e.email.toLowerCase() === email.toLowerCase())
    );
    if (duplicates.length > 0) {
      toast.error(`Correos duplicados: ${duplicates.join(", ")}`);
      return;
    }

    const emailsToAdd = newEmails.map((email) => ({
      email,
      enabled: true,
    }));

    const updatedEmails = [...emails, ...emailsToAdd];
    setEmails(updatedEmails);
    setNewEmailInput("");

    // Guardar inmediatamente en la BD
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/mantencion/suppliers/${supplierId}/alternative-emails`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails: updatedEmails }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al guardar correos");
      }

      toast.success(`${emailsToAdd.length} correo(s) agregado(s)`);
      onSave?.(updatedEmails);
    } catch (error) {
      toast.error("Error al guardar correos");
      console.error(error);
      // Revertir cambios en caso de error
      setEmails(emails);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle habilitar/deshabilitar y guardar inmediatamente
  const handleToggleEmail = async (index: number) => {
    const updated = [...emails];
    updated[index].enabled = !updated[index].enabled;
    setEmails(updated);

    // Guardar inmediatamente en la BD
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/mantencion/suppliers/${supplierId}/alternative-emails`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails: updated }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al guardar cambios");
      }

      toast.success("Cambio guardado");
      onSave?.(updated);
    } catch (error) {
      toast.error("Error al guardar cambios");
      console.error(error);
      // Revertir cambios en caso de error
      setEmails(emails);
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar correo y guardar inmediatamente
  const handleDeleteEmail = async (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated);

    // Guardar inmediatamente en la BD
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/mantencion/suppliers/${supplierId}/alternative-emails`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails: updated }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar correo");
      }

      toast.success("Correo eliminado");
      onSave?.(updated);
    } catch (error) {
      toast.error("Error al eliminar correo");
      console.error(error);
      // Revertir cambios en caso de error
      setEmails(emails);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-full max-h-[80vh] p-4 bg-white dark:bg-slate-100 text-slate-900">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Gestionar emails</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Lista de correos existentes */}
          <div className="space-y-2">
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Sin correos
              </p>
            ) : (
              <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                {emails.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <label
                      className="flex-1 text-xs cursor-pointer truncate"
                    >
                      {item.email}
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEmail(index)}
                      className={`h-6 px-2 text-xs shrink-0 ${
                        item.enabled
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200"
                          : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
                      }`}
                    >
                      {item.enabled ? "✓ On" : "○ Off"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteEmail(index)}
                      className="h-6 w-6 shrink-0 text-red-600 border-red-300 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar nuevos correos */}
          <div className="border-t pt-2 space-y-2">
            <div className="flex gap-1">
              <Input
                placeholder="correo@example.com"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddEmails();
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddEmails}
                disabled={isSaving || !newEmailInput}
                className="h-8 px-2 bg-blue-500 text-white hover:bg-blue-600 border border-blue-600"
              >
                <Plus className="h-3 w-3" />Agregar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="justify-center pt-2 border-t">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="gap-1"
          >
            <X className="h-3 w-3" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
