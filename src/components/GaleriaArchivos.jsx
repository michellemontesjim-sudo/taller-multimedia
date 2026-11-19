"use client";
import { useEffect, useState } from "react";
import "./GaleriaArchivos.css";
import {
  categoriaDe,
  ETIQUETAS_CATEGORIA,
  formatearFecha,
  formatearPeso,
} from "@/lib/formato";

// Los valores coinciden con el query param ?tipo= que acepta el GET del Rol 3
const FILTROS = [
  { valor: "", etiqueta: "Todos" },
  { valor: "imagen", etiqueta: "Imágenes" },
  { valor: "video", etiqueta: "Videos" },
  { valor: "pdf", etiqueta: "PDF" },
];

/**
 * [ROL 5] Galería multimedia.
 * Consume GET /api/archivos (con ?tipo= y ?q=) y muestra cada archivo con su
 * vista previa y metadatos. También permite eliminar (DELETE /api/archivos/:id).
 *
 * `refrescar` es un número que sube cada vez que se sube un archivo nuevo;
 * al cambiar, la galería vuelve a pedir la lista.
 */
export default function GaleriaArchivos({ refrescar = 0 }) {
  const [archivos, setArchivos] = useState([]);
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error
  const [mensajeError, setMensajeError] = useState("");
  const [tipo, setTipo] = useState("");
  const [busqueda, setBusqueda] = useState(""); // lo que se escribe en el input
  const [busquedaAplicada, setBusquedaAplicada] = useState(""); // lo que se manda al servidor
  const [reintento, setReintento] = useState(0);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [aviso, setAviso] = useState(null); // { tipo: "ok" | "error", texto }

  // Espera 300 ms después de que la persona deja de escribir para no
  // llamar a la API con cada letra
  useEffect(() => {
    const temporizador = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Pide la lista cada vez que cambia un filtro, se sube un archivo o se reintenta
  useEffect(() => {
    const controlador = new AbortController();
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (busquedaAplicada) params.set("q", busquedaAplicada);

    fetch(`/api/archivos?${params.toString()}`, {
      signal: controlador.signal,
      cache: "no-store",
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          throw new Error(datos?.error || "No se pudo cargar la galería.");
        }
        if (!Array.isArray(datos)) {
          throw new Error("El servidor respondió con un formato inesperado.");
        }
        setArchivos(datos);
        setMensajeError("");
        setEstado("listo");
      })
      .catch((error) => {
        // Si la petición se canceló porque cambió un filtro, no es un error real
        if (error.name === "AbortError") return;
        setMensajeError(error.message || "Error de red al cargar la galería.");
        setEstado("error");
      });

    return () => controlador.abort();
  }, [tipo, busquedaAplicada, refrescar, reintento]);

  // El aviso (éxito/error de borrado) se esconde solo a los 5 segundos
  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  function reintentar() {
    setEstado("cargando");
    setReintento((n) => n + 1);
  }

  function limpiarFiltros() {
    setTipo("");
    setBusqueda("");
    setBusquedaAplicada("");
  }

  async function eliminar(archivo) {
    const confirmado = window.confirm(
      `¿Eliminar "${archivo.titulo}"?\nSe borrará de la nube y de la base de datos.`
    );
    if (!confirmado) return;

    setEliminandoId(archivo.id);
    setAviso(null);
    try {
      const respuesta = await fetch(`/api/archivos/${archivo.id}`, { method: "DELETE" });
      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(datos?.error || "No se pudo eliminar el archivo.");
      }
      // Se quita de la pantalla al instante, sin recargar la página
      setArchivos((anteriores) => anteriores.filter((a) => a.id !== archivo.id));
      setAviso({ tipo: "ok", texto: `"${archivo.titulo}" se eliminó de la nube y de la base de datos.` });
    } catch (error) {
      setAviso({ tipo: "error", texto: error.message || "Error de red al eliminar el archivo." });
    } finally {
      setEliminandoId(null);
    }
  }

  const hayFiltros = tipo !== "" || busquedaAplicada !== "";

  return (
    <section className="galeria" aria-labelledby="titulo-galeria">
      <h2 id="titulo-galeria" className="galeria-titulo">Galería multimedia</h2>

      <div className="galeria-controles">
        <div className="galeria-filtros" role="group" aria-label="Filtrar por tipo de archivo">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.valor || "todos"}
              type="button"
              className="galeria-filtro"
              aria-pressed={tipo === filtro.valor}
              onClick={() => setTipo(filtro.valor)}
            >
              {filtro.etiqueta}
            </button>
          ))}
        </div>

        <div className="galeria-busqueda">
          <label htmlFor="busqueda-titulo">Buscar por título</label>
          <input
            id="busqueda-titulo"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. logo, informe, intro…"
          />
        </div>
      </div>

      {aviso && (
        <p
          role="status"
          className={aviso.tipo === "ok" ? "galeria-aviso-ok" : "galeria-aviso-error"}
        >
          {aviso.texto}
        </p>
      )}

      {estado === "cargando" && (
        <p role="status" className="galeria-mensaje">Cargando archivos…</p>
      )}

      {estado === "error" && (
        <div role="alert" className="galeria-error">
          <p>{mensajeError}</p>
          <button type="button" className="galeria-boton" onClick={reintentar}>
            Reintentar
          </button>
        </div>
      )}

      {estado === "listo" && archivos.length === 0 && (
        <div className="galeria-mensaje">
          {hayFiltros ? (
            <>
              <p>No se encontraron archivos con esos filtros.</p>
              <button type="button" className="galeria-boton" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </>
          ) : (
            <p>Aún no hay archivos. Sube el primero con el formulario de arriba.</p>
          )}
        </div>
      )}

      {estado === "listo" && archivos.length > 0 && (
        <>
          <p className="galeria-contador" aria-live="polite">
            {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"}
          </p>
          <div className="galeria-cuadricula">
            {archivos.map((archivo) => (
              <TarjetaArchivo
                key={archivo.id}
                archivo={archivo}
                eliminando={eliminandoId === archivo.id}
                onEliminar={() => eliminar(archivo)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// Una tarjeta: vista previa según el tipo + metadatos + botón de borrar
function TarjetaArchivo({ archivo, eliminando, onEliminar }) {
  const categoria = categoriaDe(archivo.tipoArchivo);

  return (
    <article className="galeria-tarjeta" aria-busy={eliminando}>
      <div className="galeria-vista">
        {categoria === "imagen" && (
          // Se usa <img> normal porque la URL viene de Cloudinary y next/image
          // pediría configurar el dominio en next.config.mjs
          // eslint-disable-next-line @next/next/no-img-element
          <img src={archivo.url} alt={archivo.titulo} loading="lazy" />
        )}
        {categoria === "video" && (
          <video src={archivo.url} controls preload="metadata">
            Tu navegador no soporta el reproductor de video.
          </video>
        )}
        {categoria === "pdf" && <VistaPdf archivo={archivo} />}
        {categoria === "otro" && <span className="galeria-icono">Archivo</span>}
      </div>

      <div className="galeria-cuerpo">
        <h3 className="galeria-nombre" title={archivo.titulo}>{archivo.titulo}</h3>
        <dl className="galeria-metadatos">
          <div><dt>Tipo</dt><dd>{ETIQUETAS_CATEGORIA[categoria]}</dd></div>
          <div><dt>Peso</dt><dd>{formatearPeso(archivo.tamanoBytes)}</dd></div>
          <div><dt>Subido</dt><dd>{formatearFecha(archivo.fechaSubida)}</dd></div>
          <div><dt>Autor</dt><dd>{archivo.subidoPor}</dd></div>
        </dl>
        <button
          type="button"
          className="galeria-boton-eliminar"
          onClick={onEliminar}
          disabled={eliminando}
          aria-label={`Eliminar ${archivo.titulo}`}
        >
          {eliminando ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </article>
  );
}

// Para los PDF: Cloudinary puede entregar la primera página como .jpg si se
// cambia la extensión de la URL. Si no carga, se muestra un ícono de respaldo.
function VistaPdf({ archivo }) {
  const [miniaturaFalla, setMiniaturaFalla] = useState(false);
  const urlMiniatura = /\.pdf$/i.test(archivo.url)
    ? archivo.url.replace(/\.pdf$/i, ".jpg")
    : null;

  return (
    <>
      {urlMiniatura && !miniaturaFalla ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlMiniatura}
          alt={`Primera página de ${archivo.titulo}`}
          loading="lazy"
          onError={() => setMiniaturaFalla(true)}
        />
      ) : (
        <span className="galeria-icono">PDF</span>
      )}
      <a
        className="galeria-enlace-pdf"
        href={archivo.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir PDF
      </a>
    </>
  );
}
