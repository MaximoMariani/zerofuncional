'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Shell from '../../../components/Shell';
import Guard from '../../../components/Guard';
import { fetcher, api } from '../../../lib/api';

// ── Beep sounds via Web Audio API ─────────────────────────────
function beep(freq = 880, dur = 120, type = 'sine') {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur / 1000);
  } catch {}
}

function beepOk()    { beep(1200, 80, 'sine'); }
function beepError() { beep(200, 300, 'sawtooth'); }
function beepDone()  { beep(880, 100); setTimeout(() => beep(1200, 200), 120); }

// ── Item row ───────────────────────────────────────────────────
function ItemRow({ item }) {
  const done = item.scanned_qty >= item.qty;
  const pct  = Math.min(100, (item.scanned_qty / item.qty) * 100);
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${done ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
        {done ? '✓' : '○'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
        {item.variant && <p className="text-xs text-gray-500">{item.variant}</p>}
        <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}{item.barcode ? ` · ${item.barcode}` : ''}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-2xl font-bold ${done ? 'text-green-600' : 'text-gray-700'}`}>
          {item.scanned_qty}<span className="text-gray-400 text-lg">/{item.qty}</span>
        </p>
        <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
          <div className={`h-1.5 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Toast notification ─────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const colors = { ok: 'bg-green-600', error: 'bg-red-600', warn: 'bg-amber-500', done: 'bg-blue-700' };
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-white font-semibold shadow-2xl text-base max-w-sm text-center transition-all ${colors[type] || 'bg-gray-700'}`}>
      {msg}
    </div>
  );
}

export default function PackingScreen() {
  const { id } = useParams();
  const router = useRouter();
  const inputRef = useRef(null);
  const [scanInput, setScanInput] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [scanning, setScanning] = useState(false);

  const { data: order, isLoading, mutate } = useSWR(id ? `/api/orders/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  // Always keep scanner focused
  useEffect(() => {
    const focus = () => { if (order?.status === 'pending') inputRef.current?.focus(); };
    focus();
    document.addEventListener('click', focus);
    return () => document.removeEventListener('click', focus);
  }, [order?.status]);

  function showToast(msg, type, dur = 2500) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), dur);
  }

  const handleScan = useCallback(async (e) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code || scanning) return;
    setScanInput('');
    setScanning(true);

    try {
      const result = await api.post(`/api/orders/${id}/scan-item`, { code });
      mutate(); // refresh order data

      if (result.allDone) {
        beepDone();
        showToast('🎉 ¡Pedido completo! Marcado como armado.', 'done', 4000);
        setTimeout(() => router.push('/orders'), 3500);
      } else {
        beepOk();
        const item = result.item;
        showToast(`✓ ${item.name} · ${item.scanned_qty}/${item.qty}`, 'ok', 1500);
      }
    } catch (err) {
      if (err.status === 409) {
        beepError();
        showToast(`⚠ Duplicado: ${err.data?.error || err.message}`, 'warn');
      } else if (err.status === 422) {
        beepError();
        showToast(`✗ No encontrado: "${code}"`, 'error');
      } else {
        beepError();
        showToast(`Error: ${err.message}`, 'error');
      }
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [scanInput, scanning, id, mutate, router]);

  if (isLoading) return (
    <Guard><Shell>
      <div className="flex items-center justify-center py-20 text-gray-400">Cargando pedido...</div>
    </Shell></Guard>
  );

  if (!order) return (
    <Guard><Shell>
      <div className="text-center py-20 text-red-500">Pedido no encontrado</div>
    </Shell></Guard>
  );

  const isPacked = order.status === 'packed';
  const totalQty   = order.items?.reduce((s, i) => s + i.qty, 0) || 0;
  const scannedQty = order.items?.reduce((s, i) => s + i.scanned_qty, 0) || 0;
  const pct = totalQty ? Math.round((scannedQty / totalQty) * 100) : 0;

  return (
    <Guard>
      <Shell>
        <Toast msg={toast.msg} type={toast.type} />

        <div className="max-w-2xl mx-auto space-y-5">
          {/* Order header */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pedido</p>
                <h1 className="text-3xl font-bold text-blue-700">#{order.tn_order_number || order.id}</h1>
                <p className="text-gray-600 mt-1">{order.customer_name}</p>
                {order.shipping_label_code && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">📦 {order.shipping_label_code}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${isPacked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                  {isPacked ? '✓ Armado' : 'Pendiente'}
                </span>
                {isPacked && order.packed_at && (
                  <p className="text-xs text-gray-400 mt-1">{new Date(order.packed_at).toLocaleString('es-AR')}</p>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progreso</span>
                <span className="font-semibold">{scannedQty}/{totalQty} unidades ({pct}%)</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Scanner input */}
          {!isPacked && (
            <form onSubmit={handleScan} className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📷 Escanear código de producto
              </label>
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Barcode o SKU..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={scanning}
                  className="flex-1 border-2 border-blue-300 focus:border-blue-500 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!scanInput.trim() || scanning}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-xl transition-colors">
                  OK
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                El cursor siempre vuelve aquí. Escaneá con pistola o teclado.
              </p>
            </form>
          )}

          {/* Items */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              Productos del pedido ({order.items?.length || 0} líneas)
            </h2>
            {order.items?.map(item => <ItemRow key={item.id} item={item} />)}
          </div>

          {/* Packed confirmation */}
          {isPacked && (
            <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center">
              <p className="text-5xl mb-3">🎉</p>
              <p className="text-green-700 font-bold text-xl">Pedido armado</p>
              <button onClick={() => router.push('/orders')} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-xl transition-colors">
                Volver a pedidos
              </button>
            </div>
          )}
        </div>
      </Shell>
    </Guard>
  );
}
