'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: AccountType
  description?: string
  is_active: boolean
}

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense']

const TYPE_CONFIG: Record<AccountType, { label: string; headerBg: string; headerText: string; badgeBg: string; badgeText: string; dotColor: string }> = {
  asset:     { label: 'Assets',       headerBg: 'bg-blue-50',   headerText: 'text-blue-800',   badgeBg: 'bg-blue-100',   badgeText: 'text-blue-800',   dotColor: 'bg-blue-500' },
  liability: { label: 'Liabilities',  headerBg: 'bg-red-50',    headerText: 'text-red-800',    badgeBg: 'bg-red-100',    badgeText: 'text-red-800',    dotColor: 'bg-red-500' },
  equity:    { label: 'Equity',       headerBg: 'bg-purple-50', headerText: 'text-purple-800', badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', dotColor: 'bg-purple-500' },
  revenue:   { label: 'Revenue',      headerBg: 'bg-green-50',  headerText: 'text-green-800',  badgeBg: 'bg-green-100',  badgeText: 'text-green-800',  dotColor: 'bg-green-500' },
  expense:   { label: 'Expenses',     headerBg: 'bg-orange-50', headerText: 'text-orange-800', badgeBg: 'bg-orange-100', badgeText: 'text-orange-800', dotColor: 'bg-orange-500' },
}

const emptyForm = { account_code: '', account_name: '', account_type: 'asset' as AccountType, description: '' }

export default function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [collapsed, setCollapsed] = useState<Record<AccountType, boolean>>({
    asset: false, liability: false, equity: false, revenue: false, expense: false,
  })

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: () => accountingAPI.getAccounts().then((r: any) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: typeof emptyForm) => accountingAPI.createAccount(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      toast.success('Account created!')
      setShowAdd(false)
      setForm(emptyForm)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create account'),
  })

  const toggleCollapse = (type: AccountType) => {
    setCollapsed(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const grouped = ACCOUNT_TYPES.reduce<Record<AccountType, Account[]>>((acc, type) => {
    acc[type] = (accounts ?? []).filter(a => a.account_type === type)
    return acc
  }, { asset: [], liability: [], equity: [], revenue: [], expense: [] })

  const totalAccounts = (accounts ?? []).length
  const activeAccounts = (accounts ?? []).filter(a => a.is_active).length

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chart of Accounts</h1>
          <p className="page-subtitle">{totalAccounts} accounts &mdash; {activeAccounts} active</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Account</button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {ACCOUNT_TYPES.map(type => {
          const cfg = TYPE_CONFIG[type]
          const count = grouped[type].length
          return (
            <div key={type} className="stat-card flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
              <div>
                <p className="text-xs text-gray-500">{cfg.label}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Loading accounts...</span>
        </div>
      )}

      {/* Grouped account sections */}
      {!isLoading && (
        <div className="space-y-4">
          {ACCOUNT_TYPES.map(type => {
            const cfg = TYPE_CONFIG[type]
            const rows = grouped[type]
            const isCollapsed = collapsed[type]

            return (
              <div key={type} className="card overflow-hidden">
                {/* Collapsible section header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(type)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 ${cfg.headerBg} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                    <span className={`font-semibold text-sm ${cfg.headerText}`}>{cfg.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                      {rows.length} {rows.length === 1 ? 'account' : 'accounts'}
                    </span>
                  </div>
                  <span className={`text-lg leading-none ${cfg.headerText} select-none`}>
                    {isCollapsed ? '+' : '−'}
                  </span>
                </button>

                {/* Account rows */}
                {!isCollapsed && (
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        {['Code', 'Account Name', 'Type', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-sm text-gray-400">
                            No {cfg.label.toLowerCase()} accounts yet
                          </td>
                        </tr>
                      )}
                      {rows.map((account: Account) => (
                        <tr key={account.id} className="table-row">
                          <td className="table-cell font-mono text-gray-700 font-semibold text-xs">
                            {account.account_code}
                          </td>
                          <td className="table-cell font-medium text-gray-900">
                            {account.account_name}
                            {account.description && (
                              <p className="text-xs text-gray-400 font-normal mt-0.5 truncate max-w-xs">
                                {account.description}
                              </p>
                            )}
                          </td>
                          <td className="table-cell">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                              {cfg.label.replace(/s$/, '')}
                            </span>
                          </td>
                          <td className="table-cell">
                            {account.is_active
                              ? <span className="badge-active">Active</span>
                              : <span className="badge-gray">Inactive</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state when no accounts at all */}
      {!isLoading && totalAccounts === 0 && (
        <div className="card p-16 text-center mt-4">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">&#x1F4CA;</span>
          </div>
          <p className="text-gray-500 text-sm">No accounts found. Create your first account to get started.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">+ Add First Account</button>
        </div>
      )}

      {/* Add Account Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">Add Account</h2>
              <button
                onClick={() => { setShowAdd(false); setForm(emptyForm) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &#x2715;
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                createMutation.mutate(form)
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="label">Account Code *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. 1001, 2100, 4001"
                  value={form.account_code}
                  onChange={e => setForm({ ...form, account_code: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Account Name *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Cash and Cash Equivalents"
                  value={form.account_name}
                  onChange={e => setForm({ ...form, account_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Account Type *</label>
                <select
                  className="input"
                  required
                  value={form.account_type}
                  onChange={e => setForm({ ...form, account_type: e.target.value as AccountType })}
                >
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type} value={type}>
                      {TYPE_CONFIG[type].label.replace(/s$/, '')}
                    </option>
                  ))}
                </select>
                {/* Live type colour preview */}
                <div className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_CONFIG[form.account_type].badgeBg} ${TYPE_CONFIG[form.account_type].badgeText}`}>
                  <span className={`w-2 h-2 rounded-full ${TYPE_CONFIG[form.account_type].dotColor}`} />
                  {TYPE_CONFIG[form.account_type].label}
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Optional description for this account..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setForm(emptyForm) }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
