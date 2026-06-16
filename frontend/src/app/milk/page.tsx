'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dairyAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { animal_id: '', production_date: today, session: 'morning', quantity_liters: '', fat_percentage: '', remarks: '' }

export default function MilkPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: ['milk', page],
    queryFn: () => dairyAPI.listMilk({ page, per_page: 20 }).then(r => r.data.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['milk-summary'],
    queryFn: () => dairyAPI.dailySummary(14).then(r => r.data.data),
  })

  const { data: animals } = useQuery({
    queryKey: ['animals-list'],
    queryFn: () => animalsAPI.list({ per_page: 100, species: 'buffalo' }).then(r => r.data.data),
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ ...form, quantity_liters: parseFloat(form.quantity_liters), fat_percentage: form.fat_percentage ? parseFloat(form.fat_percentage) : undefined })
  }

  // Calculate totals
  const totalToday = (data?.items ?? []).filter((m: any) => m.production_date === today).reduce((s: number, m: any) => s + parseFloat(m.quantity_liters), 0)

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Milk Production</h1>
          <p className="page-subtitle">Today: {totalToday.toFixed(1)}L recorded</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Record Milk</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart */}
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

        {/* Milk Sales Summary */}
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
              {['Animal', 'Date', 'Session', 'Quantity (L)', 'Fat %', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((m: any) => (
              <tr key={m.id} className="table-row">
                <td className="table-cell font-mono font-medium text-green-700">{m.animal_id?.slice(0, 8)}...</td>
                <td className="table-cell">{m.production_date}</td>
                <td className="table-cell capitalize">
                  <span className={m.session === 'morning' ? 'badge-info' : 'badge-warning'}>{m.session}</span>
                </td>
                <td className="table-cell font-semibold">{parseFloat(m.quantity_liters).toFixed(2)}</td>
                <td className="table-cell">{m.fat_percentage ? `${m.fat_percentage}%` : '—'}</td>
                <td className="table-cell">
                  <button onClick={() => deleteMutation.mutate(m.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No records found</td></tr>
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

      {/* Add Modal */}
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
                    <option key={a.id} value={a.id}>{a.animal_code} {a.name ? `(${a.name})` : ''} — {a.species}</option>
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
                  </select>
                </div>
                <div>
                  <label className="label">Quantity (Liters) *</label>
                  <input type="number" step="0.01" className="input" required value={form.quantity_liters} onChange={e => setForm({ ...form, quantity_liters: e.target.value })} />
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
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
