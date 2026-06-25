'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'
import ExportButtons from '@/components/ui/ExportButtons'

const emptyForm = {
  vendor_code: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  ntn: '',
}

const statusColors: Record<string, string> = {
  active: 'badge-active',
  inactive: 'badge-gray',
}

export default function VendorsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editVendor, setEditVendor] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => accountingAPI.getVendors({ per_page: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => accountingAPI.createVendor(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor added successfully!')
      closeModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to add vendor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => accountingAPI.updateVendor(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor updated successfully!')
      closeModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update vendor'),
  })

  const openAdd = () => {
    setEditVendor(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (vendor: any) => {
    setEditVendor(vendor)
    setForm({
      vendor_code: vendor.vendor_code || '',
      name: vendor.name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      ntn: vendor.ntn || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditVendor(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...form }
    // Strip empty optional strings so backend doesn't complain
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') delete payload[k]
    })
    if (editVendor) {
      updateMutation.mutate({ id: editVendor.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const vendors: any[] = data?.items ?? data?.data ?? data ?? []
  const total: number = data?.total ?? vendors.length

  const filtered = vendors.filter((v: any) =>
    v.name?.toLowerCase().includes(search.toLowerCase())
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendors / Suppliers</h1>
          <p className="page-subtitle">{total} total vendor{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Name', key: 'name' },
              { header: 'Contact', key: 'contact' },
              { header: 'Email', key: 'email' },
              { header: 'Phone', key: 'phone' },
              { header: 'Payment Terms', key: 'payment_terms' },
              { header: 'Balance (PKR)', key: 'balance' },
            ]}
            rows={vendors.map(v => ({
              name: v.name || '',
              contact: v.vendor_code || '',
              email: v.email || '',
              phone: v.phone || '',
              payment_terms: v.payment_terms || '',
              balance: v.outstanding_balance ?? v.balance ?? 0,
            }))}
            filename="farmerp360-vendors"
            title="Vendors"
          />
          <button onClick={openAdd} className="btn-primary">+ Add Vendor</button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="input max-w-sm"
          placeholder="Search by vendor name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Vendor Code', 'Name', 'Phone', 'Email', 'NTN', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Loading vendors...</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm font-medium">
                      {search ? 'No vendors match your search' : 'No vendors found'}
                    </p>
                    {!search && (
                      <button onClick={openAdd} className="mt-1 text-green-600 hover:text-green-800 text-sm font-medium">
                        Add your first vendor
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && filtered.map((vendor: any) => (
              <tr key={vendor.id} className="table-row">
                <td className="table-cell font-mono text-gray-600 text-sm">
                  {vendor.vendor_code || <span className="text-gray-300">—</span>}
                </td>
                <td className="table-cell font-semibold text-gray-900">{vendor.name}</td>
                <td className="table-cell">{vendor.phone || <span className="text-gray-300">—</span>}</td>
                <td className="table-cell">{vendor.email || <span className="text-gray-300">—</span>}</td>
                <td className="table-cell font-mono text-sm">{vendor.ntn || <span className="text-gray-300">—</span>}</td>
                <td className="table-cell">
                  <span className={statusColors[vendor.status] ?? 'badge-gray'}>
                    {vendor.status ?? 'active'}
                  </span>
                </td>
                <td className="table-cell">
                  <button
                    onClick={() => openEdit(vendor)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editVendor ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vendor Code</label>
                  <input
                    className="input"
                    placeholder="e.g. VEN-001"
                    value={form.vendor_code}
                    onChange={e => setForm({ ...form, vendor_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="Vendor / supplier name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="+92 300 0000000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="vendor@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">NTN (National Tax Number)</label>
                <input
                  className="input"
                  placeholder="e.g. 1234567-8"
                  value={form.ntn}
                  onChange={e => setForm({ ...form, ntn: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Address</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Full address..."
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn-primary">
                  {isPending ? 'Saving...' : editVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
