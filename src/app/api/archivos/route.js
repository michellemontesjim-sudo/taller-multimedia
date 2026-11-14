import { NextResponse } from 'next/server';
import { subirStreamCloudinary } from '@/lib/cloudinary';
// [ROL 3] Descomentar estas 2 líneas al conectar persistencia en MongoDB:
// import { connectDB } from '@/lib/mongodb';
// import Archivo from '@/models/Archivo';

const TIPOS_MIME_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

const MAX_TAMANO_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const archivo = formData.get('archivo');
    const titulo = formData.get('titulo')?.toString().trim();
    const subidoPor = formData.get('subidoPor')?.toString().trim();

    // 1. Validación de presencia
    if (!archivo || typeof archivo === 'string' || archivo.size === 0) {
      return NextResponse.json(
        { error: 'Debes adjuntar un archivo válido en el campo "archivo".' },
        { status: 400 }
      );
    }

    // 2. Validación de tipo MIME
    if (!TIPOS_MIME_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido (${archivo.type}). Solo imágenes, videos MP4/WebM o PDF.` },
        { status: 400 }
      );
    }

    // 3. Validación de peso máximo
    if (archivo.size > MAX_TAMANO_BYTES) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 20 MB.' },
        { status: 413 }
      );
    }

    // 4. Conversión a Buffer y subida a Cloudinary
    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resultadoCloud = await subirStreamCloudinary(buffer);

    // 5. Contrato de metadatos listo para persistencia
    const metadatos = {
      titulo: titulo || archivo.name,
      url: resultadoCloud.secure_url,
      publicId: resultadoCloud.public_id,
      tipoArchivo: archivo.type,
      tamanoBytes: archivo.size,
      fechaSubida: new Date().toISOString(),
      subidoPor: subidoPor || 'Anónimo',
    };

    // [ROL 3] Reemplazar este return por el guardado en MongoDB:
    // await connectDB();
    // const registroGuardado = await Archivo.create(metadatos);
    // return NextResponse.json(registroGuardado, { status: 201 });

    return NextResponse.json(metadatos, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/archivos:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la subida del archivo.' },
      { status: 500 }
    );
  }
}