'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Shell from '../../../../components/Shell';
import Guard from '../../../../components/Guard';
import { fetcher, api } from '../../../../lib/api';

function StatusDot({ connected }) {
  return (
    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

export default function TNIntegrationPage() {
  const searchParams = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [banner, setBanner] = useState('');

  const { data: status, mutate, isLoading } = useSWR('/api/integrations/tiendanube/status', fetcher, {
    refreshInterval: 10000,
  });

  useEffect(() => {
    if (searchParams.get('connected') === '1') setBanner('✅ Tiendanube conectado correctamente.');
    if (searchParams.get('error')) setBanner(`❌ Error al conectar: ${searchParams.get('error')}`);
  }, [searchParams]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError('');
    try {
      const res = await api.post('/api/integrations/tiendanube/sync', {});
      setSyncResult(res);
      mutate();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  function handleConnect() {
    window.location.href = '/api/integrations/tiendanube/auth/start';
  }

  return (
    <Guard adminOnly>
      <Shell>
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Integración Tiendanube</h1>

          {banner && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${banner.startsWith('✅') ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
              {banner}
            </div>
          )}

          {/* Connection status */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Estado de conexión</h2>

            {isLoading ? (
              <p className="text-gray-400">Cargando...</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <StatusDot connected={status?.connected} />
                  <span className="font-medium">
                    {status?.connected ? 'Conectado a Tiendanube' : 'Sin conectar'}
                  </span>
                </div>

                {status?.connected && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tienda</span>
                      <span className="font-medium">{status.tn_store_name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Store ID</span>
                      <span className="font-mono">{status.tn_store_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Última sincronización</span>
                      <span>{status.last_sync_at ? new Date(status.last_sync_at).toLocaleString('es-AR') : 'Nunca'}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleConnect}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${status?.connected ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                    {status?.connected ? '🔄 Reconectar' : '🔗 Conectar con Tiendanube'}
                  </button>
                  {status?.connected && (
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
                      {syncing ? '⏳ Sincronizando...' : '⬇ Sync ahora'}
                    </button>
                  )}
                </div>

                {syncResult && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-green-800">✅ Sincronización completa</p>
                    <p className="text-green-700 mt-1">
                      {syncResult.synced} pedidos importados · {syncResult.errors} errores
                    </p>
                  </div>
                )}
                {syncError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    ❌ {syncError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Setup guide */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Configuración</h2>
            <ol className="space-y-3 text-sm text-gray-700 list-none">
              {[
                ['1', 'Creá una app en Tiendanube Partners y obtenés Client ID y Client Secret.'],
                ['2', `Configurá el Redirect URI en la app: ${typeof window !== 'undefined' ? window.location.origin : 'https://TU-APP.railway.app'}/api/integrations/tiendanube/auth/callback`],
                ['3', 'Agregá TIENDANUBE_CLIENT_ID y TIENDANUBE_CLIENT_SECRET en las variables de entorno de Railway.'],
                ['4', 'Hacé clic en "Conectar con Tiendanube" y autorizá la app.'],
                ['5', 'Hacé clic en "Sync ahora" para importar los pedidos recientes.'],
              ].map(([n, text]) => (
                <li key={n} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>

            <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-1">
              <p className="font-semibold text-gray-700">URLs de webhook para Tiendanube:</p>
              <code className="block text-gray-600 break-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://TU-APP.railway.app'}/api/integrations/tiendanube/webhook
              </code>
              <p className="text-gray-500 mt-2">Configurá este URL en los webhooks de tu app de Tiendanube (eventos: order/*)</p>
            </div>
          </div>
        </div>
      </Shell>
    </Guard>
  );
}
