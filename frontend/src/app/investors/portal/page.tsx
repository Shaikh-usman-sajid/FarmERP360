'use client'
import { useQuery } from '@tanstack/react-query'
import { investorsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/store/authStore'

export default function InvestorPortalPage() {
  const { user } = useAuthStore()
  const { data: me, isLoading } = useQuery({ queryKey: ['investor-portal-me'], queryFn: () => investorsAPI.portalMe().then(r => r.data.data) })
  const { data: portfolio = [] } = useQuery({ queryKey: ['investor-portal-portfolio'], queryFn: () => investorsAPI.portalPortfolio().then(r => r.data.data) })
  const { data: distributions = [] } = useQuery({ queryKey: ['investor-portal-dist'], queryFn: () => investorsAPI.portalDistributions().then(r => r.data.data) })
  const { data: capital = [] } = useQuery({ queryKey: ['investor-portal-capital'], queryFn: () => investorsAPI.portalCapital().then(r => r.data.data) })

  const profile = me as any

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-64 text-gray-400">Loading your portal...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Investor Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome, {user?.full_name}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-2xl font-bold text-purple-700">PKR {Number(profile?.total_capital ?? 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Total Invested</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-green-700">PKR {Number(profile?.total_distributed ?? 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Total Received</div>
        </div>
        <div className="card p-5">
          <div className={`text-2xl font-bold ${(profile?.roi_percentage ?? 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{profile?.roi_percentage ?? 0}%</div>
          <div className="text-sm text-gray-500 mt-1">ROI</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-gray-900">{(portfolio as any[]).length}</div>
          <div className="text-sm text-gray-500 mt-1">Animals in Portfolio</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">My Portfolio</h2>
          {(portfolio as any[]).length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">No animals in portfolio yet</div> :
            <div className="space-y-3">
              {(portfolio as any[]).map((a: any) => (
                <div key={a.animal_id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-xl">🐐</div>
                    <div>
                      <div className="font-medium text-gray-900">{a.animal_code}</div>
                      <div className="text-xs text-gray-500">{a.name || a.breed} · {a.species}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-700">{a.ownership_percentage}%</div>
                    <div className="text-xs text-gray-400">ownership</div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Investor Profile */}
        {profile && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">My Profile</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Full Name</span>
                <span className="font-medium">{profile.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{profile.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{profile.email || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Profit Share</span>
                <span className="font-bold text-purple-700">{profile.profit_share_percentage}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Net Position</span>
                <span className={`font-bold ${(profile.net_position ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>PKR {Number(profile.net_position ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Distributions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Profit Distributions ({(distributions as any[]).length})</h2>
          {(distributions as any[]).length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">No distributions yet</div> :
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(distributions as any[]).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{d.distribution_date}</div>
                    <div className="text-xs text-gray-400">{d.period ? `Period: ${d.period}` : d.distribution_type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700">PKR {Number(d.amount).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{d.distribution_type}</div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Capital Contributions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Capital Contributions ({(capital as any[]).length})</h2>
          {(capital as any[]).length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">No contributions yet</div> :
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(capital as any[]).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{c.contribution_date}</div>
                    <div className="text-xs text-gray-400">{c.type} {c.notes ? `· ${c.notes}` : ''}</div>
                  </div>
                  <div className={`font-bold ${c.type === 'deposit' ? 'text-blue-700' : 'text-red-600'}`}>
                    {c.type === 'deposit' ? '+' : '-'}PKR {Number(c.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </DashboardLayout>
  )
}
