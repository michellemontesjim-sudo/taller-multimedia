import { NextResponse } from 'next/server';
import { subirStreamCloudinary, cloudinary } from '@/lib/cloudinary';
import { connectDB } from '@/lib/mongodb';
import Archivo from '@/models/Archivo';

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

// [ROL 3] Filtro por categoría: ?tipo=imagen | video | pdf
const FILTROS_TIPO = {
  imagen: /^image\//,
  video: /^video\//,
  pdf: /^application\/pdf$/,
};

// [ROL 3] Escapa caracteres especiales para usar el texto del usuario en una RegExp
function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * [ROL 3] GET /api/archivos
 * Query params opcionales:
 *   - tipo:  imagen | video | pdf
 *   - q:     búsqueda por título (sin distinguir mayúsculas)
 *   - orden: desc (por defecto, más recientes primero) | asc
 */
export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const tipo = searchParams.get('tipo')?.toLowerCase();
    const q = searchParams.get('q')?.trim();
    const orden = searchParams.get('orden') === 'asc' ? 1 : -1;

    if (tipo && !FILTROS_TIPO[tipo]) {
      return NextResponse.json(
        { error: 'Filtro "tipo" inválido. Usa: imagen, video o pdf.' },
        { status: 400 }
      );
    }

    const filtro = {};
    if (tipo) filtro.tipoArchivo = FILTROS_TIPO[tipo];
    if (q) filtro.titulo = { $regex: escaparRegex(q), $options: 'i' };

    await connectDB();
    const archivos = await Archivo.find(filtro).sort({ fechaSubida: orden });

    // toJSON del modelo convierte _id → id y quita __v
    return NextResponse.json(archivos);
  } catch (error) {
    console.error('Error en GET /api/archivos:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar los archivos.' },
      { status: 500 }
    );
  }
}

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

    // 6. [ROL 3] Persistencia en MongoDB con rollback:
    //    si falla el guardado, se borra el archivo recién subido
    //    para no dejar huérfanos en Cloudinary.
    try {
      await connectDB();
      const registroGuardado = await Archivo.create(metadatos);
      return NextResponse.json(registroGuardado, { status: 201 });
    } catch (errorBD) {
      console.error('Fallo al guardar en MongoDB, revirtiendo subida:', errorBD);
      await cloudinary.uploader
        .destroy(resultadoCloud.public_id, {
          resource_type: resultadoCloud.resource_type,
          invalidate: true,
        })
        .catch((errorRollback) =>
          console.error('No se pudo revertir la subida en Cloudinary:', errorRollback)
        );
      return NextResponse.json(
        { error: 'El archivo se subió pero no se pudo registrar. Se revirtió la subida.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en POST /api/archivos:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la subida del archivo.' },
      { status: 500 }
    );
  }
}
