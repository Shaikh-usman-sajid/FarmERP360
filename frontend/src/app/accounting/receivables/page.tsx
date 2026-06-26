'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingAPI, customerCategoriesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ARInvoice {
  id: string
  invoice_number: string
  customer_name: string
  issue_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  outstanding: number
  status: 'sent' | 'overdue' | string
}

interface ARReport {
  total_outstanding: number
  invoice_count: number
  overdue_count: number
  overdue_amount: number
  invoices: ARInvoice[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pkr(val: number | string | undefined) {
  return (
    'PKR ' +
    Number(val || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function daysOverdue(dueDateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

// ─── Aging bucket helpers ─────────────────────────────────────────────────────

interface AgingBucket {
  label: string
  amount: number
  count: number
}

function buildAgingBuckets(invoices: ARInvoice[]): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: 'Current', amount: 0, count: 0 },
    { label: '1–30 days', amount: 0, count: 0 },
    { label: '31–60 days', amount: 0, count: 0 },
    { label: '61–90 days', amount: 0, count: 0 },
    { label: '90+ days', amount: 0, count: 0 },
  ]

  for (const inv of invoices) {
    const outstanding = Number(inv.outstanding ?? (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)))
    if (outstanding <= 0) continue
    const days = inv.status === 'overdue' ? daysOverdue(inv.due_date) : 0

    let idx: number
    if (days <= 0) idx = 0
    else if (days <= 30) idx = 1
    else if (days <= 60) idx = 2
    else if (days <= 90) idx = 3
    else idx = 4

    buckets[idx].amount += outstanding
    buckets[idx].count += 1
  }

  return buckets
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  sent: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700',
  overdue: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
}

function statusBadgeClass(status: string) {
  return STATUS_BADGE[status?.toLowerCase()] ?? STATUS_BADGE['sent']
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceivablesPage() {
  const [customerSearch, setCustomerSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: report, isLoading, isError } = useQuery<ARReport>({
    queryKey: ['accounts-receivable'],
    queryFn: () => accountingAPI.getAccountsReceivable().then((r) => r.data),
    refetchOnWindowFocus: false,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => customerCategoriesAPI.list({ per_page: 100, is_active: true }).then(r => r.data.data?.items ?? []),
  })
  const categories: any[] = categoriesData ?? []

  const allInvoices: ARInvoice[] = Array.isArray(report?.invoices) ? report!.invoices : []
  const invoices = allInvoices.filter(inv => {
    const name = (inv.customer_name ?? '').toLowerCase()
    if (customerSearch && !name.includes(customerSearch.toLowerCase())) return false
    if (categoryFilter && !name.includes(categoryFilter.toLowerCase())) return false
    return true
  })
  const agingBuckets = buildAgingBuckets(invoices)

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts Receivable</h1>
          <p className="page-subtitle">Aging Report — Open Customer Invoices</p>
        </div>
        <ExportButtons
          columns={[
            { header: 'Customer', key: 'customer' },
            { header: 'Invoice Number', key: 'invoice_number' },
            { header: 'Amount (PKR)', key: 'amount' },
            { header: 'Due Date', key: 'due_date' },
            { header: 'Days Overdue', key: 'days_overdue' },
            { header: 'Age Bucket', key: 'age_bucket' },
          ]}
          rows={invoices.map(inv => {
            const outstanding = inv.outstanding !== undefined
              ? Number(inv.outstanding)
              : Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)
            const isOverdue = inv.status?.toLowerCase() === 'overdue'
            const overdueDays = isOverdue ? daysOverdue(inv.due_date) : 0
            let ageBucket = 'Current'
            if (isOverdue) {
              if (overdueDays <= 30) ageBucket = '1–30 days'
              else if (overdueDays <= 60) ageBucket = '31–60 days'
              else if (overdueDays <= 90) ageBucket = '61–90 days'
              else ageBucket = '90+ days'
            }
            return {
              customer: inv.customer_name || '',
              invoice_number: inv.invoice_number || '',
              amount: outstanding,
              due_date: inv.due_date || '',
              days_overdue: overdueDays,
              age_bucket: ageBucket,
            }
          })}
          filename="farmerp360-receivables"
          title="Accounts Receivable"
        />
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Customer</label>
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Customer name..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.name.trim()}>{c.name.trim()}</option>
                ))}
              </select>
            </div>
          )}
          {(customerSearch || categoryFilter) && (
            <button
              onClick={() => { setCustomerSearch(''); setCategoryFilter('') }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
            >
              ✕ Clear
            </button>
          )}
          {(customerSearch || categoryFilter) && (
            <span className="text-xs text-gray-400 self-end pb-2">
              Showing {invoices.length} of {allInvoices.length} invoices
            </span>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-gray-800">
            {isLoading ? '—' : pkr(report?.total_outstanding)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Open Invoices</p>
          <p className="text-2xl font-bold text-gray-800">
            {isLoading ? '—' : (report?.invoice_count ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overdue Count</p>
          <p
            className={`text-2xl font-bold ${
              (report?.overdue_count ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'
            }`}
          >
            {isLoading ? '—' : (report?.overdue_count ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overdue Amount</p>
          <p
            className={`text-2xl font-bold ${
              (report?.overdue_amount ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'
            }`}
          >
            {isLoading ? '—' : pkr(report?.overdue_amount)}
          </p>
        </div>
      </div>

      {/* ── Invoices Table ── */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Open Invoices
          </h2>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading receivables...</div>
        ) : isError ? (
          <div className="py-16 text-center text-red-500">Failed to load accounts receivable data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {[
                    'Invoice #',
                    'Customer',
                    'Issue Date',
                    'Due Date',
                    'Total (PKR)',
                    'Paid (PKR)',
                    'Outstanding (PKR)',
                    'Status',
                    'Days Overdue',
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No open invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const outstanding =
                      inv.outstanding !== undefined
                        ? Number(inv.outstanding)
                        : Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)
                    const isOverdue = inv.status?.toLowerCase() === 'overdue'
                    const overdueDays = isOverdue ? daysOverdue(inv.due_date) : 0

                    return (
                      <tr
                        key={inv.id}
                        className={`table-row ${
                          isOverdue ? 'bg-red-50 hover:bg-red-100' : ''
                        }`}
                      >
                        <td className="table-cell font-mono text-blue-700 font-semibold">
                          {inv.invoice_number || '—'}
                        </td>
                        <td className="table-cell font-medium text-gray-800">
                          {inv.customer_name || '—'}
                        </td>
                        <td className="table-cell text-gray-600">{inv.issue_date || '—'}</td>
                        <td
                          className={`table-cell ${
                            isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                          }`}
                        >
                          {inv.due_date || '—'}
                        </td>
                        <td className="table-cell font-bold text-gray-800">
                          {Number(inv.total_amount || 0).toLocaleString('en-PK', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="table-cell text-green-700">
                          {Number(inv.paid_amount || 0).toLocaleString('en-PK', {
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
                          <span className={statusBadgeClass(inv.status)}>
                            {inv.status || 'sent'}
                          </span>
                        </td>
                        <td className="table-cell">
                          {isOverdue && overdueDays > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                              {overdueDays}d
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
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

      {/* ── Aging Buckets Summary ── */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Aging Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {agingBuckets.map((bucket, idx) => (
            <div
              key={bucket.label}
              className={`rounded-lg p-4 border ${
                idx === 0
                  ? 'border-green-200 bg-green-50'
                  : idx === 1
                  ? 'border-yellow-200 bg-yellow-50'
                  : idx === 2
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  idx === 0
                    ? 'text-green-600'
                    : idx === 1
                    ? 'text-yellow-600'
                    : idx === 2
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}
              >
                {bucket.label}
              </p>
              <p
                className={`text-lg font-bold ${
                  idx === 0
                    ? 'text-green-800'
                    : idx === 1
                    ? 'text-yellow-800'
                    : idx === 2
                    ? 'text-orange-800'
                    : 'text-red-800'
                }`}
              >
                {pkr(bucket.amount)}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  idx === 0
                    ? 'text-green-500'
                    : idx === 1
                    ? 'text-yellow-500'
                    : idx === 2
                    ? 'text-orange-500'
                    : 'text-red-500'
                }`}
              >
                {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
