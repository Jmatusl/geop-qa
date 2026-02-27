/**
 * Componente: Filtros de Solicitudes
 * Archivo: app/insumos/listado/components/RequestFilters.tsx
 * 
 * Panel de filtros para el listado de solicitudes
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { MntInstallation } from "@prisma/client";

interface RequestFiltersProps {
  installations: MntInstallation[];
  filters: {
    status?: string;
    installationId?: string;
    priority?: string;
    requester?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_PROCESO", label: "En Proceso" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "ANULADA", label: "Anulada" },
];

const priorityOptions = [
  { value: "all", label: "Todas" },
  { value: "BAJA", label: "Baja" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

export function RequestFilters({
  installations,
  filters,
  onFilterChange,
  onClearFilters,
}: RequestFiltersProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v && v !== "");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filtros</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Búsqueda */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Folio, título..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Responsable */}
        <div className="space-y-2">
          <Label htmlFor="requester">Responsable</Label>
          <Input
            id="requester"
            placeholder="Nombre del solicitante"
            value={filters.requester || ""}
            onChange={(e) => onFilterChange("requester", e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => onFilterChange("status", value === "all" ? "" : value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Seleccione estado" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridad */}
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridad</Label>
          <Select
            value={filters.priority || "all"}
            onValueChange={(value) => onFilterChange("priority", value === "all" ? "" : value)}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Seleccione prioridad" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Instalación */}
        <div className="space-y-2">
          <Label htmlFor="installation">Instalación</Label>
          <Select
            value={filters.installationId || "all"}
            onValueChange={(value) => onFilterChange("installationId", value === "all" ? "" : value)}
          >
            <SelectTrigger id="installation">
              <SelectValue placeholder="Seleccione instalación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {installations.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha desde */}
        <div className="space-y-2">
          <Label htmlFor="startDate">Fecha desde</Label>
          <Input
            id="startDate"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Fecha hasta */}
        <div className="space-y-2">
          <Label htmlFor="endDate">Fecha hasta</Label>
          <Input
            id="endDate"
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
