# gRPC Cassandra Distributed System

Sistema distribuido con Cassandra, gRPC y Next.js para gestionar ventas en tiempo real con monitoreo de nodos del cluster.

## Estructura del Proyecto

```
├── backend-grpc-service/      # Servidor gRPC con Node.js
│   ├── server.js              # Servidor principal
│   ├── package.json
│   └── proto/
│       └── venta.proto        # Definición de servicios gRPC
│
├── frontend-next/             # Frontend con Next.js
│   ├── app/
│   │   ├── page.tsx          # Página principal (monitoreo + formulario)
│   │   ├── api/
│   │   │   ├── estado/       # API para estado de nodos
│   │   │   └── venta/        # API para gestión de ventas
│   │   └── globals.css
│   ├── package.json
│   └── tsconfig.json
│
└── docker-compose.yml         # Orquestación de 5 nodos Cassandra
```

## Requisitos

- **Node.js** v20+
- **Docker** y **Docker Compose**
- **npm** o **yarn**

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/gRPC-Project.git
cd gRPC-Project
```

### 2. Iniciar los contenedores Cassandra

```bash
docker-compose up -d
```

Espera a que los nodos se inicien (aprox. 30-60 segundos):

```bash
docker ps
```

### 3. Configurar el Backend

```bash
cd backend-grpc-service
npm install
node server.js
```

El servidor gRPC estará disponible en **localhost:50051**

### 4. Configurar el Frontend

En otra terminal:

```bash
cd frontend-next
npm install
npm run dev
```

El frontend estará disponible en **http://localhost:3000**

## Funcionalidades

### Backend (gRPC)

- **RegistrarVenta**: Inserta ventas en Cassandra
- **ListarVentas**: Obtiene todas las ventas registradas
- **ObtenerEstadoNodos**: Monitorea el estado en tiempo real de los 5 nodos

### Frontend (Next.js)

- 📊 **Monitoreo en Tiempo Real**: Visualización del estado de nodos (UP/DOWN)
- 📝 **Formulario de Registro**: Registra ventas con producto, precio, país y región
- 📋 **Tabla de Historial**: Muestra todas las ventas con filtros por región
- 🔄 **Polling Automático**: Actualiza el estado cada 2 segundos

## Estructura de Datos (Cassandra)

### Tabla `ventas`

```sql
CREATE TABLE ventas (
  id_venta UUID PRIMARY KEY,
  region TEXT,
  pais TEXT,
  producto TEXT,
  precio FLOAT,
  fecha TIMESTAMP
);
```

## Docker Compose

El archivo `docker-compose.yml` orquesta:

- **5 nodos Cassandra** en red distribuida
- **Red personalizada** `red-bd-distribuida`
- **Health checks** para verificar disponibilidad
- **Volúmenes persistentes** para datos

### Puertos

| Nodo  | Puerto | Contenedor       |
| ----- | ------ | ---------------- |
| nodo1 | 9042   | cassandra:latest |
| nodo2 | 9043   | cassandra:latest |
| nodo3 | 9044   | cassandra:latest |
| nodo4 | 9045   | cassandra:latest |
| nodo5 | 9046   | cassandra:latest |

## Uso

### Registrar una venta

```bash
curl -X POST http://localhost:3000/api/venta \
  -H "Content-Type: application/json" \
  -d '{"producto": "Laptop", "precio": 999.99, "pais": "Peru", "region": "SUR"}'
```

### Obtener estado de nodos

```bash
curl http://localhost:3000/api/estado
```

### Listar todas las ventas

```bash
curl http://localhost:3000/api/venta
```

## Monitoreo

### Ver logs del backend

```bash
# En la terminal donde corre server.js
# Verás: Monitor: Nodo X [IP:PUERTO] -> UP/DOWN
```

### Ver estado del cluster Cassandra

```bash
docker exec -it nodo1 nodetool status
```

### Pausar/Reanudar nodos (Pruebas)

```bash
# Pausar un nodo
docker pause nodo2

# Reanudar un nodo
docker unpause nodo2
```

## API Endpoints

### Frontend API Routes

#### `GET /api/estado`

Retorna estado de todos los nodos UP

**Response:**

```json
{
  "nodos": [
    {
      "nombre": "Nodo 1",
      "estado": "UP",
      "direccion": "172.18.0.2:9042"
    }
  ]
}
```

#### `GET /api/venta`

Lista todas las ventas

**Response:**

```json
{
  "ventas": [
    {
      "id_venta": "uuid",
      "producto": "Laptop",
      "precio": 999.99,
      "region": "SUR",
      "pais": "Peru",
      "fecha": "2025-12-05T10:30:00Z"
    }
  ]
}
```

#### `POST /api/venta`

Registra una nueva venta

**Body:**

```json
{
  "producto": "Laptop",
  "precio": 999.99,
  "pais": "Peru",
  "region": "SUR"
}
```

## Solución de Problemas

### Error: "illegal token '¿syntax'" en proto

Asegúrate de que el archivo `venta.proto` esté en UTF-8 sin BOM:

```powershell
# PowerShell
$path = 'backend-grpc-service/proto/venta.proto'
$txt = Get-Content -Raw $path
[System.IO.File]::WriteAllText($path, $txt, (New-Object System.Text.UTF8Encoding $false))
```

### Los nodos no aparecen en el frontend

- Verifica que Docker esté corriendo: `docker ps`
- Revisa los logs del backend: `node server.js`
- Confirma conectividad: `docker exec -it nodo1 nodetool status`

### Timeout de conexión a Cassandra

Aumenta el tiempo de espera en `backend-grpc-service/server.js`:

```javascript
socketOptions: { connectTimeout: 15000, readTimeout: 15000 }
```

## Tecnologías

- **Backend**: Node.js, gRPC, Cassandra Driver
- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Infraestructura**: Docker, Docker Compose
- **Base de Datos**: Apache Cassandra

## Licencia

MIT

## Autor

Saul - Proyecto Base de Datos Distribuidos 2025
