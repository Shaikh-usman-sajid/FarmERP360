'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { breedsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const SPECIES = ['', 'goat', 'buffalo', 'cattle', 'other']

const emptyForm = { name: '', species: '', description: '' }

export default function BreedsPage() {
  const qc = useQueryClient()
  const [filterSpecies, setFilterSpecies] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editBreed, setEditBreed] = useState<any>(null)
  const [editForm, setEditForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['breeds-admin', filterSpecies],
    queryFn: () => breedsAPI.list(filterSpecies || undefined).then(r => r.data.data ?? r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => breedsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breeds-admin'] }); toast.success('Breed added'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => breedsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breeds-admin'] }); toast.success('Breed updated'); setEditBreed(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => breedsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breeds-admin'] }); toast.success('Breed removed') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const breeds = (data ?? []) as any[]

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Animal Breeds</h1>
          <p className="page-subtitle">Manage breed registry for your organization</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Breed</button>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-5 flex gap-3">
        <select className="input max-w-[200px]" value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
          <option value="">All Species</option>
          {SPECIES.filter(s => s).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Breed Name', 'Species', 'Description', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : breeds.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No breeds yet — add your first breed</td></tr>
            ) : breeds.map((b: any) => (
              <tr key={b.id} className="table-row">
                <td className="table-cell font-semibold">{b.name}</td>
                <td className="table-cell capitalize">{b.species || 'All species'}</td>
                <td className="table-cell text-gray-500 text-sm">{b.description || '—'}</td>
                <td className="table-cell">
                  <span className={b.is_active ? 'badge-active' : 'badge-gray'}>{b.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditBreed(b); setEditForm({ name: b.name, species: b.species || '', description: b.description || '' }) }} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                    <button onClick={() => { if (confirm(`Remove breed "${b.name}"?`)) deleteMutation.mutate(b.id) }} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add New Breed</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const payload: any = { ...form }; if (!payload.species) delete payload.species; if (!payload.description) delete payload.description; createMutation.mutate(payload) }} className="p-5 space-y-4">
              <div>
                <label className="label">Breed Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Beetal" />
              </div>
              <div>
                <label className="label">Species (optional)</label>
                <select className="input" value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}>
                  <option value="">All species</option>
                  {SPECIES.filter(s => s).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Notes about this breed..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Add Breed'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBreed && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Edit Breed — {editBreed.name}</h2>
              <button onClick={() => setEditBreed(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const payload: any = { ...editForm }; if (!payload.species) delete payload.species; updateMutation.mutate({ id: editBreed.id, data: payload }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Breed Name *</label>
                <input className="input" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Species</label>
                <select className="input" value={editForm.species} onChange={e => setEditForm({ ...editForm, species: e.target.value })}>
                  <option value="">All species</option>
                  {SPECIES.filter(s => s).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditBreed(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
