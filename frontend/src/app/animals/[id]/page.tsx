'use client'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsAPI, healthAPI, dairyAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const FINANCIAL_ROLES = ['super_admin', 'owner', 'accountant']

export default function AnimalDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role ?? ''
  const canSeeFinancials = FINANCIAL_ROLES.includes(role)

  const [weightKg, setWeightKg] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])
  const [weightNotes, setWeightNotes] = useState('')

  const { data: animalData, isLoading } = useQuery({
    queryKey: ['animal', id],
    queryFn: () => animalsAPI.get(id).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: weights } = useQuery({
    queryKey: ['weights', id],
    queryFn: () => animalsAPI.getWeights(id).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: vaccinations } = useQuery({
    queryKey: ['vaccinations', id],
    queryFn: () => healthAPI.listVaccinations({ animal_id: id, per_page: 10 }).then(r => r.data.data?.items ?? r.data.data ?? []),
    enabled: !!id,
  })

  const { data: treatments } = useQuery({
    queryKey: ['treatments', id],
    queryFn: () => healthAPI.listTreatments({ animal_id: id, per_page: 10 }).then(r => r.data.data?.items ?? r.data.data ?? []),
    enabled: !!id,
  })

  const { data: milkData } = useQuery({
    queryKey: ['milk', id],
    queryFn: () => dairyAPI.listMilk({ animal_id: id, per_page: 10 }).then(r => r.data.data?.items ?? r.data.data ?? []),
    enabled: !!id,
  })

  const addWeightMutation = useMutation({
    mutationFn: (data: object) => animalsAPI.addWeight(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weights', id] })
      toast.success('Weight recorded')
      setWeightKg(''); setWeightNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">Loading animal data...</div>
    </DashboardLayout>
  )

  if (!animalData) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">Animal not found</p>
        <button onClick={() => router.push('/animals')} className="btn-primary">← Back to Animals</button>
      </div>
    </DashboardLayout>
  )

  const a = animalData

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    sold: 'bg-gray-100 text-gray-600',
    deceased: 'bg-red-100 text-red-700',
    transferred: 'bg-blue-100 text-blue-700',
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.push('/animals')} className="text-gray-400 hover:text-gray-600 text-sm">← Animals</button>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 font-mono">{a.animal_code}</h1>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
              </div>
              {a.name && <p className="text-gray-500 text-lg">{a.name}</p>}
              <p className="text-sm text-gray-400 capitalize mt-1">{a.species} · {a.breed || 'Unknown breed'} · {a.gender}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">PKR {Number(a.current_value || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">Current Value</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              ['Date of Birth', a.date_of_birth || '—'],
              ['Purchase Date', a.purchase_date || '—'],
              ['Ownership', a.ownership_type],
              ['Ear Tag', a.ear_tag || '—'],
              ...(canSeeFinancials ? [
                ['Purchase Price', a.purchase_price ? `PKR ${Number(a.purchase_price).toLocaleString()}` : '—'],
                ['Feed Cost (Total)', a.feed_cost ? `PKR ${Number(a.feed_cost).toLocaleString()}` : '—'],
              ] : []),
              ['Latest Weight', a.latest_weight_kg ? `${a.latest_weight_kg} kg` : '—'],
              ['RFID Tag', a.rfid_tag || '—'],
            ].map(([k, v]) => (
              <div key={k as string} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                <div className="text-sm font-semibold text-gray-800 capitalize">{v}</div>
              </div>
            ))}
          </div>

          {a.notes && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-3">
              <div className="text-xs text-yellow-700 font-medium mb-0.5">Notes</div>
              <div className="text-sm text-gray-700">{a.notes}</div>
            </div>
          )}
        </div>

        {/* Weight Tracking */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Weight History</h2>
          </div>

          {/* Add weight inline form */}
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!weightKg) return
              addWeightMutation.mutate({ weight_kg: parseFloat(weightKg), recorded_date: weightDate, notes: weightNotes })
            }}
            className="flex gap-3 mb-5 flex-wrap"
          >
            <input type="number" step="0.1" placeholder="Weight (kg)" required value={weightKg}
              onChange={e => setWeightKg(e.target.value)} className="input max-w-[140px]" />
            <input type="date" value={weightDate}
              onChange={e => setWeightDate(e.target.value)} className="input max-w-[160px]" />
            <input placeholder="Notes (optional)" value={weightNotes}
              onChange={e => setWeightNotes(e.target.value)} className="input flex-1 min-w-[160px]" />
            <button type="submit" disabled={addWeightMutation.isPending} className="btn-primary text-sm whitespace-nowrap">
              {addWeightMutation.isPending ? 'Saving...' : '+ Record'}
            </button>
          </form>

          {(weights ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No weight records yet — add the first one above</p>
          ) : (() => {
            const wList: any[] = weights as any[]
            const latest = parseFloat(wList[0].weight_kg)
            const initial = parseFloat(wList[wList.length - 1].weight_kg)
            const totalGain = latest - initial
            const chartData = [...wList].reverse()

            return (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Initial', value: `${initial.toFixed(1)} kg` },
                    { label: 'Current', value: `${latest.toFixed(1)} kg`, highlight: true },
                    {
                      label: 'Total Gain',
                      value: `${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)} kg`,
                      gain: totalGain,
                    },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className={`text-lg font-bold ${
                        s.highlight ? 'text-green-700' :
                        s.gain !== undefined ? (s.gain >= 0 ? 'text-green-600' : 'text-red-500') :
                        'text-gray-900'
                      }`}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Line chart — only if 2+ entries */}
                {wList.length >= 2 && (
                  <div className="mb-5">
                    <p className="text-xs text-gray-500 font-medium mb-2">Weight Trend</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="recorded_date"
                          tickFormatter={d => d.slice(5)}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          unit="kg"
                          domain={['auto', 'auto']}
                        />
                        <Tooltip formatter={(v: any) => [`${v} kg`, 'Weight']} />
                        <Line
                          type="monotone"
                          dataKey="weight_kg"
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={{ fill: '#16a34a', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* History table */}
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs">
                      <tr>
                        <th className="text-left px-4 py-2">Date</th>
                        <th className="text-right px-4 py-2">Weight (kg)</th>
                        <th className="text-right px-4 py-2">Change</th>
                        <th className="text-left px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wList.map((w: any, i: number) => {
                        const prev = wList[i + 1]
                        const change = prev ? parseFloat(w.weight_kg) - parseFloat(prev.weight_kg) : null
                        return (
                          <tr key={w.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2.5">{w.recorded_date}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {parseFloat(w.weight_kg).toFixed(1)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {change !== null ? (
                                <span className={change >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                  {change >= 0 ? '+' : ''}{change.toFixed(1)}
                                </span>
                              ) : <span className="text-gray-400 text-xs">first</span>}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{w.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </div>

        {/* Recent Vaccinations */}
        {(vaccinations ?? []).length > 0 && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Vaccinations</h2>
            <div className="space-y-2">
              {(vaccinations as any[]).slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <span className="text-sm font-medium">{v.vaccine_name}</span>
                    <span className="text-xs text-gray-400 ml-2">{v.vaccination_date}</span>
                  </div>
                  <span className="text-xs text-gray-400">{v.next_due_date ? `Next: ${v.next_due_date}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Treatments */}
        {(treatments ?? []).length > 0 && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Treatments</h2>
            <div className="space-y-2">
              {(treatments as any[]).slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <span className="text-sm font-medium">{t.diagnosis}</span>
                    <span className="text-xs text-gray-400 ml-2">{t.treatment_date}</span>
                  </div>
                  {canSeeFinancials && t.cost && <span className="text-sm text-red-600 font-medium">PKR {Number(t.cost).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Milk Production */}
        {(milkData ?? []).length > 0 && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Milk Production</h2>
            <div className="space-y-2">
              {(milkData as any[]).slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">{m.production_date} · {m.session}</span>
                  <span className="text-sm font-semibold text-blue-700">{m.quantity_liters} L</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
