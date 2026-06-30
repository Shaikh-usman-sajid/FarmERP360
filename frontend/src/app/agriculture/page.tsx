'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agricultureAPI, inventoryAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import toast from 'react-hot-toast'

const emptyField = { name: '', area_acres: '', soil_type: '', location_description: '' }
const emptyCrop = { field_id: '', crop_name: '', variety: '', sowing_date: '', expected_harvest_date: '', seed_product_id: '', seed_quantity: '', seed_cost: '', fertilizer_cost: '', labor_cost: '', expected_yield_kg: '' }

const statusColors: any = { planned: 'badge-info', growing: 'badge-active', harvested: 'badge-gray', failed: 'badge-danger' }

export default function AgriculturePage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'fields' | 'crops'>('fields')
  const [showAddField, setShowAddField] = useState(false)
  const [showAddCrop, setShowAddCrop] = useState(false)
  const [fieldForm, setFieldForm] = useState(emptyField)
  const [cropForm, setCropForm] = useState(emptyCrop)

  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldSoilType, setFieldSoilType] = useState('')

  const [cropSearch, setCropSearch] = useState('')
  const [cropStatus, setCropStatus] = useState('')
  const [cropFieldId, setCropFieldId] = useState('')
  const [cropSowingFrom, setCropSowingFrom] = useState('')
  const [cropSowingTo, setCropSowingTo] = useState('')

  const hasFieldFilter = !!(fieldSearch || fieldSoilType)
  const hasCropFilter = !!(cropSearch || cropStatus || cropFieldId || cropSowingFrom || cropSowingTo)

  const clearFieldFilters = () => { setFieldSearch(''); setFieldSoilType('') }
  const clearCropFilters = () => { setCropSearch(''); setCropStatus(''); setCropFieldId(''); setCropSowingFrom(''); setCropSowingTo('') }

  const { data: fields } = useQuery({
    queryKey: ['fields', fieldSearch, fieldSoilType],
    queryFn: () => agricultureAPI.listFields({ search: fieldSearch || undefined, soil_type: fieldSoilType || undefined }).then(r => r.data.data),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => inventoryAPI.listProducts({ per_page: 200 }).then(r => r.data.data),
  })
  const seedProducts: any[] = productsData?.items ?? []

  const { data: crops } = useQuery({
    queryKey: ['crops', cropSearch, cropStatus, cropFieldId, cropSowingFrom, cropSowingTo],
    queryFn: () => agricultureAPI.listCrops({ search: cropSearch || undefined, status: cropStatus || undefined, field_id: cropFieldId || undefined, sowing_date_from: cropSowingFrom || undefined, sowing_date_to: cropSowingTo || undefined }).then(r => r.data.data),
    enabled: tab === 'crops',
  })

  const createField = useMutation({
    mutationFn: (d: any) => agricultureAPI.createField(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fields'] }); toast.success('Field added!'); setShowAddField(false); setFieldForm(emptyField) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const createCrop = useMutation({
    mutationFn: (d: any) => agricultureAPI.createCrop(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crops'] }); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Crop cycle added!'); setShowAddCrop(false); setCropForm(emptyCrop) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const getFieldName = (id: string) => fields?.items?.find((f: any) => f.id === id)?.name || 'Unknown'

  const fieldRows = (fields?.items ?? []).map((f: any) => ({
    name: f.name,
    area_acres: f.area_acres ? parseFloat(f.area_acres).toFixed(1) : '',
    soil_type: f.soil_type ?? '',
    location_description: f.location_description ?? '',
    status: 'Active',
  }))

  const cropRows = (crops?.items ?? []).map((c: any) => ({
    field_name: getFieldName(c.field_id),
    crop_name: c.crop_name,
    variety: c.variety ?? '',
    sowing_date: c.sowing_date ?? '',
    expected_harvest_date: c.expected_harvest_date ?? '',
    status: c.status,
    expected_yield_kg: c.expected_yield_kg ? Number(c.expected_yield_kg).toLocaleString() : '',
    actual_yield_kg: c.actual_yield_kg ? Number(c.actual_yield_kg).toLocaleString() : '',
  }))

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agriculture Management</h1>
          <p className="page-subtitle">Fields and crop cycles</p>
        </div>
        <div className="flex gap-2 items-center">
          {tab === 'fields' && (
            <ExportButtons
              columns={[
                { header: 'Field Name', key: 'name' },
                { header: 'Area (Acres)', key: 'area_acres' },
                { header: 'Soil Type', key: 'soil_type' },
                { header: 'Location', key: 'location_description' },
                { header: 'Status', key: 'status' },
              ]}
              rows={fieldRows}
              filename="farmerp360-agriculture-fields"
              title="Agriculture Fields"
            />
          )}
          {tab === 'crops' && (
            <ExportButtons
              columns={[
                { header: 'Field', key: 'field_name' },
                { header: 'Crop', key: 'crop_name' },
                { header: 'Variety', key: 'variety' },
                { header: 'Sowing Date', key: 'sowing_date' },
                { header: 'Expected Harvest', key: 'expected_harvest_date' },
                { header: 'Status', key: 'status' },
                { header: 'Expected Yield (kg)', key: 'expected_yield_kg' },
                { header: 'Actual Yield (kg)', key: 'actual_yield_kg' },
              ]}
              rows={cropRows}
              filename="farmerp360-agriculture-crops"
              title="Agriculture Crop Cycles"
            />
          )}
          {tab === 'fields' ? (
            <button onClick={() => setShowAddField(true)} className="btn-primary">+ Add Field</button>
          ) : (
            <button onClick={() => setShowAddCrop(true)} className="btn-primary">+ Add Crop Cycle</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
        {(['fields', 'crops'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'fields' ? '🌾 Fields' : '🌱 Crop Cycles'}
          </button>
        ))}
      </div>

      {tab === 'fields' && (
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Search</label>
              <input className="input" placeholder="Field name or location..." value={fieldSearch} onChange={e => setFieldSearch(e.target.value)} />
            </div>
            <div>
              <label className="label">Soil Type</label>
              <select className="input" value={fieldSoilType} onChange={e => setFieldSoilType(e.target.value)}>
                <option value="">All</option>
                {['Loamy', 'Clay', 'Sandy', 'Clay Loam', 'Sandy Loam'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hasFieldFilter && (
              <button onClick={clearFieldFilters} className="btn-secondary text-sm">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {tab === 'crops' && (
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Search</label>
              <input className="input" placeholder="Crop name or variety..." value={cropSearch} onChange={e => setCropSearch(e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={cropStatus} onChange={e => setCropStatus(e.target.value)}>
                <option value="">All</option>
                {['planned', 'growing', 'harvested', 'failed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Field</label>
              <select className="input" value={cropFieldId} onChange={e => setCropFieldId(e.target.value)}>
                <option value="">All Fields</option>
                {(fields?.items ?? []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sowing From</label>
              <input type="date" className="input" value={cropSowingFrom} onChange={e => setCropSowingFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Sowing To</label>
              <input type="date" className="input" value={cropSowingTo} onChange={e => setCropSowingTo(e.target.value)} />
            </div>
            {hasCropFilter && (
              <button onClick={clearCropFilters} className="btn-secondary text-sm">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {tab === 'fields' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {(fields?.items ?? []).map((f: any) => (
              <div key={f.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{f.name}</h3>
                    <p className="text-sm text-gray-400">{f.soil_type || 'Soil type unknown'}</p>
                  </div>
                  <span className="badge-active">Active</span>
                </div>
                <div className="text-2xl font-bold text-green-700">{f.area_acres ? `${parseFloat(f.area_acres).toFixed(1)} acres` : '—'}</div>
              </div>
            ))}
          </div>
          {(fields?.items ?? []).length === 0 && (
            <div className="card p-12 text-center text-gray-400">No fields registered</div>
          )}
        </div>
      )}

      {tab === 'crops' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {['Field', 'Crop', 'Variety', 'Sowing Date', 'Expected Harvest', 'Status', 'Expected Yield', 'Actual Yield'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(crops?.items ?? []).map((c: any) => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium">{getFieldName(c.field_id)}</td>
                  <td className="table-cell font-semibold text-green-700">{c.crop_name}</td>
                  <td className="table-cell">{c.variety || '—'}</td>
                  <td className="table-cell">{c.sowing_date || '—'}</td>
                  <td className="table-cell">{c.expected_harvest_date || '—'}</td>
                  <td className="table-cell"><span className={statusColors[c.status] || 'badge-gray'}>{c.status}</span></td>
                  <td className="table-cell">{c.expected_yield_kg ? `${Number(c.expected_yield_kg).toLocaleString()} kg` : '—'}</td>
                  <td className="table-cell">{c.actual_yield_kg ? `${Number(c.actual_yield_kg).toLocaleString()} kg` : '—'}</td>
                </tr>
              ))}
              {(crops?.items ?? []).length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No crop cycles found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddField && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Field</h2>
              <button onClick={() => setShowAddField(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); const d: any = { ...fieldForm }; if (d.area_acres) d.area_acres = parseFloat(d.area_acres); createField.mutate(d) }} className="p-5 space-y-4">
              <div>
                <label className="label">Field Name *</label>
                <input className="input" required value={fieldForm.name} onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })} placeholder="e.g. Field D - West" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Area (Acres)</label>
                  <input type="number" step="0.1" className="input" value={fieldForm.area_acres} onChange={e => setFieldForm({ ...fieldForm, area_acres: e.target.value })} />
                </div>
                <div>
                  <label className="label">Soil Type</label>
                  <select className="input" value={fieldForm.soil_type} onChange={e => setFieldForm({ ...fieldForm, soil_type: e.target.value })}>
                    <option value="">Select...</option>
                    {['Loamy', 'Clay', 'Sandy', 'Clay Loam', 'Sandy Loam'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddField(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createField.isPending} className="btn-primary">{createField.isPending ? 'Saving...' : 'Add Field'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCrop && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Crop Cycle</h2>
              <button onClick={() => setShowAddCrop(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              const d: any = { ...cropForm }
              if (d.seed_cost) d.seed_cost = parseFloat(d.seed_cost)
              if (d.fertilizer_cost) d.fertilizer_cost = parseFloat(d.fertilizer_cost)
              if (d.labor_cost) d.labor_cost = parseFloat(d.labor_cost)
              if (d.expected_yield_kg) d.expected_yield_kg = parseFloat(d.expected_yield_kg)
              if (!d.sowing_date) delete d.sowing_date
              if (!d.expected_harvest_date) delete d.expected_harvest_date
              if (d.seed_product_id && d.seed_quantity) d.seed_quantity = parseFloat(d.seed_quantity)
              else { delete d.seed_product_id; delete d.seed_quantity }
              createCrop.mutate(d)
            }} className="p-5 space-y-4">
              <div>
                <label className="label">Field *</label>
                <select className="input" required value={cropForm.field_id} onChange={e => setCropForm({ ...cropForm, field_id: e.target.value })}>
                  <option value="">Select field...</option>
                  {(fields?.items ?? []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Crop Name *</label>
                  <input className="input" required value={cropForm.crop_name} onChange={e => setCropForm({ ...cropForm, crop_name: e.target.value })} placeholder="e.g. Berseem" />
                </div>
                <div>
                  <label className="label">Variety</label>
                  <input className="input" value={cropForm.variety} onChange={e => setCropForm({ ...cropForm, variety: e.target.value })} />
                </div>
                <div>
                  <label className="label">Sowing Date</label>
                  <input type="date" className="input" value={cropForm.sowing_date} onChange={e => setCropForm({ ...cropForm, sowing_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Expected Harvest</label>
                  <input type="date" className="input" value={cropForm.expected_harvest_date} onChange={e => setCropForm({ ...cropForm, expected_harvest_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Seed Cost (PKR)</label>
                  <input type="number" className="input" value={cropForm.seed_cost} onChange={e => setCropForm({ ...cropForm, seed_cost: e.target.value })} />
                </div>
                <div>
                  <label className="label">Expected Yield (kg)</label>
                  <input type="number" className="input" value={cropForm.expected_yield_kg} onChange={e => setCropForm({ ...cropForm, expected_yield_kg: e.target.value })} />
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seed from Inventory (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Seed Product</label>
                    <select className="input" value={cropForm.seed_product_id} onChange={e => setCropForm({ ...cropForm, seed_product_id: e.target.value, seed_quantity: '' })}>
                      <option value="">None / not tracked</option>
                      {seedProducts.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.current_stock).toFixed(1)} {p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Seed Quantity Used</label>
                    <input type="number" step="0.001" min="0.001" className="input" value={cropForm.seed_quantity} onChange={e => setCropForm({ ...cropForm, seed_quantity: e.target.value })} placeholder="e.g. 10" disabled={!cropForm.seed_product_id} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddCrop(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createCrop.isPending} className="btn-primary">{createCrop.isPending ? 'Saving...' : 'Add Crop'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
