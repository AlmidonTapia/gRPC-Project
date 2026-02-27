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

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const page_state = searchParams.get('pageState') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const filtro_region = searchParams.get('region') || 'TODAS';

    const clienteGrpc = getClient();

    return new Promise((resolve) => {
        clienteGrpc.ListarVentas({ page_state, limit, filtro_region }, (err: any, response: any) => {
            if (err) {
                console.error("Error gRPC Listar:", err);
                resolve(NextResponse.json({ ventas: [], nextPageState: "" }));
            } else {
                resolve(NextResponse.json({ ventas: response.ventas || [], nextPageState: response.next_page_state || "" }));
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

export async function PUT(request: NextRequest) {
    const clienteGrpc = getClient();
    const body = await request.json();

    const datosVenta = {
        ...body,
        precio: parseFloat(body.precio)
    };

    return new Promise((resolve) => {
        clienteGrpc.ActualizarVenta(datosVenta, (err: any, response: any) => {
            if (err) {
                console.error("Error gRPC Actualizar:", err);
                resolve(NextResponse.json({
                    exito: false,
                    mensaje: "Error de conexión con el servidor gRPC al actualizar",
                    id_generado: ""
                }));
            } else {
                resolve(NextResponse.json(response));
            }
        });
    });
}

export async function DELETE(request: NextRequest) {
    const clienteGrpc = getClient();
    const { searchParams } = new URL(request.url);
    const id_venta = searchParams.get('id_venta');
    const region = searchParams.get('region');
    const fecha = searchParams.get('fecha');

    if (!id_venta || !region || !fecha) {
        return NextResponse.json({
            exito: false,
            mensaje: "Se requieren id_venta, region y fecha para eliminar",
            id_generado: ""
        });
    }

    return new Promise((resolve) => {
        clienteGrpc.EliminarVenta({ id_venta, region, fecha }, (err: any, response: any) => {
            if (err) {
                console.error("Error gRPC Eliminar:", err);
                resolve(NextResponse.json({
                    exito: false,
                    mensaje: "Error de conexión con el servidor gRPC al eliminar",
                    id_generado: ""
                }));
            } else {
                resolve(NextResponse.json(response));
            }
        });
    });
}