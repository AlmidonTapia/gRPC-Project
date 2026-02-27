'use client';
import { useState, useEffect, FormEvent, useRef } from 'react';

// --- TIPOS ---
interface Venta {
  id_venta: string;
  producto: string;
  precio: number;
  region: string;
  pais: string;
  fecha: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  cliente_dni_ruc?: string;
}

interface Nodo {
  nombre: string;
  estado: 'UP' | 'DOWN';
  direccion: string;
}

interface Estadisticas {
  total_registros: number;
  registros_por_region: { region: string; total: number }[];
}

interface FormState {
  id_venta?: string;
  producto: string;
  precio: string | number;
  pais: string;
  region: string;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_dni_ruc: string;
  fecha?: string;
  region_original?: string;
}

interface MensajeState {
  tipo: 'success' | 'error';
  texto: string;
}

// --- COMPONENTES DE ICONOS (SVG) ---
const ServerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" />
  </svg>
);

const ActivityIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const PowerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export default function Home() {
  // --- ESTADOS ---
  const [form, setForm] = useState<FormState>({
    id_venta: '',
    producto: '',
    precio: '',
    pais: '',
    region: 'SUR',
    cliente_nombre: '',
    cliente_apellido: '',
    cliente_dni_ruc: ''
  });

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [mensaje, setMensaje] = useState<MensajeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroRegion, setFiltroRegion] = useState('TODAS');
  const filtroRegionRef = useRef('TODAS');

  const [modalConfirmacion, setModalConfirmacion] = useState<{
    titulo: string;
    mensaje: React.ReactNode;
    color: 'rose' | 'emerald' | 'indigo';
    icono: 'trash' | 'power' | 'refresh';
    onConfirm: () => void;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageStates, setPageStates] = useState<string[]>(['']);
  const currentPageRef = useRef(0);
  const pageStatesRef = useRef<string[]>(['']);

  const actualizarPaginacion = (nuevoIndex: number, nuevosStates: string[]) => {
    setCurrentPage(nuevoIndex);
    setPageStates(nuevosStates);
    currentPageRef.current = nuevoIndex;
    pageStatesRef.current = nuevosStates;
  };

  // --- EFECTOS ---
  useEffect(() => {
    const fetchEstado = async () => {
      try {
        const res = await fetch('/api/estado');
        const data = await res.json();
        setNodos(data.nodos || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching estado:', error);
        setLoading(false);
      }
    };

    fetchEstado();
    const interval = setInterval(fetchEstado, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchEstadisticas = async () => {
    try {
      const res = await fetch('/api/estadisticas');
      const data = await res.json();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error fetching estadísticas:', error);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
    const interval = setInterval(fetchEstadisticas, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFiltroCambio = (nuevaRegion: string) => {
    setFiltroRegion(nuevaRegion);
    filtroRegionRef.current = nuevaRegion;
    actualizarPaginacion(0, ['']);
    setTimeout(cargarVentas, 0);
  };

  const cargarVentas = async () => {
    try {
      const ps = pageStatesRef.current[currentPageRef.current];
      const regionFilter = filtroRegionRef.current;
      const res = await fetch(`/api/venta?limit=10&pageState=${encodeURIComponent(ps)}&region=${encodeURIComponent(regionFilter)}`);
      if (res.ok) {
        const data = await res.json();
        setVentas(data.ventas || []);

        if (data.nextPageState) {
          const newStates = [...pageStatesRef.current];
          if (newStates.length <= currentPageRef.current + 1) {
            newStates.push(data.nextPageState);
          } else {
            newStates[currentPageRef.current + 1] = data.nextPageState;
          }
          actualizarPaginacion(currentPageRef.current, newStates);
        }
      }
    } catch (error) { console.error("Error cargando ventas"); }
  };

  useEffect(() => {
    cargarVentas();
    const intervalVentas = setInterval(cargarVentas, 5000);
    return () => clearInterval(intervalVentas);
  }, []);

  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => {
        setMensaje(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  // envio del form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    // Validación básica
    if (!form.producto || !form.precio || !form.pais || !form.cliente_dni_ruc) {
      setMensaje({ tipo: 'error', texto: 'Por favor completa los campos obligatorios.' });
      setLoading(false);
      return;
    }

    try {
      const isEditing = !!form.id_venta;
      const url = '/api/venta';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.exito) {
        setMensaje({ tipo: 'success', texto: isEditing ? '¡Venta actualizada!' : `¡Venta guardada! ID: ${data.id_generado.substring(0, 8)}...` });
        // Resetear formulario completo
        setForm({
          id_venta: '',
          producto: '',
          precio: '',
          pais: '',
          region: 'SUR',
          cliente_nombre: '',
          cliente_apellido: '',
          cliente_dni_ruc: ''
        });
        cargarVentas();
      } else {
        setMensaje({ tipo: 'error', texto: `Error: ${data.mensaje}` });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (v: Venta) => {
    setForm({
      id_venta: v.id_venta,
      producto: v.producto,
      precio: v.precio,
      pais: v.pais,
      region: v.region,
      cliente_nombre: v.cliente_nombre || '',
      cliente_apellido: v.cliente_apellido || '',
      cliente_dni_ruc: v.cliente_dni_ruc || '',
      fecha: v.fecha,
      region_original: v.region
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmarEliminar = async (venta: Venta) => {
    setLoading(true);
    setMensaje(null);
    setModalConfirmacion(null);
    try {
      const { id_venta, region, fecha } = venta;
      const res = await fetch(`/api/venta?id_venta=${id_venta}&region=${region}&fecha=${fecha}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.exito) {
        setMensaje({ tipo: 'success', texto: '¡Venta eliminada correctamente!' });
        cargarVentas();
      } else {
        setMensaje({ tipo: 'error', texto: `Error: ${data.mensaje}` });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al intentar eliminar la venta.' });
    } finally {
      setLoading(false);
    }
  };

  const handleControlNodo = async (nombreNodo: string, accion: string) => {
    setLoading(true);
    setMensaje(null);
    setModalConfirmacion(null);
    try {
      const res = await fetch('/api/control-nodo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_nodo: nombreNodo, accion }),
      });
      const data = await res.json();
      if (data.exito) {
        setMensaje({ tipo: 'success', texto: data.mensaje || `Comando ${accion} enviado a ${nombreNodo}.` });
      } else {
        setMensaje({ tipo: 'error', texto: data.mensaje || 'Error al enviar comando al nodo.' });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error interno en frontend.' });
    } finally {
      setLoading(false);
    }
  };



  const getBadgeColor = (region: string) => {
    const colors: Record<string, string> = {
      'SUR': 'bg-blue-50 text-blue-700 ring-blue-600/20',
      'NORTE': 'bg-rose-50 text-rose-700 ring-rose-600/20',
      'CENTRO': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      'ESTE': 'bg-purple-50 text-purple-700 ring-purple-600/20',
      'OESTE': 'bg-amber-50 text-amber-700 ring-amber-600/20'
    };
    return colors[region] || 'bg-gray-50 text-gray-700 ring-gray-500/10';
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">

      {/* --- NAVBAR --- */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 pb-32">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20">
                <ActivityIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Cassandra Monitor</h1>
                <p className="text-indigo-200 text-xs font-medium">Sistema Distribuido • gRPC • Docker</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-black/20 px-4 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
              <span className="text-xs font-semibold text-emerald-100">Sistema Operativo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-24">

        {/* --- MONITOR DE NODOS --- */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
            <ServerIcon className="w-4 h-4" /> Estado del Cluster
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {nodos.map((nodo, index) => (
              <div key={index} className={`relative group overflow-hidden p-4 rounded-xl border shadow-lg transition-all duration-500 hover:-translate-y-1 ${nodo.estado === 'UP'
                ? 'bg-white border-white/50'
                : 'bg-rose-50 border-rose-200 opacity-90'
                }`}>
                <div className="flex flex-col items-center z-10 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${nodo.estado === 'UP' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                    <ServerIcon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-slate-700 text-center leading-tight h-8 flex items-center">{nodo.nombre.split('(')[0]}</span>
                  <span className="text-[10px] text-slate-400 mb-2 font-mono">{nodo.direccion.split(':')[1] || '9042'}</span>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${nodo.estado === 'UP'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                    }`}>
                    {nodo.estado}
                  </span>

                  {/* Botones de Control (Siempre visibles) */}
                  <div className="mt-3 flex gap-1.5 bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
                    <button onClick={() => setModalConfirmacion({
                      titulo: '¿Encender nodo?',
                      mensaje: <>¿Deseas encender el nodo <b>{nodo.nombre.split('(')[0].trim()}</b>?</>,
                      color: 'emerald',
                      icono: 'power',
                      onConfirm: () => handleControlNodo(nodo.nombre, 'start')
                    })} title="Encender" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 hover:text-emerald-700 transition" disabled={loading}>
                      <PowerIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModalConfirmacion({
                      titulo: '¿Apagar nodo?',
                      mensaje: <>¿Deseas apagar el nodo <b>{nodo.nombre.split('(')[0].trim()}</b>? Esto lo marcará como DOWN temporalmente.</>,
                      color: 'rose',
                      icono: 'power',
                      onConfirm: () => handleControlNodo(nodo.nombre, 'stop')
                    })} title="Apagar" className="p-1.5 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 hover:text-rose-700 transition" disabled={loading}>
                      <PowerIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModalConfirmacion({
                      titulo: '¿Reiniciar nodo?',
                      mensaje: <>¿Deseas reiniciar el nodo <b>{nodo.nombre.split('(')[0].trim()}</b>?</>,
                      color: 'indigo',
                      icono: 'refresh',
                      onConfirm: () => handleControlNodo(nodo.nombre, 'restart')
                    })} title="Reiniciar" className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 hover:text-indigo-700 transition" disabled={loading}>
                      <RefreshIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Efecto de fondo si está UP */}
                {nodo.estado === 'UP' && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full -mr-4 -mt-4"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* --- ESTADISTICAS DEL CLUSTER --- */}
        {estadisticas && (
          <div className="mb-8 grid grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="col-span-2 bg-gradient-to-br from-indigo-900 to-slate-800 rounded-xl p-5 shadow-lg shadow-indigo-900/20 text-white flex flex-col justify-center border border-indigo-700/50 relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1 block">Total Registros Globales</span>
                <div className="text-4xl font-black">{estadisticas.total_registros}</div>
              </div>
              <ActivityIcon className="w-24 h-24 absolute -right-4 -bottom-4 text-indigo-500/20" />
            </div>

            {estadisticas.registros_por_region.map((r, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden group hover:border-indigo-300 transition-colors">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Región {r.region}</span>
                <span className={`text-2xl font-black relative z-10 ${r.region === 'SUR' ? 'text-blue-600' :
                    r.region === 'NORTE' ? 'text-rose-600' :
                      r.region === 'CENTRO' ? 'text-emerald-600' :
                        r.region === 'ESTE' ? 'text-purple-600' :
                          'text-amber-600'
                  }`}>{r.total}</span>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 group-hover:bg-indigo-500 transition-colors"></div>
              </div>
            ))}
          </div>
        )}

        {/* --- GRID PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLUMNA IZQUIERDA: FORMULARIO (4/12) */}
          <div className="lg:col-span-4">
            <div className={`rounded-2xl shadow-xl border overflow-hidden sticky top-6 transition-colors duration-300 ${form.id_venta ? 'bg-indigo-50/40 border-indigo-200 shadow-indigo-500/10' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${form.id_venta ? 'bg-indigo-100/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                <h2 className={`font-bold ${form.id_venta ? 'text-indigo-900 flex items-center gap-2' : 'text-slate-800'}`}>
                  {form.id_venta && <PencilIcon className="w-4 h-4 text-indigo-600" />}
                  {form.id_venta ? 'Actualizar Venta' : 'Registrar Venta'}
                </h2>
                <div className={`w-2 h-2 rounded-full ${form.id_venta ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-400'}`}></div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* --- SECCION CLIENTE --- */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">DNI O RUC Cliente</label>
                    <input
                      type="text"
                      value={form.cliente_dni_ruc}
                      onChange={e => setForm({ ...form, cliente_dni_ruc: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-sm transition-all text-slate-700 placeholder:text-slate-400"
                      placeholder="Ej: 77123456"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombres</label>
                      <input
                        type="text"
                        value={form.cliente_nombre}
                        onChange={e => setForm({ ...form, cliente_nombre: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-sm transition-all text-slate-700 placeholder:text-slate-400"
                        placeholder="Ej: Juan"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Apellidos</label>
                      <input
                        type="text"
                        value={form.cliente_apellido}
                        onChange={e => setForm({ ...form, cliente_apellido: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-sm transition-all text-slate-700 placeholder:text-slate-400"
                        placeholder="Ej: Pérez"
                      />
                    </div>
                  </div>
                </div>

                {/* --- SECCION PRODUCTO --- */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Producto</label>
                    <input
                      type="text"
                      value={form.producto}
                      onChange={e => setForm({ ...form, producto: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-sm transition-all text-slate-700 placeholder:text-slate-400"
                      placeholder="Ej: Laptop Gamer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Precio ($)</label>
                      <input
                        type="number"
                        value={form.precio}
                        onChange={e => setForm({ ...form, precio: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-sm transition-all text-slate-700"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">País</label>
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm cursor-pointer text-slate-700"
                        onChange={e => setForm({ ...form, pais: e.target.value })}
                        value={form.pais}
                        required
                      >
                        <option value="">Elegir...</option>
                        <option value="Peru">Perú</option>
                        <option value="Argentina">Argentina</option>
                        <option value="Colombia">Colombia</option>
                        <option value="Mexico">México</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* --- SECCION REGION --- */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <label className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Nodo Destino (Región)
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-indigo-200 text-indigo-900 rounded-lg outline-none text-sm font-medium cursor-pointer hover:border-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-500/20"
                    onChange={e => setForm({ ...form, region: e.target.value })}
                    value={form.region}
                  >
                    <option value="SUR">Región SUR</option>
                    <option value="NORTE">Región NORTE</option>
                    <option value="CENTRO">Región CENTRO</option>
                    <option value="ESTE">Región ESTE</option>
                    <option value="OESTE">Región OESTE</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500'}`}
                  >
                    {loading ? (
                      <span className="animate-pulse">Procesando...</span>
                    ) : (
                      <>
                        <SaveIcon className="w-4 h-4" /> {form.id_venta ? 'Actualizar Transacción' : 'Guardar Transacción'}
                      </>
                    )}
                  </button>
                  {form.id_venta && (
                    <button
                      type="button"
                      onClick={() => setForm({ id_venta: '', producto: '', precio: '', pais: '', region: 'SUR', cliente_nombre: '', cliente_apellido: '', cliente_dni_ruc: '' })}
                      className="px-4 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              {mensaje && (
                <div className={`m-6 mt-0 p-4 rounded-xl text-xs text-center font-medium border ${mensaje.tipo === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  {mensaje.texto}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: TABLA (8/12) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-h-[500px]">

              {/* Toolbar de Tabla */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Historial de Operaciones</h2>
                  <p className="text-slate-400 text-xs">Datos sincronizados en tiempo real con el cluster</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar:</span>
                  <select
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer font-medium"
                    value={filtroRegion}
                    onChange={(e) => handleFiltroCambio(e.target.value)}
                  >
                    <option value="TODAS">Todas las Regiones</option>
                    <option value="SUR">Sur</option>
                    <option value="NORTE">Norte</option>
                    <option value="CENTRO">Centro</option>
                    <option value="ESTE">Este</option>
                    <option value="OESTE">Oeste</option>
                  </select>
                </div>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Región</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Precio</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ventas.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          <p className="text-sm font-medium">No hay datos registrados en esta vista.</p>
                        </div>
                      </td></tr>
                    ) : (
                      ventas.map((v) => (
                        <tr key={v.id_venta} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            {v.cliente_dni_ruc && (
                              <>
                                <div className="font-bold text-slate-700 text-xs">
                                  {(v.cliente_nombre || '') + ' ' + (v.cliente_apellido || '')}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ID: {v.cliente_dni_ruc}
                                </div>
                              </>
                            )}
                            {!v.cliente_dni_ruc && <span className="text-slate-300 text-xs italic">Anónimo</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{v.producto}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{v.pais}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-inset uppercase tracking-wide ${getBadgeColor(v.region)}`}>
                              {v.region}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono font-semibold text-slate-600 bg-slate-100 inline-block px-2 py-1 rounded-md border border-slate-200">
                              ${typeof v.precio === 'number' ? v.precio.toFixed(2) : v.precio}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                            {new Date(v.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(v)}
                                className="p-2 text-indigo-500 bg-indigo-50 border border-indigo-100 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setModalConfirmacion({
                                  titulo: '¿Eliminar registro?',
                                  mensaje: <>Estás a punto de eliminar la venta de <b>{v.producto}</b>. Esta acción no se puede deshacer.</>,
                                  color: 'rose',
                                  icono: 'trash',
                                  onConfirm: () => confirmarEliminar(v)
                                })}
                                className="p-2 text-rose-500 bg-rose-50 border border-rose-100 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Mostrando {ventas.length} registros (Pág {currentPage + 1})</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (currentPage > 0) {
                        actualizarPaginacion(currentPage - 1, pageStatesRef.current);
                        setTimeout(cargarVentas, 0);
                      }
                    }}
                    disabled={currentPage === 0}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => {
                      if (currentPage + 1 < pageStatesRef.current.length && pageStatesRef.current[currentPage + 1]) {
                        actualizarPaginacion(currentPage + 1, pageStatesRef.current);
                        setTimeout(cargarVentas, 0);
                      }
                    }}
                    disabled={currentPage + 1 >= pageStatesRef.current.length || !pageStatesRef.current[currentPage + 1]}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      {modalConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto
              ${modalConfirmacion.color === 'rose' ? 'bg-rose-100 text-rose-600' :
                modalConfirmacion.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-indigo-100 text-indigo-600'}
            `}>
              {modalConfirmacion.icono === 'trash' && <TrashIcon className="w-6 h-6" />}
              {modalConfirmacion.icono === 'power' && <PowerIcon className="w-6 h-6" />}
              {modalConfirmacion.icono === 'refresh' && <RefreshIcon className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">{modalConfirmacion.titulo}</h3>
            <p className="text-sm text-center text-slate-500 mb-6">
              {modalConfirmacion.mensaje}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalConfirmacion(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmacion.onConfirm}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-colors text-sm shadow-lg
                  ${modalConfirmacion.color === 'rose' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' :
                    modalConfirmacion.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                      'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}
                `}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}