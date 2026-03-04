import './globals.css';
import { AuthProvider } from '../lib/auth';

export const metadata = { title: 'ZERO — Order Packing', description: 'Warehouse order packing system' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
