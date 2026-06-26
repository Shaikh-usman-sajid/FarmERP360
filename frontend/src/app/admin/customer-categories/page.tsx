'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerCategoriesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const empty = { name: '', description: '', is_active: true }

export default function CustomerCategoriesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => customerCategoriesAPI.list().then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editing ? customerCategoriesAPI.update(editing.id, d) : customerCategoriesAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-categories'] })
      toast.success(editing ? 'Category updated' : 'Category created')
      closeModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerCategoriesAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-categories'] })
      toast.success('Category deleted')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Cannot delete — customers assigned'),
  })

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit   = (c: any) => { setEditing(c); setForm({ name: c.name, description: c.description || '', is_active: c.is_active }); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(empty) }

  const categories: any[] = data ?? []
  const filtered = search
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

  const exportRows = filtered.map((c: any) => ({
    name:           c.name,
    description:    c.description || '',
    customer_count: c.customer_count,
    status:         c.is_active ? 'Active' : 'Inactive',
  }))

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Categories</h1>
          <p className="page-subtitle">Define categories for milk buyers, Pallai subscribers, and more</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Category Name',   key: 'name' },
              { header: 'Description',     key: 'description' },
              { header: 'Customer Count',  key: 'customer_count' },
              { header: 'Status',          key: 'status' },
            ]}
            rows={exportRows}
            filename="customer-categories"
            title="Customer Categories"
          />
          <button onClick={openCreate} className="btn-primary">+ Add Category</button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-5">
        <div className="flex items-end gap-3">
          <div>
            <label className="label text-xs">Search</label>
            <input type="text" placeholder="Filter by name..." className="input !w-56"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="btn-secondary text-sm self-end">✕ Clear</button>
          )}
          <span className="text-xs text-gray-400 self-end pb-2">{filtered.length} categor{filtered.length !== 1 ? 'ies' : 'y'}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Categories', value: categories.length },
          { label: 'Active',           value: categories.filter(c => c.is_active).length },
          { label: 'Total Customers',  value: categories.reduce((s, c) => s + (c.customer_count || 0), 0) },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid of category cards */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="font-medium mb-2">No categories yet</p>
          <button onClick={openCreate} className="btn-primary text-sm">+ Add First Category</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: any) => (
            <div key={c.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{c.name}</h3>
                  {c.description && <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-sm text-gray-500">
                  <span className="font-bold text-gray-900">{c.customer_count}</span> customer{c.customer_count !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  <button
                    onClick={() => {
                      if (c.customer_count > 0) { toast.error('Remove all customers from this category first'); return }
                      if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id)
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Edit Category' : 'Add Customer Category'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="p-5 space-y-4">
              <div>
                <label className="label">Category Name *</label>
                <input className="input" required placeholder="e.g. Milk Customer"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[80px]" placeholder="Describe what kind of customers fall in this category..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-green-600" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
