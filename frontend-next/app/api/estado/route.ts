import { credentials } from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';

export async function GET() {
    try {
        const PROTO_PATH = path.join(process.cwd(), 'proto', 'venta.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });

        const ventaProto = require('@grpc/grpc-js').loadPackageDefinition(packageDefinition).ventas;
        const client = new ventaProto.VentaService(
            'localhost:50051',
            credentials.createInsecure()
        );

        return new Promise((resolve) => {
            client.ObtenerEstadoNodos({}, (err: { message: any; }, response: { nodos: any; }) => {
                if (err) {
                    resolve(Response.json({ nodos: [], error: err.message }, { status: 500 }));
                } else {
                    resolve(Response.json({ nodos: response.nodos }));
                }
            });
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return Response.json({ nodos: [], error: message }, { status: 500 });
    }
}