const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const cassandra = require("cassandra-driver");
const path = require("path");
const net = require("net");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");

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
  keyspace: "ventas",
  socketOptions: { connectTimeout: 10000, readTimeout: 10000 },
  policies: {
    loadBalancing: new cassandra.policies.loadBalancing.WhiteListPolicy(
      new cassandra.policies.loadBalancing.RoundRobinPolicy(),
      contactPoints
    ),
  },
});


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
    const { page_state, limit, filtro_region } = call.request;
    const fetchSize = limit > 0 ? limit : 20;

    let query = "SELECT * FROM ventas";
    const params = [];

    if (filtro_region && filtro_region !== 'TODAS') {
      query = "SELECT * FROM ventas WHERE region = ?";
      params.push(filtro_region);
    }

    const options = { prepare: true, fetchSize };

    if (page_state && page_state.length > 0) {
      options.pageState = Buffer.from(page_state, "hex");
    }

    const result = await client.execute(query, params, options);
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

    let nextPageState = "";
    if (result.pageState) {
      nextPageState = result.pageState.toString("hex");
    }

    callback(null, { ventas: ventas, next_page_state: nextPageState });
  } catch (error) {
    console.error("Error al listar ventas:", error);
    callback(null, { ventas: [], next_page_state: "" });
  }
}

async function actualizarVenta(call, callback) {
  const {
    id_venta,
    producto,
    precio,
    region,
    pais,
    cliente_nombre,
    cliente_apellido,
    cliente_dni_ruc,
    fecha,
    region_original
  } = call.request;

  try {
    const fechaDate = new Date(fecha);

    if (region !== region_original) {

      const deleteQuery = "DELETE FROM ventas WHERE region = ? AND fecha = ? AND id_venta = ?";
      await client.execute(deleteQuery, [region_original, fechaDate, id_venta], { prepare: true, consistency: cassandra.types.consistencies.localOne });

      const insertQuery = `
        INSERT INTO ventas (
          id_venta, region, fecha, pais, producto, precio, 
          cliente_nombre, cliente_apellido, cliente_dni_ruc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const insertParams = [
        id_venta, region, fechaDate, pais, producto, precio, cliente_nombre, cliente_apellido, cliente_dni_ruc
      ];
      await client.execute(insertQuery, insertParams, { prepare: true, consistency: cassandra.types.consistencies.localOne });
    } else {
      const query = `
        UPDATE ventas 
        SET pais = ?, producto = ?, precio = ?, 
            cliente_nombre = ?, cliente_apellido = ?, cliente_dni_ruc = ?
        WHERE region = ? AND fecha = ? AND id_venta = ?
      `;

      const params = [
        pais,
        producto,
        precio,
        cliente_nombre,
        cliente_apellido,
        cliente_dni_ruc,
        region,
        fechaDate,
        id_venta
      ];

      await client.execute(query, params, { prepare: true, consistency: cassandra.types.consistencies.localOne });
    }

    callback(null, {
      exito: true,
      mensaje: "Venta actualizada correctamente",
      id_generado: id_venta,
    });
  } catch (error) {
    console.error("Error BD al actualizar:", error);
    callback(null, {
      exito: false,
      mensaje: "Error interno al actualizar en Cassandra",
      id_generado: "",
    });
  }
}

async function eliminarVenta(call, callback) {
  const { id_venta, region, fecha } = call.request;

  const query = "DELETE FROM ventas WHERE region = ? AND fecha = ? AND id_venta = ?";
  const params = [region, new Date(fecha), id_venta];

  try {
    await client.execute(query, params, { prepare: true, consistency: cassandra.types.consistencies.localOne });

    callback(null, {
      exito: true,
      mensaje: "Venta eliminada correctamente",
      id_generado: id_venta,
    });
  } catch (error) {
    console.error("Error BD al eliminar:", error);
    callback(null, {
      exito: false,
      mensaje: "Error interno al eliminar en Cassandra",
      id_generado: "",
    });
  }
}


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

async function controlarNodo(call, callback) {
  const { nombre_nodo, accion } = call.request;

  let dockerContainerName = "";
  if (nombre_nodo.includes("Nodo 1")) dockerContainerName = "nodo1";
  else if (nombre_nodo.includes("Nodo 2")) dockerContainerName = "nodo2";
  else if (nombre_nodo.includes("Nodo 3")) dockerContainerName = "nodo3";
  else if (nombre_nodo.includes("Nodo 4")) dockerContainerName = "nodo4";
  else if (nombre_nodo.includes("Nodo 5")) dockerContainerName = "nodo5";

  if (!dockerContainerName) {
    return callback(null, { exito: false, mensaje: "Nombre de nodo desconocido: " + nombre_nodo });
  }

  const comandosValidos = ["start", "stop", "restart"];
  if (!comandosValidos.includes(accion)) {
    return callback(null, { exito: false, mensaje: "Acción inválida: " + accion });
  }

  let command = `docker ${accion} ${dockerContainerName}`;
  console.log(`Ejecutando: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error controlando nodo: ${error.message}`);
      return callback(null, { exito: false, mensaje: `Error de Docker: ${error.message}` });
    }
    callback(null, { exito: true, mensaje: `Nodo ${dockerContainerName} ejecutado con éxito: ${accion}` });
  });
}

async function obtenerEstadisticas(call, callback) {
  const regiones = ["SUR", "NORTE", "CENTRO", "ESTE", "OESTE"];
  const registros_por_region = [];
  let total_registros = 0;

  try {
    const promises = regiones.map(async (region) => {
      const query = "SELECT count(*) FROM ventas WHERE region = ?";
      const result = await client.execute(query, [region], { prepare: true, consistency: cassandra.types.consistencies.localOne });
      const total = parseInt(result.rows[0].count.toString());
      return { region, total };
    });

    const res = await Promise.all(promises);
    res.forEach(c => {
      registros_por_region.push(c);
      total_registros += c.total;
    });

    callback(null, { total_registros, registros_por_region });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    callback(null, { total_registros: 0, registros_por_region: [] });
  }
}

function main() {
  const server = new grpc.Server();
  server.addService(ventaProto.VentaService.service, {
    RegistrarVenta: registrarVenta,
    ListarVentas: listarVentas,
    ActualizarVenta: actualizarVenta,
    EliminarVenta: eliminarVenta,
    ObtenerEstadoNodos: obtenerEstadoNodos,
    ControlarNodo: controlarNodo,
    ObtenerEstadisticas: obtenerEstadisticas,
  });

  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log("Backend gRPC corriendo en puerto 50051");
      console.log("Conectando a cluster Cassandra (Keyspace: ventas)...");

      client
        .connect()
        .then(async () => {
          console.log("Conexión a Cassandra EXITOSA");
          const seedData = require("./seed_data");
          await seedData(client);
        })
        .catch((e) =>
          console.error("Error conectando a Cassandra:", e.message)
        );
    }
  );
}

main();
