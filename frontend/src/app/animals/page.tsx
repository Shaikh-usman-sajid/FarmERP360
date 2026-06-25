'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsAPI, adminAPI, breedsAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const SPECIES = ['goat', 'buffalo', 'cattle', 'other']
const STATUSES = ['active', 'sold', 'deceased', 'transferred']
const GENDERS = ['male', 'female']
const OWNERSHIP = ['farm', 'investor', 'shared', 'pallai']

const emptyForm = {
  animal_code: '', name: '', species: 'goat', breed: '', gender: 'female',
  date_of_birth: '', purchase_date: '', purchase_price: '',
  initial_weight_kg: '', ownership_type: 'farm', notes: '',
}

const FINANCIAL_ROLES = ['super_admin', 'owner', 'accountant']
const EDIT_ROLES = ['super_admin', 'owner', 'farm_manager']

// ─── CSV Template Columns (must match AnimalCreate) ───────────────────────────
const IMPORT_COLUMNS = [
  { key: 'animal_code',      label: 'Animal Code',         required: true,  example: 'G0010' },
  { key: 'name',             label: 'Name',                required: false, example: 'Shari' },
  { key: 'species',          label: 'Species',             required: true,  example: 'goat' },
  { key: 'breed',            label: 'Breed',               required: false, example: 'Beetal' },
  { key: 'gender',           label: 'Gender',              required: true,  example: 'female' },
  { key: 'date_of_birth',    label: 'Date of Birth',       required: false, example: '2023-01-15' },
  { key: 'purchase_date',    label: 'Purchase Date',       required: false, example: '2024-03-01' },
  { key: 'purchase_price',   label: 'Purchase Price (PKR)',required: false, example: '45000' },
  { key: 'initial_weight_kg',label: 'Initial Weight (kg)', required: false, example: '30' },
  { key: 'ear_tag',          label: 'Ear Tag',             required: false, example: 'ET-001' },
  { key: 'ownership_type',   label: 'Ownership',           required: false, example: 'farm' },
  { key: 'notes',            label: 'Notes',               required: false, example: 'Healthy' },
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

export default function AnimalsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role ?? ''
  const canEdit = EDIT_ROLES.includes(role)
  const canSeeFinancials = FINANCIAL_ROLES.includes(role)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('')
  const [status, setStatus] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [editAnimal, setEditAnimal] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})

  const [viewAnimal, setViewAnimal] = useState<any>(null)

  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['animals', page, search, species, status],
    queryFn: () => animalsAPI.list({ page, per_page: 20, search, species: species || undefined, status: status || undefined }).then(r => r.data.data),
  })

  const { data: breedsData } = useQuery({
    queryKey: ['breeds'],
    queryFn: () => breedsAPI.list().then(r => r.data.data),
  })

  const { data: weights } = useQuery({
    queryKey: ['weights', viewAnimal?.id],
    queryFn: () => animalsAPI.getWeights(viewAnimal.id).then(r => r.data.data),
    enabled: !!viewAnimal,
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => animalsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal added!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create animal'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => animalsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal updated'); setEditAnimal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => animalsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal removed') },
  })

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => animalsAPI.importBulk(rows),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['animals'] })
      const { created, skipped, errors } = res.data
      toast.success(`Imported ${created} animals${skipped ? `, ${skipped} skipped` : ''}`)
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...form }
    if (!payload.date_of_birth) delete payload.date_of_birth
    if (!payload.purchase_date) delete payload.purchase_date
    if (payload.purchase_price) payload.purchase_price = parseFloat(payload.purchase_price)
    else delete payload.purchase_price
    if (payload.initial_weight_kg) payload.initial_weight_kg = parseFloat(payload.initial_weight_kg)
    else delete payload.initial_weight_kg
    createMutation.mutate(payload)
  }

  const openEdit = (a: any) => {
    setEditAnimal(a)
    setEditForm({
      name: a.name || '',
      species: a.species,
      breed: a.breed || '',
      status: a.status,
      ownership_type: a.ownership_type,
      ear_tag: a.ear_tag || '',
      rfid_tag: a.rfid_tag || '',
      purchase_price: a.purchase_price ?? '',
      purchase_date: a.purchase_date || '',
      date_of_birth: a.date_of_birth || '',
      notes: a.notes || '',
    })
  }

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...editForm }
    if (payload.purchase_price !== '' && payload.purchase_price != null)
      payload.purchase_price = parseFloat(payload.purchase_price)
    else delete payload.purchase_price
    if (!payload.purchase_date) delete payload.purchase_date
    if (!payload.date_of_birth) delete payload.date_of_birth
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    updateMutation.mutate({ id: editAnimal.id, data: payload })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string)
      setImportRows(rows)
      setImportErrors([])
    }
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const header = IMPORT_COLUMNS.map(c => c.label).join(',')
    const example = IMPORT_COLUMNS.map(c => c.example).join(',')
    const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'animals_import_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const LOWERCASE_FIELDS = new Set(['species', 'gender', 'ownership_type'])
  const NUMERIC_FIELDS = new Set(['purchase_price', 'initial_weight_kg'])
  const DATE_FIELDS = new Set(['date_of_birth', 'purchase_date'])

  function toISODate(raw: string): string | null {
    const s = raw.trim()
    if (!s) return null
    // Already ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // MM/DD/YYYY or DD/MM/YYYY — try both interpretations via Date.parse
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const parts = s.split('/')
      // Build YYYY-MM-DD from MM/DD/YYYY (the more common Excel US format)
      const candidate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      if (!isNaN(Date.parse(candidate))) return candidate
    }
    // DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      const parts = s.split('-')
      const candidate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      if (!isNaN(Date.parse(candidate))) return candidate
    }
    return null
  }

  const submitImport = () => {
    if (!importRows.length) return
    const mapped = importRows.map(r => {
      const obj: any = {}
      IMPORT_COLUMNS.forEach(col => {
        const val = ((r[col.label] || r[col.key]) ?? '').toString().trim()
        if (!val) return
        if (NUMERIC_FIELDS.has(col.key)) {
          const n = parseFloat(val)
          if (!isNaN(n)) obj[col.key] = n
        } else if (DATE_FIELDS.has(col.key)) {
          const iso = toISODate(val)
          if (iso) obj[col.key] = iso
        } else if (LOWERCASE_FIELDS.has(col.key)) {
          obj[col.key] = val.toLowerCase()
        } else {
          obj[col.key] = val
        }
      })
      return obj
    })
    importMutation.mutate(mapped)
  }

  const statusBadge = (s: string) => {
    const map: any = { active: 'badge-active', sold: 'badge-gray', deceased: 'badge-danger', transferred: 'badge-info' }
    return <span className={map[s] || 'badge-gray'}>{s}</span>
  }

  const allBreeds = (breedsData ?? []) as any[]
  const addBreeds = allBreeds.filter(b => !b.species || b.species === form.species)
  const editBreeds = allBreeds.filter(b => !b.species || b.species === editForm.species)

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Animal Management</h1>
          <p className="page-subtitle">{data?.total ?? 0} animals registered</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButtons
            columns={[
              { header: 'Animal Code', key: 'animal_code' },
              { header: 'Name', key: 'name' },
              { header: 'Species', key: 'species' },
              { header: 'Breed', key: 'breed' },
              { header: 'Gender', key: 'gender' },
              { header: 'Date of Birth', key: 'date_of_birth' },
              { header: 'Status', key: 'status' },
              { header: 'Ownership', key: 'ownership_type' },
              ...(canSeeFinancials ? [{ header: 'Purchase Price (PKR)', key: 'purchase_price' }] : []),
              { header: 'Current Value (PKR)', key: 'current_value' },
            ]}
            rows={(data?.items ?? []).map((a: any) => ({
              animal_code: a.animal_code, name: a.name || '', species: a.species,
              breed: a.breed || '', gender: a.gender, date_of_birth: a.date_of_birth || '',
              status: a.status, ownership_type: a.ownership_type,
              ...(canSeeFinancials ? { purchase_price: a.purchase_price ?? '' } : {}),
              current_value: a.current_value ?? '',
            }))}
            filename="farmerp360-animals"
            title="Animals"
          />
          {canEdit && (
            <button onClick={() => setShowImport(true)} className="btn-secondary">⬆ Import CSV</button>
          )}
          {canEdit && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Animal</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search by code, name, ear tag..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <select className="input max-w-[160px]" value={species} onChange={e => { setSpecies(e.target.value); setPage(1) }}>
          <option value="">All Species</option>
          {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input max-w-[160px]" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || species || status) && (
          <button onClick={() => { setSearch(''); setSpecies(''); setStatus(''); setPage(1) }} className="btn-secondary text-xs">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Code', 'Name', 'Species', 'Breed', 'Gender', 'Status',
                ...(canSeeFinancials ? ['Purchase (PKR)'] : []),
                'Current Value (PKR)', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={canSeeFinancials ? 9 : 8} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : (data?.items ?? []).length === 0 ? (
              <tr><td colSpan={canSeeFinancials ? 9 : 8} className="text-center py-12 text-gray-400">No animals found</td></tr>
            ) : (data?.items ?? []).map((a: any) => (
              <tr key={a.id} className="table-row cursor-pointer" onClick={() => setViewAnimal(a)}>
                <td className="table-cell font-mono font-semibold text-green-700">{a.animal_code}</td>
                <td className="table-cell">{a.name || '—'}</td>
                <td className="table-cell capitalize">{a.species}</td>
                <td className="table-cell">{a.breed || '—'}</td>
                <td className="table-cell capitalize">{a.gender}</td>
                <td className="table-cell">{statusBadge(a.status)}</td>
                {canSeeFinancials && (
                  <td className="table-cell">{a.purchase_price ? `PKR ${Number(a.purchase_price).toLocaleString()}` : '—'}</td>
                )}
                <td className="table-cell font-semibold text-green-700">
                  {a.current_value ? `PKR ${Number(a.current_value).toLocaleString()}` : '—'}
                </td>
                <td className="table-cell" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
                      try {
                        const res = await adminAPI.getAnimalQrCode(a.id, window.location.origin)
                        const url = URL.createObjectURL(res.data)
                        const link = document.createElement('a'); link.href = url; link.download = `animal_${a.animal_code}_qr.png`; link.click()
                        URL.revokeObjectURL(url)
                      } catch { toast.error('QR code failed') }
                    }} title="Download QR Code" className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>QR</button>
                    {canEdit && (
                      <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                    )}
                    {canEdit && (
                      <button onClick={() => { if (confirm('Remove this animal?')) deleteMutation.mutate(a.id) }} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(data?.total ?? 0) > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil((data?.total ?? 0) / 20)}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Prev</button>
              <button disabled={(data?.total ?? 0) <= page * 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Animal Modal ─────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add New Animal</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Animal Code *</label>
                  <input className="input" required value={form.animal_code} onChange={e => setForm({ ...form, animal_code: e.target.value })} placeholder="e.g. G0006" />
                </div>
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Optional name" />
                </div>
                <div>
                  <label className="label">Species *</label>
                  <select className="input" value={form.species} onChange={e => setForm({ ...form, species: e.target.value, breed: '' })}>
                    {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Breed</label>
                  {addBreeds.length > 0 ? (
                    <select className="input" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })}>
                      <option value="">Select breed…</option>
                      {addBreeds.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="e.g. Beetal" />
                  )}
                </div>
                <div>
                  <label className="label">Gender *</label>
                  <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <label className="label">Initial Weight (kg)</label>
                  <input type="number" step="0.1" className="input" value={form.initial_weight_kg} onChange={e => setForm({ ...form, initial_weight_kg: e.target.value })} placeholder="e.g. 35.5" />
                </div>
                {canSeeFinancials && (
                  <div>
                    <label className="label">Purchase Price (PKR)</label>
                    <input type="number" className="input" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                  </div>
                )}
                <div>
                  <label className="label">Purchase Date</label>
                  <input type="date" className="input" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Ownership</label>
                  <select className="input" value={form.ownership_type} onChange={e => setForm({ ...form, ownership_type: e.target.value })}>
                    {OWNERSHIP.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Add Animal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Animal Modal ────────────────────────────────── */}
      {editAnimal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Edit Animal — {editAnimal.animal_code}</h2>
              <button onClick={() => setEditAnimal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={submitEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Species</label>
                  <select className="input" value={editForm.species} onChange={e => setEditForm({ ...editForm, species: e.target.value, breed: '' })}>
                    {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Breed</label>
                  {editBreeds.length > 0 ? (
                    <select className="input" value={editForm.breed} onChange={e => setEditForm({ ...editForm, breed: e.target.value })}>
                      <option value="">Select breed…</option>
                      {editBreeds.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={editForm.breed} onChange={e => setEditForm({ ...editForm, breed: e.target.value })} />
                  )}
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Ownership</label>
                  <select className="input" value={editForm.ownership_type} onChange={e => setEditForm({ ...editForm, ownership_type: e.target.value })}>
                    {OWNERSHIP.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Ear Tag</label>
                  <input className="input" value={editForm.ear_tag} onChange={e => setEditForm({ ...editForm, ear_tag: e.target.value })} />
                </div>
                <div>
                  <label className="label">RFID Tag</label>
                  <input className="input" value={editForm.rfid_tag} onChange={e => setEditForm({ ...editForm, rfid_tag: e.target.value })} />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <label className="label">Purchase Date</label>
                  <input type="date" className="input" value={editForm.purchase_date} onChange={e => setEditForm({ ...editForm, purchase_date: e.target.value })} />
                </div>
                {canSeeFinancials && (
                  <div>
                    <label className="label">Purchase Price (PKR)</label>
                    <input type="number" className="input" value={editForm.purchase_price} onChange={e => setEditForm({ ...editForm, purchase_price: e.target.value })} />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditAnimal(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ─────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Import Animals from CSV</h2>
              <button onClick={() => { setShowImport(false); setImportRows([]); setImportErrors([]) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Instructions</p>
                <p>Upload a CSV with columns: <span className="font-mono text-xs">{IMPORT_COLUMNS.map(c => c.label).join(', ')}</span></p>
                <p className="mt-1">Required columns: animal_code, species, gender. Duplicate codes are skipped.</p>
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
                        {importRows.length > 5 && <tr><td colSpan={Object.keys(importRows[0]).length} className="px-2 py-1 text-gray-400">…and {importRows.length - 5} more rows</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 space-y-1">
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

      {/* ── View Animal Drawer ───────────────────────────────── */}
      {viewAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">{viewAnimal.animal_code}</h2>
                <p className="text-sm text-gray-500 capitalize">{viewAnimal.species} · {viewAnimal.breed || 'Unknown breed'}</p>
              </div>
              <button onClick={() => setViewAnimal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Name', viewAnimal.name || '—'],
                  ['Gender', viewAnimal.gender],
                  ['DOB', viewAnimal.date_of_birth || '—'],
                  ['Status', viewAnimal.status],
                  ['Ownership', viewAnimal.ownership_type],
                  ['Current Value', viewAnimal.current_value ? `PKR ${Number(viewAnimal.current_value).toLocaleString()}` : '—'],
                  ...(canSeeFinancials ? [
                    ['Purchase Price', viewAnimal.purchase_price ? `PKR ${Number(viewAnimal.purchase_price).toLocaleString()}` : '—'],
                    ['Feed Cost (Total)', viewAnimal.feed_cost ? `PKR ${Number(viewAnimal.feed_cost).toLocaleString()}` : '—'],
                  ] : []),
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400">{k}</div>
                    <div className="text-sm font-medium text-gray-800 capitalize">{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Weight History</h3>
                <div className="space-y-2">
                  {(weights ?? []).slice(0, 8).map((w: any) => (
                    <div key={w.id} className="flex justify-between text-sm bg-green-50 rounded px-3 py-2">
                      <span className="text-gray-500">{w.recorded_date}</span>
                      <span className="font-semibold text-green-700">{w.weight_kg} kg</span>
                    </div>
                  ))}
                  {(weights ?? []).length === 0 && <p className="text-gray-400 text-xs">No weight records</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
