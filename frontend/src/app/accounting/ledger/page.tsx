'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface LedgerEntry {
  entry_date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface LedgerData {
  account: {
    id: string
    code: string
    name: string
    type: string
  }
  entries: LedgerEntry[]
  closing_balance: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset:     'bg-blue-100 text-blue-800',
  liability: 'bg-orange-100 text-orange-800',
  equity:    'bg-purple-100 text-purple-800',
  revenue:   'bg-green-100 text-green-800',
  expense:   'bg-red-100 text-red-800',
}

function formatPKR(amount: number): string {
  const rounded = Math.round(Math.abs(amount))
  return 'PKR ' + rounded.toLocaleString('en-PK')
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' })
}

function AccountTypeBadge({ type }: { type: string }) {
  const cls = ACCOUNT_TYPE_COLORS[type?.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>
      {type}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeneralLedgerPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>(today)

  // Applied query params (only update when user clicks "View Ledger")
  const [queryAccountId, setQueryAccountId] = useState<string>('')
  const [queryDateFrom, setQueryDateFrom] = useState<string>('')
  const [queryDateTo, setQueryDateTo] = useState<string>(today)

  // Load all accounts for the dropdown
  const { data: accountsData, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () =>
      accountingAPI.getAccounts().then((r) => {
        const payload = r.data
        return Array.isArray(payload) ? payload : (payload.data ?? payload.accounts ?? [])
      }),
  })

  const accounts: Account[] = accountsData ?? []

  // Load ledger entries (only when user has triggered a query)
  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    isError: ledgerError,
    error: ledgerErrorObj,
  } = useQuery<LedgerData>({
    queryKey: ['general-ledger', queryAccountId, queryDateFrom, queryDateTo],
    queryFn: () =>
      accountingAPI
        .getGeneralLedger(queryAccountId, queryDateFrom || undefined, queryDateTo || undefined)
        .then((r) => r.data.data ?? r.data),
    enabled: !!queryAccountId,
  })

  const handleViewLedger = () => {
    if (!selectedAccountId) return
    setQueryAccountId(selectedAccountId)
    setQueryDateFrom(dateFrom)
    setQueryDateTo(dateTo)
  }

  // Derived totals
  const entries: LedgerEntry[] = ledgerData?.entries ?? []
  const totalDebits = entries.reduce((s, e) => s + (e.debit ?? 0), 0)
  const totalCredits = entries.reduce((s, e) => s + (e.credit ?? 0), 0)
  const openingBalance = 0
  const closingBalance = ledgerData?.closing_balance ?? openingBalance + totalDebits - totalCredits

  const hasLedger = !!queryAccountId
  const hasEntries = entries.length > 0

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">General Ledger</h1>
          <p className="page-subtitle">Accounting — view all transactions for a specific account</p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Account selector */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">
                {accountsLoading ? 'Loading accounts…' : '— Select an account —'}
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || today}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={today}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* View button */}
          <button
            onClick={handleViewLedger}
            disabled={!selectedAccountId || ledgerLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ledgerLoading ? 'Loading…' : 'View Ledger'}
          </button>
        </div>
      </div>

      {/* ── Empty state: no account chosen yet ── */}
      {!hasLedger && (
        <div className="card p-16 flex flex-col items-center justify-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-16 h-16 text-gray-200 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M3 21h18M12 3v4m0 0l-2-2m2 2l2-2"
            />
          </svg>
          <p className="text-gray-400 font-medium text-base">Select an account to view its ledger</p>
          <p className="text-gray-300 text-sm mt-1">
            Choose an account from the dropdown above, set the date range, and click View Ledger.
          </p>
        </div>
      )}

      {/* ── Error state ── */}
      {hasLedger && ledgerError && (
        <div className="card p-6 text-center text-red-600">
          <p className="font-semibold">Failed to load general ledger.</p>
          <p className="text-sm mt-1 text-gray-500">
            {(ledgerErrorObj as any)?.response?.data?.detail ?? String(ledgerErrorObj)}
          </p>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {hasLedger && ledgerLoading && (
        <div className="card p-6 text-center text-gray-400 animate-pulse">
          Loading ledger entries…
        </div>
      )}

      {/* ── Account info header + ledger table ── */}
      {hasLedger && !ledgerLoading && !ledgerError && ledgerData && (
        <>
          {/* Account info header */}
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-gray-500 font-semibold">
                {ledgerData.account.code}
              </span>
              <span className="text-gray-800 font-semibold text-base">
                {ledgerData.account.name}
              </span>
              <AccountTypeBadge type={ledgerData.account.type} />
            </div>
            {(queryDateFrom || queryDateTo) && (
              <span className="text-xs text-gray-400 ml-auto">
                {queryDateFrom ? formatDate(queryDateFrom) : 'Beginning'} — {queryDateTo ? formatDate(queryDateTo) : 'Today'}
              </span>
            )}
          </div>

          {/* Opening balance note */}
          <div className="mb-2 px-1">
            <span className="text-xs text-gray-400 italic">
              Opening balance: {formatPKR(openingBalance)} (carried forward)
            </span>
          </div>

          {/* No entries state */}
          {!hasEntries && (
            <div className="card p-10 flex flex-col items-center justify-center text-center">
              <p className="text-gray-400 font-medium">No transactions found for this account in the selected period.</p>
              <p className="text-gray-300 text-sm mt-1">Try adjusting the date range or posting journal entries to this account.</p>
            </div>
          )}

          {/* Ledger table */}
          {hasEntries && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs w-32">Date</th>
                    <th className="text-left px-4 py-3 text-xs w-36">Entry Number</th>
                    <th className="text-left px-4 py-3 text-xs">Description</th>
                    <th className="text-right px-4 py-3 text-xs w-36">Debit</th>
                    <th className="text-right px-4 py-3 text-xs w-36">Credit</th>
                    <th className="text-right px-4 py-3 text-xs w-40">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={`${entry.entry_number}-${idx}`} className="table-row">
                      {/* Date */}
                      <td className="table-cell text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(entry.entry_date)}
                      </td>

                      {/* Entry Number */}
                      <td className="table-cell font-mono text-xs text-gray-600">
                        {entry.entry_number || '—'}
                      </td>

                      {/* Description */}
                      <td className="table-cell text-gray-700">
                        {entry.description || <span className="text-gray-300 italic">No description</span>}
                      </td>

                      {/* Debit */}
                      <td className="table-cell text-right font-mono text-blue-700">
                        {entry.debit > 0 ? formatPKR(entry.debit) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Credit */}
                      <td className="table-cell text-right font-mono text-green-700">
                        {entry.credit > 0 ? formatPKR(entry.credit) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Running Balance (green if positive, red if negative) */}
                      <td
                        className={`table-cell text-right font-mono font-semibold ${
                          entry.balance >= 0 ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {entry.balance < 0
                          ? `(${formatPKR(entry.balance)})`
                          : formatPKR(entry.balance)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-blue-800">
                      {formatPKR(totalDebits)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-800">
                      {formatPKR(totalCredits)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm font-bold ${
                        closingBalance >= 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {closingBalance < 0
                        ? `(${formatPKR(closingBalance)})`
                        : formatPKR(closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footer: closing balance summary */}
              <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-gray-400">
                  {entries.length} transaction{entries.length !== 1 ? 's' : ''}
                  {queryDateFrom || queryDateTo
                    ? ` from ${queryDateFrom ? formatDate(queryDateFrom) : 'beginning'} to ${queryDateTo ? formatDate(queryDateTo) : 'today'}`
                    : ''}
                </span>
                <span className={`text-sm font-semibold ${closingBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  Closing Balance:&nbsp;
                  {closingBalance < 0
                    ? `(${formatPKR(closingBalance)})`
                    : formatPKR(closingBalance)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
