'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AppShell({ children }) {
  const router = useRouter();

  async function handleLogout() {
    try { await api.post('/api/auth/logout', {}); } catch {}
    localStorage.clear();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-wide">ZERO</span>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/dashboard/operations" className="hover:text-blue-200 transition">Dashboard</Link>
            <Link href="/orders" className="hover:text-blue-200 transition">Pedidos</Link>
            <Link href="/scan" className="hover:text-blue-200 transition">Escanear</Link>
          </nav>
          <button onClick={handleLogout} className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded-lg transition">
            Salir
          </button>
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex gap-4 px-4 pb-2 text-sm">
          <Link href="/dashboard/operations" className="hover:text-blue-200">Dashboard</Link>
          <Link href="/orders" className="hover:text-blue-200">Pedidos</Link>
          <Link href="/scan" className="hover:text-blue-200">Escanear</Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
