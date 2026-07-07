'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedAPI, animalsAPI, inventoryAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TABS = ['Overview', 'Feed Types', 'Record Consumption', 'Stock History', 'Consumption Log'] as const
type Tab = typeof TABS[number]

const SPECIES = ['goat', 'buffalo', 'cattle', 'other']
const SESSIONS = ['morning', 'evening', 'both']

const today = () => new Date().toISOString().split('T')[0]

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const qc = useQueryClient()

  // ─── Feed Types filters ────────────────────────────────────
  const [ftSearch, setFtSearch] = useState('')
  const [ftStatus, setFtStatus] = useState('')
  const [ftLowStock, setFtLowStock] = useState('')

  // ─── Stock History filters ─────────────────────────────────
  const [stFeedTypeId, setStFeedTypeId] = useState('')
  const [stTxType, setStTxType] = useState('')
  const [stDateFrom, setStDateFrom] = useState('')
  const [stDateTo, setStDateTo] = useState('')

  // ─── Consumption Log filters ───────────────────────────────
  const [conFeedTypeId, setConFeedTypeId] = useState('')
  const [conSpecies, setConSpecies] = useState('')
  const [conSession, setConSession] = useState('')
  const [conDateFrom, setConDateFrom] = useState('')
  const [conDateTo, setConDateTo] = useState('')

  // ─── Queries ───────────────────────────────────────────────
  const summary = useQuery({ queryKey: ['feed-summary'], queryFn: () => feedAPI.summary().then(r => r.data.data) })
  const feedTypes = useQuery({ queryKey: ['feed-types'], queryFn: () => feedAPI.listTypes().then(r => r.data.data) })
  const productsQuery = useQuery({ queryKey: ['products-all'], queryFn: () => inventoryAPI.listProducts({ per_page: 200 }).then(r => r.data.data) })
  const allProducts: any[] = productsQuery.data?.items ?? []
  const stockHistory = useQuery({
    queryKey: ['feed-stock', stFeedTypeId, stTxType, stDateFrom, stDateTo],
    queryFn: () => feedAPI.listStock({ feed_type_id: stFeedTypeId || undefined, transaction_type: stTxType || undefined, date_from: stDateFrom || undefined, date_to: stDateTo || undefined }).then(r => r.data.data),
    enabled: tab === 'Stock History',
  })
  const consumptionLog = useQuery({
    queryKey: ['feed-consumption', conFeedTypeId, conSpecies, conSession, conDateFrom, conDateTo],
    queryFn: () => feedAPI.listConsumption({ feed_type_id: conFeedTypeId || undefined, species: conSpecies || undefined, session: conSession || undefined, date_from: conDateFrom || undefined, date_to: conDateTo || undefined }).then(r => r.data.data),
    enabled: tab === 'Consumption Log',
  })
  const animals = useQuery({ queryKey: ['animals'], queryFn: () => animalsAPI.list({ status: 'active' }).then(r => r.data.data.items), enabled: tab === 'Record Consumption' })

  // ─── Feed Type form ────────────────────────────────────────
  const [ftForm, setFtForm] = useState({ name: '', unit: 'kg', min_stock_level: '', cost_per_unit: '', suitable_for: '', description: '', inventory_product_id: '' })
  const [editingFt, setEditingFt] = useState<any>(null)
  const [showFtForm, setShowFtForm] = useState(false)

  const saveFeedType = useMutation({
    mutationFn: (data: object) => editingFt ? feedAPI.updateType(editingFt.id, data) : feedAPI.createType(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-types'] })
      qc.invalidateQueries({ queryKey: ['feed-summary'] })
      setShowFtForm(false)
      setEditingFt(null)
      setFtForm({ name: '', unit: 'kg', min_stock_level: '', cost_per_unit: '', suitable_for: '', description: '', inventory_product_id: '' })
    },
  })

  const deleteFeedType = useMutation({
    mutationFn: (id: string) => feedAPI.deleteType(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed-types'] }); qc.invalidateQueries({ queryKey: ['feed-summary'] }) },
  })

  // ─── Stock Transaction form ────────────────────────────────
  const [stForm, setStForm] = useState({ feed_type_id: '', transaction_type: 'in', quantity: '', unit_cost: '', reference: '', notes: '', transaction_date: today() })

  const addStock = useMutation({
    mutationFn: (data: object) => feedAPI.addStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-types'] })
      qc.invalidateQueries({ queryKey: ['feed-stock'] })
      qc.invalidateQueries({ queryKey: ['feed-summary'] })
      setStForm({ feed_type_id: '', transaction_type: 'in', quantity: '', unit_cost: '', reference: '', notes: '', transaction_date: today() })
    },
  })

  // ─── Consumption form ──────────────────────────────────────
  const [conForm, setConForm] = useState({ feed_type_id: '', animal_id: '', species: '', quantity: '', consumption_date: today(), session: 'morning', notes: '' })
  const [conMode, setConMode] = useState<'animal' | 'herd'>('herd')

  const addConsumption = useMutation({
    mutationFn: (data: object) => feedAPI.addConsumption(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-types'] })
      qc.invalidateQueries({ queryKey: ['feed-consumption'] })
      qc.invalidateQueries({ queryKey: ['feed-summary'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      setConForm({ feed_type_id: '', animal_id: '', species: '', quantity: '', consumption_date: today(), session: 'morning', notes: '' })
    },
  })

  const deleteConsumption = useMutation({
    mutationFn: (id: string) => feedAPI.deleteConsumption(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed-consumption'] }); qc.invalidateQueries({ queryKey: ['feed-types'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['products-all'] }) },
  })

  const ftList: any[] = feedTypes.data || []
  const sv = summary.data

  // ─── Filtered feed types (client-side) ────────────────────
  const filteredFtList = ftList.filter((ft: any) => {
    if (ftSearch && !ft.name.toLowerCase().includes(ftSearch.toLowerCase()) && !(ft.suitable_for || '').toLowerCase().includes(ftSearch.toLowerCase())) return false
    if (ftStatus === 'active' && !ft.is_active) return false
    if (ftStatus === 'inactive' && ft.is_active) return false
    if (ftLowStock === 'yes' && !ft.is_low_stock) return false
    if (ftLowStock === 'no' && ft.is_low_stock) return false
    return true
  })

  const hasFtFilter = !!(ftSearch || ftStatus || ftLowStock)
  const hasStFilter = !!(stFeedTypeId || stTxType || stDateFrom || stDateTo)
  const hasConFilter = !!(conFeedTypeId || conSpecies || conSession || conDateFrom || conDateTo)

  const effStock = (ft: any) => ft.effective_stock ?? ft.current_stock

  const feedTypeRows = filteredFtList.map((ft: any) => ({
    name: ft.name,
    unit: ft.unit,
    current_stock: effStock(ft),
    min_stock_level: ft.min_stock_level,
    cost_per_unit: ft.cost_per_unit ?? '',
    suitable_for: ft.suitable_for ?? '',
    status: ft.is_active ? 'Active' : 'Inactive',
  }))

  const stockHistoryRows = (stockHistory.data || []).map((tx: any) => ({
    date: tx.transaction_date,
    feed_type: tx.feed_type_name,
    type: tx.transaction_type.toUpperCase(),
    quantity: tx.quantity,
    unit_cost: tx.unit_cost ?? '',
    total_cost: tx.total_cost ?? '',
    reference: tx.reference ?? '',
    notes: tx.notes ?? '',
  }))

  const consumptionRows = (consumptionLog.data || []).map((r: any) => ({
    date: r.consumption_date,
    feed_type: r.feed_type_name,
    animal_or_species: r.animal_code ? r.animal_code : r.species ? `${r.species} (herd)` : '',
    session: r.session,
    quantity: r.quantity,
    unit: r.feed_type_unit,
    notes: r.notes ?? '',
  }))

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Feed Management</h1>
          <p className="page-subtitle">Track feed inventory, consumption, and daily feeding records</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'Feed Types' && (
            <ExportButtons
              columns={[
                { header: 'Feed Type', key: 'name' },
                { header: 'Unit', key: 'unit' },
                { header: 'Current Stock', key: 'current_stock' },
                { header: 'Min Stock', key: 'min_stock_level' },
                { header: 'Cost/Unit (PKR)', key: 'cost_per_unit' },
                { header: 'Suitable For', key: 'suitable_for' },
                { header: 'Status', key: 'status' },
              ]}
              rows={feedTypeRows}
              filename="farmerp360-feed"
              title="Feed Management"
            />
          )}
          {tab === 'Stock History' && (
            <ExportButtons
              columns={[
                { header: 'Date', key: 'date' },
                { header: 'Feed Type', key: 'feed_type' },
                { header: 'Type', key: 'type' },
                { header: 'Quantity', key: 'quantity' },
                { header: 'Unit Cost (PKR)', key: 'unit_cost' },
                { header: 'Total Cost (PKR)', key: 'total_cost' },
                { header: 'Reference', key: 'reference' },
                { header: 'Notes', key: 'notes' },
              ]}
              rows={stockHistoryRows}
              filename="farmerp360-feed"
              title="Feed Management"
            />
          )}
          {tab === 'Consumption Log' && (
            <ExportButtons
              columns={[
                { header: 'Date', key: 'date' },
                { header: 'Feed Type', key: 'feed_type' },
                { header: 'Animal / Species', key: 'animal_or_species' },
                { header: 'Session', key: 'session' },
                { header: 'Quantity', key: 'quantity' },
                { header: 'Unit', key: 'unit' },
                { header: 'Notes', key: 'notes' },
              ]}
              rows={consumptionRows}
              filename="farmerp360-feed"
              title="Feed Management"
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          {summary.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : sv ? (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Feed Types</p>
                  <p className="text-2xl font-bold text-gray-900">{sv.total_feed_types}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">Low Stock Alerts</p>
                  <p className={`text-2xl font-bold ${sv.low_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{sv.low_stock_count}</p>
                </div>
                <div className="card p-4 md:col-span-1 col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Consumption Trend (6 months)</p>
                  <p className="text-sm text-gray-400">see chart below</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock levels */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Current Stock Levels</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sv.feed_type_consumption.map((ft: any) => {
                      const stock = ft.current_stock
                      const pct = ft.min_stock_level > 0 ? Math.min(100, (stock / ft.min_stock_level) * 50) : 100
                      return (
                        <div key={ft.feed_type_id} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className={`text-sm font-medium ${ft.is_low ? 'text-red-700' : 'text-gray-800'}`}>{ft.name}</span>
                              {ft.inventory_product_id && (
                                <span className="ml-1.5 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Inventory</span>
                              )}
                            </div>
                            <span className={`text-sm font-bold ${ft.is_low ? 'text-red-600' : 'text-gray-700'}`}>
                              {stock.toLocaleString('en-PK')} {ft.unit}
                              {ft.is_low && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">LOW</span>}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${ft.is_low ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Min: {ft.min_stock_level} {ft.unit} · Used (30d): {ft.consumed_30d} {ft.unit}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Consumption trend */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Consumption Trend</h2>
                  {sv.monthly_trend?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sv.monthly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(5)} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`${v} kg`, 'Total Consumption']} />
                        <Bar dataKey="total_qty" fill="#16a34a" name="Total (kg)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No consumption data yet</div>}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── FEED TYPES ─────────────────────────────────────────── */}
      {tab === 'Feed Types' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Search</label>
                <input className="input" placeholder="Name or suitable for…" value={ftSearch} onChange={e => setFtSearch(e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={ftStatus} onChange={e => setFtStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="label">Stock Level</label>
                <select className="input" value={ftLowStock} onChange={e => setFtLowStock(e.target.value)}>
                  <option value="">All</option>
                  <option value="yes">Low Stock Only</option>
                  <option value="no">Normal Stock Only</option>
                </select>
              </div>
              {hasFtFilter && (
                <button className="btn-secondary text-sm" onClick={() => { setFtSearch(''); setFtStatus(''); setFtLowStock('') }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => { setEditingFt(null); setFtForm({ name: '', unit: 'kg', min_stock_level: '', cost_per_unit: '', suitable_for: '', description: '', inventory_product_id: '' }); setShowFtForm(true) }}
              className="btn-primary text-sm">+ Add Feed Type</button>
          </div>

          {/* Form */}
          {showFtForm && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{editingFt ? 'Edit Feed Type' : 'New Feed Type'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={ftForm.name} onChange={e => setFtForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Lucerne" />
                </div>
                <div>
                  <label className="form-label">Unit *</label>
                  <select className="form-input" value={ftForm.unit} onChange={e => setFtForm(p => ({ ...p, unit: e.target.value }))}>
                    {['kg', 'bundle', 'litre', 'bag', 'ton'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Min Stock Level</label>
                  <input className="form-input" type="number" value={ftForm.min_stock_level} onChange={e => setFtForm(p => ({ ...p, min_stock_level: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="form-label">Cost per Unit (PKR)</label>
                  <input className="form-input" type="number" value={ftForm.cost_per_unit} onChange={e => setFtForm(p => ({ ...p, cost_per_unit: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="form-label">Suitable For</label>
                  <input className="form-input" value={ftForm.suitable_for} onChange={e => setFtForm(p => ({ ...p, suitable_for: e.target.value }))} placeholder="goat, buffalo, cow" />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input className="form-input" value={ftForm.description} onChange={e => setFtForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Link to Inventory Product (for auto stock deduction)</label>
                  <select className="form-input" value={ftForm.inventory_product_id} onChange={e => setFtForm(p => ({ ...p, inventory_product_id: e.target.value }))}>
                    <option value="">None — track feed stock separately</option>
                    {allProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.current_stock).toFixed(1)} {p.unit})</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">When linked, recording consumption will also deduct from the inventory product.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-primary text-sm" disabled={!ftForm.name || saveFeedType.isPending}
                  onClick={() => saveFeedType.mutate({ ...ftForm, min_stock_level: ftForm.min_stock_level || 0, cost_per_unit: ftForm.cost_per_unit || undefined, inventory_product_id: ftForm.inventory_product_id || null })}>
                  {saveFeedType.isPending ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-secondary text-sm" onClick={() => setShowFtForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Feed Type', 'Unit', 'Current Stock', 'Min Stock', 'Cost/Unit', 'Suitable For', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFtList.map((ft: any) => (
                    <tr key={ft.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {ft.name}
                        {ft.inventory_product_id && (
                          <span className="ml-1.5 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded" title="Stock from inventory">Inv</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ft.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${ft.is_low_stock ? 'text-red-600' : 'text-gray-800'}`}>{effStock(ft).toLocaleString('en-PK')}</span>
                        {ft.is_low_stock && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">LOW</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ft.min_stock_level}</td>
                      <td className="px-4 py-3 text-gray-600">{ft.cost_per_unit ? `PKR ${ft.cost_per_unit}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{ft.suitable_for || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ft.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {ft.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="text-xs text-blue-600 hover:underline"
                            onClick={() => { setEditingFt(ft); setFtForm({ name: ft.name, unit: ft.unit, min_stock_level: String(ft.min_stock_level), cost_per_unit: ft.cost_per_unit ? String(ft.cost_per_unit) : '', suitable_for: ft.suitable_for || '', description: ft.description || '', inventory_product_id: ft.inventory_product_id || '' }); setShowFtForm(true) }}>
                            Edit
                          </button>
                          <button className="text-xs text-red-500 hover:underline"
                            onClick={() => { if (confirm('Deactivate this feed type?')) deleteFeedType.mutate(ft.id) }}>
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFtList.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">{hasFtFilter ? 'No feed types match the current filters.' : 'No feed types yet. Add one above.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD CONSUMPTION ─────────────────────────────────── */}
      {tab === 'Record Consumption' && (
        <div className="space-y-4">
          <div className="card p-5 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Record Daily Feed Consumption</h3>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setConMode('herd')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${conMode === 'herd' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                Herd / Species
              </button>
              <button onClick={() => setConMode('animal')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${conMode === 'animal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                Individual Animal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Feed Type *</label>
                <select className="form-input" value={conForm.feed_type_id} onChange={e => setConForm(p => ({ ...p, feed_type_id: e.target.value }))}>
                  <option value="">Select feed type</option>
                  {ftList.map((ft: any) => (
                    <option key={ft.id} value={ft.id}>{ft.name} (Stock: {effStock(ft).toLocaleString('en-PK')} {ft.unit})</option>
                  ))}
                </select>
              </div>

              {conMode === 'herd' ? (
                <div>
                  <label className="form-label">Species *</label>
                  <select className="form-input" value={conForm.species} onChange={e => setConForm(p => ({ ...p, species: e.target.value, animal_id: '' }))}>
                    <option value="">Select species</option>
                    {SPECIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="form-label">Animal *</label>
                  <select className="form-input" value={conForm.animal_id} onChange={e => setConForm(p => ({ ...p, animal_id: e.target.value, species: '' }))}>
                    <option value="">Select animal</option>
                    {(animals.data || []).map((a: any) => (
                      <option key={a.id} value={a.id}>{a.animal_code} — {a.name || a.species}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">Quantity (kg) *</label>
                <input className="form-input" type="number" step="0.1" value={conForm.quantity}
                  onChange={e => setConForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0.0" />
              </div>

              <div>
                <label className="form-label">Session *</label>
                <select className="form-input" value={conForm.session} onChange={e => setConForm(p => ({ ...p, session: e.target.value }))}>
                  {SESSIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={conForm.consumption_date}
                  onChange={e => setConForm(p => ({ ...p, consumption_date: e.target.value }))} />
              </div>

              <div>
                <label className="form-label">Notes</label>
                <input className="form-input" value={conForm.notes} onChange={e => setConForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <button className="btn-primary text-sm mt-4"
              disabled={!conForm.feed_type_id || !conForm.quantity || (conMode === 'herd' ? !conForm.species : !conForm.animal_id) || addConsumption.isPending}
              onClick={() => {
                const payload: any = { feed_type_id: conForm.feed_type_id, quantity: conForm.quantity, consumption_date: conForm.consumption_date, session: conForm.session, notes: conForm.notes || undefined }
                if (conMode === 'herd') payload.species = conForm.species
                else payload.animal_id = conForm.animal_id
                addConsumption.mutate(payload)
              }}>
              {addConsumption.isPending ? 'Saving…' : 'Record Consumption'}
            </button>
            {addConsumption.isSuccess && <p className="text-xs text-green-600 mt-2">Consumption recorded and stock updated.</p>}
          </div>

          <div className="card p-4 max-w-2xl bg-blue-50 border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">Feed & supplement purchases are recorded in <strong>Inventory Management</strong> → Record Purchase.</p>
            <p className="text-xs text-blue-500 mt-0.5">Stock is deducted here automatically when consumption is recorded.</p>
          </div>
        </div>
      )}

      {/* ── STOCK HISTORY ──────────────────────────────────────── */}
      {tab === 'Stock History' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Feed Type</label>
                <select className="input" value={stFeedTypeId} onChange={e => setStFeedTypeId(e.target.value)}>
                  <option value="">All</option>
                  {ftList.map((ft: any) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Transaction Type</label>
                <select className="input" value={stTxType} onChange={e => setStTxType(e.target.value)}>
                  <option value="">All</option>
                  <option value="in">IN (Purchase)</option>
                  <option value="out">OUT (Usage)</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="label">Date From</label>
                <input className="input" type="date" value={stDateFrom} onChange={e => setStDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Date To</label>
                <input className="input" type="date" value={stDateTo} onChange={e => setStDateTo(e.target.value)} />
              </div>
              {hasStFilter && (
                <button className="btn-secondary text-sm" onClick={() => { setStFeedTypeId(''); setStTxType(''); setStDateFrom(''); setStDateTo('') }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Feed Type', 'Type', 'Quantity', 'Unit Cost', 'Total Cost', 'Reference', 'Notes'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockHistory.isLoading ? (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">Loading…</td></tr>
                  ) : (stockHistory.data || []).map((tx: any) => (
                    <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{tx.transaction_date}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{tx.feed_type_name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.transaction_type === 'in' ? 'bg-green-100 text-green-700' : tx.transaction_type === 'out' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {tx.transaction_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-800">{tx.quantity}</td>
                      <td className="px-4 py-2 text-gray-600">{tx.unit_cost ? `PKR ${tx.unit_cost}` : '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{tx.total_cost ? `PKR ${tx.total_cost.toLocaleString('en-PK')}` : '—'}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{tx.reference || '—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{tx.notes || '—'}</td>
                    </tr>
                  ))}
                  {!stockHistory.isLoading && (stockHistory.data || []).length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">{hasStFilter ? 'No stock transactions match the current filters.' : 'No stock transactions yet.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONSUMPTION LOG ────────────────────────────────────── */}
      {tab === 'Consumption Log' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Feed Type</label>
                <select className="input" value={conFeedTypeId} onChange={e => setConFeedTypeId(e.target.value)}>
                  <option value="">All</option>
                  {ftList.map((ft: any) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Species</label>
                <select className="input" value={conSpecies} onChange={e => setConSpecies(e.target.value)}>
                  <option value="">All</option>
                  {SPECIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Session</label>
                <select className="input" value={conSession} onChange={e => setConSession(e.target.value)}>
                  <option value="">All</option>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="label">Date From</label>
                <input className="input" type="date" value={conDateFrom} onChange={e => setConDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Date To</label>
                <input className="input" type="date" value={conDateTo} onChange={e => setConDateTo(e.target.value)} />
              </div>
              {hasConFilter && (
                <button className="btn-secondary text-sm" onClick={() => { setConFeedTypeId(''); setConSpecies(''); setConSession(''); setConDateFrom(''); setConDateTo('') }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Feed Type', 'Animal / Species', 'Session', 'Quantity', 'Notes', ''].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consumptionLog.isLoading ? (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Loading…</td></tr>
                  ) : (consumptionLog.data || []).map((r: any) => (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.consumption_date}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{r.feed_type_name}</td>
                      <td className="px-4 py-2 text-gray-700 capitalize">
                        {r.animal_code ? `${r.animal_code}` : r.species ? `${r.species} (herd)` : '—'}
                      </td>
                      <td className="px-4 py-2 capitalize text-gray-600">{r.session}</td>
                      <td className="px-4 py-2 font-semibold text-gray-800">{r.quantity} {r.feed_type_unit}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{r.notes || '—'}</td>
                      <td className="px-4 py-2">
                        <button className="text-xs text-red-500 hover:underline"
                          onClick={() => { if (confirm('Delete this record?')) deleteConsumption.mutate(r.id) }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!consumptionLog.isLoading && (consumptionLog.data || []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">{hasConFilter ? 'No consumption records match the current filters.' : 'No consumption records yet. Use "Record Consumption" tab to add.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
