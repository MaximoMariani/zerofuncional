'use client';
import { useState } from 'react';
import useSWR from 'swr';
import AppShell from '../../../components/layout/AppShell';
import { api } from '../../../lib/api';

// ── Reusable components ────────────────────────────────

function KpiCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`border rounded-xl p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
          <p className="text-3xl font-bold">{value ?? '—'}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-50">{icon}</span>}
      </div>
    </div>
  );
}

function MiniBarChart({ data, xKey, yKey, label }) {
  if (!data?.length) return <div className="text-gray-400 text-sm py-4 text-center">Sin datos</div>;
  const max = Math.max(...data.map((d) => d[yKey]), 1);
  // Show only hours with data or spread across day
  const display = data.filter((d, i) => d[yKey] > 0 || i % 4 === 0);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {display.map((d) => (
          <div key={d[xKey]} className="flex flex-col items-center flex-1 gap-0.5">
            <div
              className="w-full bg-blue-500 rounded-t-sm transition-all"
              style={{ height: `${Math.max((d[yKey] / max) * 80, d[yKey] > 0 ? 4 : 0)}px` }}
              title={`${d[xKey]}: ${d[yKey]}`}
            />
            <span className="text-xs text-gray-400" style={{ fontSize: '9px' }}>
              {d[xKey].slice(0, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperatorTable({ operators }) {
  if (!operators?.length) return <p className="text-gray-400 text-sm py-4">Sin actividad hoy</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            <th className="py-2 font-medium">Operario</th>
            <th className="py-2 font-medium text-right">Pedidos</th>
            <th className="py-2 font-medium text-right">Scans OK</th>
            <th className="py-2 font-medium text-right">Errores</th>
            <th className="py-2 font-medium text-right">Tasa error</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {operators.map((op, i) => (
            <tr key={op.user_id} className="hover:bg-gray-50">
              <td className="py-2 flex items-center gap-2">
                {i === 0 && <span title="Mejor operario">🏆</span>}
                <span className="font-medium">{op.operator_name}</span>
              </td>
              <td className="py-2 text-right font-semibold text-green-700">{op.orders_packed}</td>
              <td className="py-2 text-right">{op.scans_ok}</td>
              <td className="py-2 text-right text-red-600">{op.scans_error}</td>
              <td className="py-2 text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  op.error_rate_pct < 5 ? 'bg-green-100 text-green-700'
                  : op.error_rate_pct < 15 ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                  {op.error_rate_pct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────

export default function OperationsDashboard() {
  const [date, setDate] = useState('');

  const dateParam = date ? `?date=${date}` : '';
  const fetcher = (url) => api.get(url);

  const { data: today, isLoading: loadingToday } = useSWR(`/api/kpi/today${dateParam}`, fetcher, { refreshInterval: 30000 });
  const { data: perf } = useSWR(`/api/kpi/performance${dateParam}`, fetcher, { refreshInterval: 30000 });
  const { data: ops } = useSWR(`/api/kpi/operators${dateParam}`, fetcher, { refreshInterval: 30000 });
  const { data: errors } = useSWR(`/api/kpi/errors${dateParam}`, fetcher, { refreshInterval: 30000 });

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Operativo</h1>
          <p className="text-gray-500 text-sm mt-0.5">Métricas en tiempo real del depósito</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Fecha:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {date && (
            <button onClick={() => setDate('')} className="text-xs text-gray-400 hover:text-gray-600">
              Hoy
            </button>
          )}
        </div>
      </div>

      {loadingToday && (
        <div className="text-center py-12 text-gray-400">Cargando métricas…</div>
      )}

      {today && (
        <>
          {/* ── Row 1: Summary KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Pedidos armados hoy" value={today.orders_packed_today} color="green" icon="📦" />
            <KpiCard label="Pendientes" value={today.orders_pending} color="yellow" icon="⏳" />
            <KpiCard label="En proceso" value={today.orders_in_progress} color="blue" icon="🔄" />
            <KpiCard
              label="Tiempo prom. armado"
              value={today.avg_pack_time_display}
              sub="desde apertura a packed"
              color="purple"
              icon="⏱"
            />
          </div>

          {/* ── Row 2: Scan stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <KpiCard label="Scans exitosos" value={today.scans_ok_today} color="green" icon="✅" />
            <KpiCard label="Scans con error" value={today.scans_error_today} color="red" icon="❌" />
            <KpiCard
              label="Tasa de error"
              value={`${today.scan_error_rate_pct}%`}
              sub={today.scan_error_rate_pct < 5 ? 'Normal' : today.scan_error_rate_pct < 15 ? 'Atención' : 'Crítico'}
              color={today.scan_error_rate_pct < 5 ? 'green' : today.scan_error_rate_pct < 15 ? 'yellow' : 'red'}
              icon="📊"
            />
          </div>

          {/* ── Row 3: Charts + Tables ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Hourly chart */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Pedidos por hora</h2>
              {perf?.hourly_chart ? (
                <MiniBarChart
                  data={perf.hourly_chart}
                  xKey="hour"
                  yKey="orders_packed"
                  label="Pedidos empaquetados por hora del día"
                />
              ) : (
                <div className="text-gray-400 text-sm py-6 text-center">Cargando…</div>
              )}
            </div>

            {/* Operator rankings */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Eficiencia por operario</h2>
              <OperatorTable operators={ops?.operators} />
            </div>
          </div>

          {/* ── Row 4: Errors ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top error barcodes */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Barcodes con más errores</h2>
              {errors?.top_error_barcodes?.length ? (
                <ul className="space-y-2">
                  {errors.top_error_barcodes.map((e) => (
                    <li key={e.barcode} className="flex justify-between items-center text-sm">
                      <span className="font-mono text-gray-700">{e.barcode}</span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {e.count} errores
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-400 text-sm py-4 text-center">✅ Sin errores de escaneo hoy</div>
              )}
            </div>

            {/* Top missing SKUs */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Productos con faltantes</h2>
              {errors?.top_missing_skus?.length ? (
                <ul className="space-y-2">
                  {errors.top_missing_skus.map((e) => (
                    <li key={e.sku} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{e.name}</span>
                        <span className="ml-2 text-gray-400 text-xs">{e.sku}</span>
                      </div>
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {e.count} veces
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-400 text-sm py-4 text-center">✅ Sin faltantes hoy</div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
