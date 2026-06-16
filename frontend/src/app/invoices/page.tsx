'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const statusColors: any = { draft: 'badge-gray', sent: 'badge-info', paid: 'badge-active', overdue: 'badge-danger', cancelled: 'badge-gray' }
const emptyForm = { customer_name: '', issue_date: today, due_date: '', notes: '', line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] }

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)

  const { data } = useQuery({ queryKey: ['invoices'], queryFn: () => invoicesAPI.list({ per_page: 50 }).then(r => r.data.data) })

  const createMutation = useMutation({
    mutationFn: (d: any) => invoicesAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice created!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateLine = (idx: number, field: string, value: any) => {
    const items = [...form.line_items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].total = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0)
    }
    setForm({ ...form, line_items: items })
  }

  const grandTotal = form.line_items.reduce((s: number, li: any) => s + (parseFloat(li.total) || 0), 0)

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{data?.total ?? 0} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ New Invoice</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Invoice #', 'Customer', 'Date', 'Due Date', 'Total (PKR)', 'Paid (PKR)', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((inv: any) => (
              <tr key={inv.id} className="table-row">
                <td className="table-cell font-mono text-blue-700 font-semibold">{inv.invoice_number}</td>
                <td className="table-cell">{inv.customer_name || '—'}</td>
                <td className="table-cell">{inv.issue_date}</td>
                <td className="table-cell">{inv.due_date || '—'}</td>
                <td className="table-cell font-bold">{Number(inv.total_amount).toLocaleString()}</td>
                <td className="table-cell text-green-700">{Number(inv.paid_amount).toLocaleString()}</td>
                <td className="table-cell"><span className={statusColors[inv.status]}>{inv.status}</span></td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">New Invoice</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              const d: any = { ...form }
              if (!d.due_date) delete d.due_date
              d.line_items = d.line_items.map((li: any) => ({ ...li, quantity: parseFloat(li.quantity), unit_price: parseFloat(li.unit_price), total: parseFloat(li.total) }))
              createMutation.mutate(d)
            }} className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Customer Name</label>
                  <input className="input" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Issue Date *</label>
                  <input type="date" className="input" required value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              {/* Line Items */}
              <div>
                <label className="label">Line Items</label>
                <div className="space-y-2">
                  {form.line_items.map((li: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <input className="input text-xs" placeholder="Description" value={li.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" className="input text-xs" placeholder="Qty" value={li.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" className="input text-xs" placeholder="Price" value={li.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} />
                      </div>
                      <div className="col-span-2 text-sm font-semibold text-gray-700 px-2">
                        {(li.total || 0).toLocaleString()}
                      </div>
                      <button type="button" onClick={() => setForm({ ...form, line_items: form.line_items.filter((_: any, i: number) => i !== idx) })} className="col-span-1 text-red-400 hover:text-red-600 text-lg">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setForm({ ...form, line_items: [...form.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }] })}
                  className="mt-2 text-xs text-green-600 hover:text-green-800 font-medium">+ Add Line Item</button>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-lg font-bold text-gray-900">Total: PKR {grandTotal.toLocaleString()}</div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Create Invoice'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
