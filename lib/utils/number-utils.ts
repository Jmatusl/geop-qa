/**
 * Utilidades para formateo y validación de números en Chile.
 * Los campos de tipo monetario (CLP) no usan decimales.
 */

/**
 * Formatea un entero con separador de miles en estilo chileno (punto).
 * Ejemplo: 1500000 → "1.500.000"
 */
export const formatCLP = (value: number | string): string => {
  const num = Math.abs(parseInt(String(value).replace(/\D/g, ""), 10));
  if (isNaN(num)) return "";
  return num.toLocaleString("es-CL");
};

/**
 * Parsea un string formateado con puntos y devuelve el entero limpio.
 * Ejemplo: "1.500.000" → 1500000
 */
export const parseCLP = (formatted: string): number => {
  const clean = formatted.replace(/\./g, "").replace(/[^\d]/g, "");
  return parseInt(clean, 10) || 0;
};

/**
 * Handler para inputs de tipo numérico entero positivo en Chile.
 * - Elimina la 'e' (notación científica), letras y signos negativos.
 * - Formatea con separador de miles (punto) en tiempo real.
 * - Devuelve el string formateado para mostrar en el input.
 *
 * Uso en onChange:
 *   const { displayValue, raw } = handleNumericInput(e.target.value);
 *   setDisplay(displayValue); // mostrar en el <input>
 *   setRaw(raw);              // guardar el número limpio
 */
export const handleNumericInput = (rawInput: string): { displayValue: string; raw: number } => {
  // 1. Eliminar todo lo que no sea dígito
  const digitsOnly = rawInput.replace(/[^0-9]/g, "");
  if (!digitsOnly) return { displayValue: "", raw: 0 };

  // 2. Convertir a número (elimina ceros a la izquierda)
  const num = parseInt(digitsOnly, 10);
  if (isNaN(num)) return { displayValue: "", raw: 0 };

  // 3. Formatear con separador de miles estilo chileno
  const formatted = num.toLocaleString("es-CL");

  return { displayValue: formatted, raw: num };
};

/**
 * Propiedades de teclado para bloquear caracteres no permitidos
 * en inputs numéricos enteros positivos.
 *
 * Uso: <input onKeyDown={blockInvalidNumericKeys} />
 */
export const blockInvalidNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Bloquear: e, E, +, -, ,, .
  if (["e", "E", "+", "-", ",", "."].includes(e.key)) {
    e.preventDefault();
  }
};
