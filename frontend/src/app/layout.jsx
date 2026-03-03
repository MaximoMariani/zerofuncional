import './globals.css';

export const metadata = {
  title: 'ZERO — Armado de Pedidos',
  description: 'Sistema de armado de pedidos con escaneo de código de barras',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
