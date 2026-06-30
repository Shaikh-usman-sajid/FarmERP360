'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { pallaiAPI } from '@/lib/api'

const BILLING_MODELS = [
  { value: 'monthly', label: 'Monthly', desc: 'Fixed fee billed every month' },
  { value: 'daily', label: 'Daily', desc: 'Per-day rate multiplied by days in month' },
  { value: 'premium', label: 'Premium', desc: 'Premium tier with full services included' },
  { value: 'custom', label: 'Custom', desc: 'Custom arrangement — price negotiated per customer' },
]

const emptyForm = {
  name: '',
  billing_model: 'monthly',
  price: '',
  includes_feed: false,
  includes_vet: false,
  description: '',
}

export default function AdminPackagesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [filterActive, setFilterActive] = useState<string>('all')

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['pallai-packages'],
    queryFn: () => pallaiAPI.listPackages().then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => pallaiAPI.createPackage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pallai-packages'] })
      setShowForm(false)
      setForm({ ...emptyForm })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => pallaiAPI.updatePackage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pallai-packages'] })
      setShowForm(false)
      setEditingId(null)
      setForm({ ...emptyForm })
    },
  })

  const openEdit = (pkg: any) => {
    setForm({
      name: pkg.name,
      billing_model: pkg.billing_model,
      price: String(pkg.price),
      includes_feed: pkg.includes_feed,
      includes_vet: pkg.includes_vet,
      description: pkg.description || '',
    })
    setEditingId(pkg.id)
    setShowForm(true)
  }

  const openAdd = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setShowForm(true)
  }

  const toggleActive = (pkg: any) => {
    updateMutation.mutate({ id: pkg.id, data: { is_active: !pkg.is_active } })
  }

  const handleSubmit = () => {
    const payload = {
      ...form,
      price: Number(form.price),
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const filtered = (packages as any[]).filter((p: any) => {
    if (filterActive === 'active') return p.is_active
    if (filterActive === 'inactive') return !p.is_active
    return true
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pallai Packages</h1>
          <p className="page-subtitle">Define and manage service packages for Pallai subscriptions</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Package</button>
      </div>

      {/* Billing model info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {BILLING_MODELS.map(m => (
          <div key={m.value} className="card p-4">
            <div className="font-semibold text-gray-800 capitalize">{m.label}</div>
            <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
            <div className="text-xs font-medium text-green-700 mt-2">
              {(packages as any[]).filter((p: any) => p.billing_model === m.value && p.is_active).length} active
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterActive(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterActive === v ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Packages table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading packages…</div>
        ) : (
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {['Package Name', 'Billing Model', 'Price (PKR)', 'Services', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell font-semibold text-gray-900">{p.name}</td>
                  <td className="table-cell">
                    <span className="badge-info capitalize">{p.billing_model}</span>
                  </td>
                  <td className="table-cell font-medium">PKR {Number(p.price).toLocaleString()}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.includes_feed && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Feed</span>}
                      {p.includes_vet && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Vet</span>}
                      {!p.includes_feed && !p.includes_vet && <span className="text-xs text-gray-400">Basic</span>}
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 max-w-xs truncate">{p.description || '—'}</td>
                  <td className="table-cell">
                    <span className={p.is_active ? 'badge-active' : 'badge-inactive'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs font-medium ${p.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                        disabled={updateMutation.isPending}>
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    {filterActive !== 'all' ? `No ${filterActive} packages` : 'No packages yet — click Add Package to create one'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">{editingId ? 'Edit Package' : 'Add Package'}</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Package Name *</label>
                <input className="input" placeholder="e.g. Standard Monthly, Premium Care" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Billing Model *</label>
                <select className="input" value={form.billing_model} onChange={e => setForm(f => ({ ...f, billing_model: e.target.value }))}>
                  {BILLING_MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Price (PKR) *</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 15000" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} placeholder="What's included in this package…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium text-gray-700">Included Services</div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.includes_feed} onChange={e => setForm(f => ({ ...f, includes_feed: e.target.checked }))}
                    className="h-4 w-4 text-green-600 rounded" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Feed Included</div>
                    <div className="text-xs text-gray-500">Feed costs are included in the package price</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.includes_vet} onChange={e => setForm(f => ({ ...f, includes_vet: e.target.checked }))}
                    className="h-4 w-4 text-green-600 rounded" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Veterinary Included</div>
                    <div className="text-xs text-gray-500">Vet visits and treatments are included in the price</div>
                  </div>
                </label>
              </div>
            </div>
            {(createMutation.isError || updateMutation.isError) && (
              <p className="text-red-600 text-sm mt-3">
                {(createMutation.error as any)?.response?.data?.detail || (updateMutation.error as any)?.response?.data?.detail || 'An error occurred'}
              </p>
            )}
            <div className="flex gap-2 mt-5">
              <button className="btn-primary flex-1" onClick={handleSubmit}
                disabled={!form.name || !form.price || isPending}>
                {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create Package'}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
