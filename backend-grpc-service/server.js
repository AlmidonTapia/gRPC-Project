const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const cassandra = require("cassandra-driver");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const net = require("net");

const PROTO_PATH = path.join(__dirname, "proto", "venta.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const ventaProto = grpc.loadPackageDefinition(packageDefinition).ventas;

const contactPoints = [
  "127.0.0.1:9042",
  "127.0.0.1:9043",
  "127.0.0.1:9044",
  "127.0.0.1:9045",
  "127.0.0.1:9046",
];

const client = new cassandra.Client({
  contactPoints: contactPoints,
  localDataCenter: "DC1",
  keyspace: "proyecto",
  socketOptions: { connectTimeout: 10000, readTimeout: 10000 },
  policies: {
    loadBalancing: new cassandra.policies.loadBalancing.WhiteListPolicy(
      new cassandra.policies.loadBalancing.RoundRobinPolicy(),
      contactPoints
    ),
  },
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

// Verificar conectividad TCP real a un host:puerto
function verificarConexionTCP(host, puerto) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: puerto, timeout: 1500 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function obtenerEstadoNodos(call, callback) {
  let hosts = Array.from(client.hosts.values());

  // Ordenar por dirección
  hosts.sort((a, b) => {
    const ipA = a.address.toString();
    const ipB = b.address.toString();
    return ipA.localeCompare(ipB);
  });

  // Verificar conectividad TCP real con cada nodo
  const verificaciones = hosts.map(async (host) => {
    const direccion = host.address.toString();
    const [ip, puerto] = direccion.split(":");
    const conectado = await verificarConexionTCP(ip, parseInt(puerto) || 9042);
    console.log(
      `Verificando [${direccion}] -> ${
        conectado ? "CONECTADO" : "NO CONECTADO"
      }`
    );
    return {
      direccion: direccion,
      estado: conectado ? "UP" : "DOWN",
    };
  });

  const resultados = await Promise.all(verificaciones);

  // Filtrar solo nodos que realmente están UP
  const nodosActivos = resultados.filter((n) => n.estado === "UP");

  const estadoNodos = nodosActivos.map((nodo, index) => {
    const nombre = `Nodo ${index + 1}`;
    console.log(`Monitor: ${nombre} [${nodo.direccion}] -> ${nodo.estado}`);
    return { nombre, estado: nodo.estado, direccion: nodo.direccion };
  });

  console.log(`Total nodos UP: ${estadoNodos.length}`);
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
        .catch((e) => console.error(e));
    }
  );
}

main();
