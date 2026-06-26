'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsAPI, invoicesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'
import ExportButtons from '@/components/ui/ExportButtons'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { invoice_id: '', amount: '', payment_date: today, payment_method: 'cash', reference: '', notes: '' }

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'online']

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const hasFilter = !!(search || method || dateFrom || dateTo)

  function clearFilters() {
    setSearch('')
    setMethod('')
    setDateFrom('')
    setDateTo('')
  }

  const { data } = useQuery({
    queryKey: ['payments', search, method, dateFrom, dateTo],
    queryFn: () => paymentsAPI.list({
      per_page: 50,
      ...(search ? { search } : {}),
      ...(method ? { payment_method: method } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }).then(r => r.data.data),
  })

  const { data: invoices } = useQuery({ queryKey: ['invoices-list'], queryFn: () => invoicesAPI.list({ per_page: 100, status: 'sent' }).then(r => r.data.data) })

  const createMutation = useMutation({
    mutationFn: (d: any) => paymentsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success('Payment recorded!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <DashboardLayout>
      <div className="page-header">
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">{data?.total ?? 0} payment records</p></div>
        <div className="flex items-center gap-2">
          <ExportButtons
            columns={[
              { header: 'Payment Date', key: 'Payment Date' },
              { header: 'Invoice Number', key: 'Invoice Number' },
              { header: 'Amount (PKR)', key: 'Amount (PKR)' },
              { header: 'Method', key: 'Method' },
              { header: 'Reference', key: 'Reference' },
            ]}
            rows={(data?.items ?? []).map((p: any) => ({
              'Payment Date': p.payment_date,
              'Invoice Number': p.invoice_id ? p.invoice_id.slice(0, 8) + '...' : '',
              'Amount (PKR)': Number(p.amount),
              Method: p.payment_method || '',
              Reference: p.reference || '',
            }))}
            filename="farmerp360-payments"
            title="Payments"
          />
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Record Payment</button>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Search Reference</label>
            <input className="input" placeholder="Reference or notes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {hasFilter && (
            <button onClick={clearFilters} className="btn-secondary self-end">✕ Clear</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Invoice', 'Amount (PKR)', 'Date', 'Method', 'Reference'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p: any) => (
              <tr key={p.id} className="table-row">
                <td className="table-cell font-mono text-blue-600 text-xs">{p.invoice_id ? p.invoice_id.slice(0, 8) + '...' : '—'}</td>
                <td className="table-cell font-bold text-green-700">{Number(p.amount).toLocaleString()}</td>
                <td className="table-cell">{p.payment_date}</td>
                <td className="table-cell capitalize">{p.payment_method || '—'}</td>
                <td className="table-cell">{p.reference || '—'}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No payments recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Record Payment</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const d: any = { ...form }; d.amount = parseFloat(d.amount); if (!d.invoice_id) delete d.invoice_id; createMutation.mutate(d) }} className="p-5 space-y-4">
              <div>
                <label className="label">Invoice (optional)</label>
                <select className="input" value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })}>
                  <option value="">No linked invoice</option>
                  {(invoices?.items ?? []).map((inv: any) => (
                    <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.customer_name || 'Unknown'} (PKR {Number(inv.total_amount).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (PKR) *</label>
                  <input type="number" step="0.01" className="input" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" required value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Method</label>
                  <select className="input" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Reference</label>
                  <input className="input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
