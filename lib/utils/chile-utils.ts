/**
 * Utilidades específicas para validaciones y formatos en Chile
 */

/**
 * Valida un RUT chileno (con o sin puntos/guión)
 * @param rut String del RUT a validar
 * @returns boolean
 */
export const validateRUT = (rut: string): boolean => {
    // Limpiar formato
    const clean = rut.replace(/[.-]/g, '');
    if (clean.length < 2) return false;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();

    // Calcular dígito verificador
    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();

    return dv === calculatedDV;
};

/**
 * Formatea un RUT al estilo XX.XXX.XXX-X
 * @param rut String del RUT a formatear
 * @returns string formateado
 */
export const formatRUT = (rut: string): string => {
    // Limpiar entrada y asegurar que no sea nula
    const value = (rut || "").replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length < 2) return value;

    const body = value.slice(0, -1);
    const dv = value.slice(-1);

    let result = '';
    let j = 0;
    for (let i = body.length - 1; i >= 0; i--) {
        if (j > 0 && j % 3 === 0) {
            result = '.' + result;
        }
        result = body.charAt(i) + result;
        j++;
    }

    return result + '-' + dv;
};

/**
 * Limpia un RUT eliminado puntos y guión para persistencia
 * @param rut String del RUT con formato
 * @returns string limpio y DV en mayúscula
 */
export const cleanRUT = (rut: string): string => {
    return (rut || "").replace(/\./g, '').toUpperCase();
};
