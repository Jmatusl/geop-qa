"use client";

import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface ActivityEmail {
  email: string;
  enabled: boolean;
}

interface AlternativeEmailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEmails: string[];
  providerId: string;
  onSelectEmails: (emails: string[]) => void;
}

/**
 * Modal para seleccionar correos alternativos del proveedor
 * Permite búsqueda, multi-select y agregar nuevos correos
 * Solo muestra correos que estén habilitados (enabled: true)
 */
export function AlternativeEmailsModal({
  open,
  onOpenChange,
  existingEmails,
  providerId,
  onSelectEmails,
}: AlternativeEmailsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
    new Set(existingEmails)
  );
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [alternativeEmails, setAlternativeEmails] = useState<ActivityEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar correos alternativos al abrir modal
  if (open && alternativeEmails.length === 0 && !isLoading) {
    setIsLoading(true);
    fetch(`/api/v1/mantencion/suppliers/${providerId}/alternative-emails`)
      .then((res) => res.json())
      .then((data) => {
        setAlternativeEmails(data.emails || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }

  // Filtrar correos por búsqueda y mostrar solo los habilitados
  const filteredEmails = useMemo(() => {
    return alternativeEmails
      .filter(({ enabled }) => enabled)
      .filter(({ email }) =>
        email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [alternativeEmails, searchTerm]);

  /**
   * Agregar un nuevo correo a la lista de alternativos
   */
  const handleAddNewEmail = async () => {
    if (!newEmail) {
      toast.error("Ingrese un correo electrónico");
      return;
    }

    // Validación básica de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Correo electrónico inválido");
      return;
    }

    // Evitar duplicados (comparar con emails existentes)
    if (
      alternativeEmails.some(
        (e) => e.email.toLowerCase() === newEmail.toLowerCase()
      )
    ) {
      toast.error("Este correo ya existe en los alternativos");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/mantencion/suppliers/${providerId}/alternative-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newEmail,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al guardar correo");
      }

      const data = await response.json();

      // Actualizar la lista local con la respuesta del servidor
      setAlternativeEmails(data.emails || []);
      setSelectedEmails(new Set([...selectedEmails, newEmail]));
      setNewEmail("");
      toast.success("Correo agregado exitosamente");
    } catch (error) {
      toast.error("Error al guardar correo");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Manejar selección/deselección de checkboxes
   */
  const handleToggleEmail = (email: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  /**
   * Confirmar selección y cerrar modal
   */
  const handleConfirm = () => {
    onSelectEmails(Array.from(selectedEmails));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Correos Alternativos</DialogTitle>
          <DialogDescription>
            Selecciona los correos donde deseas enviar el PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar correo..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Lista de correos alternativos */}
          <div className="border rounded-lg max-h-48 overflow-y-auto space-y-2 p-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cargando correos...
              </p>
            ) : filteredEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {alternativeEmails.length === 0
                  ? "Sin correos alternativos"
                  : "No hay resultados"}
              </p>
            ) : (
              filteredEmails.map(({ email }) => (
                <div key={email} className="flex items-center gap-2">
                  <Checkbox
                    id={email}
                    checked={selectedEmails.has(email)}
                    onCheckedChange={() => handleToggleEmail(email)}
                  />
                  <label
                    htmlFor={email}
                    className="flex-1 text-sm cursor-pointer hover:text-foreground/80"
                  >
                    {email}
                  </label>
                </div>
              ))
            )}
          </div>

          {/* Agregar nuevo correo */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Agregar nuevo correo alternativo
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="nuevo@correo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddNewEmail();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleAddNewEmail}
                disabled={isSaving || !newEmail}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Seleccionar ({selectedEmails.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
