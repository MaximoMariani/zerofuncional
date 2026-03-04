'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '../../components/Shell';
import Guard from '../../components/Guard';
import { api } from '../../lib/api';

export default function PackPage() {
  const [mode, setMode] = useState('label'); // 'label' | 'number'
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => { inputRef.current?.focus(); }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    setError('');
    setLoading(true);
    try {
      let order;
      if (mode === 'label') {
        order = await api.get(`/api/orders/by-label/${encodeURIComponent(val)}`);
      } else {
        order = await api.get(`/api/orders/by-number/${encodeURIComponent(val)}`);
      }
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message || 'Pedido no encontrado');
      setInput('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Guard>
      <Shell>
        <div className="max-w-lg mx-auto pt-8 space-y-6">
          <h1 className="text-2xl font-bold">Armar pedido</h1>

          {/* Mode toggle */}
          <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => { setMode('label'); setInput(''); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'label' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              📷 Escanear etiqueta Andreani
            </button>
            <button
              onClick={() => { setMode('number'); setInput(''); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'number' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              🔢 Número de pedido
            </button>
          </div>

          {/* Input */}
          <div className="bg-white rounded-2xl shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'label' ? 'Código de etiqueta Andreani' : 'Número de pedido Tiendanube'}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={mode === 'label' ? 'AND000001234...' : '1234'}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full border-2 border-blue-300 focus:border-blue-500 rounded-xl px-4 py-3 text-xl font-mono focus:outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                  ✗ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-lg transition-colors">
                {loading ? 'Buscando...' : 'Abrir pedido →'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
              {mode === 'label'
                ? 'Escaneá la etiqueta del paquete Andreani para encontrar el pedido'
                : 'Ingresá el número de pedido de Tiendanube (ej: 1234)'}
            </p>
          </div>

          {/* Quick tip */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
            <strong>💡 Flujo rápido:</strong> Escaneá la etiqueta Andreani pegada al paquete → el sistema abre el pedido automáticamente → escaneá cada producto → listo.
          </div>
        </div>
      </Shell>
    </Guard>
  );
}
