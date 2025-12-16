import { credentials, loadPackageDefinition } from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { NextResponse } from 'next/server';

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

// Cliente Singleton
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

export async function GET() {
    try {
        const grpcClient = getClient();

        return new Promise((resolve) => {
            grpcClient.ObtenerEstadoNodos({}, (err: any, response: any) => {
                if (err) {
                    console.error("Error gRPC Estado:", err);
                    resolve(NextResponse.json({ nodos: [] }));
                } else {
                    resolve(NextResponse.json({ nodos: response.nodos || [] }));
                }
            });
        });

    } catch (error: any) {
        console.error("Error interno:", error.message);
        return NextResponse.json({ nodos: [] }, { status: 500 });
    }
}