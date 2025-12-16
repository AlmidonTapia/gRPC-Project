# ⚙️ Documentación del Backend (gRPC Service)

El backend es un microservicio construido en **Node.js** que actúa como interfaz entre la aplicación y el cluster de almacenamiento.

## 🛠️ Stack Tecnológico
* **Runtime:** Node.js v18+.
* **Driver DB:** `cassandra-driver` (DataStax).
* **Framework RPC:** `@grpc/grpc-js` y `@grpc/proto-loader`.

## 🚀 Características Principales

### 1. Conexión "High Availability" (Alta Disponibilidad)
Para resolver los conflictos de red entre Docker y Windows, y garantizar la resiliencia, se implementó una estrategia de conexión robusta en `server.js`:

* **Multi-Point Contact:** El cliente se inicializa con una lista de 5 puntos de contacto (`127.0.0.1:9042` a `9046`), correspondiendo a los puertos expuestos de cada contenedor.
* **Política de Whitelist:** Se utiliza `WhiteListPolicy`. Esto obliga al driver a ignorar las IPs internas de Docker (`172.x.x.x`) que son inalcanzables desde Windows, y usar exclusivamente los puertos mapeados en `localhost`.

```javascript
// Ejemplo de configuración usada
const client = new cassandra.Client({
    contactPoints: ['127.0.0.1:9042', ... '127.0.0.1:9046'],
    policies: {
        loadBalancing: new cassandra.policies.loadBalancing.WhiteListPolicy(
            new cassandra.policies.loadBalancing.RoundRobinPolicy(),
            contactPoints
        )
    }
});