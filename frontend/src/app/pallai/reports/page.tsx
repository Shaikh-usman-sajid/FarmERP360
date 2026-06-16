'use client'
import { useQuery } from '@tanstack/react-query'
import { pallaiAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function PallaiReportsPage() {
  const { data: summary } = useQuery({ queryKey: ['pallai-summary'], queryFn: () => pallaiAPI.reportSummary().then(r => r.data.data) })
  const { data: revenue = [] } = useQuery({ queryKey: ['pallai-revenue'], queryFn: () => pallaiAPI.reportRevenue(6).then(r => r.data.data) })
  const { data: subscriptions = [] } = useQuery({ queryKey: ['pallai-subscriptions'], queryFn: () => pallaiAPI.listSubscriptions().then(r => r.data.data) })

  const maxRevenue = Math.max(...(revenue as any[]).map((r: any) => Number(r.invoiced || 0)), 1)

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Pallai Reports</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-2xl font-bold text-gray-900">{summary?.total_customers ?? '—'}</div>
          <div className="text-sm text-gray-500 mt-1">Total Customers</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-green-700">{summary?.active_subscriptions ?? '—'}</div>
          <div className="text-sm text-gray-500 mt-1">Active Subscriptions</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-blue-700">PKR {Number(summary?.monthly_revenue ?? 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Monthly Revenue</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-red-600">PKR {Number(summary?.outstanding_balance ?? 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Outstanding</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue — Last 6 Months</h3>
          {(revenue as any[]).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
          ) : (
            <div className="space-y-3">
              {(revenue as any[]).map((r: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{r.month}</span>
                    <span>PKR {Number(r.invoiced || 0).toLocaleString()} invoiced · PKR {Number(r.collected || 0).toLocaleString()} collected</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div className="bg-blue-200 rounded transition-all" style={{ width: `${(Number(r.invoiced || 0) / maxRevenue) * 100}%`, minWidth: '4px' }} title="Invoiced" />
                    <div className="bg-green-400 rounded transition-all" style={{ width: `${(Number(r.collected || 0) / maxRevenue) * 100}%`, minWidth: '2px' }} title="Collected" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-200 rounded" /> Invoiced</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded" /> Collected</div>
          </div>
        </div>

        {/* Subscription breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription Breakdown</h3>
          {(subscriptions as any[]).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No subscriptions yet</div>
          ) : (() => {
            const byPackage: Record<string, { count: number, revenue: number }> = {}
            ;(subscriptions as any[]).forEach((s: any) => {
              const pkg = s.package_name || 'Unknown'
              if (!byPackage[pkg]) byPackage[pkg] = { count: 0, revenue: 0 }
              byPackage[pkg].count++
              if (s.is_active) byPackage[pkg].revenue += Number(s.monthly_fee || 0)
            })
            return (
              <div className="space-y-3">
                {Object.entries(byPackage).map(([pkg, data]) => (
                  <div key={pkg} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{pkg}</div>
                      <div className="text-xs text-gray-400">{data.count} subscription{data.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-700 text-sm">PKR {data.revenue.toLocaleString()}/mo</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Active subscriptions list */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">All Active Subscriptions</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Customer','Animal','Package','Start Date','Monthly Fee','Status'].map(h => <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(subscriptions as any[]).filter((s: any) => s.is_active).map((s: any) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{s.customer_name || '—'}</td>
                  <td className="py-2 px-3 text-gray-600">{s.animal_name || '—'}</td>
                  <td className="py-2 px-3 text-gray-600">{s.package_name || '—'}</td>
                  <td className="py-2 px-3 text-gray-500">{s.start_date}</td>
                  <td className="py-2 px-3 font-medium text-green-700">PKR {Number(s.monthly_fee || 0).toLocaleString()}</td>
                  <td className="py-2 px-3"><span className="badge-active">Active</span></td>
                </tr>
              ))}
              {!(subscriptions as any[]).some((s: any) => s.is_active) && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No active subscriptions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
