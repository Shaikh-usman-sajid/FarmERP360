'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

function pkr(amount: number | string) {
  return 'PKR ' + Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700',
  processed: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700',
  paid: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700',
}

function statusBadge(status: string) {
  const cls = STATUS_BADGE[status] ?? STATUS_BADGE['draft']
  return <span className={cls}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

const emptyForm = { month: currentMonth, year: currentYear, notes: '' }

export default function PayrollPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // ── List payroll runs ──────────────────────────────────────────────────────
  const { data: runsData, isLoading } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => accountingAPI.getPayrollRuns({ per_page: 50 }).then(r => r.data),
  })

  const runs: any[] = runsData?.items ?? runsData?.data ?? runsData ?? []

  // ── Get single run detail ─────────────────────────────────────────────────
  const { data: runDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-run', selectedRunId],
    queryFn: () => accountingAPI.getPayrollRun(selectedRunId!).then(r => r.data),
    enabled: !!selectedRunId,
  })

  // ── Process payroll mutation ───────────────────────────────────────────────
  const processMutation = useMutation({
    mutationFn: (d: any) => accountingAPI.processPayroll(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      toast.success('Payroll processed successfully!')
      setShowModal(false)
      setForm(emptyForm)
      const newId = res.data?.id ?? res.data?.payroll_run?.id
      if (newId) setSelectedRunId(String(newId))
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to process payroll'),
  })

  // ── Summary calculations ───────────────────────────────────────────────────
  const thisMonthRun = runs.find(
    (r: any) => Number(r.month) === currentMonth && Number(r.year) === currentYear
  )
  const totalThisMonth = thisMonthRun ? Number(thisMonthRun.total_net ?? thisMonthRun.total_gross ?? 0) : 0

  const activeEmployees = runDetail?.records?.length
    ?? thisMonthRun?.employee_count
    ?? runs[0]?.employee_count
    ?? 0

  const totalPaidYTD = runs
    .filter((r: any) => Number(r.year) === currentYear && r.status === 'paid')
    .reduce((sum: number, r: any) => sum + Number(r.total_net ?? r.total_gross ?? 0), 0)

  // ── Detail records ─────────────────────────────────────────────────────────
  const records: any[] = runDetail?.records ?? []
  const totalGross = records.reduce((s, r) => s + Number(r.gross_salary ?? 0), 0)
  const totalDeductions = records.reduce((s, r) => s + Number(r.deductions ?? 0), 0)
  const totalNet = records.reduce((s, r) => s + Number(r.net_salary ?? 0), 0)

  const detailRun = selectedRunId ? runs.find((r: any) => String(r.id) === selectedRunId) : null
  const detailLabel = detailRun
    ? `${MONTH_NAMES[(Number(detailRun.month) - 1) % 12]} ${detailRun.year}`
    : runDetail
    ? `${MONTH_NAMES[(Number(runDetail.month) - 1) % 12]} ${runDetail.year}`
    : ''

  return (
    <DashboardLayout>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Manage monthly employee payroll processing</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Process Payroll
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Payroll This Month</p>
          <p className="text-2xl font-bold text-gray-900">{pkr(totalThisMonth)}</p>
          <p className="text-xs text-gray-400 mt-1">{MONTH_NAMES[currentMonth - 1]} {currentYear}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Employees</p>
          <p className="text-2xl font-bold text-gray-900">{activeEmployees}</p>
          <p className="text-xs text-gray-400 mt-1">On latest payroll run</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Paid YTD</p>
          <p className="text-2xl font-bold text-gray-900">{pkr(totalPaidYTD)}</p>
          <p className="text-xs text-gray-400 mt-1">Year {currentYear} — paid runs only</p>
        </div>
      </div>

      {/* ── Payroll runs table ─────────────────────────────────────────── */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Payroll Runs</h2>
        </div>
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Period', 'Employees', 'Gross Salary', 'Net Salary', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Loading payroll runs...</td>
              </tr>
            )}
            {!isLoading && runs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">No payroll runs yet. Click &ldquo;Process Payroll&rdquo; to start.</td>
              </tr>
            )}
            {runs.map((run: any) => (
              <tr
                key={run.id}
                className={`table-row${selectedRunId === String(run.id) ? ' bg-blue-50' : ''}`}
              >
                <td className="table-cell font-semibold text-gray-800">
                  {MONTH_NAMES[(Number(run.month) - 1) % 12]} {run.year}
                </td>
                <td className="table-cell">{run.employee_count ?? '—'}</td>
                <td className="table-cell">{pkr(run.total_gross)}</td>
                <td className="table-cell font-semibold">{pkr(run.total_net)}</td>
                <td className="table-cell">{statusBadge(run.status ?? 'draft')}</td>
                <td className="table-cell">
                  <button
                    onClick={() => setSelectedRunId(selectedRunId === String(run.id) ? null : String(run.id))}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                  >
                    {selectedRunId === String(run.id) ? 'Hide' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Run detail / employee breakdown ───────────────────────────── */}
      {selectedRunId && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Employee Breakdown — {detailLabel}
            </h2>
            <button
              onClick={() => setSelectedRunId(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {detailLoading && (
            <p className="text-center py-10 text-gray-400">Loading employee details...</p>
          )}

          {!detailLoading && records.length === 0 && (
            <p className="text-center py-10 text-gray-400">No employee records found for this run.</p>
          )}

          {!detailLoading && records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    {[
                      'Employee Name',
                      'Basic Salary',
                      'Days Present',
                      'Working Days',
                      'Gross Salary',
                      'Deductions',
                      'Net Salary',
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec: any, idx: number) => (
                    <tr key={rec.id ?? idx} className="table-row">
                      <td className="table-cell font-medium text-gray-800">
                        {rec.employee_name ?? rec.employee?.full_name ?? rec.employee?.name ?? `Employee ${idx + 1}`}
                      </td>
                      <td className="table-cell">{pkr(rec.basic_salary)}</td>
                      <td className="table-cell text-center">{rec.days_present ?? '—'}</td>
                      <td className="table-cell text-center">{rec.working_days ?? '—'}</td>
                      <td className="table-cell">{pkr(rec.gross_salary)}</td>
                      <td className="table-cell text-red-600">{pkr(rec.deductions)}</td>
                      <td className="table-cell font-semibold text-green-700">{pkr(rec.net_salary)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="table-cell text-gray-700">Total ({records.length} employees)</td>
                    <td className="table-cell">—</td>
                    <td className="table-cell">—</td>
                    <td className="table-cell">—</td>
                    <td className="table-cell">{pkr(totalGross)}</td>
                    <td className="table-cell text-red-600">{pkr(totalDeductions)}</td>
                    <td className="table-cell text-green-700">{pkr(totalNet)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Process Payroll Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">Process Payroll</h2>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                processMutation.mutate({
                  month: Number(form.month),
                  year: Number(form.year),
                  notes: form.notes || undefined,
                })
              }}
              className="p-5 space-y-4"
            >
              {/* Month selector */}
              <div>
                <label className="label">Month *</label>
                <select
                  className="input"
                  required
                  value={form.month}
                  onChange={e => setForm({ ...form, month: Number(e.target.value) })}
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Year input */}
              <div>
                <label className="label">Year *</label>
                <input
                  type="number"
                  className="input"
                  required
                  min={2000}
                  max={2099}
                  value={form.year}
                  onChange={e => setForm({ ...form, year: Number(e.target.value) })}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Optional remarks..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Summary line */}
              <p className="text-sm text-gray-500">
                This will calculate gross and net salaries for all active employees based on
                attendance records for{' '}
                <strong>{MONTH_NAMES[Number(form.month) - 1]} {form.year}</strong>.
              </p>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(emptyForm) }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processMutation.isPending}
                  className="btn-primary"
                >
                  {processMutation.isPending ? 'Processing...' : 'Process Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
