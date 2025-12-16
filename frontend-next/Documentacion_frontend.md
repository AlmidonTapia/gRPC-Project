### Archivo 3: `DOCUMENTACION_FRONTEND.md`
*Este archivo explica la interfaz de usuario, el uso de TypeScript y la integración visual.*

```markdown
# 🎨 Documentación del Frontend (Next.js Dashboard)

La interfaz de usuario es un Dashboard moderno diseñado para monitorear el sistema distribuido y operar las ventas.

## 🛠️ Stack Tecnológico
* **Framework:** Next.js 14 (App Router).
* **Lenguaje:** TypeScript (`.tsx`).
* **Estilos:** Tailwind CSS.
* **Integración:** API Routes como Proxy gRPC.

## 🧩 Componentes y Funcionalidad

### 1. Arquitectura de Proxy (API Routes)
Dado que los navegadores no soportan gRPC nativamente, Next.js actúa como un puente:
* El Frontend hace una petición `fetch` (JSON) a `/api/venta`.
* El servidor de Next.js (archivo `route.ts`) recibe la petición, la convierte a Protobuf y la envía al Backend gRPC.
* La respuesta hace el camino inverso.

### 2. Monitor en Tiempo Real
El Dashboard incluye una sección de **"Estado del Cluster"** que visualiza los 5 nodos.
* **Polling:** Utiliza `setInterval` y `useEffect` para consultar el estado cada 2 segundos.
* **Feedback Visual:**
    * 🟢 **Verde (UP):** El nodo está respondiendo correctamente.
    * 🔴 **Rojo (DOWN):** El nodo ha dejado de responder (simulación de fallo).
    * Si se detiene un contenedor Docker, la UI lo refleja automáticamente sin recargar la página.

### 3. Interfaz de Usuario (UI)
Diseñada con un enfoque "SaaS Minimalista":
* **Tipado Estricto:** Se definieron interfaces TypeScript (`interface Venta`, `interface Nodo`) para evitar errores de desarrollo.
* **Feedback al Usuario:** Mensajes de éxito/error flotantes y estados de carga (`loading`) en los botones.
* **Filtrado Dinámico:** La tabla de historial permite filtrar las ventas por `Región` en el lado del cliente, facilitando la visualización de la distribución de datos.

### 4. Estructura de Directorios Clave
```bash
frontend-next/
├── app/
│   ├── api/
│   │   ├── estado/route.ts  # Endpoint para monitoreo
│   │   └── venta/route.ts   # Endpoint para CRUD de ventas
│   ├── layout.tsx           # Configuración global
│   └── page.tsx             # Dashboard principal
├── proto/
│   └── venta.proto          # Contrato compartido con el backend