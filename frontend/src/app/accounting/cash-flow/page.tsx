'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
  const abs = Math.round(Math.abs(amount))
  return 'PKR ' + abs.toLocaleString('en-PK')
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CFItem {
  label: string
  amount: number
}

interface CashFlowData {
  period_start: string
  period_end: string
  operating_items: CFItem[]
  net_operating: number
  investing_items: CFItem[]
  net_investing: number
  financing_items: CFItem[]
  net_financing: number
  net_cash_change: number
  opening_cash: number
  closing_cash: number
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <tr>
      <td
        colSpan={2}
        className={`px-5 py-2 text-xs font-bold uppercase tracking-widest border-t border-gray-200 bg-gray-50 ${color}`}
      >
        {title}
      </td>
    </tr>
  )
}

function LineRow({ item }: { item: CFItem }) {
  const isNeg = item.amount < 0
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-2 text-sm text-gray-700 pl-10">{item.label}</td>
      <td className={`px-5 py-2 text-sm text-right font-mono ${isNeg ? 'text-red-600' : 'text-gray-800'}`}>
        {isNeg ? '(' : ''}
        {formatPKR(item.amount)}
        {isNeg ? ')' : ''}
      </td>
    </tr>
  )
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  const isPos = amount >= 0
  return (
    <tr className="border-t border-gray-200 border-dashed">
      <td className="px-5 py-2 text-sm font-bold text-gray-700 pl-10">{label}</td>
      <td className={`px-5 py-2 text-sm font-bold text-right font-mono ${isPos ? 'text-green-700' : 'text-red-600'}`}>
        {isPos ? '' : '('}
        {formatPKR(amount)}
        {isPos ? '' : ')'}
      </td>
    </tr>
  )
}

function CashRow({ label, amount, highlight }: { label: string; amount: number; highlight?: boolean }) {
  const isPos = amount >= 0
  const base = highlight
    ? 'border-t-2 border-gray-800 bg-gray-50'
    : 'border-t border-gray-200'
  return (
    <tr className={base}>
      <td className={`px-5 py-3 font-bold text-gray-800 ${highlight ? 'text-base' : 'text-sm'}`}>
        {label}
      </td>
      <td className={`px-5 py-3 font-bold text-right font-mono ${highlight ? 'text-base' : 'text-sm'} ${isPos ? 'text-gray-900' : 'text-red-600'}`}>
        {isPos ? '' : '('}
        {formatPKR(amount)}
        {isPos ? '' : ')'}
      </td>
    </tr>
  )
}

function EmptySection({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={2} className="px-5 py-2 text-sm text-gray-400 pl-10 italic">
        {text}
      </td>
    </tr>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

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
      <p className={`font-mono ${isNeg ? 'text-red-600' : 'text-green-700'}`}>
        {isNeg ? '(' : ''}{formatPKR(value)}{isNeg ? ')' : ''}
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CashFlowPage() {
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth())
  const [dateTo, setDateTo] = useState(getToday())
  const [queryFrom, setQueryFrom] = useState(getFirstDayOfMonth())
  const [queryTo, setQueryTo] = useState(getToday())

  const { data, isLoading, isError, error } = useQuery<CashFlowData>({
    queryKey: ['cash-flow-statement', queryFrom, queryTo],
    queryFn: () =>
      accountingAPI.getCashFlow(queryFrom, queryTo).then((r) => r.data.data ?? r.data),
    enabled: !!(queryFrom && queryTo),
  })

  const handleGenerate = () => {
    setQueryFrom(dateFrom)
    setQueryTo(dateTo)
  }

  const hasData = data && (
    data.operating_items.length > 0 ||
    data.investing_items.length > 0 ||
    data.financing_items.length > 0
  )

  const chartData = data
    ? [
        { name: 'Operating', value: data.net_operating ?? 0 },
        { name: 'Investing', value: data.net_investing ?? 0 },
        { name: 'Financing', value: data.net_financing ?? 0 },
        { name: 'Net Change', value: data.net_cash_change ?? 0 },
      ]
    : []

  const CHART_COLORS: Record<string, string> = {
    Operating: '#16a34a',
    Investing: '#2563eb',
    Financing: '#7c3aed',
    'Net Change': '#0891b2',
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
          <h1 className="page-title">Cash Flow Statement</h1>
          <p className="page-subtitle">
            Accounting — cash inflows and outflows by activity type
          </p>
        </div>
        {hasData && (
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
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
          <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Print heading */}
      <div className="hidden print:block mb-6 text-center">
        <h2 className="text-xl font-bold">FarmERP360 — Cash Flow Statement</h2>
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

      {/* Loading */}
      {isLoading && (
        <div className="card p-6 text-center text-gray-400 animate-pulse">
          Generating report…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && !hasData && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 font-medium">No transactions found for this period</p>
          <p className="text-gray-300 text-sm mt-1">Try a different date range or post journal entries first.</p>
        </div>
      )}

      {/* Report */}
      {!isLoading && !isError && hasData && data && (
        <div className="space-y-6">

          {/* KPI summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
            {[
              { label: 'Operating', value: data.net_operating, color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Investing', value: data.net_investing, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Financing', value: data.net_financing, color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Net Change', value: data.net_cash_change, color: data.net_cash_change >= 0 ? 'text-cyan-700' : 'text-red-600', bg: data.net_cash_change >= 0 ? 'bg-cyan-50' : 'bg-red-50' },
            ].map((kpi) => (
              <div key={kpi.label} className={`card p-4 ${kpi.bg}`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                <p className={`text-lg font-bold font-mono mt-1 ${kpi.color}`}>
                  {kpi.value < 0 ? '(' : ''}{formatPKR(kpi.value)}{kpi.value < 0 ? ')' : ''}
                </p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="card p-5 no-print">
            <h2 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              Cash Flow Summary
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 24, left: 24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v === 0 ? '0' : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)
                  }
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.value < 0 ? '#ef4444' : CHART_COLORS[entry.name]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Statement table */}
          <div className="card overflow-hidden print-full">
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Period:{' '}
                <span className="font-semibold text-gray-700">{data.period_start ?? queryFrom}</span>
                {' '}to{' '}
                <span className="font-semibold text-gray-700">{data.period_end ?? queryTo}</span>
              </span>
              <span className="font-medium text-gray-400 uppercase tracking-wide">FarmERP360</span>
            </div>

            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-5 py-3 text-xs">Activity</th>
                  <th className="text-right px-5 py-3 text-xs">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>

                {/* ── OPERATING ACTIVITIES ── */}
                <SectionHeader title="Operating Activities" color="text-green-700" />
                {data.operating_items.length > 0
                  ? data.operating_items.map((item, i) => <LineRow key={i} item={item} />)
                  : <EmptySection text="No operating activity" />
                }
                <SubtotalRow label="Net Cash from Operating Activities" amount={data.net_operating ?? 0} />

                {/* ── INVESTING ACTIVITIES ── */}
                <SectionHeader title="Investing Activities" color="text-blue-700" />
                {data.investing_items.length > 0
                  ? data.investing_items.map((item, i) => <LineRow key={i} item={item} />)
                  : <EmptySection text="No investing activity" />
                }
                <SubtotalRow label="Net Cash from Investing Activities" amount={data.net_investing ?? 0} />

                {/* ── FINANCING ACTIVITIES ── */}
                <SectionHeader title="Financing Activities" color="text-purple-700" />
                {data.financing_items.length > 0
                  ? data.financing_items.map((item, i) => <LineRow key={i} item={item} />)
                  : <EmptySection text="No financing activity" />
                }
                <SubtotalRow label="Net Cash from Financing Activities" amount={data.net_financing ?? 0} />

                {/* ── CASH RECONCILIATION ── */}
                <CashRow label="Net Increase / (Decrease) in Cash" amount={data.net_cash_change ?? 0} />
                <CashRow label="Cash & Bank Balance — Beginning of Period" amount={data.opening_cash ?? 0} />
                <CashRow label="Cash & Bank Balance — End of Period" amount={data.closing_cash ?? 0} highlight />

              </tbody>
            </table>

            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 no-print">
              Prepared using the indirect method &mdash; Generated {getToday()} &mdash; All amounts in Pakistani Rupees (PKR)
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
