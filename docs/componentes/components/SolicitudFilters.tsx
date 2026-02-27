"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useShipsQuery } from "@/hooks/useShipsQuery";
import { useAreasQuery } from "@/hooks/useArea";
import { type SolicitudesFilter } from "@/validations/solicitud-insumos/schemas";

interface SolicitudFiltersProps {
  filters: Partial<SolicitudesFilter>;
  onApply: (filters: Partial<SolicitudesFilter>) => void;
  onReset: () => void;
  // selectShips permite limitar las instalaciones visibles según permisos del usuario
  selectShips?: {
    isAllowed: boolean;
    shipId?: number | null;
    userOnShip?: any[];
    shipSelect?: { id: number; name: string }[];
  };
}

export default function SolicitudFilters({ filters, onApply, onReset, selectShips }: SolicitudFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Partial<SolicitudesFilter>>(filters);
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(filters.fechaDesde);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(filters.fechaHasta);
  const [isFechaDesdeOpen, setIsFechaDesdeOpen] = useState(false);
  const [isFechaHastaOpen, setIsFechaHastaOpen] = useState(false);

  // Obtener datos para los selectores usando hooks reutilizables
  const { data: shipsResp, isLoading: loadingShips } = useShipsQuery();
  const { data: areasResp, isLoading: loadingAreas } = useAreasQuery();
  const ships = shipsResp ?? [];
  // Si selectShips indica restricción, construir la lista permitida
  let visibleShips: any[] = ships as any[];
  if (selectShips && selectShips.isAllowed === false) {
    if (selectShips.shipSelect && selectShips.shipSelect.length > 0) {
      visibleShips = selectShips.shipSelect as any;
    } else if (selectShips.userOnShip && selectShips.userOnShip.length > 0) {
      const ids = selectShips.userOnShip.map((s: any) => s.shipId);
      visibleShips = ships.filter((s) => ids.includes(s.id));
    } else if (selectShips.shipId) {
      visibleShips = ships.filter((s) => s.id === selectShips.shipId);
    } else {
      // Si está restringido pero no hay datos, mostrar lista vacía
      visibleShips = [];
    }
  }
  const areas = areasResp ?? [];

  useEffect(() => {
    setLocalFilters(filters);
    setFechaDesde(filters.fechaDesde);
    setFechaHasta(filters.fechaHasta);
  }, [filters]);

  const handleFilterChange = (key: keyof SolicitudesFilter, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    onApply({
      ...localFilters,
      fechaDesde,
      fechaHasta,
    });
  };

  const handleReset = () => {
    setLocalFilters({});
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    onReset();
  };

  const statusOptions = [
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "EN_COTIZACION", label: "En Cotización" },
    { value: "APROBADA", label: "Aprobada" },
    { value: "RECHAZADA", label: "Rechazada" },
  ];

  const prioridadOptions = [
    { value: "BAJA", label: "Baja" },
    { value: "NORMAL", label: "Normal" },
    { value: "ALTA", label: "Alta" },
    { value: "URGENTE", label: "Urgente" },
  ];

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select value={localFilters.status || "ALL"} onValueChange={(value) => handleFilterChange("status", value === "ALL" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridad */}
        {/* <div className="space-y-2">
          <Label htmlFor="prioridad">Prioridad</Label>
          <Select value={localFilters.prioridad || "ALL"} onValueChange={(value) => handleFilterChange("prioridad", value === "ALL" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las prioridades</SelectItem>
              {prioridadOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}

        {/* Instalación */}
        <div className="space-y-2">
          <Label htmlFor="shipId">Instalación</Label>
          <Select value={localFilters.shipId?.toString() || "ALL"} onValueChange={(value) => handleFilterChange("shipId", value === "ALL" ? undefined : parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar instalación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las instalaciones</SelectItem>
              {visibleShips.map((ship: any) => (
                <SelectItem key={ship.id} value={ship.id.toString()}>
                  {ship.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Área */}
        {/* <div className="space-y-2">
          <Label htmlFor="areaId">Área</Label>
          <Select value={localFilters.areaId?.toString() || "ALL"} onValueChange={(value) => handleFilterChange("areaId", value === "ALL" ? undefined : parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las áreas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id.toString()}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}
        <div className="space-y-2">
          <Label>Fecha desde</Label>
          <Popover open={isFechaDesdeOpen} onOpenChange={setIsFechaDesdeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaDesde && "text-muted-foreground")} onClick={() => setIsFechaDesdeOpen((prev) => !prev)}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaDesde ? format(fechaDesde, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaDesde}
                onSelect={(date) => {
                  setFechaDesde(date);
                  if (date) setIsFechaDesdeOpen(false);
                }}
                initialFocus
                locale={es}
                // disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Fecha hasta</Label>
          <Popover open={isFechaHastaOpen} onOpenChange={setIsFechaHastaOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaHasta && "text-muted-foreground")} onClick={() => setIsFechaHastaOpen((prev) => !prev)}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaHasta ? format(fechaHasta, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaHasta}
                onSelect={(date) => {
                  setFechaHasta(date);
                  if (date) setIsFechaHastaOpen(false);
                }}
                initialFocus
                locale={es}
                // disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>

      {/* Botones */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleReset} className="">
          <X className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
        <Button className="bg-custom-blue" onClick={handleApply}>
          <Check className="mr-2 h-4 w-4" />
          Aplicar
        </Button>
      </div>
    </div>
  );
}
