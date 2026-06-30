'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pallaiAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'

export default function PallaiLedgerPage() {
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [search, setSearch] = useState('')
  const [filterOutstanding, setFilterOutstanding] = useState(false)
  const [filterInactive, setFilterInactive] = useState(false)
  const [minOutstanding, setMinOutstanding] = useState('')
  const [maxOutstanding, setMaxOutstanding] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: summary = [], isLoading: loadingSummary } = useQuery({
    queryKey: ['pallai-ledger-summary'],
    queryFn: () => pallaiAPI.getLedgerSummary().then(r => r.data.data),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['pallai-customers'],
    queryFn: () => pallaiAPI.listCustomers().then(r => r.data.data),
  })

  const { data: ledger = [], isLoading: loadingLedger } = useQuery({
    queryKey: ['pallai-ledger', selectedCustomer, dateFrom, dateTo, statusFilter],
    queryFn: () => pallaiAPI.getCustomerLedger(selectedCustomer, {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: statusFilter || undefined,
    }).then(r => r.data.data),
    enabled: !!selectedCustomer,
  })

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['pallai-customer-subs', selectedCustomer],
    queryFn: () => pallaiAPI.getCustomerSubscriptions(selectedCustomer).then(r => r.data.data),
    enabled: !!selectedCustomer,
  })

  const selectedCustomerData = (summary as any[]).find((c: any) => c.id === selectedCustomer)
    || (customers as any[]).find((c: any) => c.id === selectedCustomer)
  const totalBilled = (ledger as any[]).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)
  const totalPaid = (ledger as any[]).reduce((sum: number, e: any) => sum + Number(e.paid_amount || 0), 0)

  // Filter summary table
  const filteredSummary = (summary as any[]).filter((c: any) => {
    if (search) {
      const term = search.toLowerCase()
      if (!c.full_name.toLowerCase().includes(term) && !c.phone?.includes(search) && !c.cnic?.includes(search) && !c.email?.toLowerCase().includes(term)) return false
    }
    if (filterOutstanding && c.outstanding <= 0) return false
    if (!filterInactive && !c.is_active) return false
    if (minOutstanding && c.outstanding < Number(minOutstanding)) return false
    if (maxOutstanding && c.outstanding > Number(maxOutstanding)) return false
    return true
  })

  const clearFilters = () => { setSearch(''); setFilterOutstanding(false); setFilterInactive(false); setMinOutstanding(''); setMaxOutstanding('') }
  const clearLedgerFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('') }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Ledger</h1>
          <p className="page-subtitle">All customers — invoice history and outstanding balances</p>
        </div>
        {selectedCustomer && (
          <button onClick={() => setSelectedCustomer('')} className="btn-secondary text-sm">← All Customers</button>
        )}
      </div>

      {!selectedCustomer ? (
        <>
          {/* Export */}
          {filteredSummary.length > 0 && (
            <div className="flex justify-end mb-3">
              <ExportButtons
                columns={[
                  { header: 'Customer', key: 'Customer' },
                  { header: 'Phone', key: 'Phone' },
                  { header: 'Email', key: 'Email' },
                  { header: 'CNIC', key: 'CNIC' },
                  { header: 'Status', key: 'Status' },
                  { header: 'Invoices', key: 'Invoices' },
                  { header: 'Total Billed', key: 'Total Billed' },
                  { header: 'Total Paid', key: 'Total Paid' },
                  { header: 'Outstanding', key: 'Outstanding' },
                ]}
                rows={filteredSummary.map((c: any) => ({
                  Customer: c.full_name,
                  Phone: c.phone || '',
                  Email: c.email || '',
                  CNIC: c.cnic || '',
                  Status: c.is_active ? 'Active' : 'Inactive',
                  Invoices: c.invoice_count,
                  'Total Billed': Number(c.total_billed).toFixed(2),
                  'Total Paid': Number(c.total_paid).toFixed(2),
                  Outstanding: Number(c.outstanding).toFixed(2),
                }))}
                filename="pallai-customer-ledgers"
                title="Customer Ledger Summary"
              />
            </div>
          )}
          {/* Summary filters */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48">
                <label className="label">Search</label>
                <input className="input" placeholder="Name, phone, email or CNIC..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div>
                <label className="label">Min Outstanding (PKR)</label>
                <input className="input w-36" type="number" min="0" placeholder="0" value={minOutstanding} onChange={e => setMinOutstanding(e.target.value)} />
              </div>
              <div>
                <label className="label">Max Outstanding (PKR)</label>
                <input className="input w-36" type="number" min="0" placeholder="Any" value={maxOutstanding} onChange={e => setMaxOutstanding(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2 self-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" id="outstanding" checked={filterOutstanding} onChange={e => setFilterOutstanding(e.target.checked)} className="h-4 w-4 text-green-600 rounded" />
                  <span className="text-gray-700">Has outstanding balance</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" id="inactive" checked={filterInactive} onChange={e => setFilterInactive(e.target.checked)} className="h-4 w-4 text-green-600 rounded" />
                  <span className="text-gray-700">Include inactive customers</span>
                </label>
              </div>
              {(search || filterOutstanding || filterInactive || minOutstanding || maxOutstanding) && (
                <button onClick={clearFilters} className="btn-secondary text-sm self-end">✕ Clear</button>
              )}
            </div>
          </div>

          {/* All customers summary table */}
          <div className="card overflow-hidden">
            {loadingSummary ? (
              <div className="p-12 text-center text-gray-400">Loading customer ledgers...</div>
            ) : (
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    {['Customer', 'Phone', 'Invoices', 'Total Billed', 'Total Paid', 'Outstanding', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((c: any) => (
                    <tr key={c.id} className={`table-row ${!c.is_active ? 'opacity-60' : ''}`}>
                      <td className="table-cell font-semibold">
                        {c.full_name}
                        {!c.is_active && <span className="ml-2 text-xs text-gray-400">(Inactive)</span>}
                      </td>
                      <td className="table-cell text-gray-500">{c.phone || '—'}</td>
                      <td className="table-cell">{c.invoice_count}</td>
                      <td className="table-cell">PKR {Number(c.total_billed).toLocaleString()}</td>
                      <td className="table-cell text-green-700">PKR {Number(c.total_paid).toLocaleString()}</td>
                      <td className="table-cell">
                        <span className={`font-semibold ${c.outstanding > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          PKR {Number(c.outstanding).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => setSelectedCustomer(c.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSummary.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        {search || filterOutstanding ? 'No customers match the filters' : 'No customers found'}
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredSummary.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t-2">
                      <td colSpan={3} className="py-3 px-4 text-right text-gray-700">Totals ({filteredSummary.length} customers):</td>
                      <td className="py-3 px-4">PKR {filteredSummary.reduce((s: number, c: any) => s + Number(c.total_billed), 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-green-700">PKR {filteredSummary.reduce((s: number, c: any) => s + Number(c.total_paid), 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-red-600">PKR {filteredSummary.reduce((s: number, c: any) => s + Number(c.outstanding), 0).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Customer detail header */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
            <div className="card p-4">
              <div className="text-lg font-bold text-gray-900">{selectedCustomerData?.full_name}</div>
              <div className="text-sm text-gray-500">{selectedCustomerData?.phone || '—'}</div>
              <div className="text-xs text-gray-400">{selectedCustomerData?.cnic || ''}</div>
            </div>
            <div className="card p-4">
              <div className="text-xl font-bold text-blue-700">{(subscriptions as any[]).filter((s: any) => s.is_active).length}</div>
              <div className="text-sm text-gray-500">Active Subscriptions</div>
            </div>
            <div className="card p-4">
              <div className="text-xl font-bold text-gray-900">PKR {totalBilled.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Billed</div>
            </div>
            <div className="card p-4">
              <div className={`text-xl font-bold ${(totalBilled - totalPaid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                PKR {(totalBilled - totalPaid).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Outstanding</div>
            </div>
          </div>

          {/* Subscriptions */}
          {(subscriptions as any[]).length > 0 && (
            <div className="card p-4 mb-5">
              <h3 className="font-semibold text-gray-700 mb-3">Subscriptions</h3>
              <div className="flex flex-wrap gap-3">
                {(subscriptions as any[]).map((s: any) => (
                  <div key={s.id} className="border border-gray-100 rounded-lg px-4 py-2 text-sm">
                    <span className="font-medium">{s.animal_name || 'Animal'}</span>
                    <span className="text-gray-500"> · {s.package_name}</span>
                    <span className="text-green-700 font-medium ml-2">PKR {Number(s.monthly_fee || 0).toLocaleString()}/mo</span>
                    <span className={s.is_active ? ' badge-active ml-2' : ' badge-inactive ml-2'}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ledger filters */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="label">Date From</label>
                <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Date To</label>
                <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {(dateFrom || dateTo || statusFilter) && (
                <button onClick={clearLedgerFilters} className="btn-secondary text-sm self-end">✕ Clear</button>
              )}
            </div>
          </div>

          {/* Ledger table */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Invoice Ledger</h3>
            </div>
            {loadingLedger ? (
              <div className="p-8 text-center text-gray-400">Loading ledger...</div>
            ) : (ledger as any[]).length === 0 ? (
              <div className="p-8 text-center text-gray-400">No invoices found for this customer</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Date', 'Invoice #', 'Description', 'Amount', 'Paid', 'Balance', 'Status'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ledger as any[]).map((e: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">{e.date}</td>
                      <td className="py-3 px-4 font-mono text-xs">{e.invoice_number || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{e.description}</td>
                      <td className="py-3 px-4 font-medium">PKR {Number(e.amount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-green-700">PKR {Number(e.paid_amount || 0).toLocaleString()}</td>
                      <td className={`py-3 px-4 font-semibold ${Number(e.balance || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        PKR {Number(e.balance || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={e.status === 'paid' ? 'badge-active' : 'badge-info'}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="py-3 px-4 text-right text-gray-700">Totals:</td>
                    <td className="py-3 px-4">PKR {totalBilled.toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-700">PKR {totalPaid.toLocaleString()}</td>
                    <td className={`py-3 px-4 ${(totalBilled - totalPaid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      PKR {(totalBilled - totalPaid).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
