const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const cassandra = require("cassandra-driver");
const path = require("path");
const net = require("net");
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

// --- CONFIGURACIÓN DE CONEXIÓN ---
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
  keyspace: "ventas",
  socketOptions: { connectTimeout: 10000, readTimeout: 10000 },
  policies: {
    loadBalancing: new cassandra.policies.loadBalancing.WhiteListPolicy(
      new cassandra.policies.loadBalancing.RoundRobinPolicy(),
      contactPoints
    ),
  },
});

// --- LÓGICA DE VENTAS ---
async function registrarVenta(call, callback) {
  const {
    producto,
    precio,
    region,
    pais,
    cliente_nombre,
    cliente_apellido,
    cliente_dni_ruc,
  } = call.request;

  const id = uuidv4();
  const fecha = new Date();

  const query = `
    INSERT INTO ventas (
      id_venta, region, fecha, pais, producto, precio, 
      cliente_nombre, cliente_apellido, cliente_dni_ruc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    region,
    fecha,
    pais,
    producto,
    precio,
    cliente_nombre,
    cliente_apellido,
    cliente_dni_ruc,
  ];

  try {
    await client.execute(query, params, {
      prepare: true,
      consistency: cassandra.types.consistencies.localOne,
    });

    callback(null, {
      exito: true,
      mensaje: "Venta registrada correctamente",
      id_generado: id.toString(),
    });
  } catch (error) {
    console.error("Error BD al registrar:", error);
    callback(null, {
      exito: false,
      mensaje: "Error interno al guardar en Cassandra",
      id_generado: "",
    });
  }
}

async function listarVentas(call, callback) {
  try {
    const query = "SELECT * FROM ventas";
    const result = await client.execute(query);
    const ventas = result.rows.map((row) => ({
      id_venta: row.id_venta.toString(),
      producto: row.producto,
      precio: row.precio,
      region: row.region,
      pais: row.pais,
      fecha: row.fecha.toISOString(),
      cliente_nombre: row.cliente_nombre || "",
      cliente_apellido: row.cliente_apellido || "",
      cliente_dni_ruc: row.cliente_dni_ruc || "",
    }));

    callback(null, { ventas: ventas });
  } catch (error) {
    console.error("Error al listar ventas:", error);
    callback(null, { ventas: [] });
  }
}

// --- MONITOR DE ESTADO (Versión Ligera TCP) ---
function checkNodeHealth(nombre, puerto) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = "DOWN";
    socket.setTimeout(1000);
    socket.on("connect", () => {
      status = "UP";
      socket.destroy();
    });
    socket.on("timeout", () => {
      socket.destroy();
    });
    socket.on("error", (err) => {
      socket.destroy();
    });
    socket.on("close", () => {
      resolve({
        nombre: nombre,
        estado: status,
        direccion: `127.0.0.1:${puerto}`,
      });
    });

    socket.connect(puerto, "127.0.0.1");
  });
}

async function obtenerEstadoNodos(call, callback) {
  const definicionNodos = [
    { nombre: "Nodo 1 (Seed)", puerto: 9042 },
    { nombre: "Nodo 2", puerto: 9043 },
    { nombre: "Nodo 3", puerto: 9044 },
    { nombre: "Nodo 4", puerto: 9045 },
    { nombre: "Nodo 5", puerto: 9046 },
  ];
  const resultados = await Promise.all(
    definicionNodos.map((n) => checkNodeHealth(n.nombre, n.puerto))
  );
  callback(null, { nodos: resultados });
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
      console.log("🚀 Backend gRPC corriendo en puerto 50051");
      console.log("📡 Conectando a cluster Cassandra (Keyspace: ventas)...");

      client
        .connect()
        .then(() => console.log("✅ Conexión a Cassandra EXITOSA"))
        .catch((e) =>
          console.error("❌ Error fatal conectando a Cassandra:", e.message)
        );
    }
  );
}

main();
