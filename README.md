# Documentación del Sistema de Ventas Distribuido
<img width="2721" height="2006" alt="localhost_3000_" src="https://github.com/user-attachments/assets/216f0bc1-2a67-4b45-8501-003f794c68df" />


## 1. Visión General del Proyecto
Este proyecto simula un sistema de alta disponibilidad para el registro y monitoreo de ventas. Utiliza una **arquitectura híbrida**: la base de datos corre en un cluster de contenedores Docker, mientras que las aplicaciones (Backend y Frontend) se ejecutan localmente en la máquina anfitriona.

### Tecnologías Principales
* **Frontend:** Next.js 14 (React) con Tailwind CSS **[Ejecución Local]**.
* **Backend:** Node.js puro implementando el protocolo **gRPC** **[Ejecución Local]**.
* **Base de Datos:** Cluster de **Apache Cassandra** (5 Nodos) con replicación.
* **Infraestructura:** Docker & Docker Compose (Solo para la capa de datos).

---

## 2. Arquitectura del Sistema

El flujo de datos atraviesa el entorno local y el entorno virtualizado:

1. **Cliente (Navegador):** Interactúa con la interfaz en `localhost:3000`.
2. **API Gateway (Next.js):** Recibe HTTP y conecta al Backend local vía gRPC (`localhost:50051`).
3. **Backend gRPC:** Procesa la lógica y se conecta al Cluster Cassandra mediante los puertos expuestos en el host (`localhost:9042` a `9046`).
4. **Cassandra Cluster (Docker):** Los contenedores reciben la data a través del mapeo de puertos y replican la información internamente en la red de Docker.
---

## 3. Infraestructura (Docker & Cassandra)

La infraestructura se define en `docker-compose.yml`. El cluster está diseñado para ser autónomo y autorreparable.

### Componentes Clave:
* **Red Personalizada (`red-bd-distribuida`):** Usamos una subred con IPs estáticas (`172.25.0.0/16`) para evitar problemas de descubrimiento (gossip) entre nodos cuando se reinician.
* **Nodos de Cassandra (5 Contenedores):**
    * Cada nodo expone su puerto interno `9042` a un puerto distinto en tu PC (`9042`, `9043`, `9044`, `9045`, `9046`).
    * **Objetivo:** Permitir que el Backend (que corre fuera de Docker) pueda conectarse a cualquiera de los nodos.
* **Inicializador Automático (`cassandra-init`):**
    * Es un contenedor efímero.
    * **Lógica:** Espera a que exista un **Quorum** (Nodo 1 y Nodo 2 saludables) para asegurar consistencia.
    * **Acción:** Ejecuta el script `init.cql` que crea el *Keyspace* y la *Tabla* automáticamente. Luego se apaga.

---

## 4. Backend (Lógica y Comunicación)

El cerebro del sistema, ubicado en `/backend-grpc-service`. Se ejecuta como un proceso de Node.js en tu máquina.

### Protocolo gRPC (`venta.proto`)
Define el contrato estricto de comunicación.
* **Servicios:** `RegistrarVenta`, `ListarVentas`, `ObtenerEstadoNodos`.
* **Mensajes:** Estructuras tipadas (string, float) que incluyen los nuevos datos del cliente (`cliente_nombre`, `cliente_dni_ruc`, etc.).

### Servidor (`server.js`)
* **Conexión a BD:** Utiliza `cassandra-driver` con políticas de balanceo de carga (*RoundRobin*) y lista blanca de IPs.
* **Healthcheck TCP:** Implementa una función personalizada utilizando `net.Socket` para verificar si los puertos `9042` de los nodos están abiertos, permitiendo al frontend saber qué nodos están "UP" o "DOWN" en tiempo real.
* **Lógica de Negocio:**
    * Genera UUIDs únicos para cada venta.
    * Inserta datos con consistencia `LOCAL_ONE` (prioriza velocidad).
    * Transforma los resultados de Cassandra a objetos JSON limpios.

---

## 5. Frontend (Interfaz y Sincronización)

La cara del sistema, ubicada en /frontend-next. Se ejecuta como un servidor de desarrollo Next.js en tu máquina.

### Interfaz de Usuario (`page.tsx`)
* **Diseño:** Dashboard moderno con indicadores de estado en tiempo real.
* **Gestión de Estado:** Usa `useState` para manejar el formulario, la lista de ventas y el estado de los nodos.
* **Polling (Sincronización):**
    * `setInterval` cada **2 segundos**: Consulta la salud de los servidores.
    * `setInterval` cada **5 segundos**: Actualiza la tabla de ventas.
    * Esto simula una experiencia "tiempo real" sin la complejidad de WebSockets.

### API Routes (`api/venta/route.ts` y `api/estado/route.ts`)
Next.js actúa como intermediario. El navegador no puede hablar gRPC directamente, por lo que estas rutas:
1.  Reciben JSON del `fetch` del cliente.
2.  **Patrón Singleton:** Mantienen una única conexión gRPC abierta (reutilizando el cliente) para no saturar el servidor.
3.  Convierten los tipos de datos (ej. `precio` de String a Float).
4.  Envían la petición al contenedor `backend` y devuelven la respuesta.

---

## 6. Base de Datos (Modelo de Datos)

El esquema CQL está optimizado para lecturas rápidas ordenadas por fecha.

```sql
CREATE TABLE ventas (
    region text,           -- Partition Key (Agrupa datos por zona física)
    fecha timestamp,       -- Clustering Key (Ordena descendentemente)
    id_venta uuid,         -- Clustering Key (Asegura unicidad)
    pais text,
    producto text,
    precio float,
    cliente_nombre text,
    cliente_apellido text,
    cliente_dni_ruc text,
    PRIMARY KEY ((region), fecha, id_venta)
) WITH CLUSTERING ORDER BY (fecha DESC, id_venta ASC);
```
### Detalles de la Clave Primaria:
*   **Partition Key (`region`):** Permite que el cluster distribuya la carga. Las ventas de diferentes regiones pueden vivir en nodos distintos, optimizando el almacenamiento físico.
*   **Clustering Key (`fecha DESC`):** Optimiza el dashboard, devolviendo automáticamente las ventas más recientes sin costo computacional adicional en la consulta (evita el uso de `ORDER BY` en tiempo de ejecución).

---

## 7. Cómo Ejecutar el Proyecto

Al no estar todo dockerizado, necesitas levantar los servicios en 3 terminales distintas.

### Requisitos Previos
*   Tener instalado [Docker Desktop](www.docker.com).
*   Contar con la estructura de carpetas: `/frontend`, `/backend`, `/proto`, y `/scripts`.

### Paso 1: Levantar la Base de Datos
1.  Abre una terminal en la raíz del proyecto.
2.  Ejecuta el siguiente comando para construir y levantar los contenedores:
    ```bash
    docker-compose up -d
    ```
**Verificación:** Espera a que el contenedor cassandra-init termine su trabajo (verás "Inicialización COMPLETADA" en los logs o usando docker logs cassandra-init).

### Paso 2: Iniciar el Backend (Local)
1. Abre otra terminal y navega hacia la ruta del backend.
    ```bash
    cd backend-grpc-service
    ```
2.  Ejecuta el siguiente comando para instalar todas las dependencias y e inicar el servidor
    ```bash
    npm install
    node server.js
    ```

> **Verificación** Deberías ver: 🚀 Backend gRPC corriendo y ✅ Conexión a Cassandra EXITOSA.

### Paso 3: 
1. Abre otra terminal y navega hacia la ruta del frontend.
    ```bash
    cd frontend-next
    ```
2.  Ejecuta el siguiente comando para instalar todas las dependencias y e inicar el servidor
    ```bash
    npm install
    npm run dev
    ```
> **Verificación** Una vez finalizado el proceso, puedes ingresar al sistema desde tu navegador en: [http://localhost:3000](http://localhost:3000).

* **⚠️NOTA** El orden es importante. Cassandra debe estar lista antes de iniciar el Backend, y el Backend debe estar listo antes de usar el Frontend.
