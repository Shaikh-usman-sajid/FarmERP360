'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

const today = new Date().toISOString().split('T')[0]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BalanceSheetAccount {
  account_code: string
  account_name: string
  balance: number
}

interface BalanceSheetData {
  as_of_date: string
  assets: BalanceSheetAccount[]
  total_assets: number
  liabilities: BalanceSheetAccount[]
  total_liabilities: number
  equity: BalanceSheetAccount[]
  total_equity: number
  total_liabilities_equity: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPKR(amount: number): string {
  const rounded = Math.round(amount)
  return 'PKR ' + rounded.toLocaleString('en-PK')
}

function AccountRow({ account }: { account: BalanceSheetAccount }) {
  const negative = account.balance < 0
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-2 px-3 font-mono text-xs text-gray-400 w-28">{account.account_code}</td>
      <td className="py-2 px-3 text-sm text-gray-700">{account.account_name}</td>
      <td className={`py-2 px-3 text-right font-mono text-sm ${negative ? 'text-red-600' : 'text-gray-800'}`}>
        {negative ? `(${formatPKR(Math.abs(account.balance))})` : formatPKR(account.balance)}
      </td>
    </tr>
  )
}

function SectionTotal({ label, amount, topBorder = false }: { label: string; amount: number; topBorder?: boolean }) {
  return (
    <tr className={topBorder ? 'border-t-2 border-gray-300' : 'border-t border-gray-200'}>
      <td className="py-2 px-3" />
      <td className="py-2 px-3 text-sm font-bold text-gray-800">{label}</td>
      <td className="py-2 px-3 text-right font-mono text-sm font-bold text-gray-900">
        {formatPKR(amount)}
      </td>
    </tr>
  )
}

function SectionHeader({ title, colorClass }: { title: string; colorClass: string }) {
  return (
    <tr>
      <td
        colSpan={3}
        className={`py-2 px-3 text-xs font-bold uppercase tracking-widest ${colorClass} border-b`}
      >
        {title}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(today)
  const [queryDate, setQueryDate] = useState(today)

  const { data, isLoading, isError, error } = useQuery<BalanceSheetData>({
    queryKey: ['balance-sheet', queryDate],
    queryFn: () => accountingAPI.getBalanceSheet(queryDate).then((r) => r.data.data ?? r.data),
    enabled: !!queryDate,
  })

  const handleGenerate = () => setQueryDate(asOf)
  const handlePrint = () => window.print()

  const totalAssets = data?.total_assets ?? 0
  const totalLiabilitiesEquity = data?.total_liabilities_equity ?? 0
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01
  const hasData = !!data && (
    (data.assets?.length ?? 0) > 0 ||
    (data.liabilities?.length ?? 0) > 0 ||
    (data.equity?.length ?? 0) > 0
  )

  return (
    <DashboardLayout>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      {/* Page header */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Balance Sheet</h1>
          <p className="page-subtitle">Accounting — statement of financial position at a point in time</p>
        </div>
        {hasData && (
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Export
          </button>
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

      {/* Print heading — visible only when printing */}
      <div className="hidden print:block mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">FarmERP360</h2>
        <p className="text-base font-semibold mt-1">Balance Sheet</p>
        <p className="text-sm text-gray-500 mt-0.5">As of {data?.as_of_date ?? queryDate}</p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card p-6 text-center text-red-600">
          <p className="font-semibold">Failed to load balance sheet.</p>
          <p className="text-sm mt-1 text-gray-500">
            {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? String(error)}
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card p-8 text-center text-gray-400 animate-pulse">
          Generating report…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && !hasData && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 6h6M9 18h6" />
          </svg>
          <p className="text-gray-400 font-medium">No account data found</p>
          <p className="text-gray-300 text-sm mt-1">Post journal entries to populate the balance sheet.</p>
        </div>
      )}

      {/* Balance Sheet Report */}
      {!isLoading && !isError && hasData && (
        <div className="space-y-4">
          {/* Balance check banner */}
          {isBalanced ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium no-print">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Balance sheet is in balance — Total Assets equal Total Liabilities &amp; Equity.
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-semibold no-print">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Warning: Balance sheet is OUT OF BALANCE — difference of{' '}
              {formatPKR(Math.abs(totalAssets - totalLiabilitiesEquity))}
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── LEFT COLUMN: ASSETS ── */}
            <div className="card overflow-hidden print-card">
              <div className="px-4 py-3 bg-blue-600 text-white">
                <h2 className="text-sm font-bold uppercase tracking-widest">Assets</h2>
                <p className="text-xs text-blue-200 mt-0.5">As of {data?.as_of_date ?? queryDate}</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-50 border-b border-blue-100">
                    <th className="py-2 px-3 text-left text-xs font-semibold text-blue-700 w-28">Code</th>
                    <th className="py-2 px-3 text-left text-xs font-semibold text-blue-700">Account</th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-blue-700">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.assets ?? []).length > 0 ? (
                    <>
                      <SectionHeader title="Current &amp; Non-Current Assets" colorClass="bg-blue-50 text-blue-600" />
                      {data!.assets.map((a) => (
                        <AccountRow key={a.account_code} account={a} />
                      ))}
                      <SectionTotal label="Total Assets" amount={data!.total_assets} topBorder />
                    </>
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-gray-400 text-sm">
                        No asset accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── RIGHT COLUMN: LIABILITIES & EQUITY ── */}
            <div className="card overflow-hidden print-card">
              <div className="px-4 py-3 bg-indigo-600 text-white">
                <h2 className="text-sm font-bold uppercase tracking-widest">Liabilities &amp; Equity</h2>
                <p className="text-xs text-indigo-200 mt-0.5">As of {data?.as_of_date ?? queryDate}</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-indigo-50 border-b border-indigo-100">
                    <th className="py-2 px-3 text-left text-xs font-semibold text-indigo-700 w-28">Code</th>
                    <th className="py-2 px-3 text-left text-xs font-semibold text-indigo-700">Account</th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-indigo-700">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Liabilities section */}
                  {(data?.liabilities ?? []).length > 0 ? (
                    <>
                      <SectionHeader title="Liabilities" colorClass="bg-orange-50 text-orange-700" />
                      {data!.liabilities.map((a) => (
                        <AccountRow key={a.account_code} account={a} />
                      ))}
                      <SectionTotal label="Total Liabilities" amount={data!.total_liabilities} topBorder />
                    </>
                  ) : (
                    <>
                      <SectionHeader title="Liabilities" colorClass="bg-orange-50 text-orange-700" />
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-gray-400 text-xs italic">
                          No liability accounts found.
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Spacer */}
                  <tr><td colSpan={3} className="py-1" /></tr>

                  {/* Equity section */}
                  {(data?.equity ?? []).length > 0 ? (
                    <>
                      <SectionHeader title="Equity" colorClass="bg-purple-50 text-purple-700" />
                      {data!.equity.map((a) => (
                        <AccountRow key={a.account_code} account={a} />
                      ))}
                      <SectionTotal label="Total Equity" amount={data!.total_equity} topBorder />
                    </>
                  ) : (
                    <>
                      <SectionHeader title="Equity" colorClass="bg-purple-50 text-purple-700" />
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-gray-400 text-xs italic">
                          No equity accounts found.
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Grand total: Total Liabilities + Equity */}
                  <tr className="border-t-2 border-indigo-300 bg-indigo-50">
                    <td className="py-3 px-3" />
                    <td className="py-3 px-3 text-sm font-bold text-indigo-900">
                      Total Liabilities &amp; Equity
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-bold text-indigo-900">
                      {formatPKR(data?.total_liabilities_equity ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance verification summary card */}
          <div className="card p-4 print-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Total Assets</p>
                  <p className="text-lg font-bold text-blue-700 font-mono">{formatPKR(totalAssets)}</p>
                </div>
                <div className="text-2xl text-gray-300 select-none">=</div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Total Liabilities &amp; Equity</p>
                  <p className="text-lg font-bold text-indigo-700 font-mono">{formatPKR(totalLiabilitiesEquity)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-700 font-semibold text-sm">Balanced</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-red-600 font-semibold text-sm">
                      Out of Balance — Difference: {formatPKR(Math.abs(totalAssets - totalLiabilitiesEquity))}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-xs text-gray-400 text-right no-print">
            Report generated for {data?.as_of_date ?? queryDate} &mdash; all amounts in PKR
          </p>
        </div>
      )}
    </DashboardLayout>
  )
}
