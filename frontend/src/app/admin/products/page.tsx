'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryAPI, productCategoriesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'vial', 'bag', 'bottle', 'box']
const emptyForm = { name: '', category: '', unit: 'kg', min_stock_level: '', unit_cost: '', description: '' }

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editItem, setEditItem] = useState<any>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productCategoriesAPI.list().then(r => r.data.data),
  })
  const categories: any[] = categoriesData ?? []

  const { data: products } = useQuery({
    queryKey: ['products-admin', search, filterCat],
    queryFn: () => inventoryAPI.listProducts({ per_page: 100, search: search || undefined, category: filterCat || undefined }).then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => inventoryAPI.createProduct(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-admin'] }); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product added'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => inventoryAPI.updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-admin'] }); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Updated'); setEditItem(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryAPI.deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-admin'] }); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Deleted') },
  })

  const parseForm = (f: typeof emptyForm) => ({
    ...f,
    min_stock_level: f.min_stock_level ? parseFloat(f.min_stock_level) : undefined,
    unit_cost: f.unit_cost ? parseFloat(f.unit_cost) : undefined,
  })

  const items = products?.items ?? []

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage inventory product catalog — {items.length} products</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Product</button>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="Product name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {(search || filterCat) && (
            <button onClick={() => { setSearch(''); setFilterCat('') }} className="btn-secondary text-sm">✕ Clear</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Product Name', 'Category', 'Unit', 'Min Stock', 'Unit Cost (PKR)', 'Current Stock', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p: any) => (
              <tr key={p.id} className="table-row">
                <td className="table-cell font-semibold">{p.name}</td>
                <td className="table-cell">{p.category || '—'}</td>
                <td className="table-cell">{p.unit || '—'}</td>
                <td className="table-cell">{p.min_stock_level ? parseFloat(p.min_stock_level).toFixed(1) : '—'}</td>
                <td className="table-cell">{p.unit_cost ? `PKR ${parseFloat(p.unit_cost).toLocaleString()}` : '—'}</td>
                <td className="table-cell font-bold text-gray-900">{parseFloat(p.current_stock || '0').toFixed(1)}</td>
                <td className="table-cell">
                  {parseFloat(p.current_stock || '0') <= parseFloat(p.min_stock_level || '0')
                    ? <span className="badge-danger">Low Stock</span>
                    : <span className="badge-active">OK</span>}
                </td>
                <td className="table-cell">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditItem(p)
                        setEditForm({ name: p.name, category: p.category || '', unit: p.unit || 'kg', min_stock_level: p.min_stock_level ? String(parseFloat(p.min_stock_level)) : '', unit_cost: p.unit_cost ? String(parseFloat(p.unit_cost)) : '', description: p.description || '' })
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id) }}
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
                <td colSpan={8} className="text-center py-12 text-gray-400">No products found. Add one to get started.</td>
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
              <h2 className="text-lg font-bold">Add Product</h2>
              <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(parseForm(form)) }} className="p-5 space-y-4">
              <div>
                <label className="label">Product Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Oxytetracycline" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category...</option>
                    {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Min Stock Level</label>
                  <input type="number" className="input" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="label">Unit Cost (PKR)</label>
                  <input type="number" className="input" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setForm(emptyForm) }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Add Product'}
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
            <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ id: editItem.id, data: parseForm(editForm) }) }} className="p-5 space-y-4">
              <div>
                <label className="label">Product Name *</label>
                <input className="input" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="">Select category...</option>
                    {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Min Stock Level</label>
                  <input type="number" className="input" value={editForm.min_stock_level} onChange={e => setEditForm({ ...editForm, min_stock_level: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit Cost (PKR)</label>
                  <input type="number" className="input" value={editForm.unit_cost} onChange={e => setEditForm({ ...editForm, unit_cost: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
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
