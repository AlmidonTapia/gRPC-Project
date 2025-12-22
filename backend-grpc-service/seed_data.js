const cassandra = require("cassandra-driver");
const { v4: uuidv4 } = require("uuid");

const client = new cassandra.Client({
  contactPoints: ["127.0.0.1:9042"],
  localDataCenter: "DC1",
  keyspace: "ventas",
});

const REGIONES = ["NORTE", "SUR", "CENTRO", "ESTE", "OESTE"];
const PRODUCTOS = [
  "Laptop Gamer",
  "Mouse",
  "Teclado Mecánico",
  "Monitor 4K",
  "Silla Ergonómica",
  "Headset",
  "Webcam",
];
const PAISES = ["Peru", "Argentina", "Colombia", "Mexico", "Chile"];
const NOMBRES = ["Juan", "Maria", "Carlos", "Ana", "Luis", "Sofia", "Pedro"];
const APELLIDOS = ["Perez", "Gomez", "Rodriguez", "Fernandez", "Lopez", "Diaz"];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🚀 Iniciando generación masiva de datos...");

  try {
    await client.connect();
    console.log("✅ Conectado a Cassandra");

    const query = `
      INSERT INTO ventas (
        id_venta, region, fecha, pais, producto, precio, 
        cliente_nombre, cliente_apellido, cliente_dni_ruc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let totalInsertados = 0;

    for (const region of REGIONES) {
      console.log(`⏳ Insertando 250 registros para región ${region}...`);

      const promesas = [];

      for (let i = 0; i < 250; i++) {
        const params = [
          uuidv4(),
          region,
          new Date(),
          randomItem(PAISES),
          randomItem(PRODUCTOS),
          parseFloat((Math.random() * 1000 + 50).toFixed(2)),
          randomItem(NOMBRES),
          randomItem(APELLIDOS),
          Math.floor(Math.random() * 90000000 + 10000000).toString(),
        ];

        promesas.push(client.execute(query, params, { prepare: true }));
      }

      await Promise.all(promesas);
      totalInsertados += 250;
    }

    console.log(
      `\n✨ ÉXITO: Se insertaron ${totalInsertados} registros en total.`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.shutdown();
  }
}

main();
