import imageCompression from "browser-image-compression";

/**
 * Redimensiona una imagen a un ancho máximo manteniendo la proporción.
 * @param file Archivo de imagen original
 * @param maxWidth Ancho máximo en píxeles
 * @returns Promesa con el archivo comprimido/redimensionado
 */
export async function resizeImage(file: File, maxWidth: number = 256): Promise<File> {
  const options = {
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: "image/webp", // Usamos webp por eficiencia de espacio en base64
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Error al redimensionar imagen:", error);
    throw error;
  }
}

/**
 * Convierte un archivo a su representación en string Base64.
 * @param file Archivo a convertir
 * @returns Promesa con el string base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Valida si un string es una URL válida.
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true; // Allow relative paths
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
