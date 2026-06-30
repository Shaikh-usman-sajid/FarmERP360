'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { healthAPI, animalsAPI, inventoryAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]
const emptyForm = { animal_id: '', diagnosis: '', treatment_description: '', medicine_used: '', treatment_date: today, follow_up_date: '', treated_by: '', cost: '', medicine_product_id: '', medicine_quantity: '' }

export default function TreatmentsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAnimal, setFilterAnimal] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterVet, setFilterVet] = useState('')

  const [viewTreatment, setViewTreatment] = useState<any>(null)
  const [editTreatment, setEditTreatment] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})

  const hasFilter = !!(search || filterStatus || filterAnimal || filterDateFrom || filterDateTo || filterVet)

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('')
    setFilterAnimal('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterVet('')
  }

  const { data } = useQuery({
    queryKey: ['treatments', search, filterStatus, filterAnimal, filterDateFrom, filterDateTo, filterVet],
    queryFn: () => healthAPI.listTreatments({
      per_page: 50,
      ...(search && { search }),
      ...(filterStatus && { is_resolved: filterStatus === 'resolved' ? 'true' : 'false' }),
      ...(filterAnimal && { animal_id: filterAnimal }),
      ...(filterDateFrom && { date_from: filterDateFrom }),
      ...(filterDateTo && { date_to: filterDateTo }),
      ...(filterVet && { treated_by: filterVet }),
    }).then(r => r.data.data),
  })

  const { data: animals } = useQuery({
    queryKey: ['animals-all'],
    queryFn: () => animalsAPI.list({ per_page: 100 }).then(r => r.data.data),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => inventoryAPI.listProducts({ per_page: 200 }).then(r => r.data.data),
  })
  const medicineProducts: any[] = productsData?.items ?? []

  const createMutation = useMutation({
    mutationFn: (d: any) => healthAPI.createTreatment(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treatments'] }); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Treatment recorded!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => healthAPI.updateTreatment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatments'] })
      toast.success('Treatment updated')
      setEditTreatment(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => healthAPI.deleteTreatment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treatments'] }); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Deleted') },
  })

  const getAnimalCode = (id: string) => animals?.items?.find((a: any) => a.id === id)?.animal_code || id.slice(0, 8)
  const getAnimalName = (id: string) => animals?.items?.find((a: any) => a.id === id)?.name || ''

  const openEdit = (t: any) => {
    setEditTreatment(t)
    setEditForm({
      diagnosis: t.diagnosis || '',
      treatment_description: t.treatment_description || '',
      medicine_used: t.medicine_used || '',
      treatment_date: t.treatment_date || today,
      follow_up_date: t.follow_up_date || '',
      treated_by: t.treated_by || '',
      cost: t.cost ? String(t.cost) : '',
      is_resolved: t.is_resolved || false,
    })
  }

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...editForm }
    if (payload.cost) payload.cost = parseFloat(payload.cost)
    else delete payload.cost
    if (!payload.follow_up_date) delete payload.follow_up_date
    updateMutation.mutate({ id: editTreatment.id, data: payload })
  }

  const treatmentItems: any[] = data?.items ?? []

  // For view panel: treatments for the same animal
  const animalTreatments = viewTreatment
    ? treatmentItems.filter((t: any) => t.animal_id === viewTreatment.animal_id)
    : []

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
              { header: 'Cost (PKR)', key: 'cost' },
              { header: 'Vet', key: 'treated_by' },
              { header: 'Date', key: 'treatment_date' },
              { header: 'Status', key: 'status' },
            ]}
            rows={treatmentItems.map((t: any) => ({
              animal: getAnimalCode(t.animal_id),
              diagnosis: t.diagnosis,
              treatment_description: t.treatment_description || '',
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

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Diagnosis..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="label">Animal</label>
            <select className="input" value={filterAnimal} onChange={e => setFilterAnimal(e.target.value)}>
              <option value="">All animals</option>
              {(animals?.items ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` (${a.name})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input type="date" className="input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" className="input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Vet / Treated By</label>
            <input
              className="input"
              placeholder="Vet name..."
              value={filterVet}
              onChange={e => setFilterVet(e.target.value)}
            />
          </div>
          {hasFilter && (
            <button onClick={clearFilters} className="btn-secondary whitespace-nowrap">✕ Clear</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Animal', 'Diagnosis', 'Treatment Date', 'Cost (PKR)', 'Treated By', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {treatmentItems.map((t: any) => (
              <tr key={t.id} className="table-row">
                <td className="table-cell font-mono font-semibold text-green-700">{getAnimalCode(t.animal_id)}</td>
                <td className="table-cell font-medium">{t.diagnosis}</td>
                <td className="table-cell">{t.treatment_date}</td>
                <td className="table-cell">{t.cost ? Number(t.cost).toLocaleString() : '—'}</td>
                <td className="table-cell">{t.treated_by || '—'}</td>
                <td className="table-cell">
                  <span className={t.is_resolved ? 'badge-active' : 'badge-warning'}>{t.is_resolved ? 'Resolved' : 'Active'}</span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setViewTreatment(t)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(t.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {treatmentItems.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No treatment records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── View Treatment Panel ─────────────────────────────── */}
      {viewTreatment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full sm:w-[860px] h-full flex overflow-hidden shadow-2xl">
            {/* Left: animal treatment list */}
            <div className="w-56 border-r bg-gray-50 flex flex-col flex-shrink-0">
              <div className="p-4 border-b bg-white">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Animal</p>
                <p className="font-bold text-green-700 font-mono">{getAnimalCode(viewTreatment.animal_id)}</p>
                {getAnimalName(viewTreatment.animal_id) && (
                  <p className="text-xs text-gray-500">{getAnimalName(viewTreatment.animal_id)}</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs text-gray-400 uppercase tracking-wide px-3 py-2 font-semibold">All Treatments</p>
                {animalTreatments.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setViewTreatment(t)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-green-50 transition-colors ${
                      t.id === viewTreatment.id ? 'bg-green-50 border-l-2 border-l-green-600' : ''
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-800 truncate">{t.diagnosis}</p>
                    <p className="text-xs text-gray-400">{t.treatment_date}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.is_resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.is_resolved ? 'Resolved' : 'Active'}
                    </span>
                  </button>
                ))}
                {animalTreatments.length === 0 && (
                  <p className="text-xs text-gray-400 px-3 py-4">No other treatments</p>
                )}
              </div>
            </div>

            {/* Right: treatment details */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between p-5 border-b">
                <div>
                  <h2 className="text-lg font-bold">Treatment Details</h2>
                  <p className="text-xs text-gray-400">{viewTreatment.treatment_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { openEdit(viewTreatment); setViewTreatment(null) }}
                    className="btn-secondary text-xs"
                  >
                    Edit
                  </button>
                  <button onClick={() => setViewTreatment(null)} className="text-gray-400 text-xl ml-2">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Diagnosis</p>
                    <p className="font-semibold text-gray-900">{viewTreatment.diagnosis}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${viewTreatment.is_resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {viewTreatment.is_resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Treatment Date</p>
                    <p className="font-medium">{viewTreatment.treatment_date}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Follow-up Date</p>
                    <p className="font-medium">{viewTreatment.follow_up_date || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Treated By</p>
                    <p className="font-medium">{viewTreatment.treated_by || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Cost (PKR)</p>
                    <p className="font-bold text-green-700">{viewTreatment.cost ? Number(viewTreatment.cost).toLocaleString('en-PK') : '—'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Treatment Description</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewTreatment.treatment_description || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Medicine Used</p>
                  <p className="text-sm text-gray-800">{viewTreatment.medicine_used || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Treatment Modal ─────────────────────────────── */}
      {editTreatment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Edit Treatment</h2>
              <button onClick={() => setEditTreatment(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={submitEdit} className="p-5 space-y-4">
              <div>
                <label className="label">Diagnosis *</label>
                <input className="input" required value={editForm.diagnosis} onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })} />
              </div>
              <div>
                <label className="label">Treatment Description</label>
                <textarea className="input" rows={2} value={editForm.treatment_description} onChange={e => setEditForm({ ...editForm, treatment_description: e.target.value })} />
              </div>
              <div>
                <label className="label">Medicine Used</label>
                <input className="input" value={editForm.medicine_used} onChange={e => setEditForm({ ...editForm, medicine_used: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Treatment Date *</label>
                  <input type="date" className="input" required value={editForm.treatment_date} onChange={e => setEditForm({ ...editForm, treatment_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Follow-up Date</label>
                  <input type="date" className="input" value={editForm.follow_up_date} onChange={e => setEditForm({ ...editForm, follow_up_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Cost (PKR)</label>
                  <input type="number" className="input" value={editForm.cost} onChange={e => setEditForm({ ...editForm, cost: e.target.value })} />
                </div>
                <div>
                  <label className="label">Treated By</label>
                  <input className="input" value={editForm.treated_by} onChange={e => setEditForm({ ...editForm, treated_by: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_resolved"
                  checked={editForm.is_resolved}
                  onChange={e => setEditForm({ ...editForm, is_resolved: e.target.checked })}
                  className="h-4 w-4 text-green-600 rounded"
                />
                <label htmlFor="is_resolved" className="text-sm text-gray-700">Mark as Resolved</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditTreatment(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Treatment Modal ─────────────────────────────── */}
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
              if (d.medicine_product_id && d.medicine_quantity) d.medicine_quantity = parseFloat(d.medicine_quantity)
              else { delete d.medicine_product_id; delete d.medicine_quantity }
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
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medicine from Inventory (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Medicine Product</label>
                    <select className="input" value={form.medicine_product_id} onChange={e => setForm({ ...form, medicine_product_id: e.target.value, medicine_quantity: '' })}>
                      <option value="">None / not tracked</option>
                      {medicineProducts.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.current_stock).toFixed(1)} {p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quantity Used</label>
                    <input type="number" step="0.001" min="0.001" className="input" value={form.medicine_quantity} onChange={e => setForm({ ...form, medicine_quantity: e.target.value })} placeholder="e.g. 5" disabled={!form.medicine_product_id} />
                  </div>
                </div>
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
