import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const PROTO_PATH = path.join(process.cwd(), 'proto', 'venta.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const ventaProto = grpc.loadPackageDefinition(packageDefinition).ventas as any;

let client: any = null;

function getClient() {
    if (!client) {
        client = new ventaProto.VentaService(
            'localhost:50051',
            grpc.credentials.createInsecure()
        );
    }
    return client;
}

// 1. GET: Obtener historial
export async function GET() {
    const clienteGrpc = getClient();

    return new Promise((resolve) => {
        clienteGrpc.ListarVentas({}, (err: any, response: any) => {
            if (err) {
                console.error("Error gRPC Listar:", err);
                resolve(NextResponse.json({ ventas: [] }));
            } else {
                resolve(NextResponse.json({ ventas: response.ventas || [] }));
            }
        });
    });
}

// 2. POST: Registrar venta
export async function POST(request: NextRequest) {
    const clienteGrpc = getClient();
    const body = await request.json();

    const datosVenta = {
        ...body,
        precio: parseFloat(body.precio)
    };

    return new Promise((resolve) => {
        clienteGrpc.RegistrarVenta(datosVenta, (err: any, response: any) => {
            if (err) {
                console.error("Error gRPC Registrar:", err);
                resolve(NextResponse.json({
                    exito: false,
                    mensaje: "Error de conexión con el servidor gRPC",
                    id_generado: ""
                }));
            } else {
                resolve(NextResponse.json(response));
            }
        });
    });
}