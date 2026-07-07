'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesAPI, accountingAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'
import ExportButtons from '@/components/ui/ExportButtons'

const TABS = ['Employees', 'Salary History', 'Monthly Payroll'] as const
type Tab = typeof TABS[number]

const DEPARTMENTS = ['Operations', 'Dairy', 'Health', 'Agriculture', 'Transport', 'Admin', 'HR', 'Finance']
const CHANGE_REASONS = ['Initial Appointment', 'Annual Raise', 'Promotion', 'Performance Bonus', 'Market Adjustment', 'Other']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const emptyEmpForm = { employee_code: '', full_name: '', cnic: '', phone: '', designation: '', department: '', join_date: '', monthly_salary: '' }
const emptySalaryForm = { salary_amount: '', effective_date: '', change_reason: 'Annual Raise', notes: '' }
const emptyPayrollForm = { month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' }

function pkr(v: any) { return 'PKR ' + Number(v || 0).toLocaleString('en-PK') }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  processed: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
}

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('Employees')

  // ─── Employees filters ────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [empStatus, setEmpStatus] = useState('')
  const hasFilter = !!(search || department || empStatus)

  // ─── Add/Edit employee modal ──────────────────────────────────
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [editingEmp, setEditingEmp] = useState<any>(null)
  const [empForm, setEmpForm] = useState(emptyEmpForm)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // ─── Salary / Raise modal ─────────────────────────────────────
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [salaryEmp, setSalaryEmp] = useState<any>(null)
  const [salaryForm, setSalaryForm] = useState(emptySalaryForm)

  // ─── Salary History filters ───────────────────────────────────
  const [salaryFilterEmp, setSalaryFilterEmp] = useState('')

  // ─── Payroll ──────────────────────────────────────────────────
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [payrollForm, setPayrollForm] = useState(emptyPayrollForm)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // ─── Queries ──────────────────────────────────────────────────
  const { data: empData } = useQuery({
    queryKey: ['employees', search, department, empStatus],
    queryFn: () => employeesAPI.list({ per_page: 100, search: search || undefined, department: department || undefined, status: empStatus || undefined }).then(r => r.data.data),
  })
  const employees: any[] = empData?.items ?? []

  const { data: salaryHistData } = useQuery({
    queryKey: ['salary-history-all', salaryFilterEmp],
    queryFn: () => employeesAPI.listAllSalaryHistory({ employee_id: salaryFilterEmp || undefined }).then(r => r.data.data),
    enabled: tab === 'Salary History',
  })
  const salaryHistory: any[] = salaryHistData ?? []

  const { data: payrollRunsData, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-runs-hr'],
    queryFn: () => accountingAPI.getPayrollRuns({}).then(r => r.data),
    enabled: tab === 'Monthly Payroll',
  })
  const payrollRuns: any[] = payrollRunsData?.items ?? payrollRunsData?.data ?? payrollRunsData ?? []

  const { data: runDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-run', selectedRunId],
    queryFn: () => accountingAPI.getPayrollRun(selectedRunId!).then(r => r.data),
    enabled: !!selectedRunId,
  })

  // ─── Mutations ────────────────────────────────────────────────
  const createEmpMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await employeesAPI.create(d)
      const empId = res.data?.data?.id
      if (photoFile && empId) {
        await employeesAPI.uploadPhoto(empId, photoFile)
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee added!')
      closeEmpModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to add employee'),
  })

  const updateEmpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await employeesAPI.update(id, data)
      if (photoFile) {
        await employeesAPI.uploadPhoto(id, photoFile)
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee updated!')
      closeEmpModal()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update'),
  })

  const addSalaryMutation = useMutation({
    mutationFn: ({ empId, data }: { empId: string; data: any }) =>
      employeesAPI.addSalaryRecord(empId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['salary-history-all'] })
      toast.success('Salary record added!')
      setShowSalaryModal(false)
      setSalaryForm(emptySalaryForm)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const createPayrollMutation = useMutation({
    mutationFn: (d: any) => accountingAPI.processPayroll(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs-hr'] })
      toast.success('Payroll calculated — review and submit to Finance')
      setShowPayrollModal(false)
      setPayrollForm(emptyPayrollForm)
      const id = res.data?.id ?? res.data?.data?.id
      if (id) setSelectedRunId(String(id))
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to process payroll'),
  })

  const submitPayrollMutation = useMutation({
    mutationFn: (id: string) => accountingAPI.submitPayroll(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs-hr'] })
      toast.success('Payroll submitted to Finance!')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  // ─── Helpers ──────────────────────────────────────────────────
  function closeEmpModal() {
    setShowEmpModal(false)
    setEditingEmp(null)
    setEmpForm(emptyEmpForm)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  function openAddEmp() {
    setEditingEmp(null)
    setEmpForm(emptyEmpForm)
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowEmpModal(true)
  }

  function openEditEmp(e: any) {
    setEditingEmp(e)
    setEmpForm({
      employee_code: e.employee_code || '',
      full_name: e.full_name,
      cnic: e.cnic || '',
      phone: e.phone || '',
      designation: e.designation || '',
      department: e.department || '',
      join_date: e.join_date || '',
      monthly_salary: e.monthly_salary ? String(e.monthly_salary) : '',
    })
    setPhotoFile(null)
    setPhotoPreview(e.photo_url ? e.photo_url : null)
    setShowEmpModal(true)
  }

  function openRaise(e: any) {
    setSalaryEmp(e)
    setSalaryForm({
      ...emptySalaryForm,
      effective_date: new Date().toISOString().split('T')[0],
    })
    setShowSalaryModal(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function submitEmpForm(e: React.FormEvent) {
    e.preventDefault()
    if (!editingEmp && !photoFile) {
      toast.error('Employee photo is required')
      return
    }
    const d: any = { ...empForm }
    if (d.monthly_salary) d.monthly_salary = parseFloat(d.monthly_salary)
    else delete d.monthly_salary
    if (!d.join_date) delete d.join_date
    if (editingEmp) {
      updateEmpMutation.mutate({ id: editingEmp.id, data: d })
    } else {
      createEmpMutation.mutate(d)
    }
  }

  const exportRows = employees.map((e: any) => ({
    name: e.full_name,
    code: e.employee_code || '',
    designation: e.designation || '',
    department: e.department || '',
    phone: e.phone || '',
    cnic: e.cnic || '',
    salary: e.monthly_salary ? Number(e.monthly_salary) : '',
    join_date: e.join_date || '',
    status: e.status,
  }))

  const salaryExportRows = salaryHistory.map((h: any) => ({
    employee: h.employee_name,
    code: h.employee_code || '',
    effective_date: h.effective_date,
    previous_salary: h.previous_salary ? Number(h.previous_salary) : '',
    new_salary: Number(h.salary_amount),
    reason: h.change_reason || '',
  }))

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">HR & Employees</h1>
          <p className="page-subtitle">{empData?.total ?? 0} employees</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'Employees' && (
            <>
              <ExportButtons
                columns={[
                  { header: 'Name', key: 'name' }, { header: 'Code', key: 'code' },
                  { header: 'Designation', key: 'designation' }, { header: 'Department', key: 'department' },
                  { header: 'Phone', key: 'phone' }, { header: 'CNIC', key: 'cnic' },
                  { header: 'Salary (PKR)', key: 'salary' }, { header: 'Join Date', key: 'join_date' },
                  { header: 'Status', key: 'status' },
                ]}
                rows={exportRows}
                filename="farmerp360-employees"
                title="Employees"
              />
              <button onClick={openAddEmp} className="btn-primary">+ Add Employee</button>
            </>
          )}
          {tab === 'Salary History' && (
            <ExportButtons
              columns={[
                { header: 'Employee', key: 'employee' }, { header: 'Code', key: 'code' },
                { header: 'Effective Date', key: 'effective_date' },
                { header: 'Previous Salary (PKR)', key: 'previous_salary' },
                { header: 'New Salary (PKR)', key: 'new_salary' },
                { header: 'Reason', key: 'reason' },
              ]}
              rows={salaryExportRows}
              filename="farmerp360-salary-history"
              title="Salary History"
            />
          )}
          {tab === 'Monthly Payroll' && (
            <button onClick={() => setShowPayrollModal(true)} className="btn-primary">+ Calculate Payroll</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── EMPLOYEES TAB ──────────────────────────────────────────── */}
      {tab === 'Employees' && (
        <>
          {/* Filters */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Search</label>
                <input className="input" placeholder="Name, code, CNIC..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div>
                <label className="label">Department</label>
                <select className="input" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={empStatus} onChange={e => setEmpStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {hasFilter && (
                <button onClick={() => { setSearch(''); setDepartment(''); setEmpStatus('') }} className="btn-secondary">✕ Clear</button>
              )}
            </div>
          </div>

          {/* Employee Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {employees.map((e: any) => (
              <div key={e.id} className="card p-5">
                <div className="flex items-start gap-3">
                  {e.photo_url ? (
                    <img src={e.photo_url} alt={e.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-green-100 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xl flex-shrink-0">
                      {e.full_name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{e.full_name}</h3>
                    <p className="text-sm text-gray-500">{e.designation || 'No designation'}</p>
                    <p className="text-xs text-gray-400">{e.department || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {e.status}
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-1.5 text-xs">
                  <div className="text-gray-400">Emp Code</div>
                  <div className="font-mono font-medium text-gray-700">{e.employee_code || '—'}</div>
                  <div className="text-gray-400">Phone</div>
                  <div className="text-gray-700">{e.phone || '—'}</div>
                  <div className="text-gray-400">Join Date</div>
                  <div className="text-gray-700">{e.join_date || '—'}</div>
                  <div className="text-gray-400">Monthly Salary</div>
                  <div className="font-semibold text-gray-900">{e.monthly_salary ? pkr(e.monthly_salary) : '—'}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button onClick={() => openEditEmp(e)}
                    className="flex-1 text-xs text-center text-blue-600 hover:text-blue-800 font-medium py-1 rounded hover:bg-blue-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => openRaise(e)}
                    className="flex-1 text-xs text-center text-green-700 hover:text-green-800 font-medium py-1 rounded hover:bg-green-50 transition-colors">
                    Add Raise
                  </button>
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <div className="col-span-3 card p-12 text-center text-gray-400">
                {hasFilter ? 'No employees match the filters.' : 'No employees yet. Add one above.'}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── SALARY HISTORY TAB ─────────────────────────────────────── */}
      {tab === 'Salary History' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Filter by Employee</label>
                <select className="input" value={salaryFilterEmp} onChange={e => setSalaryFilterEmp(e.target.value)}>
                  <option value="">All Employees</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.full_name} {e.employee_code ? `(${e.employee_code})` : ''}</option>
                  ))}
                </select>
              </div>
              {salaryFilterEmp && (
                <button className="btn-secondary text-sm" onClick={() => setSalaryFilterEmp('')}>✕ Clear</button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Effective Date', 'Employee', 'Previous Salary', 'New Salary', 'Change', 'Reason', 'Notes'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((h: any) => {
                    const prev = h.previous_salary ? Number(h.previous_salary) : null
                    const curr = Number(h.salary_amount)
                    const diff = prev !== null ? curr - prev : null
                    return (
                      <tr key={h.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{h.effective_date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{h.employee_name}</div>
                          {h.employee_code && <div className="text-xs text-gray-400 font-mono">{h.employee_code}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{prev !== null ? pkr(prev) : '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{pkr(curr)}</td>
                        <td className="px-4 py-3">
                          {diff !== null ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {diff >= 0 ? '+' : ''}{pkr(diff)}
                            </span>
                          ) : <span className="text-gray-400 text-xs">Initial</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{h.change_reason || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{h.notes || '—'}</td>
                      </tr>
                    )
                  })}
                  {salaryHistory.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      No salary records yet. Use "Add Raise" on an employee card to record salary changes.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY PAYROLL TAB ────────────────────────────────────── */}
      {tab === 'Monthly Payroll' && (
        <div className="space-y-4">
          <div className="card p-4 bg-blue-50 border border-blue-100">
            <p className="text-sm text-blue-800 font-medium">HR Payroll Workflow</p>
            <p className="text-xs text-blue-600 mt-1">
              1. Calculate payroll for the month → 2. Review employee breakdown → 3. Submit to Finance →
              Finance approves and releases salary from the <strong>Accounting → Payroll</strong> page.
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-800">Payroll Runs</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Period', 'Employees', 'Total Net Salary', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollLoading && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
                )}
                {!payrollLoading && payrollRuns.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No payroll runs yet. Click "Calculate Payroll" to start.</td></tr>
                )}
                {payrollRuns.map((run: any) => (
                  <tr key={run.id} className={`border-t border-gray-50 hover:bg-gray-50 ${selectedRunId === String(run.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {MONTH_NAMES[(Number(run.month) - 1) % 12]} {run.year}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{run.employee_count ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{pkr(run.total_net)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[run.status] ?? STATUS_COLORS.draft}`}>
                        {(run.status ?? 'draft').charAt(0).toUpperCase() + (run.status ?? 'draft').slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setSelectedRunId(selectedRunId === String(run.id) ? null : String(run.id))}
                          className="text-xs text-blue-600 hover:underline font-medium">
                          {selectedRunId === String(run.id) ? 'Hide' : 'View'}
                        </button>
                        {run.status === 'draft' && (
                          <button
                            disabled={submitPayrollMutation.isPending}
                            onClick={() => submitPayrollMutation.mutate(String(run.id))}
                            className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                            Submit to Finance
                          </button>
                        )}
                        {run.status === 'submitted' && (
                          <span className="text-xs text-blue-600 italic">Awaiting Finance approval</span>
                        )}
                        {run.status === 'processed' && (
                          <span className="text-xs text-amber-600 italic">Approved — Finance to release</span>
                        )}
                        {run.status === 'paid' && (
                          <span className="text-xs text-green-600 font-medium">✓ Paid</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Run detail */}
          {selectedRunId && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Employee Breakdown</h3>
                <button onClick={() => setSelectedRunId(null)} className="text-gray-400 text-xl leading-none">✕</button>
              </div>
              {detailLoading ? (
                <p className="text-center py-8 text-gray-400">Loading…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Employee', 'Basic Salary', 'Days Present', 'Gross', 'Deductions', 'Net Pay'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(runDetail?.records ?? []).map((rec: any, i: number) => (
                        <tr key={rec.id ?? i} className="border-t border-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">{rec.employee_name ?? `Employee ${i+1}`}</td>
                          <td className="px-4 py-2 text-gray-600">{pkr(rec.basic_salary)}</td>
                          <td className="px-4 py-2 text-center text-gray-600">{rec.days_present ?? '—'}</td>
                          <td className="px-4 py-2">{pkr(rec.gross_salary)}</td>
                          <td className="px-4 py-2 text-red-600">{pkr(rec.deductions)}</td>
                          <td className="px-4 py-2 font-semibold text-green-700">{pkr(rec.net_salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ADD/EDIT EMPLOYEE MODAL ────────────────────────────────── */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editingEmp ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={closeEmpModal} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={submitEmpForm} className="p-5 space-y-4">
              {/* Photo upload */}
              <div>
                <label className="label">
                  Employee Photo {!editingEmp && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-xs text-center px-1">No photo</span>
                    )}
                  </div>
                  <div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <button type="button" onClick={() => photoInputRef.current?.click()}
                      className="btn-secondary text-sm">
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {!editingEmp && !photoFile && (
                      <p className="text-xs text-red-500 mt-1">Photo is required</p>
                    )}
                    {photoFile && (
                      <p className="text-xs text-green-600 mt-1">✓ {photoFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Full Name <span className="text-red-500">*</span></label>
                  <input className="input" required value={empForm.full_name} onChange={e => setEmpForm({ ...empForm, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Employee Code</label>
                  <input className="input" value={empForm.employee_code} onChange={e => setEmpForm({ ...empForm, employee_code: e.target.value })} placeholder="EMP001" />
                </div>
                <div>
                  <label className="label">CNIC</label>
                  <input className="input" value={empForm.cnic} onChange={e => setEmpForm({ ...empForm, cnic: e.target.value })} placeholder="42101-0000000-0" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} placeholder="03001234567" />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input className="input" value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} />
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value })}>
                    <option value="">Select...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Join Date</label>
                  <input type="date" className="input" value={empForm.join_date} onChange={e => setEmpForm({ ...empForm, join_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Monthly Salary (PKR)</label>
                  <input type="number" className="input" value={empForm.monthly_salary} onChange={e => setEmpForm({ ...empForm, monthly_salary: e.target.value })} placeholder="0" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeEmpModal} className="btn-secondary">Cancel</button>
                <button type="submit"
                  disabled={createEmpMutation.isPending || updateEmpMutation.isPending}
                  className="btn-primary">
                  {(createEmpMutation.isPending || updateEmpMutation.isPending) ? 'Saving...' : (editingEmp ? 'Update' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD RAISE MODAL ────────────────────────────────────────── */}
      {showSalaryModal && salaryEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Record Salary Change</h2>
                <p className="text-sm text-gray-500">{salaryEmp.full_name}</p>
              </div>
              <button onClick={() => setShowSalaryModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              addSalaryMutation.mutate({
                empId: salaryEmp.id,
                data: {
                  salary_amount: parseFloat(salaryForm.salary_amount),
                  effective_date: salaryForm.effective_date,
                  change_reason: salaryForm.change_reason || undefined,
                  notes: salaryForm.notes || undefined,
                },
              })
            }} className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Current Salary: </span>
                <span className="font-semibold text-gray-900">
                  {salaryEmp.monthly_salary ? pkr(salaryEmp.monthly_salary) : 'Not set'}
                </span>
              </div>

              <div>
                <label className="label">New Salary (PKR) <span className="text-red-500">*</span></label>
                <input type="number" required className="input" value={salaryForm.salary_amount}
                  onChange={e => setSalaryForm({ ...salaryForm, salary_amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="label">Effective Date <span className="text-red-500">*</span></label>
                <input type="date" required className="input" value={salaryForm.effective_date}
                  onChange={e => setSalaryForm({ ...salaryForm, effective_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Reason</label>
                <select className="input" value={salaryForm.change_reason}
                  onChange={e => setSalaryForm({ ...salaryForm, change_reason: e.target.value })}>
                  {CHANGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={salaryForm.notes}
                  onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })} />
              </div>

              {salaryForm.salary_amount && salaryEmp.monthly_salary && (
                <div className={`text-sm font-medium p-2 rounded ${Number(salaryForm.salary_amount) >= Number(salaryEmp.monthly_salary) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {Number(salaryForm.salary_amount) >= Number(salaryEmp.monthly_salary) ? '↑' : '↓'} Change:{' '}
                  {pkr(Number(salaryForm.salary_amount) - Number(salaryEmp.monthly_salary))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSalaryModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={addSalaryMutation.isPending} className="btn-primary">
                  {addSalaryMutation.isPending ? 'Saving...' : 'Save Salary Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CALCULATE PAYROLL MODAL ────────────────────────────────── */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Calculate Monthly Payroll</h2>
              <button onClick={() => setShowPayrollModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              createPayrollMutation.mutate({ month: Number(payrollForm.month), year: Number(payrollForm.year), notes: payrollForm.notes || undefined })
            }} className="p-5 space-y-4">
              <div>
                <label className="label">Month <span className="text-red-500">*</span></label>
                <select className="input" required value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: Number(e.target.value) })}>
                  {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year <span className="text-red-500">*</span></label>
                <input type="number" className="input" required min={2020} max={2099} value={payrollForm.year}
                  onChange={e => setPayrollForm({ ...payrollForm, year: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={payrollForm.notes}
                  onChange={e => setPayrollForm({ ...payrollForm, notes: e.target.value })} />
              </div>
              <p className="text-xs text-gray-500">
                Calculates gross pay for all active employees based on attendance records for the selected month. Saved as <strong>Draft</strong> — you can review and then submit to Finance.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPayrollModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createPayrollMutation.isPending} className="btn-primary">
                  {createPayrollMutation.isPending ? 'Calculating...' : 'Calculate Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
