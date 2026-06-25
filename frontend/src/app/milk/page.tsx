'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dairyAPI, animalsAPI, accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyProd = { animal_id: '', production_date: today, session: 'morning', quantity_liters: '', fat_percentage: '', remarks: '' }
const emptySale = { vendor_id: '', buyer_name: '', sale_date: today, quantity_liters: '', price_per_liter: '120', payment_method: 'cash', notes: '' }

const IMPORT_COLUMNS = [
  { key: 'animal_code',     label: 'Animal Code',  required: true,  example: 'C-02' },
  { key: 'production_date', label: 'Date',         required: true,  example: '2026-06-25' },
  { key: 'session',         label: 'Session',      required: true,  example: 'morning' },
  { key: 'quantity_liters', label: 'Quantity (L)', required: true,  example: '14' },
  { key: 'fat_percentage',  label: 'Fat %',        required: false, example: '4.5' },
  { key: 'remarks',         label: 'Remarks',      required: false, example: '' },
]

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}

function toISODate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const p = s.split('/')
    const c = `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`
    return isNaN(Date.parse(c)) ? null : c
  }
  return null
}

export default function MilkPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'production' | 'sales'>('production')

  // ── Production state ───────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyProd)
  const [prodPage, setProdPage] = useState(1)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const [prodFilter, setProdFilter] = useState({ animal_id: '', date_from: '', date_to: '', session: '' })

  // ── Sales state ────────────────────────────────────
  const [showSale, setShowSale] = useState(false)
  const [saleForm, setSaleForm] = useState(emptySale)
  const [salesPage, setSalesPage] = useState(1)

  const [saleFilter, setSaleFilter] = useState({ date_from: '', date_to: '', payment_method: '', vendor_id: '' })

  // ── Queries ────────────────────────────────────────
  const { data: milkData } = useQuery({
    queryKey: ['milk', prodPage, prodFilter],
    queryFn: () => dairyAPI.listMilk({
      page: prodPage,
      per_page: 20,
      ...(prodFilter.animal_id   ? { animal_id:  prodFilter.animal_id }   : {}),
      ...(prodFilter.session     ? { session:     prodFilter.session }     : {}),
      ...(prodFilter.date_from   ? { date_from:   prodFilter.date_from }   : {}),
      ...(prodFilter.date_to     ? { date_to:     prodFilter.date_to }     : {}),
    }).then(r => r.data.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['milk-summary'],
    queryFn: () => dairyAPI.dailySummary(14).then(r => r.data.data),
  })

  const { data: animals } = useQuery({
    queryKey: ['animals-milk-eligible'],
    queryFn: () => animalsAPI.list({ per_page: 500, status: 'active', gender: 'female' }).then(r => r.data.data),
  })

  const { data: salesData } = useQuery({
    queryKey: ['milk-sales', salesPage, saleFilter],
    queryFn: () => dairyAPI.listSales({
      page: salesPage,
      per_page: 20,
      ...(saleFilter.date_from      ? { date_from:       saleFilter.date_from }      : {}),
      ...(saleFilter.date_to        ? { date_to:         saleFilter.date_to }        : {}),
      ...(saleFilter.payment_method ? { payment_method:  saleFilter.payment_method } : {}),
      ...(saleFilter.vendor_id      ? { vendor_id:       saleFilter.vendor_id }      : {}),
    }).then(r => r.data.data),
    enabled: tab === 'sales',
  })

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => accountingAPI.getVendors({ per_page: 200 }).then(r => r.data),
    enabled: showSale || tab === 'sales',
  })

  // ── Mutations ─ production ─────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: any) => dairyAPI.createMilk(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milk'] })
      qc.invalidateQueries({ queryKey: ['milk-summary'] })
      toast.success('Production recorded!')
      setShowAdd(false)
      setForm(emptyProd)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dairyAPI.deleteMilk(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['milk'] }); toast.success('Deleted') },
  })

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => dairyAPI.importBulk(rows),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['milk'] })
      qc.invalidateQueries({ queryKey: ['milk-summary'] })
      const { created, skipped, errors } = res.data
      toast.success(`Imported ${created} records${skipped ? `, ${skipped} skipped` : ''}`)
      if (errors?.length) setImportErrors(errors)
      else { setShowImport(false); setImportRows([]) }
    },
    onError: (e: any) => {
      const detail = e.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `Row ${(d.loc?.[1] ?? 0) + 1}: ${d.msg}`).join('\n')
        : (typeof detail === 'string' ? detail : 'Import failed')
      toast.error(msg, { duration: 6000 })
    },
  })

  // ── Mutations ─ sales ──────────────────────────────
  const saleMutation = useMutation({
    mutationFn: (d: any) => dairyAPI.createSale(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milk-sales'] })
      toast.success('Sale recorded with accounting entry!')
      setShowSale(false)
      setSaleForm(emptySale)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to record sale'),
  })

  const deleteSaleMutation = useMutation({
    mutationFn: (id: string) => dairyAPI.deleteSale(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['milk-sales'] }); toast.success('Sale deleted') },
  })

  // ── Handlers ── production ─────────────────────────
  const submitProd = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(form.quantity_liters)
    const fat = form.fat_percentage ? parseFloat(form.fat_percentage) : undefined
    if (form.session === 'both') {
      const half = qty / 2
      try {
        await dairyAPI.createMilk({ ...form, session: 'morning', quantity_liters: half, fat_percentage: fat })
        await dairyAPI.createMilk({ ...form, session: 'evening', quantity_liters: half, fat_percentage: fat })
        qc.invalidateQueries({ queryKey: ['milk'] })
        qc.invalidateQueries({ queryKey: ['milk-summary'] })
        toast.success(`${half.toFixed(2)}L morning + ${half.toFixed(2)}L evening`)
        setShowAdd(false)
        setForm(emptyProd)
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Failed')
      }
    } else {
      createMutation.mutate({ ...form, quantity_liters: qty, fat_percentage: fat })
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([IMPORT_COLUMNS.map(c => c.label).join(',') + '\n' + IMPORT_COLUMNS.map(c => c.example).join(',')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'milk_import_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImportRows(parseCSV(ev.target?.result as string)); setImportErrors([]) }
    reader.readAsText(file)
  }

  const submitImport = () => {
    if (!importRows.length) return
    const mapped = importRows.map(r => {
      const obj: any = {}
      IMPORT_COLUMNS.forEach(col => {
        const val = ((r[col.label] || r[col.key]) ?? '').toString().trim()
        if (!val) return
        if (col.key === 'production_date') { const iso = toISODate(val); if (iso) obj[col.key] = iso }
        else if (col.key === 'quantity_liters' || col.key === 'fat_percentage') { const n = parseFloat(val); if (!isNaN(n)) obj[col.key] = n }
        else if (col.key === 'session') obj[col.key] = val.toLowerCase()
        else obj[col.key] = val
      })
      return obj
    })
    importMutation.mutate(mapped)
  }

  // ── Handlers ── sales ──────────────────────────────
  const saleTotal = (() => {
    const q = parseFloat(saleForm.quantity_liters)
    const p = parseFloat(saleForm.price_per_liter)
    return (!isNaN(q) && !isNaN(p)) ? (q * p).toFixed(2) : ''
  })()

  const submitSale = (e: React.FormEvent) => {
    e.preventDefault()
    saleMutation.mutate({
      sale_date: saleForm.sale_date,
      vendor_id: saleForm.vendor_id || undefined,
      buyer_name: saleForm.buyer_name || undefined,
      quantity_liters: parseFloat(saleForm.quantity_liters),
      price_per_liter: parseFloat(saleForm.price_per_liter),
      payment_method: saleForm.payment_method,
      notes: saleForm.notes || undefined,
    })
  }

  // ── Helpers ────────────────────────────────────────
  const resetProdFilter = () => { setProdFilter({ animal_id: '', date_from: '', date_to: '', session: '' }); setProdPage(1) }
  const resetSaleFilter = () => { setSaleFilter({ date_from: '', date_to: '', payment_method: '', vendor_id: '' }); setSalesPage(1) }
  const hasProdFilter = !!(prodFilter.animal_id || prodFilter.date_from || prodFilter.date_to || prodFilter.session)
  const hasSaleFilter = !!(saleFilter.date_from || saleFilter.date_to || saleFilter.payment_method || saleFilter.vendor_id)

  const prodItems  = milkData?.items ?? []
  const salesItems = salesData?.items ?? []
  const totalToday = prodItems.filter((m: any) => m.production_date === today)
    .reduce((s: number, m: any) => s + parseFloat(m.quantity_liters), 0)

  const totalRevenue  = salesItems.reduce((s: number, x: any) => s + parseFloat(x.total_amount), 0)
  const cashRevenue   = salesItems.filter((x: any) => x.payment_method === 'cash').reduce((s: number, x: any) => s + parseFloat(x.total_amount), 0)
  const creditRevenue = salesItems.filter((x: any) => x.payment_method === 'credit').reduce((s: number, x: any) => s + parseFloat(x.total_amount), 0)

  const vendors: any[] = Array.isArray(vendorsData) ? vendorsData : (vendorsData?.items ?? [])
  const animalItems: any[] = animals?.items ?? []

  const sessionBadge = (s: string) => {
    if (s === 'morning') return <span className="badge-info">Morning</span>
    if (s === 'evening') return <span className="badge-warning">Evening</span>
    return <span className="badge-gray capitalize">{s}</span>
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Milk</h1>
          <p className="page-subtitle">Production tracking &amp; sales management</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {tab === 'production' && (
            <>
              <ExportButtons
                columns={[
                  { header: 'Date',        key: 'production_date' },
                  { header: 'Animal Code', key: 'animal_code' },
                  { header: 'Animal Name', key: 'animal_name' },
                  { header: 'Session',     key: 'session' },
                  { header: 'Qty (L)',     key: 'quantity_liters' },
                  { header: 'Fat %',       key: 'fat_percentage' },
                  { header: 'Remarks',     key: 'remarks' },
                ]}
                rows={prodItems.map((m: any) => ({
                  production_date: m.production_date,
                  animal_code:     m.animal_code ?? m.animal_id?.slice(0, 8),
                  animal_name:     m.animal_name || '',
                  session:         m.session,
                  quantity_liters: parseFloat(m.quantity_liters).toFixed(2),
                  fat_percentage:  m.fat_percentage ?? '',
                  remarks:         m.remarks || '',
                }))}
                filename="milk-production"
                title="Milk Production"
              />
              <button onClick={() => setShowImport(true)} className="btn-secondary">⬆ Import</button>
              <button onClick={() => setShowAdd(true)} className="btn-primary">+ Record Production</button>
            </>
          )}
          {tab === 'sales' && (
            <>
              <ExportButtons
                columns={[
                  { header: 'Date',       key: 'sale_date' },
                  { header: 'Buyer',      key: 'buyer' },
                  { header: 'Qty (L)',    key: 'quantity_liters' },
                  { header: 'Price/L',   key: 'price_per_liter' },
                  { header: 'Total PKR', key: 'total_amount' },
                  { header: 'Method',    key: 'payment_method' },
                  { header: 'Notes',     key: 'notes' },
                ]}
                rows={salesItems.map((s: any) => ({
                  sale_date:       s.sale_date,
                  buyer:           s.vendor_name || s.buyer_name || 'Walk-in',
                  quantity_liters: parseFloat(s.quantity_liters).toFixed(1),
                  price_per_liter: parseFloat(s.price_per_liter).toFixed(0),
                  total_amount:    parseFloat(s.total_amount).toFixed(2),
                  payment_method:  s.payment_method,
                  notes:           s.notes || '',
                }))}
                filename="milk-sales"
                title="Milk Sales"
              />
              <button onClick={() => setShowSale(true)} className="btn-primary">+ Record Sale</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {(['production', 'sales'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'production' ? '🥛 Production' : '💰 Sales'}
          </button>
        ))}
      </div>

      {/* ══════════ PRODUCTION FILTERS ══════════ */}
      {tab === 'production' && (
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label text-xs">Animal</label>
              <select className="input !w-44" value={prodFilter.animal_id}
                onChange={e => { setProdFilter(f => ({ ...f, animal_id: e.target.value })); setProdPage(1) }}>
                <option value="">All Animals</option>
                {animalItems.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` (${a.name})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Session</label>
              <select className="input !w-36" value={prodFilter.session}
                onChange={e => { setProdFilter(f => ({ ...f, session: e.target.value })); setProdPage(1) }}>
                <option value="">All Sessions</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Date From</label>
              <input type="date" className="input !w-40" value={prodFilter.date_from}
                onChange={e => { setProdFilter(f => ({ ...f, date_from: e.target.value })); setProdPage(1) }} />
            </div>
            <div>
              <label className="label text-xs">Date To</label>
              <input type="date" className="input !w-40" value={prodFilter.date_to}
                onChange={e => { setProdFilter(f => ({ ...f, date_to: e.target.value })); setProdPage(1) }} />
            </div>
            {hasProdFilter && (
              <button onClick={resetProdFilter} className="btn-secondary text-sm self-end">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ SALES FILTERS ══════════ */}
      {tab === 'sales' && (
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label text-xs">Payment Method</label>
              <select className="input !w-40" value={saleFilter.payment_method}
                onChange={e => { setSaleFilter(f => ({ ...f, payment_method: e.target.value })); setSalesPage(1) }}>
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Buyer / Vendor</label>
              <select className="input !w-44" value={saleFilter.vendor_id}
                onChange={e => { setSaleFilter(f => ({ ...f, vendor_id: e.target.value })); setSalesPage(1) }}>
                <option value="">All Buyers</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Date From</label>
              <input type="date" className="input !w-40" value={saleFilter.date_from}
                onChange={e => { setSaleFilter(f => ({ ...f, date_from: e.target.value })); setSalesPage(1) }} />
            </div>
            <div>
              <label className="label text-xs">Date To</label>
              <input type="date" className="input !w-40" value={saleFilter.date_to}
                onChange={e => { setSaleFilter(f => ({ ...f, date_to: e.target.value })); setSalesPage(1) }} />
            </div>
            {hasSaleFilter && (
              <button onClick={resetSaleFilter} className="btn-secondary text-sm self-end">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ PRODUCTION TAB ══════════ */}
      {tab === 'production' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">14-Day Production Trend</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="L" />
                  <Tooltip formatter={(v: any) => [`${v}L`, 'Liters']} />
                  <Bar dataKey="total_liters" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Stats</h2>
              <div className="space-y-3">
                {[
                  { label: "Today's production",  value: `${totalToday.toFixed(1)}L` },
                  { label: 'Filtered records',    value: milkData?.total ?? 0 },
                  { label: '7-day avg (L/day)',   value: summary ? (summary.slice(-7).reduce((s: number, d: any) => s + d.total_liters, 0) / 7).toFixed(1) + 'L' : '—' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {['Animal', 'Date', 'Session', 'Quantity (L)', 'Fat %', 'Remarks', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prodItems.map((m: any) => (
                  <tr key={m.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-semibold text-green-700">{m.animal_code ?? m.animal_id?.slice(0, 8)}</div>
                      {m.animal_name    && <div className="text-xs text-gray-400">{m.animal_name}</div>}
                      {m.animal_species && <div className="text-xs text-gray-400 capitalize">{m.animal_species}</div>}
                    </td>
                    <td className="table-cell">{m.production_date}</td>
                    <td className="table-cell">{sessionBadge(m.session)}</td>
                    <td className="table-cell font-semibold">{parseFloat(m.quantity_liters).toFixed(2)}</td>
                    <td className="table-cell">{m.fat_percentage ? `${m.fat_percentage}%` : '—'}</td>
                    <td className="table-cell text-gray-500 text-xs">{m.remarks || '—'}</td>
                    <td className="table-cell">
                      <button onClick={() => deleteMutation.mutate(m.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
                {prodItems.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No records found for selected filters</td></tr>
                )}
              </tbody>
            </table>
            {(milkData?.total ?? 0) > 20 && (
              <div className="flex justify-between items-center px-4 py-3 border-t">
                <span className="text-sm text-gray-500">Page {prodPage}</span>
                <div className="flex gap-2">
                  <button disabled={prodPage === 1} onClick={() => setProdPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Prev</button>
                  <button disabled={(milkData?.total ?? 0) <= prodPage * 20} onClick={() => setProdPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════ SALES TAB ══════════ */}
      {tab === 'sales' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Revenue',  value: `PKR ${totalRevenue.toLocaleString('en-PK')}`,  color: 'text-green-700', icon: '💰' },
              { label: 'Cash Sales',    value: `PKR ${cashRevenue.toLocaleString('en-PK')}`,   color: 'text-blue-700',  icon: '💵', sub: '→ Cash in Hand' },
              { label: 'Credit Sales',  value: `PKR ${creditRevenue.toLocaleString('en-PK')}`, color: 'text-orange-700',icon: '📋', sub: '→ Accounts Receivable' },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{s.icon}</span>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {['Date', 'Buyer / Customer', 'Qty (L)', 'Price/L', 'Total (PKR)', 'Method', 'Account Impact', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesItems.map((s: any) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell">{s.sale_date}</td>
                    <td className="table-cell">
                      <div className="font-medium">{s.vendor_name || s.buyer_name || <span className="text-gray-400 italic text-xs">Walk-in</span>}</div>
                    </td>
                    <td className="table-cell font-semibold">{parseFloat(s.quantity_liters).toFixed(1)}</td>
                    <td className="table-cell">PKR {parseFloat(s.price_per_liter).toFixed(0)}</td>
                    <td className="table-cell font-bold text-green-700">PKR {parseFloat(s.total_amount).toLocaleString('en-PK')}</td>
                    <td className="table-cell">
                      {s.payment_method === 'cash'
                        ? <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💵 Cash</span>
                        : <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">📋 Credit</span>
                      }
                    </td>
                    <td className="table-cell text-xs text-gray-500">
                      {s.payment_method === 'cash' ? 'DR Cash in Hand' : 'DR Accounts Receivable'}
                    </td>
                    <td className="table-cell">
                      <button onClick={() => deleteSaleMutation.mutate(s.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
                {salesItems.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No sales found for selected filters</td></tr>
                )}
              </tbody>
            </table>
            {(salesData?.total ?? 0) > 20 && (
              <div className="flex justify-between items-center px-4 py-3 border-t">
                <span className="text-sm text-gray-500">Page {salesPage}</span>
                <div className="flex gap-2">
                  <button disabled={salesPage === 1} onClick={() => setSalesPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Prev</button>
                  <button disabled={(salesData?.total ?? 0) <= salesPage * 20} onClick={() => setSalesPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add Production Modal ─────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Record Milk Production</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={submitProd} className="p-5 space-y-4">
              <div>
                <label className="label">Animal (female) *</label>
                <select className="input" required value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })}>
                  <option value="">Select animal...</option>
                  {animalItems.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` (${a.name})` : ''} — {a.species}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" required value={form.production_date} onChange={e => setForm({ ...form, production_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Session *</label>
                  <select className="input" value={form.session} onChange={e => setForm({ ...form, session: e.target.value })}>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="both">Both (split equally)</option>
                  </select>
                </div>
                <div>
                  <label className="label">{form.session === 'both' ? 'Total Qty (L) *' : 'Quantity (L) *'}</label>
                  <input type="number" step="0.01" className="input" required value={form.quantity_liters} onChange={e => setForm({ ...form, quantity_liters: e.target.value })} />
                  {form.session === 'both' && form.quantity_liters && (
                    <p className="text-xs text-gray-400 mt-1">= {(parseFloat(form.quantity_liters) / 2).toFixed(2)}L each</p>
                  )}
                </div>
                <div>
                  <label className="label">Fat %</label>
                  <input type="number" step="0.1" className="input" value={form.fat_percentage} onChange={e => setForm({ ...form, fat_percentage: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Remarks</label>
                <input className="input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Sale Modal ────────────────────────── */}
      {showSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Record Milk Sale</h2>
                <p className="text-xs text-gray-500 mt-0.5">Accounting entry created automatically</p>
              </div>
              <button onClick={() => setShowSale(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={submitSale} className="p-5 space-y-4">
              <div>
                <label className="label">Buyer / Customer</label>
                <select className="input" value={saleForm.vendor_id}
                  onChange={e => setSaleForm({ ...saleForm, vendor_id: e.target.value, buyer_name: '' })}>
                  <option value="">— Select buyer (or enter name below) —</option>
                  {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name}{v.vendor_code ? ` (${v.vendor_code})` : ''}</option>
                  ))}
                </select>
                {!saleForm.vendor_id && (
                  <input className="input mt-2" placeholder="Or type buyer name manually..."
                    value={saleForm.buyer_name}
                    onChange={e => setSaleForm({ ...saleForm, buyer_name: e.target.value })} />
                )}
              </div>
              <div>
                <label className="label">Sale Date *</label>
                <input type="date" className="input" required value={saleForm.sale_date}
                  onChange={e => setSaleForm({ ...saleForm, sale_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity (L) *</label>
                  <input type="number" step="0.01" className="input" required value={saleForm.quantity_liters}
                    onChange={e => setSaleForm({ ...saleForm, quantity_liters: e.target.value })} />
                </div>
                <div>
                  <label className="label">Price / Liter (PKR) *</label>
                  <input type="number" step="0.01" className="input" required value={saleForm.price_per_liter}
                    onChange={e => setSaleForm({ ...saleForm, price_per_liter: e.target.value })} />
                </div>
              </div>
              {saleTotal && (
                <div className="bg-green-50 rounded-lg px-4 py-2 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="text-lg font-bold text-green-700">PKR {parseFloat(saleTotal).toLocaleString('en-PK')}</span>
                </div>
              )}
              <div>
                <label className="label">Payment Method *</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[
                    { value: 'cash',   label: '💵 Cash',   sub: 'DR Cash in Hand' },
                    { value: 'credit', label: '📋 Credit', sub: 'DR Accounts Receivable' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setSaleForm({ ...saleForm, payment_method: opt.value })}
                      className={`border-2 rounded-lg p-3 text-left transition-colors ${
                        saleForm.payment_method === opt.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Both credit <strong>Milk Sales Revenue (4000)</strong></p>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Optional" value={saleForm.notes}
                  onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSale(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saleMutation.isPending} className="btn-primary">
                  {saleMutation.isPending ? 'Saving...' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ─────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Import Production from CSV</h2>
              <button onClick={() => { setShowImport(false); setImportRows([]); setImportErrors([]) }} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Instructions</p>
                <p>Required: <span className="font-mono text-xs">Animal Code, Date, Session, Quantity (L)</span></p>
                <p className="mt-1">Session: <strong>morning</strong>, <strong>evening</strong>, or <strong>both</strong>.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={downloadTemplate} className="btn-secondary text-sm">⬇ Template</button>
                <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm">📂 Choose CSV</button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </div>
              {importRows.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{importRows.length} rows parsed</p>
                  <div className="overflow-x-auto border rounded">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50"><tr>{Object.keys(importRows[0]).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}</tr></thead>
                      <tbody>
                        {importRows.slice(0, 5).map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v: any, j) => <td key={j} className="px-2 py-1">{v}</td>)}</tr>)}
                        {importRows.length > 5 && <tr><td colSpan={Object.keys(importRows[0]).length} className="px-2 py-1 text-gray-400">…and {importRows.length - 5} more</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                  {importErrors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowImport(false); setImportRows([]); setImportErrors([]) }} className="btn-secondary">Cancel</button>
                <button onClick={submitImport} disabled={!importRows.length || importMutation.isPending} className="btn-primary">
                  {importMutation.isPending ? 'Importing...' : `Import ${importRows.length} Rows`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
