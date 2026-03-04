'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

export default function Guard({ children, adminOnly = false }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace('/login');
    if (user && adminOnly && user.role !== 'admin') router.replace('/orders');
  }, [user, adminOnly, router]);

  if (user === undefined) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user === null) return null;
  if (adminOnly && user.role !== 'admin') return null;
  return <>{children}</>;
}
