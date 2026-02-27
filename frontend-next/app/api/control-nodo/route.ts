import { credentials, loadPackageDefinition } from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const PROTO_PATH = path.join(process.cwd(), 'proto', 'venta.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = loadPackageDefinition(packageDefinition) as any;
const ventaProto = protoDescriptor.ventas;

let client: any = null;

function getClient() {
    if (!client) {
        client = new ventaProto.VentaService(
            'localhost:50051',
            credentials.createInsecure()
        );
    }
    return client;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nombre_nodo, accion } = body;

        if (!nombre_nodo || !accion) {
            return NextResponse.json({ exito: false, mensaje: "Faltan parámetros." }, { status: 400 });
        }

        const grpcClient = getClient();

        return new Promise((resolve) => {
            grpcClient.ControlarNodo({ nombre_nodo, accion }, (err: any, response: any) => {
                if (err) {
                    console.error("Error gRPC ControlNodo:", err);
                    resolve(NextResponse.json({ exito: false, mensaje: "Error del servidor." }, { status: 500 }));
                } else {
                    resolve(NextResponse.json(response));
                }
            });
        });

    } catch (error: any) {
        console.error("Error interno:", error.message);
        return NextResponse.json({ exito: false, mensaje: "Error interno del servidor." }, { status: 500 });
    }
}
