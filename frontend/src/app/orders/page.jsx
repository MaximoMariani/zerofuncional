'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Shell from '../../components/Shell';
import Guard from '../../components/Guard';
import { fetcher } from '../../lib/api';

const STATUS_LABELS = { pending: 'Pendiente', packed: 'Armado', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-800',
  packed:    'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ProgressBar({ scanned, total }) {
  if (!total) return <span className="text-gray-400 text-xs">—</span>;
  const pct = Math.min(100, Math.round((scanned / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[80px]">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{scanned}/{total}</span>
    </div>
  );
}

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page });
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const { data, isLoading, mutate } = useSWR(`/api/orders?${params}`, fetcher, { refreshInterval: 15000 });

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  return (
    <Guard>
      <Shell>
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Pedidos</h1>
            <Link href="/pack" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              ＋ Armar pedido
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <input
                value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Buscar por número, cliente o etiqueta..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-3 py-1.5 text-sm transition-colors">
                Buscar
              </button>
            </form>
            <div className="flex gap-1">
              {['', 'pending', 'packed'].map(s => (
                <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  {s === '' ? 'Todos' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">Cargando...</div>
            ) : !data?.data?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <span className="text-4xl">📦</span>
                <p>No hay pedidos</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Pedido</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Etiqueta</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Progreso</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                        #{order.tn_order_number || order.id}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.customer_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {order.shipping_label_code || '—'}
                      </td>
                      <td className="px-4 py-3"><Badge status={order.status} /></td>
                      <td className="px-4 py-3">
                        <ProgressBar scanned={order.scanned_qty} total={order.total_qty} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(order.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{data.pagination.total} pedidos · pág {data.pagination.page}/{data.pagination.pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">← Anterior</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.pages}
                  className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      </Shell>
    </Guard>
  );
}
