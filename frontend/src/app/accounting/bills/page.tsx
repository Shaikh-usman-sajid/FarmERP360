'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]

const STATUS_FILTERS = ['All', 'Draft', 'Approved', 'Paid', 'Overdue'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_BADGE: Record<string, string> = {
  draft: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700',
  approved: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700',
  paid: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700',
  overdue: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
}

const emptyLineItem = () => ({ description: '', quantity: 1, unit_price: 0, total: 0 })

const emptyForm = {
  vendor_id: '',
  bill_date: today,
  due_date: '',
  notes: '',
  line_items: [emptyLineItem()],
}

function pkr(val: number | string) {
  return 'PKR ' + Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BillsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [payBillId, setPayBillId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: billsData, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => accountingAPI.getBills({ per_page: 200, sort_by: 'bill_date', sort_dir: 'desc' }).then(r => r.data),
  })

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => accountingAPI.getVendors({ per_page: 200 }).then(r => r.data),
    enabled: showAdd,
  })

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (d: any) => accountingAPI.createBill(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Bill created!')
      setShowAdd(false)
      setForm(emptyForm)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create bill'),
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => accountingAPI.payBill(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Payment recorded!')
      setPayBillId(null)
      setPayAmount('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to record payment'),
  })

  // ─── Derived data ──────────────────────────────────────────────────────────

  const allBills: any[] = Array.isArray(billsData?.items)
    ? billsData.items
    : Array.isArray(billsData)
    ? billsData
    : []

  const filteredBills = statusFilter === 'All'
    ? allBills
    : allBills.filter(b => b.status?.toLowerCase() === statusFilter.toLowerCase())

  const totalOutstanding = allBills.reduce((sum: number, b: any) => {
    const outstanding = Number(b.total_amount || 0) - Number(b.paid_amount || 0)
    return sum + (outstanding > 0 ? outstanding : 0)
  }, 0)

  const totalBills = allBills.length

  const overdueBills = allBills.filter(b => b.status === 'overdue').length

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const updateLine = (idx: number, field: string, value: any) => {
    const items = [...form.line_items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].total =
        (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0)
    }
    setForm({ ...form, line_items: items })
  }

  const addLine = () => setForm({ ...form, line_items: [...form.line_items, emptyLineItem()] })

  const removeLine = (idx: number) => {
    if (form.line_items.length === 1) return
    setForm({ ...form, line_items: form.line_items.filter((_: any, i: number) => i !== idx) })
  }

  const grandTotal = form.line_items.reduce(
    (s: number, li: any) => s + (parseFloat(li.total) || 0),
    0
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vendor_id) return toast.error('Please select a vendor')
    if (!form.bill_date) return toast.error('Bill date is required')
    if (!form.due_date) return toast.error('Due date is required')
    createMutation.mutate({ ...form, total_amount: grandTotal })
  }

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payBillId) return
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return toast.error('Enter a valid payment amount')
    payMutation.mutate({ id: payBillId, amount })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const vendors: any[] = Array.isArray(vendorsData?.items)
    ? vendorsData.items
    : Array.isArray(vendorsData)
    ? vendorsData
    : []

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Bills</h1>
          <p className="page-subtitle">Accounts Payable</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + New Bill
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-gray-800">{pkr(totalOutstanding)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Number of Bills</p>
          <p className="text-2xl font-bold text-gray-800">{totalBills}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overdue Bills</p>
          <p className={`text-2xl font-bold ${overdueBills > 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {overdueBills}
          </p>
        </div>
      </div>

      {/* ── Status Filter ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading bills...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {[
                    'Bill #',
                    'Vendor',
                    'Bill Date',
                    'Due Date',
                    'Total (PKR)',
                    'Paid (PKR)',
                    'Outstanding (PKR)',
                    'Status',
                    'Actions',
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No bills found
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill: any) => {
                    const outstanding =
                      Number(bill.total_amount || 0) - Number(bill.paid_amount || 0)
                    const canPay = bill.status === 'approved' || bill.status === 'overdue'
                    return (
                      <tr key={bill.id} className="table-row">
                        <td className="table-cell font-mono text-blue-700 font-semibold">
                          {bill.bill_number || '—'}
                        </td>
                        <td className="table-cell">{bill.vendor_name || '—'}</td>
                        <td className="table-cell">{bill.bill_date || '—'}</td>
                        <td className="table-cell">{bill.due_date || '—'}</td>
                        <td className="table-cell font-bold">
                          {Number(bill.total_amount || 0).toLocaleString('en-PK', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="table-cell text-green-700">
                          {Number(bill.paid_amount || 0).toLocaleString('en-PK', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`table-cell font-semibold ${
                            outstanding > 0 ? 'text-red-600' : 'text-gray-500'
                          }`}
                        >
                          {outstanding > 0
                            ? outstanding.toLocaleString('en-PK', { minimumFractionDigits: 2 })
                            : '0.00'}
                        </td>
                        <td className="table-cell">
                          <span className={STATUS_BADGE[bill.status] ?? STATUS_BADGE['draft']}>
                            {bill.status ?? 'draft'}
                          </span>
                        </td>
                        <td className="table-cell">
                          {canPay && (
                            <button
                              onClick={() => {
                                setPayBillId(bill.id)
                                setPayAmount(String(outstanding > 0 ? outstanding : ''))
                              }}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 hover:bg-green-100 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New Bill Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">New Vendor Bill</h2>
              <button
                onClick={() => {
                  setShowAdd(false)
                  setForm(emptyForm)
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.vendor_id}
                  onChange={e => setForm({ ...form, vendor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name || v.vendor_name || v.company_name || v.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.bill_date}
                    onChange={e => setForm({ ...form, bill_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Line Items</label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    + Add Line
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 w-1/2">
                          Description
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 w-[90px]">Qty</th>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 w-[110px]">
                          Unit Price
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 w-[100px]">
                          Total
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.line_items.map((li: any, idx: number) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={li.description}
                              onChange={e => updateLine(idx, 'description', e.target.value)}
                              placeholder="Item description"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={li.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={li.unit_price}
                              onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-gray-700">
                            {Number(li.total).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              disabled={form.line_items.length === 1}
                              className="text-gray-300 hover:text-red-500 disabled:opacity-30 text-sm leading-none"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-right text-gray-600">
                          Grand Total
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-gray-800">
                          {grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false)
                    setForm(emptyForm)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Saving...' : 'Create Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      {payBillId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Record Payment</h2>
              <button
                onClick={() => {
                  setPayBillId(null)
                  setPayAmount('')
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePay} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPayBillId(null)
                    setPayAmount('')
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="btn-primary disabled:opacity-60"
                >
                  {payMutation.isPending ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
