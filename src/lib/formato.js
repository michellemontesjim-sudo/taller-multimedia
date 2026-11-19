//Funciones de ayuda para mostrar los metadatos en la galería.

// Convierte bytes a un texto legible: "512.0 KB""
export function formatearPeso(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Convierte la fecha ISO que guarda MongoDB a algo como "14 de nov de 2026, 4:30 p. m."
export function formatearFecha(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";
  return fecha
    .toLocaleString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    // Espacio que no se parte, para que "a. m." no quede en dos líneas
    .replace(/([ap])\.\s+m\./gi, "$1. m.");
}

// A partir del tipo MIME (image/png, video/mp4...) saca la categoría de la galería
export function categoriaDe(tipoMime = "") {
  if (tipoMime.startsWith("image/")) return "imagen";
  if (tipoMime.startsWith("video/")) return "video";
  if (tipoMime === "application/pdf") return "pdf";
  return "otro";
}

export const ETIQUETAS_CATEGORIA = {
  imagen: "Imagen",
  video: "Video",
  pdf: "PDF",
  otro: "Archivo",
};
