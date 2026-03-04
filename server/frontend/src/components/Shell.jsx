'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const NAV = [
  { href: '/orders', label: 'Pedidos' },
  { href: '/pack',   label: 'Armar pedido' },
];
const ADMIN_NAV = [
  { href: '/admin/integrations/tiendanube', label: 'Tiendanube' },
  { href: '/admin/users', label: 'Usuarios' },
];

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const path = usePathname();

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/orders" className="font-bold text-xl tracking-tight">ZERO</Link>
            {NAV.map(n => (
              <Link key={n.href} href={n.href}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${path.startsWith(n.href) ? 'bg-blue-900' : 'hover:bg-blue-600'}`}>
                {n.label}
              </Link>
            ))}
            {user.role === 'admin' && ADMIN_NAV.map(n => (
              <Link key={n.href} href={n.href}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${path.startsWith(n.href) ? 'bg-blue-900' : 'hover:bg-blue-600'}`}>
                {n.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-70">{user.email}</span>
            <button onClick={logout} className="bg-blue-900 hover:bg-blue-800 px-3 py-1 rounded text-xs font-medium transition-colors">
              Salir
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
