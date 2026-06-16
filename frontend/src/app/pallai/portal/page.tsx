'use client'
import { useQuery } from '@tanstack/react-query'
import { pallaiAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/store/authStore'

export default function PallaiPortalPage() {
  const { user } = useAuthStore()
  const { data: me, isLoading: loadingMe } = useQuery({ queryKey: ['portal-me'], queryFn: () => pallaiAPI.portalMe().then(r => r.data.data) })
  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({ queryKey: ['portal-subs'], queryFn: () => pallaiAPI.portalSubscriptions().then(r => r.data.data) })
  const { data: invoices = [] } = useQuery({ queryKey: ['portal-invoices'], queryFn: () => pallaiAPI.portalInvoices().then(r => r.data.data) })
  const { data: myAnimals = [] } = useQuery({ queryKey: ['portal-animals'], queryFn: () => pallaiAPI.portalAnimals().then(r => r.data.data) })

  if (loadingMe) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="text-gray-400">Loading your portal...</div></div></DashboardLayout>

  const unpaidInvoices = (invoices as any[]).filter((i: any) => i.status !== 'paid')
  const totalDue = unpaidInvoices.reduce((sum: number, i: any) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0)

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Pallai Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome, {user?.full_name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-2xl font-bold text-green-700">{(subscriptions as any[]).filter((s: any) => s.is_active).length}</div>
          <div className="text-sm text-gray-500 mt-1">Active Subscriptions</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-gray-900">{(myAnimals as any[]).length}</div>
          <div className="text-sm text-gray-500 mt-1">My Animals</div>
        </div>
        <div className="card p-5">
          <div className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>PKR {totalDue.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Outstanding Balance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Subscriptions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">My Subscriptions</h2>
          {loadingSubs ? <div className="text-gray-400 text-sm">Loading...</div> :
            (subscriptions as any[]).length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">No subscriptions yet</div> :
            <div className="space-y-3">
              {(subscriptions as any[]).map((s: any) => (
                <div key={s.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{s.animal_name || 'Animal'}</div>
                      <div className="text-sm text-gray-500">{s.package_name}</div>
                      <div className="text-xs text-gray-400 mt-1">Since {s.start_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-700">PKR {Number(s.monthly_fee || 0).toLocaleString()}/mo</div>
                      <span className={s.is_active ? 'badge-active text-xs' : 'badge-inactive text-xs'}>{s.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* My Animals */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">My Animals</h2>
          {(myAnimals as any[]).length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">No animals found</div> :
            <div className="space-y-3">
              {(myAnimals as any[]).map((a: any) => (
                <div key={a.id} className="flex items-center gap-4 border border-gray-100 rounded-lg p-3">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">🐐</div>
                  <div>
                    <div className="font-medium text-gray-900">{a.animal_code}</div>
                    <div className="text-sm text-gray-500">{a.name || a.breed}</div>
                    <div className="text-xs text-gray-400">{a.gender} · {a.breed}</div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Outstanding Invoices */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Invoices</h2>
          {(invoices as any[]).length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">No invoices yet</div> :
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">{['Invoice #','Issue Date','Due Date','Amount','Paid','Status'].map(h => <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {(invoices as any[]).map((i: any) => (
                  <tr key={i.id} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{i.invoice_number}</td>
                    <td className="py-2 px-3 text-gray-500">{i.issue_date}</td>
                    <td className="py-2 px-3 text-gray-500">{i.due_date || '—'}</td>
                    <td className="py-2 px-3 font-medium">PKR {Number(i.total_amount).toLocaleString()}</td>
                    <td className="py-2 px-3 text-green-700">PKR {Number(i.paid_amount || 0).toLocaleString()}</td>
                    <td className="py-2 px-3"><span className={i.status === 'paid' ? 'badge-active' : i.status === 'overdue' ? 'badge-inactive' : 'badge-info'}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      </div>
    </DashboardLayout>
  )
}
