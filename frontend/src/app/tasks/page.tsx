'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksAPI, employeesAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ['Dashboard', 'All Tasks', 'Create Task', 'My Tasks'] as const
type Tab = typeof TABS[number]

const CATEGORIES = ['feeding', 'milking', 'health_check', 'cleaning', 'maintenance', 'vaccination', 'treatment', 'other']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled']

const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500 line-through',
}
const CAT_ICON: Record<string, string> = {
  feeding: '🌿', milking: '🥛', health_check: '🩺', cleaning: '🧹',
  maintenance: '🔧', vaccination: '💉', treatment: '💊', other: '📋',
}
const today = () => new Date().toISOString().split('T')[0]

const MANAGER_ROLES = ['super_admin', 'owner', 'farm_manager']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ label, style }: { label: string; style: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${style}`}>{label.replace('_', ' ')}</span>
}

function KpiCard({ label, value, color = 'text-gray-900' }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TasksPage() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const [filter, setFilter] = useState({ status: '', priority: '', category: '', assigned_to_id: '' })
  const [completeModal, setCompleteModal] = useState<{ id: string; title: string } | null>(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [editModal, setEditModal] = useState<any>(null)

  const { user } = useAuthStore()
  const isManager = MANAGER_ROLES.includes(user?.role || '')
  const qc = useQueryClient()

  // ─── Queries ────────────────────────────────────────────────────────────────
  const summary = useQuery({
    queryKey: ['tasks-summary'],
    queryFn: () => tasksAPI.summary().then(r => r.data.data),
  })

  const allTasks = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => tasksAPI.list(Object.fromEntries(Object.entries(filter).filter(([, v]) => v))).then(r => r.data.data),
    enabled: tab === 'All Tasks',
  })

  const myTasks = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => tasksAPI.myTasks().then(r => r.data),
    enabled: tab === 'My Tasks',
  })

  const employees = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesAPI.list({ per_page: 100 }).then(r => r.data.data.items),
    enabled: tab === 'Create Task' || tab === 'All Tasks',
  })

  const animals = useQuery({
    queryKey: ['animals-active'],
    queryFn: () => animalsAPI.list({ status: 'active', per_page: 200 }).then(r => r.data.data),
    enabled: tab === 'Create Task',
  })

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['tasks-summary'] })
    qc.invalidateQueries({ queryKey: ['my-tasks'] })
  }

  const startTask = useMutation({ mutationFn: (id: string) => tasksAPI.start(id), onSuccess: invalidate })
  const completeTask = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => tasksAPI.complete(id, { completion_notes: notes }),
    onSuccess: () => { invalidate(); setCompleteModal(null); setCompleteNotes('') },
  })
  const cancelTask = useMutation({ mutationFn: (id: string) => tasksAPI.cancel(id), onSuccess: invalidate })
  const saveEdit = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => tasksAPI.update(id, data),
    onSuccess: () => { invalidate(); setEditModal(null) },
  })

  // ─── Create form ────────────────────────────────────────────────────────────
  const blankForm = { title: '', description: '', category: 'other', priority: 'medium', assigned_to_id: '', animal_id: '', due_date: today() }
  const [form, setForm] = useState({ ...blankForm })

  const createTask = useMutation({
    mutationFn: (data: object) => tasksAPI.create(data),
    onSuccess: () => { invalidate(); setForm({ ...blankForm }); setTab('All Tasks') },
  })

  const sv = summary.data

  // ─── Task Row Component ──────────────────────────────────────────────────────
  function TaskRow({ t, showActions = true }: { t: any; showActions?: boolean }) {
    return (
      <tr className={`border-t border-gray-50 hover:bg-gray-50 ${t.is_overdue ? 'bg-red-50' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span>{CAT_ICON[t.category] || '📋'}</span>
            <div>
              <p className="text-sm font-medium text-gray-800">{t.title}</p>
              {t.animal_code && <p className="text-xs text-gray-400">Animal: {t.animal_code}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><Badge label={t.status} style={STATUS_STYLE[t.status] || ''} /></td>
        <td className="px-4 py-3"><Badge label={t.priority} style={PRIORITY_STYLE[t.priority] || ''} /></td>
        <td className="px-4 py-3 text-sm text-gray-600">{t.assigned_to_name || <span className="text-gray-300">Unassigned</span>}</td>
        <td className="px-4 py-3 text-sm">
          {t.due_date ? (
            <span className={t.is_overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
              {t.due_date}{t.is_overdue && ' ⚠️'}
            </span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex gap-2 flex-wrap">
              {t.status === 'pending' && (
                <button className="text-xs text-blue-600 hover:underline"
                  onClick={() => startTask.mutate(t.id)}>Start</button>
              )}
              {(t.status === 'pending' || t.status === 'in_progress') && (
                <button className="text-xs text-green-600 hover:underline"
                  onClick={() => setCompleteModal({ id: t.id, title: t.title })}>Complete</button>
              )}
              {isManager && t.status !== 'completed' && t.status !== 'cancelled' && (
                <>
                  <button className="text-xs text-amber-600 hover:underline"
                    onClick={() => setEditModal(t)}>Edit</button>
                  <button className="text-xs text-red-500 hover:underline"
                    onClick={() => { if (confirm('Cancel this task?')) cancelTask.mutate(t.id) }}>Cancel</button>
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Tasks</h1>
          <p className="page-subtitle">Assign, track, and complete daily farm tasks</p>
        </div>
        {isManager && (
          <button className="btn-primary text-sm" onClick={() => setTab('Create Task')}>+ New Task</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'My Tasks' && myTasks.data?.data?.filter((x: any) => x.status === 'pending' || x.status === 'in_progress').length > 0 && (
              <span className="ml-1.5 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5">
                {myTasks.data.data.filter((x: any) => x.status === 'pending' || x.status === 'in_progress').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      {tab === 'Dashboard' && (
        <div className="space-y-6">
          {summary.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : sv && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Pending" value={sv.pending} color="text-gray-800" />
                <KpiCard label="In Progress" value={sv.in_progress} color="text-blue-600" />
                <KpiCard label="Completed Today" value={sv.completed_today} color="text-green-600" />
                <KpiCard label="Due Today" value={sv.due_today} color={sv.due_today > 0 ? 'text-amber-600' : 'text-gray-800'} />
                <KpiCard label="Overdue" value={sv.overdue} color={sv.overdue > 0 ? 'text-red-600' : 'text-gray-800'} />
                <KpiCard label="Total Open" value={sv.total_open} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* By category chart */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Open Tasks by Category</h2>
                  {sv.by_category?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={sv.by_category} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={80}
                          tickFormatter={(v: string) => CAT_ICON[v] + ' ' + v.replace('_', ' ')} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#16a34a" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No open tasks</div>}
                </div>

                {/* Today's tasks */}
                <div className="card overflow-hidden lg:col-span-2">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Due Today</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sv.due_today > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {sv.due_today}
                    </span>
                  </div>
                  {sv.todays_tasks?.length ? (
                    <div className="divide-y divide-gray-50">
                      {sv.todays_tasks.map((t: any) => (
                        <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{CAT_ICON[t.category] || '📋'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                              <p className="text-xs text-gray-400">{t.assigned_to_name || 'Unassigned'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge label={t.status} style={STATUS_STYLE[t.status] || ''} />
                            <Badge label={t.priority} style={PRIORITY_STYLE[t.priority] || ''} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-6 text-sm text-green-600 text-center">No tasks due today ✓</p>
                  )}
                </div>
              </div>

              {/* Overdue tasks */}
              {sv.overdue_tasks?.length > 0 && (
                <div className="card overflow-hidden border border-red-100">
                  <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
                    <span>⚠️</span>
                    <h2 className="text-sm font-semibold text-red-700">Overdue Tasks ({sv.overdue})</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Task', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sv.overdue_tasks.map((t: any) => <TaskRow key={t.id} t={t} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ALL TASKS ───────────────────────────────────────────────────────── */}
      {tab === 'All Tasks' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <select className="form-input text-sm" value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="form-input text-sm" value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="form-input text-sm" value={filter.category} onChange={e => setFilter(p => ({ ...p, category: e.target.value }))}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c.replace('_', ' ')}</option>)}
            </select>
            <select className="form-input text-sm" value={filter.assigned_to_id} onChange={e => setFilter(p => ({ ...p, assigned_to_id: e.target.value }))}>
              <option value="">All Employees</option>
              {(employees.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Task', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTasks.isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
                  ) : (allTasks.data || []).length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No tasks found.</td></tr>
                  ) : (
                    (allTasks.data || []).map((t: any) => <TaskRow key={t.id} t={t} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE TASK ─────────────────────────────────────────────────────── */}
      {tab === 'Create Task' && (
        <div className="max-w-2xl">
          {!isManager ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Only managers can create tasks.</div>
          ) : (
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">New Task</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Morning feeding — goat herd" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={form.assigned_to_id} onChange={e => setForm(p => ({ ...p, assigned_to_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {(employees.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.full_name} — {e.designation || e.department || ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Related Animal (optional)</label>
                  <select className="form-input" value={form.animal_id} onChange={e => setForm(p => ({ ...p, animal_id: e.target.value }))}>
                    <option value="">None</option>
                    {(animals.data || []).map((a: any) => <option key={a.id} value={a.id}>{a.animal_code}{a.name ? ` — ${a.name}` : ''}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Detailed instructions for the employee…" />
                </div>
              </div>
              <button className="btn-primary text-sm"
                disabled={!form.title || createTask.isPending}
                onClick={() => createTask.mutate({
                  ...form,
                  assigned_to_id: form.assigned_to_id || undefined,
                  animal_id: form.animal_id || undefined,
                  due_date: form.due_date || undefined,
                })}>
                {createTask.isPending ? 'Creating…' : 'Create Task'}
              </button>
              {createTask.isSuccess && <p className="text-xs text-green-600">Task created!</p>}
            </div>
          )}
        </div>
      )}

      {/* ── MY TASKS ────────────────────────────────────────────────────────── */}
      {tab === 'My Tasks' && (
        <div className="space-y-4">
          {myTasks.isLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
            <>
              {myTasks.data?.message && (
                <div className="card p-6 text-center text-sm text-amber-600 bg-amber-50">
                  {myTasks.data.message} Ask your manager to link your user account to an employee profile.
                </div>
              )}
              {myTasks.data?.employee && (
                <p className="text-sm text-gray-500">Showing tasks for: <strong>{myTasks.data.employee}</strong></p>
              )}
              {(myTasks.data?.data || []).length === 0 && !myTasks.data?.message ? (
                <div className="card p-8 text-center text-sm text-gray-400">No tasks assigned to you.</div>
              ) : (
                <div className="space-y-3">
                  {(myTasks.data?.data || []).map((t: any) => (
                    <div key={t.id} className={`card p-4 flex items-start gap-4 ${t.is_overdue ? 'border border-red-200' : ''}`}>
                      <div className="text-2xl shrink-0 mt-0.5">{CAT_ICON[t.category] || '📋'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                          <Badge label={t.status} style={STATUS_STYLE[t.status] || ''} />
                          <Badge label={t.priority} style={PRIORITY_STYLE[t.priority] || ''} />
                          {t.is_overdue && <span className="text-xs text-red-600 font-semibold">⚠️ Overdue</span>}
                        </div>
                        {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {t.due_date && <span>Due: {t.due_date}</span>}
                          {t.animal_code && <span>Animal: {t.animal_code}</span>}
                          {t.completed_at && <span>Completed: {t.completed_at.slice(0, 10)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {t.status === 'pending' && (
                          <button className="btn-secondary text-xs py-1"
                            onClick={() => startTask.mutate(t.id)}>
                            ▶ Start
                          </button>
                        )}
                        {(t.status === 'pending' || t.status === 'in_progress') && (
                          <button className="btn-primary text-xs py-1"
                            onClick={() => setCompleteModal({ id: t.id, title: t.title })}>
                            ✓ Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── COMPLETE MODAL ──────────────────────────────────────────────────── */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Complete Task</h3>
            <p className="text-xs text-gray-500 mb-4">"{completeModal.title}"</p>
            <label className="form-label">Completion Notes (optional)</label>
            <textarea className="form-input mb-4" rows={3} value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              placeholder="Any notes on how the task was completed…" />
            <div className="flex gap-2">
              <button className="btn-primary text-sm flex-1"
                disabled={completeTask.isPending}
                onClick={() => completeTask.mutate({ id: completeModal.id, notes: completeNotes })}>
                {completeTask.isPending ? 'Saving…' : 'Mark Complete'}
              </button>
              <button className="btn-secondary text-sm" onClick={() => { setCompleteModal(null); setCompleteNotes('') }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Edit Task</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Title</label>
                <input className="form-input" value={editModal.title}
                  onChange={e => setEditModal((p: any) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={editModal.priority}
                    onChange={e => setEditModal((p: any) => ({ ...p, priority: e.target.value }))}>
                    {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={editModal.due_date || ''}
                    onChange={e => setEditModal((p: any) => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Assign To</label>
                <select className="form-input" value={editModal.assigned_to_id || ''}
                  onChange={e => setEditModal((p: any) => ({ ...p, assigned_to_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {(employees.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={editModal.description || ''}
                  onChange={e => setEditModal((p: any) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary text-sm flex-1"
                disabled={saveEdit.isPending}
                onClick={() => saveEdit.mutate({ id: editModal.id, data: { title: editModal.title, priority: editModal.priority, due_date: editModal.due_date || null, assigned_to_id: editModal.assigned_to_id || null, description: editModal.description } })}>
                {saveEdit.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn-secondary text-sm" onClick={() => setEditModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
