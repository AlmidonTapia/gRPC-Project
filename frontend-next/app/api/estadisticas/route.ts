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

let grpcClient: any = null;

function getClient() {
    if (!grpcClient) {
        grpcClient = new ventaProto.VentaService(
            'localhost:50051',
            grpc.credentials.createInsecure()
        );
    }
    return grpcClient;
}

export async function GET(request: NextRequest) {
    const client = getClient();
    return new Promise((resolve) => {
        client.ObtenerEstadisticas({}, (err: any, response: any) => {
            if (err) {
                console.error("Error gRPC Estadisticas:", err);
                resolve(NextResponse.json({ total_registros: 0, registros_por_region: [] }));
                return;
            }
            resolve(NextResponse.json(response));
        });
    });
}
