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

async function seedData(client, retries = 5, delay = 5000) {
    const { v4: uuidv4 } = require("uuid");
    console.log("Verificando e iniciando generación de datos iniciales...");

    try {
        let checkResult;
        try {
            checkResult = await client.execute("SELECT count(*) FROM ventas");
        } catch (err) {
            if (err.message && err.message.includes('unconfigured table')) {
                if (retries > 0) {
                    console.log(`Tabla 'ventas' no encontrada. Esperando a que cassandra-init finalice... (Reintentos: ${retries})`);
                    await new Promise(res => setTimeout(res, delay));
                    return seedData(client, retries - 1, delay);
                } else {
                    console.error("No se pudo encontrar la tabla 'ventas' después de múltiples intentos.");
                    return;
                }
            }
            throw err;
        }

        const count = checkResult.rows[0].count;
        if (count > 0) {
            console.log(`Base de datos ya fue poblada, se encontraron ${count} registros.`);
            return;
        }

        console.log("Base de datos vacía. Poblado inicial activado...");

        const query = `
      INSERT INTO ventas (
        id_venta, region, fecha, pais, producto, precio, 
        cliente_nombre, cliente_apellido, cliente_dni_ruc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        let totalInsertados = 0;

        for (const region of REGIONES) {
            console.log(`Insertando 50 registros para región ${region}...`);

            const promesas = [];

            for (let i = 0; i < 50; i++) {
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
            totalInsertados += 50;
        }

        console.log(
            `\n ÉXITO: Se insertaron ${totalInsertados} registros en total.`
        );
    } catch (error) {
        console.error("Error en seed:", error);
    }
}

module.exports = seedData;
