'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { investorsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'

const TABS = ['Overview', 'Investors', 'Distributions', 'Reports']

export default function InvestorsPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [showAddInvestor, setShowAddInvestor] = useState(false)
  const [showAddCapital, setShowAddCapital] = useState(false)
  const [showAddDistribution, setShowAddDistribution] = useState(false)
  const [selectedInvestorId, setSelectedInvestorId] = useState('')
  const [investorForm, setInvestorForm] = useState({ full_name: '', phone: '', email: '', cnic: '', address: '', profit_share_percentage: '33.33' })
  const [capitalForm, setCapitalForm] = useState({ investor_id: '', amount: '', contribution_date: '', type: 'deposit', notes: '' })
  const [distForm, setDistForm] = useState({ investor_id: '', amount: '', distribution_date: '', period: '', distribution_type: 'profit', notes: '' })
  const qc = useQueryClient()

  const { data: summaryData } = useQuery({ queryKey: ['investors-summary'], queryFn: () => investorsAPI.getSummary().then(r => r.data.data) })
  const { data: investors = [] } = useQuery({ queryKey: ['investors'], queryFn: () => investorsAPI.list().then(r => r.data.data) })
  const { data: distributions = [] } = useQuery({ queryKey: ['distributions'], queryFn: () => investorsAPI.listDistributions().then(r => r.data.data) })

  const addInvestor = useMutation({
    mutationFn: (data: object) => investorsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investors'] }); qc.invalidateQueries({ queryKey: ['investors-summary'] }); setShowAddInvestor(false); setInvestorForm({ full_name: '', phone: '', email: '', cnic: '', address: '', profit_share_percentage: '33.33' }) }
  })
  const addCapital = useMutation({
    mutationFn: (data: object) => investorsAPI.addCapital(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investors'] }); qc.invalidateQueries({ queryKey: ['investors-summary'] }); setShowAddCapital(false) }
  })
  const addDist = useMutation({
    mutationFn: (data: object) => investorsAPI.createDistribution(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distributions'] }); qc.invalidateQueries({ queryKey: ['investors-summary'] }); setShowAddDistribution(false) }
  })

  const summary = summaryData as any

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Investor Management</h1>
        <div className="flex items-center gap-2">
          <ExportButtons
            columns={[
              { header: 'Name', key: 'name' },
              { header: 'CNIC', key: 'cnic' },
              { header: 'Phone', key: 'phone' },
              { header: 'Profit Share %', key: 'profit_share' },
              { header: 'Total Capital (PKR)', key: 'total_capital' },
              { header: 'Total Distributed (PKR)', key: 'total_distributed' },
            ]}
            rows={(investors as any[]).map((inv: any) => {
              const summaryRow = (summary?.investors ?? []).find((s: any) => s.investor_id === inv.id)
              return {
                name: inv.full_name,
                cnic: inv.cnic || '',
                phone: inv.phone || '',
                profit_share: inv.profit_share_percentage,
                total_capital: inv.total_capital ? Number(inv.total_capital) : 0,
                total_distributed: summaryRow ? Number(summaryRow.total_distributed) : 0,
              }
            })}
            filename="farmerp360-investors"
            title="Investors"
          />
          {activeTab === 'Investors' && <button className="btn-primary" onClick={() => setShowAddInvestor(true)}>+ Add Investor</button>}
          {activeTab === 'Investors' && <button className="btn-secondary" onClick={() => setShowAddCapital(true)}>+ Capital</button>}
          {activeTab === 'Distributions' && <button className="btn-primary" onClick={() => setShowAddDistribution(true)}>+ Distribution</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5"><div className="text-2xl font-bold text-gray-900">{summary?.investor_count ?? '—'}</div><div className="text-sm text-gray-500 mt-1">Active Investors</div></div>
            <div className="card p-5"><div className="text-2xl font-bold text-purple-700">PKR {Number(summary?.total_capital ?? 0).toLocaleString()}</div><div className="text-sm text-gray-500 mt-1">Total Capital</div></div>
            <div className="card p-5"><div className="text-2xl font-bold text-green-700">PKR {Number(summary?.total_distributed ?? 0).toLocaleString()}</div><div className="text-sm text-gray-500 mt-1">Total Distributed</div></div>
            <div className="card p-5"><div className="text-2xl font-bold text-blue-700">PKR {Number((summary?.total_distributed ?? 0) - (summary?.total_capital ?? 0)).toLocaleString()}</div><div className="text-sm text-gray-500 mt-1">Net Position</div></div>
          </div>
          {summary?.investors?.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Investor Summary</div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">{['Investor','Profit Share %','Capital Invested','Distributed','ROI %','Net Position','Animals'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody>
                  {summary.investors.map((row: any) => (
                    <tr key={row.investor_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{row.full_name}</td>
                      <td className="py-3 px-4 text-purple-700 font-semibold">{row.profit_share_percentage}%</td>
                      <td className="py-3 px-4">PKR {Number(row.total_invested).toLocaleString()}</td>
                      <td className="py-3 px-4 text-green-700">PKR {Number(row.total_distributed).toLocaleString()}</td>
                      <td className="py-3 px-4"><span className={row.roi_percentage >= 0 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>{row.roi_percentage}%</span></td>
                      <td className={`py-3 px-4 font-semibold ${row.net_position >= 0 ? 'text-green-700' : 'text-red-600'}`}>PKR {Number(row.net_position).toLocaleString()}</td>
                      <td className="py-3 px-4">{row.active_animals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Investors */}
      {activeTab === 'Investors' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(investors as any[]).map((inv: any) => (
            <div key={inv.id} className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-xl">{inv.full_name[0]}</div>
                <div>
                  <div className="font-bold text-gray-900">{inv.full_name}</div>
                  <div className="text-sm text-gray-500">{inv.email || inv.phone || '—'}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Profit Share</span><span className="font-semibold text-purple-700">{inv.profit_share_percentage}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Capital</span><span className="font-bold">PKR {Number(inv.total_capital).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={inv.is_active ? 'badge-active' : 'badge-inactive'}>{inv.is_active ? 'Active' : 'Inactive'}</span></div>
              </div>
              <button className="w-full mt-3 text-xs text-purple-600 hover:text-purple-800 font-medium" onClick={() => { setCapitalForm(f => ({...f, investor_id: inv.id})); setShowAddCapital(true) }}>+ Add Capital</button>
            </div>
          ))}
          {!(investors as any[]).length && <div className="col-span-3 card p-12 text-center text-gray-400">No investors yet</div>}
        </div>
      )}

      {/* Distributions */}
      {activeTab === 'Distributions' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Investor','Date','Period','Amount','Type','Notes'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(distributions as any[]).map((d: any) => {
                const inv = (investors as any[]).find((i: any) => i.id === d.investor_id)
                return (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{inv?.full_name || d.investor_id.slice(0,8)}</td>
                    <td className="py-3 px-4 text-gray-500">{d.distribution_date}</td>
                    <td className="py-3 px-4 text-gray-500">{d.period || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-green-700">PKR {Number(d.amount).toLocaleString()}</td>
                    <td className="py-3 px-4"><span className="badge-info">{d.distribution_type}</span></td>
                    <td className="py-3 px-4 text-gray-500">{d.notes || '—'}</td>
                  </tr>
                )
              })}
              {!(distributions as any[]).length && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No distributions recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Reports */}
      {activeTab === 'Reports' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">ROI by Investor</h3>
            {!(investors as any[]).length ? <div className="text-gray-400 text-sm">No investors yet</div> :
              <div className="space-y-4">
                {(summary?.investors ?? []).map((row: any) => (
                  <div key={row.investor_id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{row.full_name}</span>
                      <span className={`text-sm font-bold ${row.roi_percentage >= 0 ? 'text-green-700' : 'text-red-600'}`}>{row.roi_percentage}% ROI</span>
                    </div>
                    <div className="flex gap-1 h-5">
                      <div className="bg-purple-200 rounded transition-all" style={{ width: row.total_invested > 0 ? '100%' : '4px', minWidth: '4px' }} title={`Capital: PKR ${Number(row.total_invested).toLocaleString()}`} />
                    </div>
                    <div className="flex gap-1 h-5 mt-0.5">
                      <div className="bg-green-400 rounded transition-all" style={{ width: row.total_invested > 0 ? `${Math.min((row.total_distributed / row.total_invested) * 100, 200)}%` : '0%', minWidth: row.total_distributed > 0 ? '4px' : '0' }} title={`Distributed: PKR ${Number(row.total_distributed).toLocaleString()}`} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400 mt-1">
                      <span>Invested: PKR {Number(row.total_invested).toLocaleString()}</span>
                      <span>Distributed: PKR {Number(row.total_distributed).toLocaleString()}</span>
                      <span className={row.net_position >= 0 ? 'text-green-600' : 'text-red-600'}>Net: PKR {Number(row.net_position).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            }
            <div className="flex gap-4 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-200 rounded" /> Capital Invested</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded" /> Distributed</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Investor Modal */}
      {showAddInvestor && (
        <div className="modal-overlay" onClick={() => setShowAddInvestor(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Add Investor</h3>
            <div className="space-y-3">
              <input className="form-input" placeholder="Full Name *" value={investorForm.full_name} onChange={e => setInvestorForm(f => ({...f, full_name: e.target.value}))} />
              <input className="form-input" placeholder="Phone" value={investorForm.phone} onChange={e => setInvestorForm(f => ({...f, phone: e.target.value}))} />
              <input className="form-input" placeholder="Email" value={investorForm.email} onChange={e => setInvestorForm(f => ({...f, email: e.target.value}))} />
              <input className="form-input" placeholder="CNIC" value={investorForm.cnic} onChange={e => setInvestorForm(f => ({...f, cnic: e.target.value}))} />
              <input className="form-input" placeholder="Profit Share %" type="number" step="0.01" value={investorForm.profit_share_percentage} onChange={e => setInvestorForm(f => ({...f, profit_share_percentage: e.target.value}))} />
              <textarea className="form-input" placeholder="Address" rows={2} value={investorForm.address} onChange={e => setInvestorForm(f => ({...f, address: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => addInvestor.mutate({...investorForm, profit_share_percentage: Number(investorForm.profit_share_percentage)})} disabled={!investorForm.full_name || addInvestor.isPending}>
                {addInvestor.isPending ? 'Saving...' : 'Add Investor'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddInvestor(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Capital Modal */}
      {showAddCapital && (
        <div className="modal-overlay" onClick={() => setShowAddCapital(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Add Capital Contribution</h3>
            <div className="space-y-3">
              <select className="form-input" value={capitalForm.investor_id} onChange={e => setCapitalForm(f => ({...f, investor_id: e.target.value}))}>
                <option value="">Select Investor *</option>
                {(investors as any[]).map((i: any) => <option key={i.id} value={i.id}>{i.full_name}</option>)}
              </select>
              <input className="form-input" placeholder="Amount (PKR) *" type="number" value={capitalForm.amount} onChange={e => setCapitalForm(f => ({...f, amount: e.target.value}))} />
              <input className="form-input" type="date" value={capitalForm.contribution_date} onChange={e => setCapitalForm(f => ({...f, contribution_date: e.target.value}))} />
              <select className="form-input" value={capitalForm.type} onChange={e => setCapitalForm(f => ({...f, type: e.target.value}))}>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
              <input className="form-input" placeholder="Notes" value={capitalForm.notes} onChange={e => setCapitalForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => addCapital.mutate({...capitalForm, amount: Number(capitalForm.amount)})} disabled={!capitalForm.investor_id || !capitalForm.amount || !capitalForm.contribution_date || addCapital.isPending}>
                {addCapital.isPending ? 'Saving...' : 'Add Capital'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddCapital(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Distribution Modal */}
      {showAddDistribution && (
        <div className="modal-overlay" onClick={() => setShowAddDistribution(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Record Profit Distribution</h3>
            <div className="space-y-3">
              <select className="form-input" value={distForm.investor_id} onChange={e => setDistForm(f => ({...f, investor_id: e.target.value}))}>
                <option value="">Select Investor *</option>
                {(investors as any[]).map((i: any) => <option key={i.id} value={i.id}>{i.full_name}</option>)}
              </select>
              <input className="form-input" placeholder="Amount (PKR) *" type="number" value={distForm.amount} onChange={e => setDistForm(f => ({...f, amount: e.target.value}))} />
              <input className="form-input" type="date" value={distForm.distribution_date} onChange={e => setDistForm(f => ({...f, distribution_date: e.target.value}))} />
              <input className="form-input" placeholder="Period (YYYY-MM, optional)" value={distForm.period} onChange={e => setDistForm(f => ({...f, period: e.target.value}))} />
              <select className="form-input" value={distForm.distribution_type} onChange={e => setDistForm(f => ({...f, distribution_type: e.target.value}))}>
                <option value="profit">Profit Share</option>
                <option value="dividend">Dividend</option>
                <option value="return">Capital Return</option>
              </select>
              <input className="form-input" placeholder="Notes" value={distForm.notes} onChange={e => setDistForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => addDist.mutate({...distForm, amount: Number(distForm.amount)})} disabled={!distForm.investor_id || !distForm.amount || !distForm.distribution_date || addDist.isPending}>
                {addDist.isPending ? 'Saving...' : 'Record Distribution'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddDistribution(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
