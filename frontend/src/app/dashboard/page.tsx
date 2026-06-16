'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/store/authStore'

function StatCard({ icon, label, value, sub, color = 'green' }: any) {
  const colors: any = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => dashboardAPI.owner().then(r => r.data.data),
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dashboardAPI.notifications().then(r => r.data.data),
  })

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    </DashboardLayout>
  )

  const trend = data?.milk_trend_7days || []

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.full_name?.split(' ')[0]} 👋</p>
        </div>
        <div className="text-sm text-gray-400">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🐐" label="Total Animals" value={data?.total_animals ?? '-'} sub={`${data?.active_animals ?? 0} active`} color="green" />
        <StatCard icon="🥛" label="Milk Today" value={`${(data?.milk_today_liters ?? 0).toFixed(1)}L`} sub={`${(data?.milk_this_month_liters ?? 0).toFixed(0)}L this month`} color="blue" />
        <StatCard icon="💰" label="Revenue (Month)" value={`PKR ${Number(data?.revenue_this_month ?? 0).toLocaleString()}`} color="green" />
        <StatCard icon="📈" label="Investors" value={data?.total_investors ?? '-'} sub={`PKR ${Number(data?.total_investor_capital ?? 0).toLocaleString()} capital`} color="purple" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🧾" label="Pending Invoices" value={data?.pending_invoices ?? 0} color="amber" />
        <StatCard icon="📦" label="Low Stock Items" value={data?.low_stock_items ?? 0} color="red" />
        <StatCard icon="💉" label="Vaccinations Due" value={data?.vaccinations_due_soon ?? 0} sub="within 7 days" color="amber" />
        <StatCard icon="💵" label="Capital Invested" value={`PKR ${Number(data?.total_investor_capital ?? 0).toLocaleString()}`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Milk Trend Chart */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Milk Production — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} unit="L" />
              <Tooltip formatter={(v: any) => [`${v}L`, 'Production']} />
              <Line type="monotone" dataKey="liters" stroke="#16a34a" strokeWidth={2.5} dot={{ fill: '#16a34a', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Notifications
            {(notifications?.unread ?? 0) > 0 && (
              <span className="ml-2 badge-danger">{notifications?.unread}</span>
            )}
          </h2>
          <div className="space-y-3">
            {(notifications?.items ?? []).slice(0, 5).map((n: any) => (
              <div key={n.id} className={`p-3 rounded-lg border text-sm ${!n.is_read ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="font-medium text-gray-800">{n.title}</div>
                <div className="text-gray-500 text-xs mt-0.5">{n.message}</div>
              </div>
            ))}
            {(notifications?.items ?? []).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No notifications</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🐐', label: 'Add Animal', href: '/animals' },
            { icon: '🥛', label: 'Record Milk', href: '/milk' },
            { icon: '💉', label: 'Add Vaccination', href: '/vaccination' },
            { icon: '📦', label: 'Stock Update', href: '/inventory' },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex flex-col items-center p-4 bg-gray-50 hover:bg-green-50 rounded-xl border border-gray-200 hover:border-green-300 transition-all text-center">
              <span className="text-2xl mb-2">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
