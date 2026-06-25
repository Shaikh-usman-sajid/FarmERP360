'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { useState } from 'react'
import ExportButtons from '@/components/ui/ExportButtons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalLine {
  account_id: string
  description: string
  debit_amount: number | string
  credit_amount: number | string
}

interface JournalEntry {
  id: string
  entry_number: string
  entry_date: string
  description: string
  reference?: string
  total_debit: number
  total_credit: number
  status: 'draft' | 'posted' | 'voided'
  lines?: JournalEntryLine[]
}

interface JournalEntryLine {
  id: string
  account_id: string
  account_name?: string
  account_code?: string
  description: string
  debit_amount: number
  credit_amount: number
}

interface Account {
  id: string
  account_name: string
  account_code: string
  account_type: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPKR = (amount: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
  }).format(amount ?? 0)

const statusConfig: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  posted: { label: 'Posted', classes: 'bg-green-100 text-green-700' },
  voided: { label: 'Voided', classes: 'bg-red-100 text-red-700' },
}

const emptyLine = (): JournalLine => ({
  account_id: '',
  description: '',
  debit_amount: '',
  credit_amount: '',
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalEntriesPage() {
  const queryClient = useQueryClient()

  // Filters
  const [statusFilter, setStatusFilter] = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [entryDate, setEntryDate] = useState('')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()])

  // View modal
  const [viewId, setViewId] = useState<string | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['journal-entries', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const res = await accountingAPI.getJournalEntries(params)
      return res.data
    },
  })

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await accountingAPI.getAccounts()
      return res.data
    },
  })

  const { data: viewData, isLoading: viewLoading } = useQuery({
    queryKey: ['journal-entry', viewId],
    queryFn: async () => {
      const res = await accountingAPI.getJournalEntry(viewId!)
      return res.data
    },
    enabled: !!viewId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: object) => accountingAPI.createJournalEntry(data),
    onSuccess: () => {
      toast.success('Journal entry created')
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      resetCreateForm()
      setShowCreate(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create journal entry')
    },
  })

  const postMutation = useMutation({
    mutationFn: (id: string) => accountingAPI.postJournalEntry(id),
    onSuccess: () => {
      toast.success('Journal entry posted')
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to post journal entry')
    },
  })

  // ── Form helpers ───────────────────────────────────────────────────────────

  const resetCreateForm = () => {
    setEntryDate('')
    setDescription('')
    setReference('')
    setLines([emptyLine(), emptyLine()])
  }

  const updateLine = (index: number, field: keyof JournalLine, value: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    )
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('Minimum two lines required')
      return
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const totalDebit = lines.reduce(
    (sum, l) => sum + (parseFloat(String(l.debit_amount)) || 0),
    0
  )
  const totalCredit = lines.reduce(
    (sum, l) => sum + (parseFloat(String(l.credit_amount)) || 0),
    0
  )
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0

  const handleSubmit = () => {
    if (!entryDate) {
      toast.error('Entry date is required')
      return
    }
    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    const validLines = lines.filter(
      (l) => l.account_id && (parseFloat(String(l.debit_amount)) > 0 || parseFloat(String(l.credit_amount)) > 0)
    )
    if (validLines.length < 2) {
      toast.error('At least two lines with amounts are required')
      return
    }
    if (!isBalanced) {
      toast.error('Debits and credits must balance before submitting')
      return
    }
    createMutation.mutate({
      entry_date: entryDate,
      description: description.trim(),
      reference: reference.trim() || undefined,
      lines: validLines.map((l) => ({
        account_id: l.account_id,
        description: l.description,
        debit_amount: parseFloat(String(l.debit_amount)) || 0,
        credit_amount: parseFloat(String(l.credit_amount)) || 0,
      })),
    })
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  const entries: JournalEntry[] = Array.isArray(entriesData)
    ? entriesData
    : entriesData?.items ?? entriesData?.data ?? []

  const accounts: Account[] = Array.isArray(accountsData)
    ? accountsData
    : accountsData?.items ?? accountsData?.data ?? []

  const viewEntry: JournalEntry | null = viewData ?? null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
            <p className="text-sm text-gray-500 mt-1">Manage double-entry bookkeeping records</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons
              columns={[
                { header: 'Entry Number', key: 'entry_number' },
                { header: 'Date', key: 'date' },
                { header: 'Description', key: 'description' },
                { header: 'Status', key: 'status' },
                { header: 'Total Debit (PKR)', key: 'total_debit' },
                { header: 'Total Credit (PKR)', key: 'total_credit' },
              ]}
              rows={entries.map(e => ({
                entry_number: e.entry_number,
                date: e.entry_date,
                description: e.description,
                status: (statusConfig[e.status] ?? statusConfig.draft).label,
                total_debit: e.total_debit,
                total_credit: e.total_credit,
              }))}
              filename="farmerp360-journal-entries"
              title="Journal Entries"
            />
            <button
              onClick={() => setShowCreate(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Journal Entry
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="voided">Voided</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {entriesLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <svg className="animate-spin h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading journal entries...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-medium">No journal entries found</p>
              <p className="text-sm mt-1">Create your first journal entry to get started.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Credit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => {
                  const sc = statusConfig[entry.status] ?? statusConfig.draft
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.entry_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.entry_date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                        {formatPKR(entry.total_debit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                        {formatPKR(entry.total_credit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.classes}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => setViewId(entry.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                        {entry.status === 'draft' && (
                          <button
                            onClick={() => postMutation.mutate(entry.id)}
                            disabled={postMutation.isPending}
                            className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          >
                            Post
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Modal ────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Journal Entry</h2>
              <button
                onClick={() => { setShowCreate(false); resetCreateForm() }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Top fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Monthly salary payment"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. INV-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Lines section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Journal Lines</h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    + Add Line
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-3 font-medium text-gray-600 w-48">Account</th>
                        <th className="text-left py-2 pr-3 font-medium text-gray-600">Description</th>
                        <th className="text-right py-2 pr-3 font-medium text-gray-600 w-36">Debit (PKR)</th>
                        <th className="text-right py-2 pr-3 font-medium text-gray-600 w-36">Credit (PKR)</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2 pr-3">
                            <select
                              value={line.account_id}
                              onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value="">Select account</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.account_code} — {acc.account_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateLine(idx, 'description', e.target.value)}
                              placeholder="Line description"
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.debit_amount}
                              onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.credit_amount}
                              onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => removeLine(idx)}
                              className="text-red-400 hover:text-red-600"
                              title="Remove line"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50">
                        <td colSpan={2} className="py-2 pr-3 text-right text-sm font-semibold text-gray-700">
                          Totals
                        </td>
                        <td className="py-2 pr-3 text-right text-sm font-semibold font-mono text-gray-900">
                          {formatPKR(totalDebit)}
                        </td>
                        <td className="py-2 pr-3 text-right text-sm font-semibold font-mono text-gray-900">
                          {formatPKR(totalCredit)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Balance indicator */}
                <div className={`mt-2 text-xs font-medium px-3 py-1.5 rounded inline-flex items-center gap-1.5 ${
                  totalDebit === 0 && totalCredit === 0
                    ? 'bg-gray-100 text-gray-500'
                    : isBalanced
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {totalDebit === 0 && totalCredit === 0 ? (
                    'Enter amounts in the lines above'
                  ) : isBalanced ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Entry is balanced
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Out of balance by {formatPKR(Math.abs(totalDebit - totalCredit))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); resetCreateForm() }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !isBalanced}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {createMutation.isPending ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ──────────────────────────────────────────────────────── */}
      {viewId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Journal Entry Detail</h2>
              <button
                onClick={() => setViewId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {viewLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <svg className="animate-spin h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading...
                </div>
              ) : viewEntry ? (
                <div className="space-y-5">
                  {/* Entry metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Entry #</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">{viewEntry.entry_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                      <p className="mt-0.5 text-sm text-gray-900">{viewEntry.entry_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <span className={`mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(statusConfig[viewEntry.status] ?? statusConfig.draft).classes}`}>
                        {(statusConfig[viewEntry.status] ?? statusConfig.draft).label}
                      </span>
                    </div>
                    {viewEntry.reference && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Reference</p>
                        <p className="mt-0.5 text-sm text-gray-900">{viewEntry.reference}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
                    <p className="mt-0.5 text-sm text-gray-900">{viewEntry.description}</p>
                  </div>

                  {/* Lines table */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Journal Lines</h3>
                    {viewEntry.lines && viewEntry.lines.length > 0 ? (
                      <table className="min-w-full text-sm divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Account</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Debit</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {viewEntry.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">
                                {line.account_code ? `${line.account_code} — ` : ''}{line.account_name ?? line.account_id}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{line.description}</td>
                              <td className="px-3 py-2 text-right font-mono text-gray-900">
                                {line.debit_amount > 0 ? formatPKR(line.debit_amount) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-900">
                                {line.credit_amount > 0 ? formatPKR(line.credit_amount) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                            <td colSpan={2} className="px-3 py-2 text-right text-gray-700">Totals</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-900">{formatPKR(viewEntry.total_debit)}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-900">{formatPKR(viewEntry.total_credit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No lines available.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Could not load entry details.</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {viewEntry?.status === 'draft' && (
                <button
                  onClick={() => {
                    postMutation.mutate(viewEntry.id)
                    setViewId(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Post Entry
                </button>
              )}
              <button
                onClick={() => setViewId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
