"use client";

import React, { useState } from "react";

export default function ConfigFormClient({ defaultDays }: { defaultDays: number }) {
  const [value, setValue] = useState<number>(defaultDays);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/insumos-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultDeadlineDays: value }),
      });
      const json = await res.json();
      if (json.success) setMessage("Guardado");
      else setMessage(json.error || "Error");
    } catch (err) {
      console.error(err);
      setMessage("Error de comunicación");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-card border border-border rounded-lg p-4">
      <label className="block text-sm font-medium">Días por defecto para Fecha Límite de Respuesta</label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          className="form-input w-full p-2 border rounded"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
        <span className="text-sm text-muted-foreground">Si está vacío, el valor por defecto es 7 días.</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {message && <span className="text-sm">{message}</span>}
      </div>
    </form>
  );
}
