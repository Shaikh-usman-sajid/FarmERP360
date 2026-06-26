'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, Area, PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const fmt = (n: number) =>
  n >= 1_000_000 ? `PKR ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `PKR ${(n / 1_000).toFixed(1)}K`
  : `PKR ${n.toFixed(0)}`

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const up = pct >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, value, change_pct, prefix = '', suffix = '' }: any) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-PK') : value}{suffix}
      </p>
      <div className="mt-1"><Trend pct={change_pct} /></div>
    </div>
  )
}

const TABS = ['Overview', 'Milk', 'Cash Flow', 'Farm Health', 'Animals', 'Inventory', 'Investors', 'Pallai', 'Customers'] as const
type Tab = typeof TABS[number]

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('Overview')

  const overview = useQuery({ queryKey: ['analytics-overview'], queryFn: () => analyticsAPI.overview().then(r => r.data.data) })
  const milk = useQuery({ queryKey: ['analytics-milk', 12], queryFn: () => analyticsAPI.milkTrends(12).then(r => r.data.data), enabled: tab === 'Milk' || tab === 'Overview' })
  const milkByCustomer = useQuery({ queryKey: ['analytics-milk-customers', 12], queryFn: () => analyticsAPI.milkSalesByCustomer(12).then(r => r.data.data), enabled: tab === 'Milk' })
  const cashFlow = useQuery({ queryKey: ['analytics-cash-flow', 6], queryFn: () => analyticsAPI.cashFlow(6).then(r => r.data.data), enabled: tab === 'Cash Flow' || tab === 'Overview' })
  const farmHealth = useQuery({ queryKey: ['analytics-farm-health', 6], queryFn: () => analyticsAPI.farmHealth(6).then(r => r.data.data), enabled: tab === 'Farm Health' })
  const animals = useQuery({ queryKey: ['analytics-animals'], queryFn: () => analyticsAPI.animalProfitability().then(r => r.data.data), enabled: tab === 'Animals' })
  const inventory = useQuery({ queryKey: ['analytics-inventory'], queryFn: () => analyticsAPI.inventoryHealth().then(r => r.data.data), enabled: tab === 'Inventory' })
  const investors = useQuery({ queryKey: ['analytics-investors'], queryFn: () => analyticsAPI.investorPerformance().then(r => r.data.data), enabled: tab === 'Investors' })
  const pallai = useQuery({ queryKey: ['analytics-pallai'], queryFn: () => analyticsAPI.pallaiPerformance().then(r => r.data.data), enabled: tab === 'Pallai' })
  const customers = useQuery({ queryKey: ['analytics-customers'], queryFn: () => analyticsAPI.customerAnalytics().then(r => r.data.data), enabled: tab === 'Customers' })

  const ov = overview.data

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-subtitle">Business intelligence across all farm operations</p>
        </div>
        {tab === 'Milk' && (
          <div className="flex gap-2">
            <ExportButtons
              columns={[
                { header: 'Customer',          key: 'customer_name' },
                { header: 'Liters',            key: 'liters' },
                { header: 'Revenue (PKR)',      key: 'revenue' },
                { header: 'Transactions',       key: 'transactions' },
                { header: 'Avg Price/L (PKR)',  key: 'avg_price_per_liter' },
              ]}
              rows={milkByCustomer.data ?? []}
              filename="farmerp360-milk-by-customer"
              title="Milk Sales by Customer"
              disabled={!milkByCustomer.data?.length}
            />
            <ExportButtons
              columns={[
                { header: 'Month', key: 'month' },
                { header: 'Liters', key: 'liters' },
                { header: 'Avg Daily (L)', key: 'avg_daily' },
                { header: 'Revenue (PKR)', key: 'revenue' },
              ]}
              rows={milk.data ?? []}
              filename="farmerp360-report-milk"
              title="Milk Production Report"
              disabled={!milk.data?.length}
            />
          </div>
        )}
        {tab === 'Cash Flow' && (
          <ExportButtons
            columns={[
              { header: 'Month', key: 'month' },
              { header: 'Income (PKR)', key: 'income' },
              { header: 'Expenses (PKR)', key: 'expenses' },
              { header: 'Net (PKR)', key: 'net' },
            ]}
            rows={cashFlow.data ?? []}
            filename="farmerp360-report-cash-flow"
            title="Cash Flow Analytics"
            disabled={!cashFlow.data?.length}
          />
        )}
        {tab === 'Farm Health' && (
          <ExportButtons
            columns={[
              { header: 'Month', key: 'month' },
              { header: 'Vaccinations', key: 'vaccinations' },
              { header: 'Treatments', key: 'treatments' },
              { header: 'Breeding Attempts', key: 'breeding_attempts' },
            ]}
            rows={farmHealth.data?.monthly ?? []}
            filename="farmerp360-report-farm-health"
            title="Farm Health Report"
            disabled={!farmHealth.data?.monthly?.length}
          />
        )}
        {tab === 'Animals' && (
          <ExportButtons
            columns={[
              { header: 'Code', key: 'animal_code' },
              { header: 'Name', key: 'name' },
              { header: 'Species', key: 'species' },
              { header: 'Breed', key: 'breed' },
              { header: 'Milk Revenue (PKR)', key: 'milk_revenue' },
              { header: 'Treatment Cost (PKR)', key: 'treatment_cost' },
              { header: 'Vaccination Cost (PKR)', key: 'vaccination_cost' },
              { header: 'Est. Profit (PKR)', key: 'estimated_profit' },
            ]}
            rows={animals.data ?? []}
            filename="farmerp360-report-animals"
            title="Animal Profitability Report"
            disabled={!animals.data?.length}
          />
        )}
        {tab === 'Inventory' && (
          <ExportButtons
            columns={[
              { header: 'Product Name', key: 'product_name' },
              { header: 'Current Stock', key: 'current_stock' },
              { header: 'Min Stock Level', key: 'min_stock_level' },
              { header: 'Deficit', key: 'deficit' },
            ]}
            rows={inventory.data?.low_stock_items ?? []}
            filename="farmerp360-report-inventory-low-stock"
            title="Inventory Low Stock Report"
            disabled={!inventory.data?.low_stock_items?.length}
          />
        )}
        {tab === 'Investors' && (
          <ExportButtons
            columns={[
              { header: 'Investor', key: 'name' },
              { header: 'Total Capital (PKR)', key: 'total_capital' },
              { header: 'Total Distributed (PKR)', key: 'total_distributed' },
              { header: 'ROI %', key: 'roi_pct' },
            ]}
            rows={investors.data?.investors ?? []}
            filename="farmerp360-report-investors"
            title="Investor Performance Report"
            disabled={!investors.data?.investors?.length}
          />
        )}
        {tab === 'Pallai' && (
          <ExportButtons
            columns={[
              { header: 'Month', key: 'month' },
              { header: 'Invoiced (PKR)', key: 'invoiced' },
              { header: 'Collected (PKR)', key: 'collected' },
            ]}
            rows={pallai.data?.monthly_billing ?? []}
            filename="farmerp360-report-pallai"
            title="Pallai Billing Report"
            disabled={!pallai.data?.monthly_billing?.length}
          />
        )}
        {tab === 'Customers' && (
          <ExportButtons
            columns={[
              { header: 'Customer', key: 'name' },
              { header: 'Status', key: 'status' },
              { header: 'Total Revenue (PKR)', key: 'total_revenue' },
              { header: 'Total Liters', key: 'total_liters' },
              { header: 'Transactions', key: 'transaction_count' },
            ]}
            rows={customers.data?.leaderboard ?? []}
            filename="farmerp360-report-customers"
            title="Customer Analytics Report"
            disabled={!customers.data?.leaderboard?.length}
          />
        )}
        {tab === 'Overview' && (
          <ExportButtons
            columns={[
              { header: 'Month', key: 'month' },
              { header: 'Liters', key: 'liters' },
              { header: 'Avg Daily (L)', key: 'avg_daily' },
              { header: 'Revenue (PKR)', key: 'revenue' },
            ]}
            rows={milk.data ?? []}
            filename="farmerp360-report-overview"
            title="Farm Overview Report"
            disabled={!milk.data?.length}
          />
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          {overview.isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : ov ? (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Milk (Liters)" value={ov.milk_liters.value} change_pct={ov.milk_liters.change_pct} suffix="L" />
                <KpiCard label="Milk Revenue" value={ov.milk_revenue.value} change_pct={ov.milk_revenue.change_pct} prefix="PKR " />
                <KpiCard label="Active Animals" value={ov.total_animals.value} change_pct={null} />
                <KpiCard label="Payments Received" value={ov.payments_received.value} change_pct={ov.payments_received.change_pct} prefix="PKR " />
                <KpiCard label="Treatments" value={ov.treatments_count.value} change_pct={ov.treatments_count.change_pct} />
                <KpiCard label="Invoices Issued" value={ov.invoices_issued_count.value} change_pct={ov.invoices_issued_count.change_pct} />
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Low Stock Alerts</p>
                  <p className={`text-xl font-bold ${ov.low_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {ov.low_stock_count}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">products below min</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Vaccinations Due (7d)</p>
                  <p className={`text-xl font-bold ${ov.vaccinations_due_7days > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {ov.vaccinations_due_7days}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">upcoming doses</p>
                </div>
              </div>

              {/* Mini charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Milk trend preview */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Milk Production — Last 12 Months</h2>
                  {milk.data?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={milk.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={m => m.slice(5)} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="L" />
                        <Tooltip formatter={(v: any) => [`${v}L`, 'Liters']} />
                        <Bar dataKey="liters" fill="#16a34a" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>}
                </div>

                {/* Cash flow preview */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Cash Flow — Last 6 Months</h2>
                  {cashFlow.data?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={cashFlow.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={m => m.slice(5)} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v: any) => [fmt(v)]} />
                        <Legend />
                        <Bar dataKey="income" fill="#16a34a" name="Income" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[3, 3, 0, 0]} />
                        <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={false} name="Net" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── MILK ─────────────────────────────────────────────── */}
      {tab === 'Milk' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Milk Production &amp; Revenue — Last 12 Months</h2>
            {milk.isLoading ? <p className="text-sm text-gray-400 text-center py-12">Loading…</p> :
             milk.data?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={milk.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tickFormatter={m => m.slice(5)} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit="L" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any, name: string) => [name === 'revenue' ? fmt(v) : `${v}L`, name === 'liters' ? 'Liters' : name === 'revenue' ? 'Revenue' : 'Avg Daily']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="liters" fill="#16a34a" name="liters" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="revenue" />
                  <Line yAxisId="left" type="monotone" dataKey="avg_daily" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="avg_daily" strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No milk production data</div>}
          </div>

          {milk.data?.length ? (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Month', 'Liters', 'Avg Daily (L)', 'Revenue (PKR)'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...milk.data].reverse().map((row: any) => (
                      <tr key={row.month} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-700">{row.month}</td>
                        <td className="px-4 py-2">{row.liters.toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2">{row.avg_daily}</td>
                        <td className="px-4 py-2">{row.revenue.toLocaleString('en-PK')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* ── Customer Breakdown ───────────────────────── */}
          {milkByCustomer.isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading customer data…</p>
          ) : milkByCustomer.data?.length ? (
            <div className="space-y-4">
              {/* Bar chart — top customers by revenue */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Top Customers by Revenue — Last 12 Months
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={milkByCustomer.data.slice(0, 10)} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="customer_name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: any) => [`PKR ${Number(v).toLocaleString('en-PK')}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]}>
                      {milkByCustomer.data.slice(0, 10).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Customer breakdown table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Sales by Customer</h2>
                  <span className="text-xs text-gray-400">{milkByCustomer.data.length} customer{milkByCustomer.data.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['#', 'Customer', 'Liters', 'Revenue (PKR)', 'Transactions', 'Avg Price/L'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {milkByCustomer.data.map((row: any, i: number) => {
                        const totalRevenue = milkByCustomer.data.reduce((s: number, r: any) => s + r.revenue, 0)
                        const pct = totalRevenue > 0 ? (row.revenue / totalRevenue * 100).toFixed(1) : '0'
                        return (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2">
                              <div className="font-medium text-gray-800">{row.customer_name}</div>
                              <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                                <div className="bg-green-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{pct}% of total</div>
                            </td>
                            <td className="px-4 py-2 font-medium">{row.liters.toLocaleString('en-PK')} L</td>
                            <td className="px-4 py-2 font-bold text-green-700">{row.revenue.toLocaleString('en-PK')}</td>
                            <td className="px-4 py-2 text-center">{row.transactions}</td>
                            <td className="px-4 py-2 text-gray-600">PKR {row.avg_price_per_liter}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 font-bold">
                          {milkByCustomer.data.reduce((s: number, r: any) => s + r.liters, 0).toLocaleString('en-PK')} L
                        </td>
                        <td className="px-4 py-2 font-bold text-green-700">
                          {milkByCustomer.data.reduce((s: number, r: any) => s + r.revenue, 0).toLocaleString('en-PK')}
                        </td>
                        <td className="px-4 py-2 font-bold text-center">
                          {milkByCustomer.data.reduce((s: number, r: any) => s + r.transactions, 0)}
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-10 text-gray-400 text-sm">
              No milk sales recorded in the last 12 months
            </div>
          )}
        </div>
      )}

      {/* ── CASH FLOW ─────────────────────────────────────────── */}
      {tab === 'Cash Flow' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Income vs Expenses vs Net — Last 6 Months</h2>
            {cashFlow.isLoading ? <p className="text-sm text-gray-400 text-center py-12">Loading…</p> :
             cashFlow.data?.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={cashFlow.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => [fmt(v)]} />
                  <Legend />
                  <Bar dataKey="income" fill="#16a34a" name="Income" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Net" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>}
          </div>

          {cashFlow.data?.length ? (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Monthly Cash Flow Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Month', 'Income (PKR)', 'Expenses (PKR)', 'Net (PKR)'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...cashFlow.data].reverse().map((row: any) => (
                      <tr key={row.month} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-700">{row.month}</td>
                        <td className="px-4 py-2 text-green-700">{row.income.toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2 text-red-600">{row.expenses.toLocaleString('en-PK')}</td>
                        <td className={`px-4 py-2 font-semibold ${row.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {row.net.toLocaleString('en-PK')}
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

      {/* ── FARM HEALTH ─────────────────────────────────────────── */}
      {tab === 'Farm Health' && (
        <div className="space-y-6">
          {farmHealth.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : farmHealth.data ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Vaccination Compliance (YTD)</p>
                  <p className={`text-3xl font-bold ${farmHealth.data.overall_stats.vaccination_compliance_pct >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                    {farmHealth.data.overall_stats.vaccination_compliance_pct}%
                  </p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Avg Monthly Treatments</p>
                  <p className="text-3xl font-bold text-gray-900">{farmHealth.data.overall_stats.avg_monthly_treatments}</p>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Health Activity — Last 6 Months</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={farmHealth.data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tickFormatter={m => m.slice(5)} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="vaccinations" fill="#16a34a" name="Vaccinations" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="treatments" fill="#ef4444" name="Treatments" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="breeding_attempts" fill="#8b5cf6" name="Breeding" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── ANIMALS ─────────────────────────────────────────── */}
      {tab === 'Animals' && (
        <div className="space-y-6">
          {animals.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : animals.data?.length ? (
            <>
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Animals by Estimated Profit (Last 12 Months)</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={animals.data.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="animal_code" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(v: any) => [fmt(v)]} />
                    <Bar dataKey="estimated_profit" fill="#16a34a" name="Est. Profit" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">Animal Profitability Table</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Code', 'Name', 'Species', 'Breed', 'Milk Revenue', 'Treatment Cost', 'Vaccination Cost', 'Est. Profit'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {animals.data.map((row: any) => (
                        <tr key={row.animal_id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.animal_code}</td>
                          <td className="px-4 py-2 font-medium text-gray-800">{row.name || '—'}</td>
                          <td className="px-4 py-2 capitalize text-gray-600">{row.species}</td>
                          <td className="px-4 py-2 text-gray-600">{row.breed || '—'}</td>
                          <td className="px-4 py-2 text-green-700">{row.milk_revenue.toLocaleString('en-PK')}</td>
                          <td className="px-4 py-2 text-red-600">{row.treatment_cost.toLocaleString('en-PK')}</td>
                          <td className="px-4 py-2 text-amber-600">{row.vaccination_cost.toLocaleString('en-PK')}</td>
                          <td className={`px-4 py-2 font-semibold ${row.estimated_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {row.estimated_profit.toLocaleString('en-PK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <div className="card p-8 text-center text-gray-400 text-sm">No animal data</div>}
        </div>
      )}

      {/* ── INVENTORY ─────────────────────────────────────────── */}
      {tab === 'Inventory' && (
        <div className="space-y-6">
          {inventory.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : inventory.data ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low stock */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Low Stock Alerts</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inventory.data.low_stock_count > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {inventory.data.low_stock_count}
                    </span>
                  </div>
                  {inventory.data.low_stock_items?.length ? (
                    <div className="divide-y divide-gray-50">
                      {inventory.data.low_stock_items.map((item: any) => (
                        <div key={item.product_name} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                            <p className="text-xs text-gray-400">Min: {item.min_stock_level}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">{item.current_stock}</p>
                            <p className="text-xs text-red-400">Deficit: {item.deficit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-6 text-sm text-green-600 text-center">All products above minimum stock</p>
                  )}
                </div>

                {/* Top consumed */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Consumed Products (Last 30 Days)</h2>
                  {inventory.data.top_consumed?.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={inventory.data.top_consumed} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={110} />
                        <Tooltip />
                        <Bar dataKey="quantity_used" fill="#3b82f6" name="Qty Used" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No transactions</div>}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── INVESTORS ─────────────────────────────────────────── */}
      {tab === 'Investors' && (
        <div className="space-y-6">
          {investors.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : investors.data ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Capital Deployed</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(investors.data.total_capital)}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Distributed</p>
                  <p className="text-xl font-bold text-green-700">{fmt(investors.data.total_distributed)}</p>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Distributions — Last 6 Months</h2>
                {investors.data.monthly_distributions?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={investors.data.monthly_distributions}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tickFormatter={m => m.slice(5)} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: any) => [fmt(v)]} />
                      <Bar dataKey="total_distributed" fill="#8b5cf6" name="Distributed" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No distributions</div>}
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">Investor Performance</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Investor', 'Total Capital (PKR)', 'Total Distributed (PKR)', 'ROI %'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {investors.data.investors.map((inv: any) => (
                        <tr key={inv.investor_id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">{inv.name}</td>
                          <td className="px-4 py-2">{inv.total_capital.toLocaleString('en-PK')}</td>
                          <td className="px-4 py-2 text-green-700">{inv.total_distributed.toLocaleString('en-PK')}</td>
                          <td className={`px-4 py-2 font-semibold ${inv.roi_pct >= 10 ? 'text-green-700' : inv.roi_pct >= 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {inv.roi_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── CUSTOMERS ─────────────────────────────────────────── */}
      {tab === 'Customers' && (
        <div className="space-y-6">
          {customers.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : customers.data ? (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Active Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{customers.data.total_active}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">New This Month</p>
                  <p className="text-2xl font-bold text-green-700">{customers.data.new_this_month}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">At Risk</p>
                  <p className={`text-2xl font-bold ${customers.data.at_risk > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{customers.data.at_risk}</p>
                  <p className="text-xs text-gray-400 mt-0.5">no purchase in 30+ days</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Inactive</p>
                  <p className="text-2xl font-bold text-gray-400">{customers.data.total_inactive}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Acquisition trend */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Customer Acquisition — Last 6 Months</h2>
                  {customers.data.acquisition_trend?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={customers.data.acquisition_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(5)} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip formatter={(v: any) => [v, 'New Customers']} />
                        <Bar dataKey="new_customers" fill="#16a34a" name="New Customers" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>}
                </div>

                {/* Revenue by category */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Customers by Category</h2>
                  {customers.data.by_category?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={customers.data.by_category}
                          dataKey="count"
                          nameKey="category"
                          cx="50%" cy="50%"
                          outerRadius={80}
                          label={({ category, count }: any) => `${category}: ${count}`}
                        >
                          {customers.data.by_category.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No categories</div>}
                </div>
              </div>

              {/* Leaderboard */}
              {customers.data.leaderboard?.length ? (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Customer Leaderboard</h2>
                    <span className="text-xs text-gray-400">{customers.data.leaderboard.length} customers</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['#', 'Customer', 'Category', 'Status', 'Total Revenue (PKR)', 'Liters', 'Transactions', 'Last Purchase'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customers.data.leaderboard.map((c: any, i: number) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                            <td className="px-4 py-2 text-gray-500 text-xs">{c.category || '—'}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                c.status === 'active' ? 'bg-green-100 text-green-700'
                                : c.status === 'new' ? 'bg-blue-100 text-blue-700'
                                : c.status === 'at_risk' ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                              }`}>{c.status}</span>
                            </td>
                            <td className="px-4 py-2 font-bold text-green-700">{Number(c.total_revenue).toLocaleString('en-PK')}</td>
                            <td className="px-4 py-2">{Number(c.total_liters).toFixed(1)} L</td>
                            <td className="px-4 py-2 text-center">{c.transaction_count}</td>
                            <td className="px-4 py-2 text-xs text-gray-500">{c.last_purchase || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : <div className="card p-8 text-center text-gray-400 text-sm">No customer data</div>}
        </div>
      )}

      {/* ── PALLAI ─────────────────────────────────────────── */}
      {tab === 'Pallai' && (
        <div className="space-y-6">
          {pallai.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : pallai.data ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-900">{pallai.data.active_subscriptions}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Monthly Revenue Target</p>
                  <p className="text-2xl font-bold text-green-700">{fmt(pallai.data.monthly_revenue_target)}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Collection Rate</p>
                  <p className={`text-2xl font-bold ${pallai.data.collection_rate >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                    {pallai.data.collection_rate}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subscriptions by package */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Subscriptions by Package</h2>
                  {pallai.data.subscriptions_by_package?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pallai.data.subscriptions_by_package}
                          dataKey="count"
                          nameKey="package_name"
                          cx="50%" cy="50%"
                          outerRadius={80}
                          label={({ package_name, count }: any) => `${package_name}: ${count}`}
                        >
                          {pallai.data.subscriptions_by_package.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No subscriptions</div>}
                </div>

                {/* Monthly billing */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Billing vs Collection — Last 6 Months</h2>
                  {pallai.data.monthly_billing?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={pallai.data.monthly_billing}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={m => m.slice(5)} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v: any) => [fmt(v)]} />
                        <Legend />
                        <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="collected" fill="#16a34a" name="Collected" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No billing data</div>}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </DashboardLayout>
  )
}
