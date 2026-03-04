'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Shell from '../../../components/Shell';
import Guard from '../../../components/Guard';
import { fetcher, api } from '../../../lib/api';

export default function UsersPage() {
  const { data: users, mutate, isLoading } = useSWR('/api/users', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'operator' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/users', form);
      setForm({ email: '', password: '', role: 'operator' });
      setShowForm(false);
      mutate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    try {
      await api.patch(`/api/users/${user.id}`, { active: !user.active });
      mutate();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <Guard adminOnly>
      <Shell>
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {showForm ? 'Cancelar' : '+ Nuevo usuario'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold mb-4">Crear usuario</h2>
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="email" placeholder="Email" value={form.email} required
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password" placeholder="Contraseña (mín. 8 chars)" value={form.password} required
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="operator">Operador</option>
                  <option value="admin">Admin</option>
                </select>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button type="submit" disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors">
                  {saving ? 'Guardando...' : 'Crear usuario'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow overflow-hidden">
            {isLoading ? (
              <div className="py-10 text-center text-gray-400">Cargando...</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users?.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${user.active ? 'text-green-600' : 'text-gray-400'}`}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => toggleActive(user)}
                          className="text-xs text-gray-500 hover:text-gray-700 underline">
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Shell>
    </Guard>
  );
}
