'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const today = new Date().toISOString().split('T')[0]

export default function WeightPage() {
  const qc = useQueryClient()
  const [genderFilter, setGenderFilter] = useState('male')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [search, setSearch] = useState('')
  const [addAnimal, setAddAnimal] = useState<any>(null)
  const [historyAnimal, setHistoryAnimal] = useState<any>(null)
  const [weightForm, setWeightForm] = useState({ weight_kg: '', recorded_date: today, notes: '' })

  const { data: animals, isLoading } = useQuery({
    queryKey: ['animals-weight', genderFilter, speciesFilter],
    queryFn: () => animalsAPI.list({
      per_page: 500,
      status: 'active',
      ...(genderFilter ? { gender: genderFilter } : {}),
      ...(speciesFilter ? { species: speciesFilter } : {}),
    }).then(r => r.data.data),
  })

  const { data: weightHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['animal-weights', historyAnimal?.id],
    queryFn: () => animalsAPI.getWeights(historyAnimal!.id).then(r => r.data.data),
    enabled: !!historyAnimal,
  })

  const addMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => animalsAPI.addWeight(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals-weight'] })
      qc.invalidateQueries({ queryKey: ['animal-weights', addAnimal?.id] })
      toast.success('Weight recorded!')
      setAddAnimal(null)
      setWeightForm({ weight_kg: '', recorded_date: today, notes: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const allItems: any[] = animals?.items ?? []
  const items = search
    ? allItems.filter(a =>
        a.animal_code?.toLowerCase().includes(search.toLowerCase()) ||
        a.name?.toLowerCase().includes(search.toLowerCase())
      )
    : allItems

  const withWeight = items.filter((a: any) => a.latest_weight_kg != null)
  const avgWeight = withWeight.length
    ? (withWeight.reduce((s: number, a: any) => s + parseFloat(a.latest_weight_kg), 0) / withWeight.length).toFixed(1)
    : null
  const heaviest = withWeight.length
    ? withWeight.reduce((max: any, a: any) =>
        parseFloat(a.latest_weight_kg) > parseFloat(max.latest_weight_kg) ? a : max, withWeight[0])
    : null

  const openAdd = (a: any) => {
    setAddAnimal(a)
    setWeightForm({ weight_kg: a.latest_weight_kg ? String(parseFloat(a.latest_weight_kg).toFixed(1)) : '', recorded_date: today, notes: '' })
  }

  const openHistory = (a: any) => {
    setHistoryAnimal(a)
  }

  const submitWeight = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate({
      id: addAnimal.id,
      data: {
        weight_kg: parseFloat(weightForm.weight_kg),
        recorded_date: weightForm.recorded_date,
        ...(weightForm.notes ? { notes: weightForm.notes } : {}),
      },
    })
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Weight Tracking</h1>
          <p className="page-subtitle">Monitor growth and weight gain for your livestock</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search by code or name..."
            className="input !w-48"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input !w-auto" value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)}>
            <option value="">All Species</option>
            <option value="buffalo">Buffalo</option>
            <option value="cattle">Cattle</option>
            <option value="goat">Goat</option>
            <option value="other">Other</option>
          </select>
          <select className="input !w-auto" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
            <option value="male">Male Only</option>
            <option value="female">Female Only</option>
            <option value="">All Genders</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Animals', value: items.length, icon: '🐄' },
          { label: 'Recorded Weights', value: withWeight.length, icon: '⚖️' },
          { label: 'Avg Weight', value: avgWeight ? `${avgWeight} kg` : '—', icon: '📊' },
          { label: 'Heaviest Animal', value: heaviest ? `${heaviest.animal_code} — ${parseFloat(heaviest.latest_weight_kg).toFixed(0)} kg` : '—', icon: '🏆' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Animal', 'Species / Gender', 'Age', 'Latest Weight', 'Last Weighed', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No animals found for selected filters</td></tr>
            )}
            {items.map((a: any) => {
              const dob = a.date_of_birth ? new Date(a.date_of_birth) : null
              const ageMonths = dob
                ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30))
                : null
              const ageStr = ageMonths != null
                ? ageMonths >= 12
                  ? `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`
                  : `${ageMonths}m`
                : '—'

              return (
                <tr key={a.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-semibold text-green-700">{a.animal_code}</div>
                    {a.name && <div className="text-xs text-gray-400">{a.name}</div>}
                    {a.ear_tag && <div className="text-xs text-gray-300">Tag: {a.ear_tag}</div>}
                  </td>
                  <td className="table-cell">
                    <span className="capitalize">{a.species}</span>
                    <span className="ml-1 text-xs text-gray-400 capitalize">({a.gender})</span>
                  </td>
                  <td className="table-cell text-sm text-gray-600">{ageStr}</td>
                  <td className="table-cell">
                    {a.latest_weight_kg != null
                      ? <span className="font-bold text-gray-900">{parseFloat(a.latest_weight_kg).toFixed(1)} kg</span>
                      : <span className="text-gray-400 text-xs italic">Not recorded</span>
                    }
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    {a.last_weighed_date ?? '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openAdd(a)}
                        className="text-green-600 hover:text-green-800 text-xs font-medium"
                      >
                        + Weight
                      </button>
                      <button
                        onClick={() => openHistory(a)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add Weight Modal ──────────────────────────── */}
      {addAnimal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Record Weight</h2>
                <p className="text-sm text-gray-500">
                  {addAnimal.animal_code}
                  {addAnimal.name ? ` — ${addAnimal.name}` : ''}
                  {' '}({addAnimal.species})
                </p>
              </div>
              <button onClick={() => setAddAnimal(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={submitWeight} className="p-5 space-y-4">
              {addAnimal.latest_weight_kg && (
                <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
                  Last recorded: <strong>{parseFloat(addAnimal.latest_weight_kg).toFixed(1)} kg</strong>
                  {addAnimal.last_weighed_date && ` on ${addAnimal.last_weighed_date}`}
                </div>
              )}
              <div>
                <label className="label">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input"
                  required
                  placeholder="e.g. 320.5"
                  value={weightForm.weight_kg}
                  onChange={e => setWeightForm({ ...weightForm, weight_kg: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={weightForm.recorded_date}
                  onChange={e => setWeightForm({ ...weightForm, recorded_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  className="input"
                  placeholder="e.g. before sale, monthly check"
                  value={weightForm.notes}
                  onChange={e => setWeightForm({ ...weightForm, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAddAnimal(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={addMutation.isPending} className="btn-primary">
                  {addMutation.isPending ? 'Saving...' : 'Save Weight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Weight History Modal ───────────────────────── */}
      {historyAnimal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Weight History</h2>
                <p className="text-sm text-gray-500">
                  {historyAnimal.animal_code}
                  {historyAnimal.name ? ` — ${historyAnimal.name}` : ''}
                  {' '}<span className="capitalize">({historyAnimal.species} / {historyAnimal.gender})</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setHistoryAnimal(null); openAdd(historyAnimal) }}
                  className="btn-primary text-sm"
                >
                  + Add Weight
                </button>
                <button onClick={() => setHistoryAnimal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {historyLoading && (
                <div className="text-center py-10 text-gray-400">Loading history...</div>
              )}
              {!historyLoading && (!weightHistory || weightHistory.length === 0) && (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-4xl mb-3">⚖️</p>
                  <p className="font-medium">No weight records yet</p>
                  <button
                    onClick={() => { setHistoryAnimal(null); openAdd(historyAnimal) }}
                    className="btn-primary mt-3 text-sm"
                  >
                    Record First Weight
                  </button>
                </div>
              )}
              {weightHistory && weightHistory.length > 0 && (() => {
                const latest = parseFloat(weightHistory[0].weight_kg)
                const initial = parseFloat(weightHistory[weightHistory.length - 1].weight_kg)
                const totalGain = latest - initial
                const chartData = [...weightHistory].reverse()

                return (
                  <>
                    {/* Summary bar */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Initial Weight', value: `${initial.toFixed(1)} kg` },
                        { label: 'Current Weight', value: `${latest.toFixed(1)} kg`, highlight: true },
                        {
                          label: 'Total Gain',
                          value: `${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)} kg`,
                          positive: totalGain >= 0,
                        },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                          <p className={`text-lg font-bold ${
                            s.highlight ? 'text-green-700' :
                            s.positive === false ? 'text-red-600' :
                            s.positive ? 'text-green-600' : 'text-gray-900'
                          }`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    {weightHistory.length >= 2 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Weight Trend</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="recorded_date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} unit="kg" domain={['auto', 'auto']} />
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
                          {weightHistory.map((w: any, i: number) => {
                            const prev = weightHistory[i + 1]
                            const change = prev
                              ? parseFloat(w.weight_kg) - parseFloat(prev.weight_kg)
                              : null
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
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
