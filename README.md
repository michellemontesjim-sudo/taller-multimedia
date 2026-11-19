# Taller Práctico Colaborativo: Gestor de Activos Multimedia en la Nube (Cloud Media Vault)
Integrantes:
- Michelle Montes Jiménez
- Sebastián Vargas Montenegro
- David Alejandro Potes Muñoz
- Juan Pablo Alba Ballesteros

## Roles desempeñados
1. Rol 1 — Arquitecto Cloud y Base de Datos:: Michelle Montes Jiménez
○ Configurar el proveedor de almacenamiento en la nube (ej. Cloudinary) y la instancia 
de base de datos (Neon.tech o MongoDB Atlas). 
○ Diseñar el esquema/modelo de metadatos (id, titulo, url, publicId, tipoArchivo, 
tamanoBytes, fechaSubida, subidoPor) y administrar las variables de entorno (.env 
y .env.example).

2. Rol 2 — Desarrollador Backend (Ingesta y Subida Cloud): Michelle Montes Jiménez
○ Implementar el endpoint POST /api/archivos encargado de recibir el formulario 
multipart/form-data (multer en Express o formData() en Next.js). 
○ Gestionar la transferencia segura del binario hacia el proveedor cloud y validar el 
peso máximo y tipos MIME permitidos en el servidor.

3. Rol 3 — Desarrollador Backend (Persistencia CRUD y Sincronización): Sebastián Vargas Montenegro
○ Conectar la respuesta del proveedor cloud con la base de datos para guardar los 
metadatos tras confirmar la subida. 
○ Implementar los endpoints GET /api/archivos (consulta ordenada y filtros) y 
DELETE /api/archivos/:id (eliminación sincronizada tanto en el storage cloud como 
en la base de datos).

4. Rol 4 — Desarrollador Frontend (Formulario de Carga y Validaciones): David Alejandro Potes Muñoz
○ Construir la interfaz de subida en React/Next.js con soporte de selección de archivo 
o Drag & Drop. 
○ Empaquetar los datos con FormData, validar peso/formato antes del envío y 
gestionar estados visuales de carga (loading spinner / barra de progreso) y alertas de 
retroalimentación.

5. Rol 5 — Desarrollador Frontend (Galería Multimedia, Filtros y QA): Juan Pablo Alba Ballesteros
○ Construir la galería dinámica que consume GET /api/archivos, renderizando 
miniaturas de imágenes, reproductor video para videos y previsualización/enlace 
para PDFs junto con sus metadatos. 
○ Implementar filtros por tipo de archivo y búsqueda por título, además de liderar las 
pruebas de integración y limpieza de errores en consola antes de la entrega.

## Explicación Arquitectura elegida
El proyecto implementa una arquitectura de **Monolito Fullstack (Ruta A)** basada en **Next.js (App Router)**, acoplada a dos servicios externos en la nube bajo un modelo de **almacenamiento desacoplado**: **Cloudinary** para la gestión de objetos binarios y **MongoDB Atlas** para la persistencia de metadatos.

### Capas del Sistema y Flujo de Datos

El sistema se divide en tres capas con responsabilidades aisladas:

#### A. Capa de Presentación (Frontend en React)
* **Carga (`FormularioSubida.jsx`):** Permite seleccionar o arrastrar archivos (*Drag & Drop*), realiza una validación previa en el cliente (formato y peso máximo), empaqueta el binario junto con el título y el autor en un objeto `FormData` y muestra estados de carga en tiempo real.
* **Visualización y Gestión (`GaleriaArchivos.jsx`):** Consume la API para renderizar dinámicamente miniaturas de imágenes, reproductores nativos para video y vistas previas/enlaces para documentos PDF, además de ofrecer filtros por tipo de archivo, búsqueda por título y eliminación de registros.

#### B. Capa de Lógica y API REST (Backend en Next.js Route Handlers)
* **`POST /api/archivos` (Ingesta segura):** Recibe el `FormData`, valida nuevamente en el servidor que el tipo MIME esté en la lista blanca (imágenes, MP4/WebM o PDF) y que el tamaño no supere el límite establecido. Convierte el archivo en un `Buffer` en memoria y lo transmite mediante un flujo cifrado (`upload_stream`) hacia Cloudinary. Una vez obtenida la respuesta de la nube, guarda los metadatos resultantes en MongoDB.
* **`GET /api/archivos` (Consulta):** Recupera desde MongoDB la lista de archivos ordenados cronológicamente, aplicando filtros dinámicos por categoría o coincidencias de texto en el título.
* **`DELETE /api/archivos/[id]` (Sincronización):** Garantiza la integridad referencial eliminando primero el binario físico en Cloudinary (usando su `publicId` y tipo de recurso) y posteriormente borrando su documento asociado en la base de datos.

#### C. Capa de Persistencia Desacoplada (Servicios Cloud)
* **Almacenamiento de Objetos (Cloudinary):** Aloja los archivos multimedia pesados fuera del servidor de la aplicación y los entrega optimizados a través de una CDN mediante URLs seguras (`secure_url`).
* **Base de Datos de Metadatos (MongoDB Atlas + Mongoose):** Almacena únicamente la información ligera y estructurada de cada archivo (`id`, `titulo`, `url`, `publicId`, `tipoArchivo`, `tamanoBytes`, `fechaSubida`, `subidoPor`), permitiendo consultas y búsquedas rápidas sin sobrecargar el almacenamiento binario.

## Intrucciones de ejecución
Sigue estos pasos para instalar y ejecutar el proyecto en un entorno local:

### 1. Prerrequisitos
* **Node.js** (versión 18.18 o superior) y **npm** instalados.
* Una cuenta gratuita en **MongoDB Atlas** con un clúster activo y acceso de red habilitado (`0.0.0.0/0`).
* Una cuenta gratuita en **Cloudinary** (con la opción *"Allow delivery of PDF and ZIP files"* habilitada en **Settings → Security** para permitir la previsualización de documentos PDF).

### 2. Clonar el repositorio e instalar dependencias
Abre una terminal, clona el proyecto e instala los paquetes necesarios:

git clone <URL_DEL_REPOSITORIO>
cd taller-multimedia
npm install

### Variables de entorno
Crea un archivo llamado .env.local en la raíz del proyecto (puedes guiarte con .env.example) y agrega tus credenciales reales de MongoDB Atlas y Cloudinary:

#MongoDB Atlas (reemplaza usuario, contraseña y nombre de la BD)
MONGODB_URI="mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/taller_multimedia?retryWrites=true&w=majority"

#Cloudinary Dashboard
CLOUDINARY_CLOUD_NAME="tu_cloud_name"
CLOUDINARY_API_KEY="tu_api_key"
CLOUDINARY_API_SECRET="tu_api_secret"

Para iniciar el servidor de desarrollo:
```bash
npm run dev

Una vez que la terminal indique que el servidor está listo, abre tu navegador en:
http://localhost:3000

Endpoints disponibles de la API REST
GET /api/archivos — Lista todos los archivos almacenados (soporta parámetros de consulta para filtrar por tipo y buscar por título).

POST /api/archivos — Recibe un formulario multipart/form-data con los campos archivo, titulo y subidoPor, valida el formato/peso en el servidor, sube el binario a Cloudinary y persiste sus metadatos en MongoDB.

DELETE /api/archivos/[id] — Elimina el archivo de forma sincronizada tanto en Cloudinary como en MongoDB Atlas.
