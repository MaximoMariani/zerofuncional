'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import AppShell from '../../components/layout/AppShell';
import { api } from '../../lib/api';

const STATUS_LABELS = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'En proceso', color: 'bg-blue-100 text-blue-800' },
  packed: { label: 'Empaquetado', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const params = new URLSearchParams({ page, limit: 20, ...(status ? { status } : {}) }).toString();
  const { data, error, isLoading, mutate } = useSWR(
    `/api/orders?${params}`,
    (url) => api.get(url),
    { keepPreviousData: true }
  );

  const orders = data?.data || [];
  const pagination = data?.pagination;

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En proceso</option>
          <option value="packed">Empaquetado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">Cargando pedidos…</div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          Error al cargar pedidos: {error.message}
          <button onClick={() => mutate()} className="ml-3 underline">Reintentar</button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📦</p>
          <p>No hay pedidos {status ? 'con ese estado' : ''}.</p>
        </div>
      )}

      {/* Table */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Asignado a</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-gray-500">{o.id}</td>
                  <td className="px-4 py-3 font-medium">{o.customer_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.scanned_qty}/{o.total_qty}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.assigned_to_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(o.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{pagination.total} pedidos</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >← Anterior</button>
            <span className="px-3 py-1 text-gray-600">{page} / {pagination.pages}</span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >Siguiente →</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
