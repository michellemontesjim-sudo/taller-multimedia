import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cloudinary } from '@/lib/cloudinary';
import { connectDB } from '@/lib/mongodb';
import Archivo from '@/models/Archivo';

/**
 * Cloudinary necesita el resource_type correcto para borrar.
 * El POST sube con resource_type 'auto', que guarda:
 *   - video/*          → 'video'
 *   - image/* y PDF    → 'image'
 */
function tipoRecursoCloudinary(tipoArchivo = '') {
  return tipoArchivo.startsWith('video/') ? 'video' : 'image';
}

/**
 * Eliminación sincronizada: primero Cloudinary (por publicId), luego MongoDB.
 * Si la nube falla, el registro NO se borra (así no se pierde la referencia).
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params; // En Next 15+ params es una promesa

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    await connectDB();
    const archivo = await Archivo.findById(id);

    if (!archivo) {
      return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
    }

    // 1. Borrar en Cloudinary
    const resultadoCloud = await cloudinary.uploader.destroy(archivo.publicId, {
      resource_type: tipoRecursoCloudinary(archivo.tipoArchivo),
      invalidate: true, // limpia la caché del CDN
    });

    // 'ok' = borrado; 'not found' = ya no estaba en la nube (no queda huérfano)
    if (resultadoCloud.result !== 'ok' && resultadoCloud.result !== 'not found') {
      return NextResponse.json(
        { error: 'No se pudo eliminar el archivo en la nube. El registro se conservó.' },
        { status: 502 }
      );
    }

    // 2. Borrar en MongoDB
    await Archivo.findByIdAndDelete(id);

    return NextResponse.json({ mensaje: 'Archivo eliminado de la nube y de la base de datos.', id });
  } catch (error) {
    console.error('Error en DELETE /api/archivos/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno al eliminar el archivo.' },
      { status: 500 }
    );
  }
}
