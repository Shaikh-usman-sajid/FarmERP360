'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const SPECIES = ['goat', 'buffalo', 'cattle', 'other']
const STATUSES = ['active', 'sold', 'deceased', 'transferred']
const GENDERS = ['male', 'female']
const OWNERSHIP = ['farm', 'investor', 'shared', 'pallai']

const emptyForm = { animal_code: '', name: '', species: 'goat', breed: '', gender: 'female', date_of_birth: '', purchase_price: '', current_value: '', ownership_type: 'farm', notes: '' }

export default function AnimalsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('')
  const [status, setStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [viewAnimal, setViewAnimal] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['animals', page, search, species, status],
    queryFn: () => animalsAPI.list({ page, per_page: 20, search, species: species || undefined, status: status || undefined }).then(r => r.data.data),
  })

  const { data: weights } = useQuery({
    queryKey: ['weights', viewAnimal?.id],
    queryFn: () => animalsAPI.getWeights(viewAnimal.id).then(r => r.data.data),
    enabled: !!viewAnimal,
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => animalsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal added!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create animal'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => animalsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal removed') },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...form }
    if (!payload.date_of_birth) delete payload.date_of_birth
    if (payload.purchase_price) payload.purchase_price = parseFloat(payload.purchase_price)
    if (payload.current_value) payload.current_value = parseFloat(payload.current_value)
    createMutation.mutate(payload)
  }

  const statusBadge = (s: string) => {
    const map: any = { active: 'badge-active', sold: 'badge-gray', deceased: 'badge-danger', transferred: 'badge-info' }
    return <span className={map[s] || 'badge-gray'}>{s}</span>
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Animal Management</h1>
          <p className="page-subtitle">{data?.total ?? 0} animals registered</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Animal</button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search by code, name, ear tag..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <select className="input max-w-[160px]" value={species} onChange={e => { setSpecies(e.target.value); setPage(1) }}>
          <option value="">All Species</option>
          {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input max-w-[160px]" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || species || status) && (
          <button onClick={() => { setSearch(''); setSpecies(''); setStatus(''); setPage(1) }} className="btn-secondary text-xs">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Code', 'Name', 'Species', 'Breed', 'Gender', 'Status', 'Value (PKR)', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : (data?.items ?? []).length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No animals found</td></tr>
            ) : (data?.items ?? []).map((a: any) => (
              <tr key={a.id} className="table-row cursor-pointer" onClick={() => setViewAnimal(a)}>
                <td className="table-cell font-mono font-semibold text-green-700">{a.animal_code}</td>
                <td className="table-cell">{a.name || '—'}</td>
                <td className="table-cell capitalize">{a.species}</td>
                <td className="table-cell">{a.breed || '—'}</td>
                <td className="table-cell capitalize">{a.gender}</td>
                <td className="table-cell">{statusBadge(a.status)}</td>
                <td className="table-cell">{a.current_value ? Number(a.current_value).toLocaleString() : '—'}</td>
                <td className="table-cell" onClick={e => e.stopPropagation()}>
                  <button onClick={() => deleteMutation.mutate(a.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {(data?.total ?? 0) > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil((data?.total ?? 0) / 20)}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Prev</button>
              <button disabled={(data?.total ?? 0) <= page * 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Animal Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add New Animal</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Animal Code *</label>
                  <input className="input" required value={form.animal_code} onChange={e => setForm({ ...form, animal_code: e.target.value })} placeholder="e.g. G0006" />
                </div>
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Optional name" />
                </div>
                <div>
                  <label className="label">Species *</label>
                  <select className="input" value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}>
                    {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Breed</label>
                  <input className="input" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="e.g. Beetal" />
                </div>
                <div>
                  <label className="label">Gender *</label>
                  <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <label className="label">Purchase Price (PKR)</label>
                  <input type="number" className="input" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                </div>
                <div>
                  <label className="label">Current Value (PKR)</label>
                  <input type="number" className="input" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} />
                </div>
                <div>
                  <label className="label">Ownership</label>
                  <select className="input" value={form.ownership_type} onChange={e => setForm({ ...form, ownership_type: e.target.value })}>
                    {OWNERSHIP.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Add Animal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Animal Drawer */}
      {viewAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">{viewAnimal.animal_code}</h2>
                <p className="text-sm text-gray-500 capitalize">{viewAnimal.species} · {viewAnimal.breed || 'Unknown breed'}</p>
              </div>
              <button onClick={() => setViewAnimal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Name', viewAnimal.name || '—'],
                  ['Gender', viewAnimal.gender],
                  ['DOB', viewAnimal.date_of_birth || '—'],
                  ['Status', viewAnimal.status],
                  ['Ownership', viewAnimal.ownership_type],
                  ['Value', viewAnimal.current_value ? `PKR ${Number(viewAnimal.current_value).toLocaleString()}` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400">{k}</div>
                    <div className="text-sm font-medium text-gray-800 capitalize">{v}</div>
                  </div>
                ))}
              </div>
              {/* Weight History */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Weight History</h3>
                <div className="space-y-2">
                  {(weights ?? []).slice(0, 6).map((w: any) => (
                    <div key={w.id} className="flex justify-between text-sm bg-green-50 rounded px-3 py-2">
                      <span className="text-gray-500">{w.recorded_date}</span>
                      <span className="font-semibold text-green-700">{w.weight_kg} kg</span>
                    </div>
                  ))}
                  {(weights ?? []).length === 0 && <p className="text-gray-400 text-xs">No weight records</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
