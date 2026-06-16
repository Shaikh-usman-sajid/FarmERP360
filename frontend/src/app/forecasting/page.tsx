'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { forecastingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell,
  ComposedChart, Area,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pkr(n: number) {
  return 'PKR ' + Math.round(Math.abs(n)).toLocaleString('en-PK')
}
function kg(n: number) {
  return Math.round(n).toLocaleString('en-PK') + ' kg'
}

const TABS = ['Feed', 'Cash Flow', 'Crop Yield'] as const
type Tab = typeof TABS[number]

// ─── Shared Tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-lg shadow-lg px-4 py-3 text-xs" style={{ borderColor: '#E5D9BF' }}>
      <p className="font-semibold mb-1" style={{ color: '#1B4332' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && Math.abs(p.value) > 100
            ? pkr(p.value)
            : p.value?.toLocaleString?.() ?? p.value}
        </p>
      ))}
    </div>
  )
}

// ─── TAB: FEED FORECAST ───────────────────────────────────────────────────────

function FeedForecast() {
  const [months, setMonths] = useState(3)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast-feed', months],
    queryFn: () => forecastingAPI.feed(months).then(r => r.data),
  })

  const d = data as any

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Forecast Horizon</label>
          <select value={months} onChange={e => setMonths(+e.target.value)}
            className="input w-40">
            {[1,2,3,6,9,12].map(m => <option key={m} value={m}>{m} Month{m>1?'s':''}</option>)}
          </select>
        </div>
        {d && (
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F5EDD6', color: '#1B4332' }}>
              <span className="font-bold">{d.active_animals}</span> Active Animals
            </div>
            {d.alerts_count > 0 && (
              <div className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                ⚠ {d.alerts_count} Reorder Alert{d.alerts_count > 1 ? 's' : ''}
              </div>
            )}
            {d.method === 'rule_based_estimated' && (
              <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#FDF6E3', color: '#B8943A', border: '1px solid #C9A84C' }}>
                Using estimated consumption (no historical feed data yet)
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && <div className="card p-8 text-center text-gray-400 animate-pulse">Calculating feed forecast…</div>}
      {isError && <div className="card p-6 text-center text-red-500">Failed to load forecast.</div>}

      {d && (
        <>
          {/* Monthly cost bar chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#1B4332' }}>
              Projected Monthly Feed Cost
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.monthly_cost_summary} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5EDD6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="total_cost_pkr" name="Feed Cost" fill="#C9A84C" radius={[4,4,0,0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Feed type cards */}
          <div className="space-y-3">
            {d.feed_forecasts?.map((f: any) => (
              <div key={f.feed_type_id} className="card p-4"
                style={{ borderColor: f.reorder_alert ? '#fca5a5' : '#E5D9BF' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: '#1B4332' }}>{f.name}</span>
                      {f.reorder_alert && (
                        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Reorder Now
                        </span>
                      )}
                      {f.method === 'estimated' && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          Estimated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Stock: <strong>{f.current_stock.toLocaleString()} {f.unit}</strong>
                      {' · '}Avg daily: <strong>{f.avg_daily_consumption} {f.unit}/day</strong>
                      {f.depletion_date && (
                        <span className={f.reorder_alert ? ' text-red-600 font-semibold' : ''}>
                          {' · '}Depletes: {f.depletion_date} ({f.depletion_days} days)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <div className="font-semibold" style={{ color: '#2D6A4F' }}>
                      {f.total_projected_consumption.toLocaleString()} {f.unit}
                    </div>
                    <div className="text-xs text-gray-400">total {months}m need</div>
                  </div>
                </div>

                {/* Monthly breakdown mini-table */}
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(f.monthly_projection.length, 6)}, 1fr)` }}>
                  {f.monthly_projection.map((m: any) => (
                    <div key={m.month} className="text-center p-2 rounded-lg" style={{ backgroundColor: '#F5EDD6' }}>
                      <div className="text-xs text-gray-500">{m.month}</div>
                      <div className="text-sm font-semibold" style={{ color: '#1B4332' }}>
                        {m.projected_consumption.toLocaleString()} {f.unit}
                      </div>
                      {f.cost_per_unit > 0 && (
                        <div className="text-xs" style={{ color: '#C9A84C' }}>
                          {pkr(m.estimated_cost_pkr)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {f.reorder_alert && (
                  <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                    Suggested order: <strong>{f.suggested_order_qty.toLocaleString()} {f.unit}</strong>
                    {' '}(90-day supply + 15% buffer)
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── TAB: CASH FLOW FORECAST ──────────────────────────────────────────────────

function CashFlowForecast() {
  const [months, setMonths] = useState(6)
  const [milkPrice, setMilkPrice] = useState(120)
  const [applied, setApplied] = useState({ months: 6, milkPrice: 120 })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast-cashflow', applied.months, applied.milkPrice],
    queryFn: () => forecastingAPI.cashFlow(applied.months, applied.milkPrice).then(r => r.data),
  })

  const d = data as any

  const chartData = d ? [
    ...((d.historical || []).map((h: any) => ({ ...h, type: 'actual' }))),
    ...(d.projections || []).map((p: any) => ({
      month: p.month,
      total_revenue: p.total_revenue,
      total_expense: p.total_expense,
      net_cash_flow: p.net_cash_flow,
      type: 'forecast',
    })),
  ] : []

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Forecast Months</label>
          <select value={months} onChange={e => setMonths(+e.target.value)} className="input w-40">
            {[3,6,9,12,18,24].map(m => <option key={m} value={m}>{m} months</option>)}
          </select>
        </div>
        <div>
          <label className="label">Milk Price (PKR/liter)</label>
          <input type="number" value={milkPrice} min={0}
            onChange={e => setMilkPrice(+e.target.value)}
            className="input w-36" />
        </div>
        <button className="btn-primary"
          onClick={() => setApplied({ months, milkPrice })}>
          Update Forecast
        </button>
      </div>

      {isLoading && <div className="card p-8 text-center text-gray-400 animate-pulse">Building cash flow model…</div>}
      {isError && <div className="card p-6 text-center text-red-500">Failed to load forecast.</div>}

      {d && (
        <>
          {/* Summary KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Projected Revenue', value: pkr(d.summary.total_projected_revenue), color: '#2D6A4F' },
              { label: 'Projected Expenses', value: pkr(d.summary.total_projected_expense), color: '#dc2626' },
              { label: 'Net Cash Flow', value: pkr(d.summary.total_projected_net), color: d.summary.total_projected_net >= 0 ? '#2D6A4F' : '#dc2626' },
              { label: 'Positive Months', value: `${d.summary.positive_months} / ${applied.months}`, color: '#C9A84C' },
            ].map(k => (
              <div key={k.label} className="card p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
                <p className="text-lg font-bold font-mono mt-1" style={{ color: k.color }}>
                  {d.summary.total_projected_net < 0 && k.label === 'Net Cash Flow' ? '(' : ''}
                  {k.value}
                  {d.summary.total_projected_net < 0 && k.label === 'Net Cash Flow' ? ')' : ''}
                </p>
              </div>
            ))}
          </div>

          {/* Assumptions */}
          <div className="card p-4" style={{ backgroundColor: '#F5EDD6', borderColor: '#E5D9BF' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#1B4332' }}>Model Assumptions</p>
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#374151' }}>
              <span>Avg milk/month: <strong>{d.assumptions.avg_monthly_milk_liters.toLocaleString()} L</strong></span>
              <span>Milk trend: <strong>{d.assumptions.milk_trend_slope_liters_per_month >= 0 ? '+' : ''}{d.assumptions.milk_trend_slope_liters_per_month} L/month</strong></span>
              <span>Monthly salaries: <strong>{pkr(d.assumptions.monthly_salary_total)}</strong></span>
              <span>Avg feed cost: <strong>{pkr(d.assumptions.avg_feed_cost)}</strong></span>
              <span>Milk price: <strong>PKR {applied.milkPrice}/L</strong></span>
            </div>
          </div>

          {/* Revenue vs Expense chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#1B4332' }}>
              Revenue vs Expenses (Historical + Forecast)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5EDD6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total_revenue" name="Revenue" fill="#2D6A4F" opacity={0.85} maxBarSize={32} />
                <Bar dataKey="total_expense" name="Expenses" fill="#C9A84C" opacity={0.85} maxBarSize={32} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Net cash flow line */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#1B4332' }}>
              Net Cash Flow Forecast
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={d.projections} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5EDD6" />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip content={<ChartTip />} />
                <Area dataKey="net_cash_flow" name="Net Cash Flow" type="monotone"
                  stroke="#1B4332" fill="#FDF6E3" strokeWidth={2} />
                <Line dataKey="cumulative_net" name="Cumulative Net" type="monotone"
                  stroke="#C9A84C" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly projection table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3" style={{ backgroundColor: '#F5EDD6', borderBottom: '1px solid #E5D9BF' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#1B4332' }}>Monthly Projection Detail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-2 text-left">Month</th>
                    <th className="px-4 py-2 text-right">Milk (L)</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                    <th className="px-4 py-2 text-right">Expenses</th>
                    <th className="px-4 py-2 text-right">Net</th>
                    <th className="px-4 py-2 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {d.projections.map((p: any, i: number) => (
                    <tr key={i} className="table-row">
                      <td className="px-4 py-2 font-medium" style={{ color: '#1B4332' }}>{p.month}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{p.projected_milk_liters.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono" style={{ color: '#2D6A4F' }}>{pkr(p.total_revenue)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">{pkr(p.total_expense)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${p.net_cash_flow >= 0 ? '' : 'text-red-600'}`}
                        style={p.net_cash_flow >= 0 ? { color: '#1B4332' } : undefined}>
                        {p.net_cash_flow < 0 ? '(' : ''}{pkr(p.net_cash_flow)}{p.net_cash_flow < 0 ? ')' : ''}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${p.cumulative_net >= 0 ? '' : 'text-red-500'}`}
                        style={p.cumulative_net >= 0 ? { color: '#C9A84C' } : undefined}>
                        {p.cumulative_net < 0 ? '(' : ''}{pkr(p.cumulative_net)}{p.cumulative_net < 0 ? ')' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── TAB: CROP YIELD FORECAST ─────────────────────────────────────────────────

function CropYieldForecast() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast-crop'],
    queryFn: () => forecastingAPI.cropYield().then(r => r.data),
  })

  const d = data as any

  const accuracyChartData = d
    ? Object.entries(d.crop_accuracy || {}).map(([crop, pct]) => ({ crop, accuracy: pct }))
    : []

  return (
    <div className="space-y-6">
      {isLoading && <div className="card p-8 text-center text-gray-400 animate-pulse">Analysing crop history…</div>}
      {isError && <div className="card p-6 text-center text-red-500">Failed to load forecast.</div>}

      {d && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overall Accuracy', value: `${d.overall_yield_accuracy_pct}%`, sub: 'actual vs expected' },
              { label: 'Completed Cycles', value: d.completed_cycles, sub: 'historical data' },
              { label: 'Active Cycles', value: d.active_cycles, sub: 'forecast available' },
              { label: 'Total Cycles', value: d.total_cycles, sub: 'all time' },
            ].map(k => (
              <div key={k.label} className="card p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#1B4332' }}>{k.value}</p>
                <p className="text-xs text-gray-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Seasonal recommendations */}
          {d.seasonal_recommendations?.length > 0 && (
            <div className="card p-4" style={{ borderColor: '#C9A84C', backgroundColor: '#FDF6E3' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#B8943A' }}>
                Seasonal Recommendations
              </p>
              <ul className="space-y-1">
                {d.seasonal_recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: '#1B4332' }}>
                    <span style={{ color: '#C9A84C' }}>•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Accuracy by crop chart */}
          {accuracyChartData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#1B4332' }}>
                Historical Yield Accuracy by Crop
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={accuracyChartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EDD6" />
                  <ReferenceLine y={100} stroke="#2D6A4F" strokeDasharray="4 2" label={{ value: '100%', fontSize: 10, fill: '#2D6A4F' }} />
                  <XAxis dataKey="crop" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} domain={[0, 120]} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="accuracy" name="Accuracy %" radius={[4,4,0,0]} maxBarSize={64}>
                    {accuracyChartData.map((e: any, i: number) => (
                      <Cell key={i} fill={(e.accuracy as number) >= 90 ? '#2D6A4F' : (e.accuracy as number) >= 70 ? '#C9A84C' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Active / upcoming forecasts */}
          {d.active_forecast?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3" style={{ backgroundColor: '#F5EDD6', borderBottom: '1px solid #E5D9BF' }}>
                <h3 className="text-sm font-semibold" style={{ color: '#1B4332' }}>Active & Planned Crop Forecasts</h3>
              </div>
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
                {d.active_forecast.map((c: any) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold" style={{ color: '#1B4332' }}>{c.crop_name}</span>
                          {c.variety && <span className="text-xs text-gray-500">{c.variety}</span>}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.harvest_status === 'overdue' ? 'bg-red-100 text-red-700' :
                            c.harvest_status === 'imminent' ? 'bg-amber-100 text-amber-700' :
                            c.harvest_status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {c.harvest_status === 'overdue' ? '⚠ Overdue' :
                             c.harvest_status === 'imminent' ? '⏰ Harvest soon' :
                             c.harvest_status === 'upcoming' ? '📅 Upcoming' : '🌱 On track'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {c.field_name}
                          {c.sowing_date && ` · Sown ${c.sowing_date}`}
                          {c.expected_harvest_date && ` · Expected harvest ${c.expected_harvest_date}`}
                          {c.days_to_harvest != null && ` (${c.days_to_harvest >= 0 ? c.days_to_harvest + ' days away' : Math.abs(c.days_to_harvest) + ' days overdue'})`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold" style={{ color: '#2D6A4F' }}>
                          {kg(c.projected_yield_kg)}
                        </div>
                        <div className="text-xs text-gray-400">
                          projected ({c.accuracy_used}% accuracy)
                        </div>
                        <div className="text-xs text-gray-400">
                          expected {kg(c.expected_yield_kg)}
                        </div>
                      </div>
                    </div>

                    {/* Yield comparison bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Projected vs Expected</span>
                        <span>{c.confidence === 'high' ? 'High confidence' : 'Medium confidence (no history for this crop)'}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F5EDD6' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.min(c.projected_yield_kg / Math.max(c.expected_yield_kg, 1) * 100, 100)}%`,
                          backgroundColor: c.projected_yield_kg >= c.expected_yield_kg * 0.9 ? '#2D6A4F' : '#C9A84C',
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed cycles table */}
          {d.completed_summary?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3" style={{ backgroundColor: '#F5EDD6', borderBottom: '1px solid #E5D9BF' }}>
                <h3 className="text-sm font-semibold" style={{ color: '#1B4332' }}>Historical Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-2 text-left">Field / Crop</th>
                      <th className="px-4 py-2 text-right">Harvest Date</th>
                      <th className="px-4 py-2 text-right">Expected</th>
                      <th className="px-4 py-2 text-right">Actual</th>
                      <th className="px-4 py-2 text-right">Accuracy</th>
                      <th className="px-4 py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.completed_summary.map((c: any, i: number) => (
                      <tr key={i} className="table-row">
                        <td className="px-4 py-2">
                          <div className="font-medium" style={{ color: '#1B4332' }}>{c.crop_name}</div>
                          <div className="text-xs text-gray-400">{c.field_name}</div>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">{c.harvest_date || '—'}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{kg(c.expected_yield_kg)}</td>
                        <td className="px-4 py-2 text-right font-medium" style={{ color: '#1B4332' }}>{kg(c.actual_yield_kg)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`font-semibold ${c.accuracy_pct >= 90 ? '' : c.accuracy_pct >= 70 ? '' : 'text-red-600'}`}
                            style={c.accuracy_pct >= 90 ? { color: '#2D6A4F' } : c.accuracy_pct >= 70 ? { color: '#C9A84C' } : undefined}>
                            {c.accuracy_pct}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">{pkr(c.total_cost_pkr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {d.active_forecast?.length === 0 && d.completed_summary?.length === 0 && (
            <div className="card p-12 text-center text-gray-400">
              No crop cycles found. Add crop cycles in Agriculture to enable yield forecasting.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ForecastingPage() {
  const [tab, setTab] = useState<Tab>('Feed')

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Forecasting</h1>
          <p className="page-subtitle">Feed consumption, cash flow, and crop yield projections</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: '#F5EDD6' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t
              ? { backgroundColor: '#1B4332', color: '#ffffff' }
              : { color: '#6b7280' }
            }>
            {t === 'Feed' ? '🌿 Feed' : t === 'Cash Flow' ? '💰 Cash Flow' : '🌾 Crop Yield'}
          </button>
        ))}
      </div>

      {tab === 'Feed' && <FeedForecast />}
      {tab === 'Cash Flow' && <CashFlowForecast />}
      {tab === 'Crop Yield' && <CropYieldForecast />}
    </DashboardLayout>
  )
}
