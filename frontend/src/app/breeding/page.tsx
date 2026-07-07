'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { healthAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]

const OUTCOMES = ['Successful', 'Unsuccessful', 'Pending', 'Aborted', 'Unknown']

const emptyForm = {
  animal_id: '',
  sire_id: '',
  breeding_date: today,
  expected_delivery: '',
  actual_delivery: '',
  offspring_count: '',
  outcome: 'Pending',
  notes: '',
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cls: Record<string, string> = {
    Successful:   'bg-green-100 text-green-700',
    Unsuccessful: 'bg-red-100 text-red-700',
    Pending:      'bg-yellow-100 text-yellow-700',
    Aborted:      'bg-gray-100 text-gray-600',
    Unknown:      'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[outcome] ?? cls['Unknown']}`}>
      {outcome ?? 'Unknown'}
    </span>
  )
}

export default function BreedingPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [filterAnimal, setFilterAnimal] = useState('')

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['breeding-records', filterAnimal],
    queryFn: () => healthAPI.listBreeding({ per_page: 100, animal_id: filterAnimal || undefined }).then(r => r.data.data),
  })

  const { data: animalsData } = useQuery({
    queryKey: ['animals-breeding'],
    queryFn: () => animalsAPI.list({ per_page: 200, status: 'active' }).then(r => r.data.data?.items ?? []),
  })

  const records: any[] = recordsData?.items ?? []
  const animals: any[] = animalsData ?? []
  const femaleAnimals = animals.filter((a: any) => a.gender === 'female' || a.gender === 'Female')
  const maleAnimals = animals.filter((a: any) => a.gender === 'male' || a.gender === 'Male')

  const saveMutation = useMutation({
    mutationFn: (d: any) => editRecord ? healthAPI.updateBreeding(editRecord.id, d) : healthAPI.createBreeding(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breeding-records'] })
      toast.success(editRecord ? 'Record updated' : 'Breeding record added')
      closeModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => healthAPI.deleteBreeding(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breeding-records'] }); toast.success('Record deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const openAdd = () => { setEditRecord(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (r: any) => {
    setEditRecord(r)
    setForm({
      animal_id: r.animal_id ?? '',
      sire_id: r.sire_id ?? '',
      breeding_date: r.breeding_date ?? today,
      expected_delivery: r.expected_delivery ?? '',
      actual_delivery: r.actual_delivery ?? '',
      offspring_count: r.offspring_count != null ? String(r.offspring_count) : '',
      outcome: r.outcome ?? 'Pending',
      notes: r.notes ?? '',
    })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditRecord(null); setForm(emptyForm) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.animal_id) return toast.error('Please select a dam (female animal)')
    if (!form.breeding_date) return toast.error('Breeding date is required')
    saveMutation.mutate({
      ...form,
      sire_id: form.sire_id || null,
      expected_delivery: form.expected_delivery || null,
      actual_delivery: form.actual_delivery || null,
      offspring_count: form.offspring_count ? parseInt(form.offspring_count) : 0,
    })
  }

  const exportRows = records.map((r: any) => ({
    dam: r.animal_code ? `${r.animal_code}${r.animal_name ? ' — ' + r.animal_name : ''}` : r.animal_id,
    sire: r.sire_code ?? '—',
    breeding_date: r.breeding_date ?? '',
    expected_delivery: r.expected_delivery ?? '—',
    actual_delivery: r.actual_delivery ?? '—',
    offspring_count: r.offspring_count ?? 0,
    outcome: r.outcome ?? '—',
    notes: r.notes ?? '',
  }))

  // Summary stats
  const total = records.length
  const successful = records.filter(r => r.outcome === 'Successful').length
  const pending = records.filter(r => r.outcome === 'Pending').length
  const totalOffspring = records.reduce((s, r) => s + (r.offspring_count ?? 0), 0)

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Breeding Records</h1>
          <p className="page-subtitle">Track animal breeding, expected deliveries, and offspring</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons
            columns={[
              { header: 'Dam (Animal)', key: 'dam' },
              { header: 'Sire', key: 'sire' },
              { header: 'Breeding Date', key: 'breeding_date' },
              { header: 'Expected Delivery', key: 'expected_delivery' },
              { header: 'Actual Delivery', key: 'actual_delivery' },
              { header: 'Offspring Count', key: 'offspring_count' },
              { header: 'Outcome', key: 'outcome' },
              { header: 'Notes', key: 'notes' },
            ]}
            rows={exportRows}
            filename="breeding-records"
            title="Breeding Records"
          />
          <button onClick={openAdd} className="btn-primary">+ Add Record</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Records', value: total, color: 'text-gray-900' },
          { label: 'Successful', value: successful, color: 'text-green-600' },
          { label: 'Pending / In Progress', value: pending, color: 'text-yellow-600' },
          { label: 'Total Offspring', value: totalOffspring, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Filter by Animal</label>
            <select className="input" value={filterAnimal} onChange={e => setFilterAnimal(e.target.value)}>
              <option value="">All Animals</option>
              {animals.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.animal_code}{a.name ? ` — ${a.name}` : ''} ({a.species?.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
          {filterAnimal && (
            <button onClick={() => setFilterAnimal('')} className="btn-secondary text-sm self-end">✕ Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading breeding records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {['Dam (Female)', 'Sire (Male)', 'Breeding Date', 'Expected Delivery', 'Actual Delivery', 'Offspring', 'Outcome', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <p className="text-4xl mb-3">🐄</p>
                      <p className="font-medium">No breeding records yet</p>
                      <button onClick={openAdd} className="mt-2 btn-primary text-sm">+ Add First Record</button>
                    </td>
                  </tr>
                ) : (
                  records.map((r: any) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell">
                        <span className="font-mono font-semibold text-green-700">{r.animal_code ?? '—'}</span>
                        {r.animal_name && <span className="text-xs text-gray-500 ml-1">({r.animal_name})</span>}
                      </td>
                      <td className="table-cell">
                        {r.sire_code
                          ? <span className="font-mono text-sm">{r.sire_code}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell">{r.breeding_date}</td>
                      <td className="table-cell">{r.expected_delivery ?? <span className="text-gray-300">—</span>}</td>
                      <td className="table-cell">{r.actual_delivery ?? <span className="text-gray-300">—</span>}</td>
                      <td className="table-cell text-center font-semibold">{r.offspring_count ?? 0}</td>
                      <td className="table-cell"><OutcomeBadge outcome={r.outcome} /></td>
                      <td className="table-cell">
                        <div className="flex gap-3">
                          <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                          <button
                            onClick={() => { if (confirm('Delete this breeding record?')) deleteMutation.mutate(r.id) }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editRecord ? 'Edit Breeding Record' : 'Add Breeding Record'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dam (Female Animal) *</label>
                  <select className="input" required value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })} disabled={!!editRecord}>
                    <option value="">Select female animal...</option>
                    {femaleAnimals.length > 0
                      ? femaleAnimals.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` — ${a.name}` : ''}</option>
                        ))
                      : animals.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` — ${a.name}` : ''} ({a.gender ?? 'unknown'})</option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label className="label">Sire (Male Animal)</label>
                  <select className="input" value={form.sire_id} onChange={e => setForm({ ...form, sire_id: e.target.value })}>
                    <option value="">Select male animal...</option>
                    {maleAnimals.length > 0
                      ? maleAnimals.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` — ${a.name}` : ''}</option>
                        ))
                      : animals.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` — ${a.name}` : ''} ({a.gender ?? 'unknown'})</option>
                        ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Breeding Date *</label>
                  <input type="date" className="input" required value={form.breeding_date} onChange={e => setForm({ ...form, breeding_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Expected Delivery</label>
                  <input type="date" className="input" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Actual Delivery</label>
                  <input type="date" className="input" value={form.actual_delivery} onChange={e => setForm({ ...form, actual_delivery: e.target.value })} />
                </div>
                <div>
                  <label className="label">Offspring Count</label>
                  <input type="number" min="0" className="input" value={form.offspring_count} onChange={e => setForm({ ...form, offspring_count: e.target.value })} placeholder="0" />
                </div>
              </div>

              <div>
                <label className="label">Outcome</label>
                <select className="input" value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}>
                  {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editRecord ? 'Save Changes' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
