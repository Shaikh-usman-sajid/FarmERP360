'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { healthAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { animal_id: '', diagnosis: '', treatment_description: '', medicine_used: '', treatment_date: today, follow_up_date: '', treated_by: '', cost: '' }

export default function TreatmentsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => healthAPI.listTreatments({ per_page: 50 }).then(r => r.data.data),
  })

  const { data: animals } = useQuery({
    queryKey: ['animals-all'],
    queryFn: () => animalsAPI.list({ per_page: 100 }).then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => healthAPI.createTreatment(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treatments'] }); toast.success('Treatment recorded!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => healthAPI.deleteTreatment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treatments'] }); toast.success('Deleted') },
  })

  const getAnimalCode = (id: string) => animals?.items?.find((a: any) => a.id === id)?.animal_code || id.slice(0, 8)

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Treatment Records</h1>
          <p className="page-subtitle">{data?.total ?? 0} treatment records</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Animal', key: 'animal' },
              { header: 'Diagnosis', key: 'diagnosis' },
              { header: 'Treatment', key: 'treatment_description' },
              { header: 'Medication', key: 'medicine_used' },
              { header: 'Cost (PKR)', key: 'cost' },
              { header: 'Vet', key: 'treated_by' },
              { header: 'Date', key: 'treatment_date' },
              { header: 'Status', key: 'status' },
            ]}
            rows={(data?.items ?? []).map((t: any) => ({
              animal: getAnimalCode(t.animal_id),
              diagnosis: t.diagnosis,
              treatment_description: t.treatment_description || '',
              medicine_used: t.medicine_used || '',
              cost: t.cost ? Number(t.cost).toFixed(2) : '',
              treated_by: t.treated_by || '',
              treatment_date: t.treatment_date,
              status: t.is_resolved ? 'Resolved' : 'Active',
            }))}
            filename="farmerp360-treatments"
            title="Treatment Records"
          />
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Treatment</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Animal', 'Diagnosis', 'Treatment Date', 'Medicine', 'Cost (PKR)', 'Treated By', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((t: any) => (
              <tr key={t.id} className="table-row">
                <td className="table-cell font-mono font-semibold text-green-700">{getAnimalCode(t.animal_id)}</td>
                <td className="table-cell font-medium">{t.diagnosis}</td>
                <td className="table-cell">{t.treatment_date}</td>
                <td className="table-cell">{t.medicine_used || '—'}</td>
                <td className="table-cell">{t.cost ? Number(t.cost).toLocaleString() : '—'}</td>
                <td className="table-cell">{t.treated_by || '—'}</td>
                <td className="table-cell">
                  <span className={t.is_resolved ? 'badge-active' : 'badge-warning'}>{t.is_resolved ? 'Resolved' : 'Active'}</span>
                </td>
                <td className="table-cell">
                  <button onClick={() => deleteMutation.mutate(t.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No treatment records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Treatment Record</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              const d: any = { ...form }
              if (!d.follow_up_date) delete d.follow_up_date
              if (d.cost) d.cost = parseFloat(d.cost)
              createMutation.mutate(d)
            }} className="p-5 space-y-4">
              <div>
                <label className="label">Animal *</label>
                <select className="input" required value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })}>
                  <option value="">Select animal...</option>
                  {(animals?.items ?? []).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.animal_code} {a.name ? `(${a.name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Diagnosis *</label>
                <input className="input" required value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. Foot and Mouth Disease" />
              </div>
              <div>
                <label className="label">Treatment Description</label>
                <textarea className="input" rows={2} value={form.treatment_description} onChange={e => setForm({ ...form, treatment_description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Medicine Used</label>
                  <input className="input" value={form.medicine_used} onChange={e => setForm({ ...form, medicine_used: e.target.value })} />
                </div>
                <div>
                  <label className="label">Cost (PKR)</label>
                  <input type="number" className="input" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>
                <div>
                  <label className="label">Treatment Date *</label>
                  <input type="date" className="input" required value={form.treatment_date} onChange={e => setForm({ ...form, treatment_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Follow-up Date</label>
                  <input type="date" className="input" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Treated By</label>
                <input className="input" value={form.treated_by} onChange={e => setForm({ ...form, treated_by: e.target.value })} placeholder="Vet/doctor name" />
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
