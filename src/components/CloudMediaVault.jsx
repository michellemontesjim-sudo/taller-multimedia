"use client";
import { useState } from "react";
import FormularioSubida from "@/components/FormularioSubida";
import GaleriaArchivos from "@/components/GaleriaArchivos";

// [ROL 5] Une el formulario de subida (Rol 4) con la galería (Rol 5).
// Cuando el formulario termina de subir un archivo llama a onSubido, y aquí
// se sube un contador que le avisa a la galería que debe volver a cargar.
export default function CloudMediaVault() {
  const [version, setVersion] = useState(0);

  return (
    <main>
      <h1 style={{ textAlign: "center", marginTop: "2rem", fontSize: "1.75rem", fontWeight: 700 }}>
        Cloud Media Vault
      </h1>
      <FormularioSubida onSubido={() => setVersion((v) => v + 1)} />
      <GaleriaArchivos refrescar={version} />
    </main>
  );
}
