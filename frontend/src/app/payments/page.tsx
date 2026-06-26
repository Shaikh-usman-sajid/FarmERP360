'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsAPI, invoicesAPI, customersAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'
import ExportButtons from '@/components/ui/ExportButtons'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { invoice_id: '', customer_id: '', customer_name: '', amount: '', payment_date: today, payment_method: 'cash', reference: '', notes: '' }

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'online']

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  const hasFilter = !!(search || method || dateFrom || dateTo || customerFilter)

  function clearFilters() {
    setSearch('')
    setMethod('')
    setDateFrom('')
    setDateTo('')
    setCustomerFilter('')
  }

  const { data } = useQuery({
    queryKey: ['payments', search, method, dateFrom, dateTo, customerFilter],
    queryFn: () => paymentsAPI.list({
      per_page: 50,
      ...(search       ? { search }                        : {}),
      ...(method       ? { payment_method: method }        : {}),
      ...(dateFrom     ? { date_from: dateFrom }           : {}),
      ...(dateTo       ? { date_to: dateTo }               : {}),
      ...(customerFilter ? { customer_id: customerFilter } : {}),
    }).then(r => r.data.data),
  })

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-list'],
    queryFn: () => invoicesAPI.list({ per_page: 200, status: 'sent' }).then(r => r.data.data),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersAPI.list({ per_page: 500, is_active: true }).then(r => r.data.data.items),
  })

  const customers: any[] = customersData ?? []
  const invoiceItems: any[] = invoicesData?.items ?? []

  const createMutation = useMutation({
    mutationFn: (d: any) => paymentsAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Payment recorded!')
      setShowAdd(false)
      setForm(emptyForm)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const handleInvoiceSelect = (invoice_id: string) => {
    const inv = invoiceItems.find((i: any) => i.id === invoice_id)
    setForm(f => ({
      ...f,
      invoice_id,
      customer_name: inv?.customer_name || f.customer_name,
      // auto-fill amount with remaining balance
      amount: inv ? String(Number(inv.total_amount) - Number(inv.paid_amount)) : f.amount,
    }))
  }

  const handleCustomerSelect = (customer_id: string) => {
    const cust = customers.find((c: any) => c.id === customer_id)
    setForm(f => ({ ...f, customer_id, customer_name: cust ? cust.name : f.customer_name }))
  }

  const payments: any[] = data?.items ?? []

  return (
    <DashboardLayout>
      <div className="page-header">
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">{data?.total ?? 0} payment records</p></div>
        <div className="flex items-center gap-2">
          <ExportButtons
            columns={[
              { header: 'Payment Date',  key: 'payment_date' },
              { header: 'Customer',      key: 'customer' },
              { header: 'Invoice',       key: 'invoice' },
              { header: 'Amount (PKR)',  key: 'amount' },
              { header: 'Method',        key: 'method' },
              { header: 'Reference',     key: 'reference' },
            ]}
            rows={payments.map((p: any) => ({
              payment_date: p.payment_date,
              customer:     p.customer_name || '—',
              invoice:      p.invoice_id ? p.invoice_id.slice(0, 8) + '...' : '—',
              amount:       Number(p.amount),
              method:       p.payment_method || '',
              reference:    p.reference || '',
            }))}
            filename="farmerp360-payments"
            title="Payments"
          />
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Record Payment</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="Reference or notes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="label">Customer</label>
            <select className="input !w-48" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
              <option value="">All Customers</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Customer', 'Invoice', 'Amount (PKR)', 'Date', 'Method', 'Reference'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p: any) => (
              <tr key={p.id} className="table-row">
                <td className="table-cell">
                  {p.customer_name
                    ? <span className="font-medium text-gray-800">{p.customer_name}</span>
                    : <span className="text-gray-300 italic text-xs">—</span>}
                </td>
                <td className="table-cell font-mono text-blue-600 text-xs">
                  {p.invoice_id ? p.invoice_id.slice(0, 8) + '...' : '—'}
                </td>
                <td className="table-cell font-bold text-green-700">PKR {Number(p.amount).toLocaleString()}</td>
                <td className="table-cell">{p.payment_date}</td>
                <td className="table-cell capitalize">{p.payment_method?.replace('_', ' ') || '—'}</td>
                <td className="table-cell text-xs text-gray-500">{p.reference || '—'}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No payments recorded</td></tr>
            )}
          </tbody>
        </table>
        {(data?.total ?? 0) > 50 && (
          <p className="text-xs text-gray-400 text-center py-2">Showing first 50 records</p>
        )}
      </div>

      {/* Record Payment Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Record Payment</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              const d: any = { ...form }
              d.amount = parseFloat(d.amount)
              if (!d.invoice_id)  delete d.invoice_id
              if (!d.customer_id) delete d.customer_id
              if (!d.customer_name) delete d.customer_name
              createMutation.mutate(d)
            }} className="p-5 space-y-4">

              {/* Customer */}
              <div>
                <label className="label">Customer</label>
                <select className="input" value={form.customer_id} onChange={e => handleCustomerSelect(e.target.value)}>
                  <option value="">— Select customer (optional) —</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.category_name ? ` (${c.category_name.trim()})` : ''}{c.phone ? ` — ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
                {!form.customer_id && (
                  <input className="input mt-2" placeholder="Or type customer name manually..."
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                )}
              </div>

              {/* Invoice */}
              <div>
                <label className="label">Invoice (optional)</label>
                <select className="input" value={form.invoice_id} onChange={e => handleInvoiceSelect(e.target.value)}>
                  <option value="">No linked invoice</option>
                  {invoiceItems.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.customer_name || 'Unknown'} (PKR {Number(inv.total_amount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (PKR) *</label>
                  <input type="number" step="0.01" className="input" required value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" required value={form.payment_date}
                    onChange={e => setForm({ ...form, payment_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Method</label>
                  <select className="input" value={form.payment_method}
                    onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Reference</label>
                  <input className="input" value={form.reference}
                    onChange={e => setForm({ ...form, reference: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
