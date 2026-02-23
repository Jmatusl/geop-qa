"use client";

import React, { useRef, useState, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SignatureCanvasProps {
  onSave: (base64: string) => void;
  onClear?: () => void;
}

export function SignatureCanvas({ onSave, onClear }: SignatureCanvasProps) {
  const sigPad = useRef<SignaturePad>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.offsetWidth,
          height: 300,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const clear = () => {
    sigPad.current?.clear();
    setIsEmpty(true);
    if (onClear) onClear();
  };

  const save = () => {
    if (sigPad.current?.isEmpty()) return;

    // Obtener la imagen recortada para eliminar espacios en blanco
    const trimmedCanvas = sigPad.current?.getTrimmedCanvas();
    if (trimmedCanvas) {
      const base64 = trimmedCanvas.toDataURL("image/png");
      onSave(base64);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full" ref={containerRef}>
      <Card className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
        {canvasSize.width > 0 && (
          <SignaturePad
            ref={sigPad}
            onBegin={handleBegin}
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              className: "signature-canvas",
            }}
            penColor="black"
          />
        )}

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm font-medium italic">Use su mouse, dedo o lápiz digital para firmar aquí...</p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={clear} className="h-10 px-4 rounded-md gap-2" disabled={isEmpty}>
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </Button>
        <Button onClick={save} size="sm" className="h-10 px-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-900/10" disabled={isEmpty}>
          <Check className="h-4 w-4" />
          Usar esta firma
        </Button>
      </div>
    </div>
  );
}
