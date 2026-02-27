# Documentación del Sistema de Ventas Distribuido
<img width="2721" height="2006" alt="localhost_3000_" src="https://github.com/user-attachments/assets/216f0bc1-2a67-4b45-8501-003f794c68df" />


## 1. Visión General del Proyecto
Este proyecto simula un sistema de alta disponibilidad para el registro, monitoreo y gestión de ventas de forma distribuida. Utiliza una **arquitectura híbrida**: la base de datos corre en un cluster de contenedores Docker, mientras que las aplicaciones (Backend y Frontend) se ejecutan localmente en la máquina anfitriona comunicándose ágilmente a través de gRPC.

### Tecnologías Principales
* **Frontend:** Next.js 14 (React) con Tailwind CSS **[Ejecución Local]**.
* **Backend:** Node.js puro implementando el protocolo **gRPC** **[Ejecución Local]**.
* **Base de Datos:** Cluster de **Apache Cassandra** (5 Nodos) con replicación `SimpleStrategy`.
* **Infraestructura:** Docker & Docker Compose (Para el ecosistema de datos).

---

## 2. Arquitectura del Sistema

El flujo de datos atraviesa el entorno local y el entorno virtualizado:

1. **Cliente (Navegador):** Interactúa con la interfaz reactiva en `localhost:3000`.
2. **API Gateway (Next.js):** Recibe solicitudes HTTP y se conecta al Backend local vía el protocolo binario gRPC (`localhost:50051`).
3. **Backend gRPC:** Sirve como el orquestador principal de la lógica empresarial, enrutando comandos al Cluster Cassandra mediante los puertos expuestos (`localhost:9042` a `9046`). Aquí también emite comandos hacia el *Docker CLI* del sistema operativo mediante procesos en segundo plano.
4. **Cassandra Cluster (Docker):** Los contenedores reciben la data, logrando distribución y partición escalable mediante la red en Docker.

---

## 3. Infraestructura y Funciones Avanzadas 

### Nodos Cassandra (5 Contenedores)
Nuestra infraestructura descansa sobre 5 contenedores Cassandra orquestados. El backend se conecta bajo técnicas como `RoundRobinPolicy`.
* **Manejo de Nodos (Node Control):** ¡El sistema ofrece **control interactivo en tiempo real** de los Nodos! A través de la visualización del cluster en nuestro Monitor en el Frontend, puedes encender, apagar y reiniciar cada infraestructura con un clic. El backend gRPC procesará esto delegando comandos como `docker start nodo2` a la propia máquina virtual (Host).

### Inicializador de Semilla Automático (`seed_data`)
* **Poblado Autónomo:** Si el Host arranca bajo una base de datos recién creada, el programa interceptor del backend en Node (`seed_data.js`) inyectará automáticamente un set total de **250 registros** repartidos entre cada región para que la aplicación siempre tenga datos visualizables bajo pruebas sin necesidad de rutinas manuales.

---

## 4. Backend (Protocolo y Lógica)

El cerebro de servicios de alta velocidad está construido sobre gRPC. 

### Protocolo `venta.proto`
* **Servicios Activos:** `RegistrarVenta`, `ListarVentas`, `ActualizarVenta`, `EliminarVenta`, `ObtenerEstadoNodos`, `ControlarNodo`.
* **Paginación Inteligente:** La transferencia de los historiales de ventas utiliza "Tokens de Página" (Page States) en lugar de *Offsets*, dándole a Cassandra una extrema agilidad para devolver páginas continuas sin saturaciones de memoria causadas por lectura de nodos lentos.

### Restricciones Superadas de Base de Datos
Debido a la naturaleza inmutable del modelo orientado a particiones en Cassandra, la lógica de actualización en nuestro Backend incluye validaciones dinámicas: Si un usuario *"edita"* la venta cambiándola de región, el Backend creará un túnel borrando el remanente en la partición antigua e insertándola lógicamente en la nueva área geográfica, un proceso completamente invisible al usuario.

---

## 5. Frontend (Dashboard)

Ubicada en `/frontend-next`. Servidor Next.js.
* **CRUD Completo Visual:** Experiencia de usuario optimizada con modales contextualizados.
* **Experiencia Editable:** Un dinámico ambiente visual índigo indica al cliente que se halla en estado "Modo Edición" tras seleccionar una compra, transformando el panel lateral.
* **Polling (Sincronización):**
    * Refresca las verificaciones **TCP Socket** de cada Nodo cada 2 segundos.
    * Mantiene las transacciones visuales actualizadas cargando siempre la paginación activa.

---

## 6. Base de Datos (Modelo de Datos)

El esquema CQL está optimizado para lecturas sin coste y reubicar rápidamente.

```sql
CREATE TABLE ventas (
    region text,           -- Partition Key (Agrupa datos y dicta en qué nodo ir)
    fecha timestamp,       -- Clustering Key (Ordena cronológicamente hacia abajo)
    id_venta uuid,         -- Clustering Key (Asegura unicidad final)
    pais text,
    producto text,
    precio float,
    cliente_nombre text,
    cliente_apellido text,
    cliente_dni_ruc text,
    PRIMARY KEY ((region), fecha, id_venta)
) WITH CLUSTERING ORDER BY (fecha DESC, id_venta ASC);
```

---

## 7. Instrucciones Rápida de Ejecución

Debido a su naturaleza distribuida híbrida, el programa fluye levantando 3 ecosistemas separados en 3 partes de la consola:

### 1. Levantar el Cluster Cassandra (El enjambre de datos)
Abre una terminal en la raíz del proyecto.
```bash
docker-compose up -d
```
> Nota: El auto-creador se activará solo, armando el andamiaje del Keyspace.

### 2. Poner en Órbita el Motor gRPC (Backend)
```bash
cd backend-grpc-service
npm install
node server.js
```
> Si la BD ya nació lista, aquí presenciarás el script que introduce los **250 datos semilla automáticamente** a la velocidad de la luz.

### 3. Lanzar la Visualización Interactiva Monitor (Frontend)
```bash
cd frontend-next
npm install
npm run dev
```
> Accede navegando hacia [http://localhost:3000](http://localhost:3000) en tu navegador.
