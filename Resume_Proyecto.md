# 📘 Sistema de Ventas Distribuido con Alta Disponibilidad

Este proyecto implementa un sistema completo de gestión de ventas basado en una arquitectura distribuida. El objetivo principal es demostrar conceptos de **tolerancia a fallos**, **escalabilidad horizontal** y **replicación de datos** utilizando un cluster de bases de datos NoSQL.

## 🏗️ Arquitectura del Sistema

El flujo de la aplicación sigue el siguiente patrón de diseño:

**[Cliente Web (Next.js)]** ➔ **[API Gateway (Next.js Routes)]** ➔ **(gRPC)** ➔ **[Microservicio Backend (Node.js)]** ➔ **[Cluster Cassandra (5 Nodos)]**

### Tecnologías Clave
* **Base de Datos:** Apache Cassandra (5 Nodos en Docker).
* **Backend:** Node.js con gRPC.
* **Frontend:** Next.js (React) + Tailwind CSS.
* **Infraestructura:** Docker Compose.

---

## 🔌 Implementación de gRPC

Se utiliza **gRPC (Google Remote Procedure Call)** para la comunicación de alto rendimiento entre la capa de API (Next.js) y el servicio de Backend.

1.  **Definición del Contrato (`.proto`):**
    Se utiliza Protocol Buffers para definir estrictamente la estructura de los datos y los métodos disponibles (`RegistrarVenta`, `ListarVentas`, `ObtenerEstadoNodos`). Esto garantiza que tanto el cliente como el servidor hablen el mismo "idioma" binario.

2.  **Transporte:**
    A diferencia de REST (que usa texto JSON sobre HTTP/1.1), gRPC utiliza **HTTP/2** y mensajes binarios (Protobuf), lo que reduce la latencia y el tamaño de los paquetes de red, ideal para sistemas internos.

---

## 📈 Escalabilidad y Particionamiento

El sistema aprovecha la capacidad de **Sharding (Fragmentación)** automática de Cassandra.

* **Partition Key (Clave de Partición):** Se eligió el campo `region` (SUR, NORTE, CENTRO, etc.) como clave de partición.
* **Distribución:** Cassandra aplica una función de Hash (Murmur3) a la `region`. Dependiendo del valor del hash, el dato se guarda físicamente en un nodo específico del anillo.
* **Escalabilidad Horizontal:** Si el volumen de ventas crece, podemos agregar más nodos al `docker-compose.yml` sin detener el sistema. El anillo se rebalanceará automáticamente para acomodar los nuevos datos.

---

## 🛡️ Replicación y Tolerancia a Fallos

El sistema está configurado para sobrevivir a la caída de nodos.

1.  **Factor de Replicación (RF = 3):**
    El Keyspace `proyecto` se creó con `replication_factor: 3`. Esto significa que **cada venta se guarda en 3 nodos distintos** simultáneamente.
    
    > *Ejemplo:* Si una venta llega al Nodo 1, este la copia automáticamente al Nodo 2 y al Nodo 3.

2.  **Failover (Conmutación por error):**
    * El **Backend** implementa una política de balanceo de carga (`RoundRobin` + `WhiteList`).
    * Si el driver de conexión detecta que el "Nodo 3" no responde (está `DOWN`), automáticamente redirige la consulta a los otros 4 nodos disponibles.
    * **Resultado:** El usuario final nunca percibe la caída del servidor; el sistema sigue operando.

3.  **Consistencia Eventual:**
    Se utiliza un nivel de consistencia flexible (`LOCAL_ONE` o `QUORUM`) para priorizar la disponibilidad de escritura, permitiendo que el cluster se sincronice completamente en segundo plano.