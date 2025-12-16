-- 1. Crear el Keyspace
CREATE KEYSPACE IF NOT EXISTS ventas 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3};

-- 2. Usar el Keyspace
USE ventas;

-- 3. Crear la Tabla
CREATE TABLE IF NOT EXISTS ventas (
    region text,
    fecha timestamp,
    id_venta uuid,
    pais text,
    producto text,
    precio float,
    cliente_nombre text,
    cliente_apellido text,
    cliente_dni_ruc text,
    PRIMARY KEY ((region), fecha, id_venta)
) WITH CLUSTERING ORDER BY (fecha DESC, id_venta ASC);

-- Insertar un dato de prueba para verificar
INSERT INTO ventas (id_venta, region, fecha, pais, producto, precio, cliente_nombre, cliente_apellido, cliente_dni_ruc)
VALUES (uuid(), 'SUR', toTimestamp(now()), 'Peru', 'Venta de Prueba Init', 100.0, 'Admin', 'Sistema', '00000000')
IF NOT EXISTS;