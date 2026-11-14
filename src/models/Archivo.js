import mongoose from 'mongoose';

const ArchivoSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    tipoArchivo: {
      type: String,
      required: true, // MIME type: image/png, video/mp4, application/pdf, etc.
    },
    tamanoBytes: {
      type: Number,
      required: true,
    },
    fechaSubida: {
      type: Date,
      default: Date.now,
    },
    subidoPor: {
      type: String,
      required: [true, 'El autor es obligatorio'],
      trim: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export default mongoose.models.Archivo || mongoose.model('Archivo', ArchivoSchema);