'use client';
import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import AppShell from '../../components/layout/AppShell';
import { api } from '../../lib/api';

// ── Exception Modal ─────────────────────────────────────
function ExceptionModal({ item, orderId, onClose, onDone }) {
  const [mode, setMode] = useState(null); // 'missing' | 'replace' | 'override'
  const [replaceSku, setReplaceSku] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'missing') {
        await api.post(`/api/orders/${orderId}/items/${item.id}/missing`, { notes });
      } else if (mode === 'replace') {
        if (!replaceSku.trim()) { setError('Ingresá el SKU de reemplazo'); setLoading(false); return; }
        await api.post(`/api/orders/${orderId}/items/${item.id}/replace`, { replacementSku: replaceSku.trim(), notes });
      } else if (mode === 'override') {
        await api.post(`/api/orders/${orderId}/supervisor-override`, { notes });
      }
      onDone(mode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-bold text-lg mb-1">Excepción de pedido</h2>
        {item && <p className="text-sm text-gray-500 mb-4">Item: <strong>{item.name}</strong> ({item.sku})</p>}

        {!mode && (
          <div className="space-y-3">
            <button onClick={() => setMode('missing')}
              className="w-full border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 rounded-xl py-3 font-medium text-sm transition">
              ⚠️ Marcar como faltante
            </button>
            <button onClick={() => setMode('replace')}
              className="w-full border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl py-3 font-medium text-sm transition">
              🔄 Reemplazar producto
            </button>
            <button onClick={() => setMode('override')}
              className="w-full border-2 border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl py-3 font-medium text-sm transition">
              🔐 Override de supervisor
            </button>
            <button onClick={onClose} className="w-full text-gray-400 hover:text-gray-600 text-sm py-2">
              Cancelar
            </button>
          </div>
        )}

        {mode && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 text-sm font-medium text-gray-700">
              {mode === 'missing' && '⚠️ Marcar item como faltante'}
              {mode === 'replace' && '🔄 Reemplazar producto'}
              {mode === 'override' && '🔐 Override de supervisor'}
            </div>

            {mode === 'replace' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SKU de reemplazo</label>
                <input
                  type="text"
                  value={replaceSku}
                  onChange={(e) => setReplaceSku(e.target.value)}
                  placeholder="PROD-XXX"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota / motivo (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Motivo de la excepción…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setMode(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                Atrás
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition"
              >
                {loading ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Location badge ──────────────────────────────────────
function LocationBadge({ location }) {
  if (!location) return null;
  return (
    <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg px-3 py-1.5 text-sm font-medium">
      <span>📍</span>
      <span>
        <strong>{location.code}</strong>
        {location.zone && <span className="ml-1 text-indigo-400 font-normal">— {location.zone}</span>}
      </span>
    </div>
  );
}

// ── Main scan page ──────────────────────────────────────
export default function ScanPage() {
  const [orderId, setOrderId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exceptionItem, setExceptionItem] = useState(null); // item for exception modal
  const barcodeRef = useRef(null);

  // Load order to show items + locations
  const { data: order, mutate: mutateOrder } = useSWR(
    orderId ? `/api/orders/${orderId}` : null,
    (url) => api.get(url),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (orderId) barcodeRef.current?.focus();
  }, [orderId]);

  async function handleScan(e) {
    e.preventDefault();
    if (!barcode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.post('/api/scans', { orderId: Number(orderId), barcode: barcode.trim() });
      setResult({
        type: 'ok',
        message: `✅ ${data.item.name || data.item.sku} — ${data.item.scanned_qty}/${data.item.quantity ?? '?'}`,
        location: data.item.location,
        allDone: data.allItemsComplete,
      });
      mutateOrder(); // refresh item list
    } catch (err) {
      setResult({ type: 'error', message: `❌ ${err.message}` });
    } finally {
      setLoading(false);
      setBarcode('');
      barcodeRef.current?.focus();
    }
  }

  async function handlePack() {
    if (!orderId) return;
    try {
      await api.patch(`/api/orders/${orderId}/pack`, {});
      setResult({ type: 'ok', message: '🎉 Pedido empaquetado correctamente', allDone: true });
      mutateOrder();
    } catch (err) {
      setResult({ type: 'error', message: `❌ ${err.message}` });
    }
  }

  function handleExceptionDone(mode) {
    setExceptionItem(null);
    mutateOrder();
    setResult({
      type: 'ok',
      message: mode === 'missing' ? '⚠️ Item marcado como faltante'
        : mode === 'replace' ? '🔄 Reemplazo registrado'
        : '🔐 Override de supervisor registrado',
    });
  }

  const items = order?.items || [];
  const pendingItems = items.filter((i) => i.status !== 'complete' && !i.exception_status);
  const exceptionItems = items.filter((i) => i.exception_status);
  const allResolved = items.length > 0 && pendingItems.length === 0;

  return (
    <AppShell>
      {exceptionItem && (
        <ExceptionModal
          item={exceptionItem}
          orderId={Number(orderId)}
          onClose={() => setExceptionItem(null)}
          onDone={handleExceptionDone}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold">Escanear Items</h1>

        {/* Order selector + scan input */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° de pedido</label>
            <input
              type="number"
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); setResult(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID del pedido"
            />
          </div>

          {order && (
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700">
              <strong>{order.customer_name}</strong>
              <span className="ml-2 text-gray-400">{order.customer_email}</span>
              <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                order.status === 'packed' ? 'bg-green-100 text-green-700'
                : order.status === 'in_progress' ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-800'
              }`}>
                {order.status}
              </span>
            </div>
          )}

          <form onSubmit={handleScan}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
            <div className="flex gap-2">
              <input
                ref={barcodeRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={!orderId || order?.status === 'packed'}
                autoComplete="off"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                placeholder="Escaneá o escribí el código"
              />
              <button
                type="submit"
                disabled={!orderId || !barcode || loading || order?.status === 'packed'}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
              >
                {loading ? '…' : 'OK'}
              </button>
            </div>
          </form>

          {/* Scan result */}
          {result && (
            <div role="alert" className={`rounded-lg p-4 text-sm font-medium space-y-1 ${
              result.type === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p>{result.message}</p>
              {result.location && <LocationBadge location={result.location} />}
              {result.allDone && <p className="text-green-700 font-semibold">🎉 ¡Todos los items resueltos! Podés empaquetar el pedido.</p>}
            </div>
          )}
        </div>

        {/* Items list */}
        {order && items.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Items del pedido</h2>
              <span className="text-xs text-gray-400">{items.filter(i => i.status === 'complete').length}/{items.length} completos</span>
            </div>
            <ul className="divide-y">
              {items.map((item) => {
                const isComplete = item.status === 'complete' && !item.exception_status;
                const isMissing = item.exception_status === 'missing';
                const isReplaced = item.exception_status === 'replaced';
                const isPending = !isComplete && !isMissing && !isReplaced;

                return (
                  <li key={item.id} className={`px-5 py-3 flex items-start justify-between gap-3 ${
                    isComplete ? 'bg-green-50' : isMissing ? 'bg-yellow-50' : isReplaced ? 'bg-blue-50' : ''
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{item.sku}</span>
                        {item.location && <LocationBadge location={item.location} />}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {item.scanned_qty}/{item.quantity} escaneados
                        </span>
                        {isMissing && <span className="text-xs text-yellow-700 font-medium">⚠️ Faltante{item.exception_note ? `: ${item.exception_note}` : ''}</span>}
                        {isReplaced && <span className="text-xs text-blue-700 font-medium">🔄 Reemplazado por {item.replacement_sku}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isComplete && !item.exception_status && <span className="text-green-600 text-lg">✅</span>}
                      {isMissing && <span className="text-yellow-500 text-lg">⚠️</span>}
                      {isReplaced && <span className="text-blue-500 text-lg">🔄</span>}
                      {isPending && order.status !== 'packed' && (
                        <button
                          onClick={() => setExceptionItem(item)}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-100 text-gray-600 transition"
                          title="Registrar excepción"
                        >
                          Excepción
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Exception summary */}
            {exceptionItems.length > 0 && (
              <div className="px-5 py-2 bg-amber-50 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium">
                  ⚠️ Este pedido tiene {exceptionItems.length} excepción(es) — se empaquetará como pedido parcial.
                </p>
              </div>
            )}

            {/* Pack button */}
            {order.status !== 'packed' && allResolved && (
              <div className="px-5 py-4 border-t bg-gray-50">
                <button
                  onClick={handlePack}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-3 text-sm transition"
                >
                  📦 Empaquetar pedido {exceptionItems.length > 0 ? '(parcial)' : ''}
                </button>
              </div>
            )}

            {order.status === 'packed' && (
              <div className="px-5 py-4 border-t bg-green-50 text-center text-green-700 font-semibold text-sm">
                ✅ Pedido empaquetado
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
