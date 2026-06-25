'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'

const today = new Date().toISOString().split('T')[0]

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset:     'bg-blue-100 text-blue-800',
  liability: 'bg-orange-100 text-orange-800',
  equity:    'bg-purple-100 text-purple-800',
  revenue:   'bg-green-100 text-green-800',
  expense:   'bg-red-100 text-red-800',
}

function formatPKR(amount: number): string {
  if (amount === 0) return '—'
  const rounded = Math.round(amount)
  return 'PKR ' + rounded.toLocaleString('en-PK')
}

function AccountTypeBadge({ type }: { type: string }) {
  const cls = ACCOUNT_TYPE_COLORS[type?.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>
      {type}
    </span>
  )
}

interface TrialBalanceItem {
  account_code: string
  account_name: string
  account_type: string
  total_debit: number
  total_credit: number
  balance: number
}

interface TrialBalanceData {
  as_of_date: string
  items: TrialBalanceItem[]
  total_debit: number
  total_credit: number
}

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState(today)
  const [queryDate, setQueryDate] = useState(today)

  const { data, isLoading, isError, error } = useQuery<TrialBalanceData>({
    queryKey: ['trial-balance', queryDate],
    queryFn: () => accountingAPI.getTrialBalance(queryDate).then((r) => r.data.data ?? r.data),
    enabled: !!queryDate,
  })

  const handleGenerate = () => {
    setQueryDate(asOf)
  }

  const handlePrint = () => {
    window.print()
  }

  // Group items by account type
  const grouped: Record<string, TrialBalanceItem[]> = {}
  if (data?.items) {
    for (const item of data.items) {
      const key = item.account_type?.toLowerCase() ?? 'other'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    }
  }

  const groupOrder = ['asset', 'liability', 'equity', 'revenue', 'expense']
  const sortedGroups = [
    ...groupOrder.filter((g) => grouped[g]),
    ...Object.keys(grouped).filter((g) => !groupOrder.includes(g)),
  ]

  const totalDebit = data?.total_debit ?? 0
  const totalCredit = data?.total_credit ?? 0
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const hasItems = data?.items && data.items.length > 0

  return (
    <DashboardLayout>
      {/* Print styles injected inline so they work without a separate CSS file */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Trial Balance</h1>
          <p className="page-subtitle">Accounting — summarised account balances at a point in time</p>
        </div>
        {hasItems && (
          <div className="flex items-center gap-3">
            <ExportButtons
              columns={[
                { header: 'Account Code', key: 'account_code' },
                { header: 'Account Name', key: 'account_name' },
                { header: 'Type', key: 'type' },
                { header: 'Debit (PKR)', key: 'debit' },
                { header: 'Credit (PKR)', key: 'credit' },
              ]}
              rows={(data?.items ?? []).map(item => ({
                account_code: item.account_code,
                account_name: item.account_name,
                type: item.account_type,
                debit: item.total_debit,
                credit: item.total_credit,
              }))}
              filename="farmerp360-trial-balance"
              title="Trial Balance"
            />
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Export
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">As of Date</label>
            <input
              type="date"
              value={asOf}
              max={today}
              onChange={(e) => setAsOf(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report heading (visible on print) */}
      <div className="hidden print:block mb-4 text-center">
        <h2 className="text-xl font-bold">FarmERP360 — Trial Balance</h2>
        <p className="text-sm text-gray-500">As of {data?.as_of_date ?? queryDate}</p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card p-6 text-center text-red-600">
          <p className="font-semibold">Failed to load trial balance.</p>
          <p className="text-sm mt-1 text-gray-500">{(error as any)?.response?.data?.detail ?? String(error)}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card p-6 text-center text-gray-400 animate-pulse">
          Generating report…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && !hasItems && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2v-1a7 7 0 017-7h4a7 7 0 017 7v1a2 2 0 01-2 2h-4" />
          </svg>
          <p className="text-gray-400 font-medium">No posted journal entries found</p>
          <p className="text-gray-300 text-sm mt-1">Post journal entries to see the trial balance.</p>
        </div>
      )}

      {/* Report table */}
      {!isLoading && !isError && hasItems && (
        <div className="card overflow-hidden print-full">
          {/* Balance status banner */}
          {isBalanced ? (
            <div className="px-5 py-2 bg-green-50 border-b border-green-100 text-green-700 text-sm font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Trial balance is in balance — debits equal credits.
            </div>
          ) : (
            <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Warning: Trial balance is OUT OF BALANCE — difference of PKR {Math.abs(totalDebit - totalCredit).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
            </div>
          )}

          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left px-4 py-3 text-xs w-28">Account Code</th>
                <th className="text-left px-4 py-3 text-xs">Account Name</th>
                <th className="text-left px-4 py-3 text-xs w-28">Type</th>
                <th className="text-right px-4 py-3 text-xs w-36">Debit</th>
                <th className="text-right px-4 py-3 text-xs w-36">Credit</th>
                <th className="text-right px-4 py-3 text-xs w-36">Balance</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map((groupKey) => {
                const items = grouped[groupKey]
                const groupDebit = items.reduce((s, i) => s + (i.total_debit ?? 0), 0)
                const groupCredit = items.reduce((s, i) => s + (i.total_credit ?? 0), 0)
                const groupBalance = items.reduce((s, i) => s + (i.balance ?? 0), 0)

                return (
                  <>
                    {/* Group header row */}
                    <tr key={`group-header-${groupKey}`} className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={6} className="px-4 py-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 mr-2">
                          {groupKey}
                        </span>
                      </td>
                    </tr>

                    {/* Item rows */}
                    {items.map((item) => (
                      <tr key={item.account_code} className="table-row">
                        <td className="table-cell font-mono text-xs text-gray-500">{item.account_code}</td>
                        <td className="table-cell font-medium text-gray-800">{item.account_name}</td>
                        <td className="table-cell">
                          <AccountTypeBadge type={item.account_type} />
                        </td>
                        <td className="table-cell text-right font-mono text-sm text-blue-700">
                          {item.total_debit > 0 ? formatPKR(item.total_debit) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-cell text-right font-mono text-sm text-green-700">
                          {item.total_credit > 0 ? formatPKR(item.total_credit) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`table-cell text-right font-mono text-sm font-semibold ${item.balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                          {item.balance !== 0
                            ? (item.balance < 0 ? '(' + formatPKR(Math.abs(item.balance)) + ')' : formatPKR(item.balance))
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      </tr>
                    ))}

                    {/* Group subtotal row */}
                    <tr key={`group-subtotal-${groupKey}`} className="bg-gray-50 border-t border-gray-100">
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Subtotal — {groupKey}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-blue-700">
                        {groupDebit > 0 ? formatPKR(groupDebit) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-green-700">
                        {groupCredit > 0 ? formatPKR(groupCredit) : '—'}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono text-sm font-semibold ${groupBalance >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                        {groupBalance !== 0
                          ? (groupBalance < 0 ? '(' + formatPKR(Math.abs(groupBalance)) + ')' : formatPKR(groupBalance))
                          : '—'
                        }
                      </td>
                    </tr>
                  </>
                )
              })}

              {/* Grand totals row */}
              <tr className="border-t-2 border-gray-300 bg-gray-100">
                <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-blue-800">
                  {formatPKR(totalDebit)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-800">
                  {formatPKR(totalCredit)}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${isBalanced ? 'text-gray-800' : 'text-red-600'}`}>
                  {isBalanced
                    ? <span className="text-green-700">Balanced</span>
                    : <span className="text-red-600">
                        Diff: PKR {Math.abs(totalDebit - totalCredit).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                      </span>
                  }
                </td>
              </tr>
            </tbody>
          </table>

          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 no-print">
            As of {data?.as_of_date ?? queryDate} &mdash; {data?.items?.length ?? 0} accounts
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
