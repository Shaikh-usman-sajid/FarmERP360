'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const ROLES = ['owner', 'accountant', 'farm_manager', 'vet_manager', 'employee', 'data_entry', 'investor', 'pallai_customer']
const emptyForm = { email: '', full_name: '', phone: '', password: '', role: 'employee' }
const roleColors: any = { super_admin: 'badge-danger', owner: 'badge-info', accountant: 'badge-warning', farm_manager: 'badge-active', vet_manager: 'badge-active', employee: 'badge-gray', investor: 'badge-warning', pallai_customer: 'badge-gray' }

export default function UsersPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data } = useQuery({ queryKey: ['users'], queryFn: () => usersAPI.list({ per_page: 50 }).then(r => r.data.data) })

  const createMutation = useMutation({
    mutationFn: (d: any) => usersAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create user'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated') },
  })

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{data?.total ?? 0} users</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['User', 'Email', 'Role', 'Phone', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((u: any) => (
              <tr key={u.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">{u.full_name[0]}</div>
                    <span className="font-medium">{u.full_name}</span>
                  </div>
                </td>
                <td className="table-cell text-gray-500">{u.email}</td>
                <td className="table-cell"><span className={roleColors[u.role] || 'badge-gray'}>{u.role.replace('_', ' ')}</span></td>
                <td className="table-cell">{u.phone || '—'}</td>
                <td className="table-cell"><span className={u.is_active ? 'badge-active' : 'badge-danger'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="table-cell">
                  {u.is_active && u.role !== 'super_admin' && (
                    <button onClick={() => deactivateMutation.mutate(u.id)} className="text-red-500 hover:text-red-700 text-xs">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add New User</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }} className="p-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
