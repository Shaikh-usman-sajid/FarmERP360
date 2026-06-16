'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { healthAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { animal_id: '', vaccine_name: '', administered_date: today, next_due_date: '', administered_by: '', dose: '', notes: '' }

export default function VaccinationPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: ['vaccinations', page],
    queryFn: () => healthAPI.listVaccinations({ page, per_page: 20 }).then(r => r.data.data),
  })

  const { data: animals } = useQuery({
    queryKey: ['animals-all'],
    queryFn: () => animalsAPI.list({ per_page: 100 }).then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => healthAPI.createVaccination(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vaccinations'] }); toast.success('Vaccination recorded!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => healthAPI.deleteVaccination(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vaccinations'] }); toast.success('Deleted') },
  })

  const getAnimalCode = (id: string) => animals?.items?.find((a: any) => a.id === id)?.animal_code || id.slice(0, 8)

  const isDueSoon = (d: string) => {
    if (!d) return false
    const diff = (new Date(d).getTime() - Date.now()) / 86400000
    return diff <= 7 && diff >= 0
  }

  const isOverdue = (d: string) => {
    if (!d) return false
    return new Date(d) < new Date()
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vaccination Records</h1>
          <p className="page-subtitle">{data?.total ?? 0} total records</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Vaccination</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Animal', 'Vaccine', 'Administered', 'By', 'Dose', 'Next Due', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((v: any) => (
              <tr key={v.id} className="table-row">
                <td className="table-cell font-mono font-semibold text-green-700">{getAnimalCode(v.animal_id)}</td>
                <td className="table-cell font-medium">{v.vaccine_name}</td>
                <td className="table-cell">{v.administered_date}</td>
                <td className="table-cell">{v.administered_by || '—'}</td>
                <td className="table-cell">{v.dose || '—'}</td>
                <td className="table-cell">{v.next_due_date || '—'}</td>
                <td className="table-cell">
                  {v.next_due_date ? (
                    isOverdue(v.next_due_date) ? <span className="badge-danger">Overdue</span>
                    : isDueSoon(v.next_due_date) ? <span className="badge-warning">Due Soon</span>
                    : <span className="badge-active">OK</span>
                  ) : <span className="badge-gray">—</span>}
                </td>
                <td className="table-cell">
                  <button onClick={() => deleteMutation.mutate(v.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No vaccination records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Vaccination Record</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const d: any = { ...form }; if (!d.next_due_date) delete d.next_due_date; createMutation.mutate(d) }} className="p-5 space-y-4">
              <div>
                <label className="label">Animal *</label>
                <select className="input" required value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })}>
                  <option value="">Select animal...</option>
                  {(animals?.items ?? []).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.animal_code} {a.name ? `(${a.name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Vaccine Name *</label>
                  <input className="input" required value={form.vaccine_name} onChange={e => setForm({ ...form, vaccine_name: e.target.value })} placeholder="e.g. FMD Vaccine" />
                </div>
                <div>
                  <label className="label">Dose</label>
                  <input className="input" value={form.dose} onChange={e => setForm({ ...form, dose: e.target.value })} placeholder="e.g. 2ml" />
                </div>
                <div>
                  <label className="label">Administered Date *</label>
                  <input type="date" className="input" required value={form.administered_date} onChange={e => setForm({ ...form, administered_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Next Due Date</label>
                  <input type="date" className="input" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Administered By</label>
                <input className="input" value={form.administered_by} onChange={e => setForm({ ...form, administered_by: e.target.value })} placeholder="Vet name" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
