'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingAPI, analyticsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function formatPKR(amount: number): string {
  const rounded = Math.round(Math.abs(amount))
  return 'PKR ' + rounded.toLocaleString('en-PK')
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PLLineItem {
  account_code?: string
  account_name: string
  amount: number
}

interface ProfitLossData {
  period_start: string
  period_end: string
  revenue: PLLineItem[]
  total_revenue: number
  cost_of_goods: PLLineItem[]
  total_cogs: number
  gross_profit: number
  operating_expenses: PLLineItem[]
  total_opex: number
  net_profit: number
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-50 border-t border-gray-200"
      >
        {title}
      </td>
    </tr>
  )
}

function LineRow({ item }: { item: PLLineItem }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-2 text-sm text-gray-700 pl-10">
        {item.account_code && (
          <span className="font-mono text-xs text-gray-400 mr-2">{item.account_code}</span>
        )}
        {item.account_name}
      </td>
      <td className="px-5 py-2 text-sm text-right font-mono text-gray-800">
        {formatPKR(item.amount)}
      </td>
    </tr>
  )
}

function SubtotalRow({
  label,
  amount,
  colorClass = 'text-gray-800',
}: {
  label: string
  amount: number
  colorClass?: string
}) {
  return (
    <tr className="border-t border-gray-200">
      <td className="px-5 py-2 text-sm font-bold text-gray-700 pl-10">{label}</td>
      <td className={`px-5 py-2 text-sm font-bold text-right font-mono ${colorClass}`}>
        {formatPKR(amount)}
      </td>
    </tr>
  )
}

function HighlightRow({
  label,
  amount,
  size = 'normal',
}: {
  label: string
  amount: number
  size?: 'normal' | 'large'
}) {
  const isPositive = amount >= 0
  const bgClass = isPositive ? 'bg-green-50' : 'bg-red-50'
  const textClass = isPositive ? 'text-green-700' : 'text-red-600'
  const borderClass = isPositive ? 'border-green-200' : 'border-red-200'
  const sizeClass = size === 'large' ? 'text-base' : 'text-sm'

  return (
    <tr className={`border-t-2 ${borderClass} ${bgClass}`}>
      <td className={`px-5 py-3 font-bold ${textClass} ${sizeClass}`}>{label}</td>
      <td className={`px-5 py-3 font-bold text-right font-mono ${textClass} ${sizeClass}`}>
        {isPositive ? '' : '('}
        {formatPKR(amount)}
        {isPositive ? '' : ')'}
      </td>
    </tr>
  )
}

// ─── Custom tooltip for the bar chart ─────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null
  const value = payload[0].value
  const isNeg = value < 0
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className={isNeg ? 'text-red-600 font-mono' : 'text-gray-800 font-mono'}>
        {formatPKR(value)}
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth())
  const [dateTo, setDateTo] = useState(getToday())
  const [queryFrom, setQueryFrom] = useState(getFirstDayOfMonth())
  const [queryTo, setQueryTo] = useState(getToday())

  const { data, isLoading, isError, error } = useQuery<ProfitLossData>({
    queryKey: ['profit-loss', queryFrom, queryTo],
    queryFn: () =>
      accountingAPI.getProfitLoss(queryFrom, queryTo).then((r) => r.data.data ?? r.data),
    enabled: !!(queryFrom && queryTo),
  })

  const { data: custAnalytics } = useQuery({
    queryKey: ['analytics-customers-pl'],
    queryFn: () => analyticsAPI.customerAnalytics(12).then(r => r.data.data),
  })

  const handleGenerate = () => {
    setQueryFrom(dateFrom)
    setQueryTo(dateTo)
  }

  const handlePrint = () => window.print()

  const hasRevenue = data && data.revenue && data.revenue.length > 0
  const hasCogs = data && data.cost_of_goods && data.cost_of_goods.length > 0
  const hasOpex = data && data.operating_expenses && data.operating_expenses.length > 0
  const hasData = hasRevenue || hasCogs || hasOpex

  // Build chart data
  const chartData = data
    ? [
        { name: 'Revenue', value: data.total_revenue ?? 0 },
        { name: 'COGS', value: data.total_cogs ?? 0 },
        { name: 'Op. Expenses', value: data.total_opex ?? 0 },
        { name: 'Net Profit', value: data.net_profit ?? 0 },
      ]
    : []

  const CHART_COLORS: Record<string, string> = {
    Revenue: '#16a34a',
    COGS: '#dc2626',
    'Op. Expenses': '#d97706',
    'Net Profit': '#2563eb',
  }

  return (
    <DashboardLayout>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Page header */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Profit &amp; Loss Statement</h1>
          <p className="page-subtitle">
            Accounting — income and expenses over a selected period
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Category', key: 'category' },
              { header: 'Account Name', key: 'account_name' },
              { header: 'Amount (PKR)', key: 'amount' },
            ]}
            rows={
              hasData && data
                ? [
                    ...data.revenue.map((item) => ({
                      category: 'Revenue',
                      account_name: item.account_name,
                      amount: item.amount,
                    })),
                    { category: 'Revenue', account_name: 'Total Revenue', amount: data.total_revenue ?? 0 },
                    ...data.cost_of_goods.map((item) => ({
                      category: 'Cost of Goods Sold',
                      account_name: item.account_name,
                      amount: item.amount,
                    })),
                    { category: 'Cost of Goods Sold', account_name: 'Total Cost of Goods Sold', amount: data.total_cogs ?? 0 },
                    { category: 'Summary', account_name: 'Gross Profit', amount: data.gross_profit ?? 0 },
                    ...data.operating_expenses.map((item) => ({
                      category: 'Operating Expenses',
                      account_name: item.account_name,
                      amount: item.amount,
                    })),
                    { category: 'Operating Expenses', account_name: 'Total Operating Expenses', amount: data.total_opex ?? 0 },
                    { category: 'Summary', account_name: (data.net_profit ?? 0) >= 0 ? 'Net Profit' : 'Net Loss', amount: data.net_profit ?? 0 },
                  ]
                : []
            }
            filename="farmerp360-profit-loss"
            title="Profit & Loss Statement"
            disabled={!hasData}
          />
          {hasData && (
            <button
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={getToday()}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Print heading */}
      <div className="hidden print:block mb-6 text-center">
        <h2 className="text-xl font-bold">FarmERP360 — Profit &amp; Loss Statement</h2>
        <p className="text-sm text-gray-500 mt-1">
          Period: {data?.period_start ?? queryFrom} to {data?.period_end ?? queryTo}
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card p-6 text-center text-red-600">
          <p className="font-semibold">Failed to load the report.</p>
          <p className="text-sm mt-1 text-gray-500">
            {(error as any)?.response?.data?.detail ?? String(error)}
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card p-6 text-center text-gray-400 animate-pulse">
          Generating report…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && !hasData && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-14 h-14 text-gray-200 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2v-1a7 7 0 017-7h4a7 7 0 017 7v1a2 2 0 01-2 2h-4"
            />
          </svg>
          <p className="text-gray-400 font-medium">No transactions found for this period</p>
          <p className="text-gray-300 text-sm mt-1">
            Try a different date range or post journal entries first.
          </p>
        </div>
      )}

      {/* Report + Chart */}
      {!isLoading && !isError && hasData && data && (
        <div className="space-y-6">
          {/* Summary chart */}
          <div className="card p-5 no-print">
            <h2 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              Summary Overview
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 24, left: 24, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v === 0
                      ? '0'
                      : v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}K`
                      : String(v)
                  }
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'Net Profit' && entry.value < 0
                          ? '#dc2626'
                          : CHART_COLORS[entry.name]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* P&L Statement table */}
          <div className="card overflow-hidden print-full">
            {/* Report period banner */}
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Period:{' '}
                <span className="font-semibold text-gray-700">
                  {data.period_start ?? queryFrom}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-700">
                  {data.period_end ?? queryTo}
                </span>
              </span>
              <span className="font-medium text-gray-400 uppercase tracking-wide">
                FarmERP360
              </span>
            </div>

            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-5 py-3 text-xs">Account</th>
                  <th className="text-right px-5 py-3 text-xs">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {/* ── REVENUE ── */}
                <SectionHeader title="Revenue" />
                {hasRevenue ? (
                  data.revenue.map((item, i) => <LineRow key={i} item={item} />)
                ) : (
                  <tr>
                    <td colSpan={2} className="px-5 py-2 text-sm text-gray-400 pl-10 italic">
                      No revenue accounts
                    </td>
                  </tr>
                )}
                <SubtotalRow
                  label="Total Revenue"
                  amount={data.total_revenue ?? 0}
                  colorClass="text-green-700"
                />

                {/* ── COST OF GOODS SOLD ── */}
                <SectionHeader title="Cost of Goods Sold" />
                {hasCogs ? (
                  data.cost_of_goods.map((item, i) => <LineRow key={i} item={item} />)
                ) : (
                  <tr>
                    <td colSpan={2} className="px-5 py-2 text-sm text-gray-400 pl-10 italic">
                      No cost of goods accounts
                    </td>
                  </tr>
                )}
                <SubtotalRow
                  label="Total Cost of Goods Sold"
                  amount={data.total_cogs ?? 0}
                  colorClass="text-gray-800"
                />

                {/* ── GROSS PROFIT ── */}
                <HighlightRow
                  label="Gross Profit"
                  amount={data.gross_profit ?? 0}
                  size="normal"
                />

                {/* ── OPERATING EXPENSES ── */}
                <SectionHeader title="Operating Expenses" />
                {hasOpex ? (
                  data.operating_expenses.map((item, i) => <LineRow key={i} item={item} />)
                ) : (
                  <tr>
                    <td colSpan={2} className="px-5 py-2 text-sm text-gray-400 pl-10 italic">
                      No operating expense accounts
                    </td>
                  </tr>
                )}
                <SubtotalRow
                  label="Total Operating Expenses"
                  amount={data.total_opex ?? 0}
                  colorClass="text-gray-800"
                />

                {/* ── NET PROFIT / LOSS ── */}
                <HighlightRow
                  label={
                    (data.net_profit ?? 0) >= 0 ? 'Net Profit' : 'Net Loss'
                  }
                  amount={data.net_profit ?? 0}
                  size="large"
                />
              </tbody>
            </table>

            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 no-print">
              Generated {getToday()} &mdash; All amounts in Pakistani Rupees (PKR)
            </div>
          </div>

          {/* Revenue by Customer Category */}
          {custAnalytics?.leaderboard?.length ? (
            <div className="card overflow-hidden no-print">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Revenue by Customer — Last 12 Months</h2>
                <p className="text-xs text-gray-400 mt-0.5">Milk sales per customer (all-time, last 12 months)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Customer', 'Category', 'Revenue (PKR)', 'Liters', 'Transactions', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {custAnalytics.leaderboard.slice(0, 10).map((c: any, i: number) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{c.category || '—'}</td>
                        <td className="px-4 py-2 font-bold text-green-700">{Number(c.total_revenue).toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2">{Number(c.total_liters).toFixed(1)} L</td>
                        <td className="px-4 py-2 text-center">{c.transaction_count}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.status === 'active' ? 'bg-green-100 text-green-700'
                            : c.status === 'new' ? 'bg-blue-100 text-blue-700'
                            : c.status === 'at_risk' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardLayout>
  )
}
