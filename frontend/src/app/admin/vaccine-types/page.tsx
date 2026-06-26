'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vaccineTypesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const SPECIES_OPTIONS = [
  { value: '', label: 'All Species' },
  { value: 'goat', label: 'Goat' },
  { value: 'buffalo', label: 'Buffalo' },
  { value: 'cattle', label: 'Cattle' },
  { value: 'other', label: 'Other' },
]

const TYPE_OPTIONS = [
  { value: 'vaccine', label: 'Vaccine' },
  { value: 'medicine', label: 'Medicine' },
]

const emptyForm = { name: '', species: '', type: 'vaccine' }

export default function VaccineTypesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editItem, setEditItem] = useState<any>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [filterSpecies, setFilterSpecies] = useState('')
  const [filterType, setFilterType] = useState('')

  const { data } = useQuery({
    queryKey: ['vaccine-types', filterSpecies, filterType],
    queryFn: () => vaccineTypesAPI.list({
      ...(filterSpecies ? { species: filterSpecies } : {}),
      ...(filterType ? { type: filterType } : {}),
    }).then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => vaccineTypesAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccine-types'] })
      toast.success('Added successfully')
      setShowAdd(false)
      setForm(emptyForm)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => vaccineTypesAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccine-types'] })
      toast.success('Updated successfully')
      setEditItem(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vaccineTypesAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccine-types'] })
      toast.success('Deleted')
    },
  })

  const items: any[] = data ?? []

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vaccine & Medicine Names</h1>
          <p className="page-subtitle">Manage vaccine and medicine types by animal species</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add New</button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Species</label>
            <select className="input !w-44" value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
              {SPECIES_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Type</label>
            <select className="input !w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {(filterSpecies || filterType) && (
            <button onClick={() => { setFilterSpecies(''); setFilterType('') }} className="btn-secondary text-sm self-end">✕ Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Name', 'Type', 'Species', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="table-row">
                <td className="table-cell font-semibold">{item.name}</td>
                <td className="table-cell">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.type === 'vaccine'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {item.type === 'vaccine' ? '💉 Vaccine' : '💊 Medicine'}
                  </span>
                </td>
                <td className="table-cell capitalize">
                  {item.species ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{item.species}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">All Species</span>
                  )}
                </td>
                <td className="table-cell">
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditItem(item); setEditForm({ name: item.name, species: item.species || '', type: item.type }) }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id) }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  No vaccine/medicine names found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Vaccine / Medicine</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ name: form.name, species: form.species || undefined, type: form.type }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. FMD Vaccine, Oxytetracycline" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type *</label>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Species</label>
                  <select className="input" value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}>
                    {SPECIES_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Edit — {editItem.name}</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ id: editItem.id, data: { name: editForm.name, species: editForm.species || undefined, type: editForm.type } }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type *</label>
                  <select className="input" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Species</label>
                  <select className="input" value={editForm.species} onChange={e => setEditForm({ ...editForm, species: e.target.value })}>
                    {SPECIES_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditItem(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
