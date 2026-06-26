'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI, customerCategoriesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const emptyForm = {
  category_id: '',
  name: '',
  phone: '',
  email: '',
  cnic: '',
  address: '',
  city: '',
  notes: '',
  is_active: true,
}

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Peshawar', 'Quetta', 'Other']

export default function CustomersPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState({ search: '', category_id: '', is_active: '' })
  const hasFilter = !!(filter.search || filter.category_id || filter.is_active)

  const { data: catData } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => customerCategoriesAPI.list().then(r => r.data.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, filter],
    queryFn: () => customersAPI.list({
      page,
      per_page: 20,
      ...(filter.search      ? { search:      filter.search }                      : {}),
      ...(filter.category_id ? { category_id: filter.category_id }                : {}),
      ...(filter.is_active !== '' ? { is_active: filter.is_active === 'true' }    : {}),
    }).then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editing ? customersAPI.update(editing.id, d) : customersAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-categories'] })
      toast.success(editing ? 'Customer updated' : 'Customer added')
      closeModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => customersAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deactivated')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      category_id: c.category_id || '',
      name:        c.name,
      phone:       c.phone || '',
      email:       c.email || '',
      cnic:        c.cnic || '',
      address:     c.address || '',
      city:        c.city || '',
      notes:       c.notes || '',
      is_active:   c.is_active,
    })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm) }
  const resetFilter = () => { setFilter({ search: '', category_id: '', is_active: '' }); setPage(1) }

  const categories: any[] = catData ?? []
  const items: any[]  = data?.items ?? []
  const total: number = data?.total ?? 0

  const exportRows = items.map((c: any) => ({
    name:          c.name,
    category:      c.category_name || '',
    phone:         c.phone || '',
    email:         c.email || '',
    cnic:          c.cnic || '',
    city:          c.city || '',
    address:       c.address || '',
    status:        c.is_active ? 'Active' : 'Inactive',
  }))

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage milk buyers, Pallai subscribers, and all customer profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Name',          key: 'name' },
              { header: 'Category',      key: 'category' },
              { header: 'Phone',         key: 'phone' },
              { header: 'Email',         key: 'email' },
              { header: 'CNIC',          key: 'cnic' },
              { header: 'City',          key: 'city' },
              { header: 'Address',       key: 'address' },
              { header: 'Status',        key: 'status' },
            ]}
            rows={exportRows}
            filename="customers"
            title="Customers"
          />
          <button onClick={openCreate} className="btn-primary">+ Add Customer</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Search</label>
            <input type="text" placeholder="Name / Phone / CNIC / City" className="input !w-52"
              value={filter.search}
              onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1) }} />
          </div>
          <div>
            <label className="label text-xs">Category</label>
            <select className="input !w-48" value={filter.category_id}
              onChange={e => { setFilter(f => ({ ...f, category_id: e.target.value })); setPage(1) }}>
              <option value="">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select className="input !w-36" value={filter.is_active}
              onChange={e => { setFilter(f => ({ ...f, is_active: e.target.value })); setPage(1) }}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {hasFilter && (
            <button onClick={resetFilter} className="btn-secondary text-sm self-end">✕ Clear</button>
          )}
          <span className="text-xs text-gray-400 self-end pb-2">{total} result{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Name', 'Category', 'Phone', 'CNIC', 'City / Address', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="text-gray-400 mb-3">No customers found</p>
                  {!hasFilter && <button onClick={openCreate} className="btn-primary text-sm">+ Add First Customer</button>}
                </td>
              </tr>
            )}
            {items.map((c: any) => (
              <tr key={c.id} className="table-row">
                <td className="table-cell">
                  <div className="font-semibold text-gray-900">{c.name}</div>
                  {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                </td>
                <td className="table-cell">
                  {c.category_name
                    ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c.category_name}</span>
                    : <span className="text-gray-300 text-xs italic">Uncategorized</span>
                  }
                </td>
                <td className="table-cell text-sm text-gray-700">{c.phone || '—'}</td>
                <td className="table-cell font-mono text-xs text-gray-600">{c.cnic || '—'}</td>
                <td className="table-cell">
                  {c.city && <div className="text-sm font-medium text-gray-700">{c.city}</div>}
                  {c.address && <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.address}</div>}
                  {!c.city && !c.address && <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                    {c.is_active && (
                      <button
                        onClick={() => { if (confirm(`Deactivate "${c.name}"?`)) deactivateMutation.mutate(c.id) }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >Deactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Prev</button>
              <button disabled={total <= page * 20}  onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              saveMutation.mutate({
                ...form,
                category_id: form.category_id || null,
              })
            }} className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— Select category —</option>
                  {categories.filter((c: any) => c.is_active).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="label">Full Name *</label>
                <input className="input" required placeholder="e.g. Ahmed Ali"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Phone + CNIC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="0300-1234567"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">CNIC</label>
                  <input className="input font-mono" placeholder="XXXXX-XXXXXXX-X"
                    value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="customer@email.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              {/* City */}
              <div>
                <label className="label">City</label>
                <select className="input" value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}>
                  <option value="">— Select city —</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="label">Address</label>
                <textarea className="input min-h-[72px]" placeholder="Street address..."
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Optional notes..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="cust_active" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-green-600" />
                <label htmlFor="cust_active" className="text-sm text-gray-700">Active customer</label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
