"use client";
import { useRef, useState } from "react";

const MAX_MB = 20;
const TIPOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
];

export default function FormularioSubida({ onSubido }) {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [alerta, setAlerta] = useState(null); // { tipo: "error" | "ok", texto }

  function validar(f) {
    if (!TIPOS.includes(f.type))
      return "Formato no permitido. Usa JPG, PNG, WEBP, MP4 o PDF.";
    if (f.size > MAX_MB * 1024 * 1024)
      return `El archivo supera los ${MAX_MB} MB.`;
    return null;
  }

  function seleccionar(f) {
    if (!f) return;
    const error = validar(f);
    if (error) {
      setArchivo(null);
      setAlerta({ tipo: "error", texto: error });
      return;
    }
    setArchivo(f);
    setProgreso(0);
    setAlerta(null);
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastrando(false);
    seleccionar(e.dataTransfer.files[0]);
  }

  function subir() {
    if (!archivo || cargando) return;

    const formData = new FormData();
    formData.append("archivo", archivo); // debe coincidir con el campo del Rol 2

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/archivos");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgreso(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setCargando(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setAlerta({ tipo: "ok", texto: "Archivo subido correctamente." });
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = "";
        onSubido?.();
      } else {
        let msg = "Error al subir el archivo.";
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        setAlerta({ tipo: "error", texto: msg });
      }
    };

    xhr.onerror = () => {
      setCargando(false);
      setAlerta({ tipo: "error", texto: "Error de red. Intenta de nuevo." });
    };

    setCargando(true);
    setAlerta(null);
    xhr.send(formData);
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${arrastrando ? "#2563eb" : "#888"}`,
          background: arrastrando ? "#eff6ff" : "transparent",
          color: "#333",
          borderRadius: 8,
          padding: "2rem",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        {archivo
          ? `${archivo.name} (${(archivo.size / 1024 / 1024).toFixed(2)} MB)`
          : "Arrastra un archivo aquí o haz clic para seleccionarlo"}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={TIPOS.join(",")}
          onChange={(e) => seleccionar(e.target.files[0])}
        />
      </div>

      {cargando && (
        <div style={{ marginTop: 12 }}>
          <div style={{ background: "#ddd", borderRadius: 4, height: 10 }}>
            <div
              style={{
                width: `${progreso}%`,
                height: "100%",
                background: "#2563eb",
                borderRadius: 4,
                transition: "width .2s",
              }}
            />
          </div>
          <small>Subiendo… {progreso}%</small>
        </div>
      )}

      {alerta && (
        <p
          role="alert"
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 6,
            background: alerta.tipo === "ok" ? "#dcfce7" : "#fee2e2",
            color: alerta.tipo === "ok" ? "#166534" : "#991b1b",
          }}
        >
          {alerta.texto}
        </p>
      )}

      <button
        onClick={subir}
        disabled={!archivo || cargando}
        style={{ marginTop: 12, padding: "10px 20px", cursor: "pointer" }}
      >
        {cargando ? "Subiendo…" : "Subir archivo"}
      </button>
    </div>
  );
}