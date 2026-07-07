'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const empty = { code: '', name: '', description: '' }

export default function CostCentersPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => accountingAPI.getCostCenters().then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editing ? accountingAPI.updateCostCenter(editing.id, d) : accountingAPI.createCostCenter(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-centers'] })
      toast.success(editing ? 'Cost center updated' : 'Cost center created')
      closeModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingAPI.deleteCostCenter(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-centers'] }); toast.success('Deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (cc: any) => {
    setEditing(cc)
    setForm({ code: cc.code, name: cc.name, description: cc.description || '' })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(empty) }

  const items: any[] = Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])
  const filtered = search
    ? items.filter((c: any) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost Centers</h1>
          <p className="page-subtitle">Assign costs to departments, projects, or farm areas</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Code', key: 'code' },
              { header: 'Name', key: 'name' },
              { header: 'Description', key: 'description' },
            ]}
            rows={filtered.map((c: any) => ({ code: c.code, name: c.name, description: c.description || '' }))}
            filename="cost-centers"
            title="Cost Centers"
          />
          <button onClick={openAdd} className="btn-primary">+ Add Cost Center</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{items.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Cost Centers</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{items.filter((c: any) => c.is_active !== false).length}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-5">
        <div className="flex items-end gap-3">
          <div>
            <label className="label text-xs">Search</label>
            <input className="input !w-64" placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {search && <button onClick={() => setSearch('')} className="btn-secondary text-sm self-end">✕ Clear</button>}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {['Code', 'Name', 'Description', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">🏷️</p>
                    <p className="font-medium">No cost centers yet</p>
                    <button onClick={openAdd} className="mt-2 btn-primary text-sm">+ Add First Cost Center</button>
                  </td>
                </tr>
              ) : (
                filtered.map((cc: any) => (
                  <tr key={cc.id} className="table-row">
                    <td className="table-cell font-mono font-semibold text-green-700">{cc.code}</td>
                    <td className="table-cell font-medium text-gray-900">{cc.name}</td>
                    <td className="table-cell text-gray-500 text-sm">{cc.description || <span className="text-gray-300">—</span>}</td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(cc)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        <button
                          onClick={() => { if (confirm(`Delete cost center "${cc.name}"?`)) deleteMutation.mutate(cc.id) }}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Edit Cost Center' : 'Add Cost Center'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Code *</label>
                  <input className="input" required placeholder="e.g. CC-001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input className="input" required placeholder="e.g. Dairy Farm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={3} placeholder="Optional description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
