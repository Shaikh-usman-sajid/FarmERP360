'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dairyAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { animal_id: '', production_date: today, session: 'morning', quantity_liters: '', fat_percentage: '', remarks: '' }

const IMPORT_COLUMNS = [
  { key: 'animal_code',      label: 'Animal Code',     required: true,  example: 'B001' },
  { key: 'production_date',  label: 'Date',            required: true,  example: '2026-06-25' },
  { key: 'session',          label: 'Session',         required: true,  example: 'morning' },
  { key: 'quantity_liters',  label: 'Quantity (L)',    required: true,  example: '14' },
  { key: 'fat_percentage',   label: 'Fat %',           required: false, example: '4.5' },
  { key: 'remarks',          label: 'Remarks',         required: false, example: '' },
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
    const c = `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}`
    return isNaN(Date.parse(c)) ? null : c
  }
  return null
}

export default function MilkPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const { data } = useQuery({
    queryKey: ['milk', page],
    queryFn: () => dairyAPI.listMilk({ page, per_page: 20 }).then(r => r.data.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['milk-summary'],
    queryFn: () => dairyAPI.dailySummary(14).then(r => r.data.data),
  })

  const { data: animals } = useQuery({
    queryKey: ['animals-active'],
    queryFn: () => animalsAPI.list({ per_page: 500, status: 'active' }).then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => dairyAPI.createMilk(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milk'] })
      qc.invalidateQueries({ queryKey: ['milk-summary'] })
      toast.success('Milk production recorded!')
      setShowAdd(false)
      setForm(emptyForm)
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
        : (typeof detail === 'string' ? detail : 'Import failed — check your CSV values')
      toast.error(msg, { duration: 6000 })
    },
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(form.quantity_liters)
    const fat = form.fat_percentage ? parseFloat(form.fat_percentage) : undefined

    if (form.session === 'both') {
      // split into two records — morning and evening each get half
      const half = qty / 2
      try {
        await dairyAPI.createMilk({ ...form, session: 'morning', quantity_liters: half, fat_percentage: fat })
        await dairyAPI.createMilk({ ...form, session: 'evening', quantity_liters: half, fat_percentage: fat })
        qc.invalidateQueries({ queryKey: ['milk'] })
        qc.invalidateQueries({ queryKey: ['milk-summary'] })
        toast.success(`Recorded ${half.toFixed(2)}L morning + ${half.toFixed(2)}L evening`)
        setShowAdd(false)
        setForm(emptyForm)
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Failed')
      }
    } else {
      createMutation.mutate({ ...form, quantity_liters: qty, fat_percentage: fat })
    }
  }

  const downloadTemplate = () => {
    const header = IMPORT_COLUMNS.map(c => c.label).join(',')
    const example = IMPORT_COLUMNS.map(c => c.example).join(',')
    const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'milk_import_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImportRows(parseCSV(ev.target?.result as string))
      setImportErrors([])
    }
    reader.readAsText(file)
  }

  const submitImport = () => {
    if (!importRows.length) return
    const mapped = importRows.map(r => {
      const obj: any = {}
      IMPORT_COLUMNS.forEach(col => {
        const val = ((r[col.label] || r[col.key]) ?? '').toString().trim()
        if (!val) return
        if (col.key === 'production_date') {
          const iso = toISODate(val)
          if (iso) obj[col.key] = iso
        } else if (col.key === 'quantity_liters' || col.key === 'fat_percentage') {
          const n = parseFloat(val)
          if (!isNaN(n)) obj[col.key] = n
        } else if (col.key === 'session') {
          obj[col.key] = val.toLowerCase()
        } else {
          obj[col.key] = val
        }
      })
      return obj
    })
    importMutation.mutate(mapped)
  }

  const totalToday = (data?.items ?? [])
    .filter((m: any) => m.production_date === today)
    .reduce((s: number, m: any) => s + parseFloat(m.quantity_liters), 0)

  const sessionBadge = (s: string) => {
    if (s === 'morning') return <span className="badge-info">Morning</span>
    if (s === 'evening') return <span className="badge-warning">Evening</span>
    return <span className="badge-gray capitalize">{s}</span>
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Milk Production</h1>
          <p className="page-subtitle">Today: {totalToday.toFixed(1)}L recorded</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButtons
            columns={[
              { header: 'Date', key: 'production_date' },
              { header: 'Animal Code', key: 'animal_code' },
              { header: 'Animal Name', key: 'animal_name' },
              { header: 'Session', key: 'session' },
              { header: 'Quantity (L)', key: 'quantity_liters' },
              { header: 'Fat %', key: 'fat_percentage' },
              { header: 'Remarks', key: 'remarks' },
            ]}
            rows={(data?.items ?? []).map((m: any) => ({
              production_date: m.production_date,
              animal_code: m.animal_code ?? m.animal_id?.slice(0, 8),
              animal_name: m.animal_name || '',
              session: m.session,
              quantity_liters: parseFloat(m.quantity_liters).toFixed(2),
              fat_percentage: m.fat_percentage ?? '',
              remarks: m.remarks || '',
            }))}
            filename="farmerp360-milk"
            title="Milk Production"
          />
          <button onClick={() => setShowImport(true)} className="btn-secondary">⬆ Import CSV</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Record Milk</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">14-Day Production Trend (Liters)</h2>
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
              { label: 'Total records', value: data?.total ?? 0 },
              { label: 'This week avg (L/day)', value: summary ? (summary.slice(-7).reduce((s: number, d: any) => s + d.total_liters, 0) / 7).toFixed(1) : '—' },
              { label: 'This month avg (L/day)', value: summary ? (summary.reduce((s: number, d: any) => s + d.total_liters, 0) / summary.length).toFixed(1) : '—' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2.5">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Records Table */}
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
            {(data?.items ?? []).map((m: any) => (
                <tr key={m.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-semibold text-green-700">{m.animal_code ?? m.animal_id?.slice(0, 8)}</div>
                    {m.animal_name && <div className="text-xs text-gray-400">{m.animal_name}</div>}
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
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No records found</td></tr>
            )}
          </tbody>
        </table>
        {(data?.total ?? 0) > 20 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-sm text-gray-500">Page {page}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Prev</button>
              <button disabled={(data?.total ?? 0) <= page * 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ─────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Record Milk Production</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div>
                <label className="label">Animal *</label>
                <select className="input" required value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })}>
                  <option value="">Select animal...</option>
                  {(animals?.items ?? []).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.animal_code}{a.name ? ` (${a.name})` : ''} — {a.species}
                    </option>
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
                  <label className="label">
                    {form.session === 'both' ? 'Total Quantity (L) *' : 'Quantity (L) *'}
                  </label>
                  <input type="number" step="0.01" className="input" required value={form.quantity_liters} onChange={e => setForm({ ...form, quantity_liters: e.target.value })} />
                  {form.session === 'both' && form.quantity_liters && (
                    <p className="text-xs text-gray-400 mt-1">
                      = {(parseFloat(form.quantity_liters) / 2).toFixed(2)}L morning + {(parseFloat(form.quantity_liters) / 2).toFixed(2)}L evening
                    </p>
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
                  {createMutation.isPending ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ──────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Import Milk Production from CSV</h2>
              <button onClick={() => { setShowImport(false); setImportRows([]); setImportErrors([]) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Instructions</p>
                <p>Required columns: <span className="font-mono text-xs">Animal Code, Date, Session, Quantity (L)</span></p>
                <p className="mt-1">Session values: <strong>morning</strong>, <strong>evening</strong>, or <strong>both</strong> (both splits quantity equally). Animal Code must match an existing animal.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={downloadTemplate} className="btn-secondary text-sm">⬇ Download Template</button>
                <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm">📂 Choose CSV File</button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </div>
              {importRows.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{importRows.length} rows parsed — preview:</p>
                  <div className="overflow-x-auto border rounded">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50">
                        <tr>{Object.keys(importRows[0]).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(r).map((v: any, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                          </tr>
                        ))}
                        {importRows.length > 5 && (
                          <tr><td colSpan={Object.keys(importRows[0]).length} className="px-2 py-1 text-gray-400">…and {importRows.length - 5} more rows</td></tr>
                        )}
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
