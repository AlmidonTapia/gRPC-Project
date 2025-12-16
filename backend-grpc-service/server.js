const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const cassandra = require("cassandra-driver");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const PROTO_PATH = path.join(__dirname, "proto", "venta.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const ventaProto = grpc.loadPackageDefinition(packageDefinition).ventas;

// Usar nombres de host en lugar de IPs para Docker
const contactPoints = ["nodo1", "nodo2", "nodo3", "nodo4", "nodo5"];

const client = new cassandra.Client({
  contactPoints: contactPoints,
  localDataCenter: "DC1",
  keyspace: "proyecto",
  socketOptions: {
    connectTimeout: 5000,
    readTimeout: 5000,
  },
  pooling: {
    heartBeatInterval: 1000, // Verificar cada 1 segundo
    coreConnectionsPerHost: {
      [cassandra.types.distance.local]: 1,
      [cassandra.types.distance.remote]: 1,
    },
  },
  policies: {
    reconnection:
      new cassandra.policies.reconnection.ConstantReconnectionPolicy(1000),
    loadBalancing: new cassandra.policies.loadBalancing.RoundRobinPolicy(),
  },
});

// Escuchar eventos del driver para debugging
client.on("hostAdd", (host) => {
  console.log(`✅ Nodo agregado: ${host.address}`);
});

client.on("hostRemove", (host) => {
  console.log(`❌ Nodo removido: ${host.address}`);
});

client.on("hostUp", (host) => {
  console.log(`🟢 Nodo UP: ${host.address}`);
});

client.on("hostDown", (host) => {
  console.log(`🔴 Nodo DOWN: ${host.address}`);
});

async function registrarVenta(call, callback) {
  const { producto, precio, region, pais } = call.request;
  const id = uuidv4();
  const fecha = new Date();
  const query =
    "INSERT INTO ventas (id_venta, region, pais, producto, precio, fecha) VALUES (?, ?, ?, ?, ?, ?)";
  try {
    await client.execute(query, [id, region, pais, producto, precio, fecha], {
      prepare: true,
      consistency: cassandra.types.consistencies.localOne,
    });
    callback(null, {
      exito: true,
      mensaje: "Guardado OK",
      id_generado: id.toString(),
    });
  } catch (error) {
    console.error(error);
    callback(null, { exito: false, mensaje: "Error BD", id_generado: "" });
  }
}

async function listarVentas(call, callback) {
  try {
    const result = await client.execute("SELECT * FROM ventas");
    const ventas = result.rows.map((row) => ({
      id_venta: row.id_venta.toString(),
      producto: row.producto,
      precio: row.precio,
      region: row.region,
      pais: row.pais,
      fecha: row.fecha.toISOString(),
    }));
    callback(null, { ventas: ventas });
  } catch (error) {
    callback(null, { ventas: [] });
  }
}

// FUNCIÓN MEJORADA: Verificar estado real con timeout
async function verificarNodoActivo(host) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false); // Si tarda más de 2s, considerarlo DOWN
    }, 2000);

    // Intentar query simple para verificar
    const testClient = new cassandra.Client({
      contactPoints: [host],
      localDataCenter: "DC1",
      keyspace: "system",
      socketOptions: { connectTimeout: 1500, readTimeout: 1500 },
    });

    testClient
      .execute("SELECT * FROM system.local LIMIT 1")
      .then(() => {
        clearTimeout(timeout);
        testClient.shutdown();
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timeout);
        testClient.shutdown();
        resolve(false);
      });
  });
}

async function obtenerEstadoNodos(call, callback) {
  let hosts = Array.from(client.hosts.values());

  // Mapear a nombres conocidos
  const nodosBase = [
    { nombre: "Nodo 1", host: "nodo1", puerto: "9042" },
    { nombre: "Nodo 2", host: "nodo2", puerto: "9043" },
    { nombre: "Nodo 3", host: "nodo3", puerto: "9044" },
    { nombre: "Nodo 4", host: "nodo4", puerto: "9045" },
    { nombre: "Nodo 5", host: "nodo5", puerto: "9046" },
  ];

  // Verificar estado real de cada nodo
  const estadoPromises = nodosBase.map(async (nodo) => {
    const estaActivo = await verificarNodoActivo(nodo.host);
    const estado = estaActivo ? "UP" : "DOWN";

    console.log(
      `🔍 Monitor: ${nodo.nombre} [${nodo.host}:${nodo.puerto}] -> ${estado}`
    );

    return {
      nombre: nodo.nombre,
      estado: estado,
      direccion: `${nodo.host}:${nodo.puerto}`,
    };
  });

  const estadoNodos = await Promise.all(estadoPromises);
  callback(null, { nodos: estadoNodos });
}

function main() {
  const server = new grpc.Server();
  server.addService(ventaProto.VentaService.service, {
    RegistrarVenta: registrarVenta,
    ListarVentas: listarVentas,
    ObtenerEstadoNodos: obtenerEstadoNodos,
  });
  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log("🚀 Backend corriendo en 50051");
      client
        .connect()
        .then(() => console.log("✅ Conectado a Cassandra"))
        .catch((e) => console.error("❌ Error conectando:", e));
    }
  );
}

main();
