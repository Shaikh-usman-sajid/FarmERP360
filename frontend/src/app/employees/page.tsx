'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'

const emptyForm = { employee_code: '', full_name: '', cnic: '', phone: '', designation: '', department: '', join_date: '', monthly_salary: '' }

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.list({ per_page: 50 }).then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => employeesAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee added!'); setShowAdd(false); setForm(emptyForm) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{data?.total ?? 0} employees</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Employee</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(data?.items ?? []).map((e: any) => (
          <div key={e.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg">
                {e.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{e.full_name}</h3>
                <p className="text-sm text-gray-500">{e.designation || 'No designation'}</p>
                <p className="text-xs text-gray-400">{e.department || '—'}</p>
              </div>
              <span className={e.status === 'active' ? 'badge-active' : 'badge-gray'}>{e.status}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">Employee Code</div>
              <div className="font-mono font-medium text-gray-700">{e.employee_code || '—'}</div>
              <div className="text-gray-400">Phone</div>
              <div className="text-gray-700">{e.phone || '—'}</div>
              <div className="text-gray-400">Monthly Salary</div>
              <div className="font-semibold text-gray-900">{e.monthly_salary ? `PKR ${Number(e.monthly_salary).toLocaleString()}` : '—'}</div>
            </div>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && (
          <div className="col-span-3 card p-12 text-center text-gray-400">No employees found</div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Add Employee</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              const d: any = { ...form }
              if (d.monthly_salary) d.monthly_salary = parseFloat(d.monthly_salary)
              if (!d.join_date) delete d.join_date
              createMutation.mutate(d)
            }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Employee Code</label>
                  <input className="input" value={form.employee_code} onChange={e => setForm({ ...form, employee_code: e.target.value })} placeholder="EMP004" />
                </div>
                <div>
                  <label className="label">CNIC</label>
                  <input className="input" value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} placeholder="42101-0000000-0" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="03001234567" />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input className="input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="">Select...</option>
                    {['Operations', 'Dairy', 'Health', 'Agriculture', 'Transport', 'Admin'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Join Date</label>
                  <input type="date" className="input" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Monthly Salary (PKR)</label>
                  <input type="number" className="input" value={form.monthly_salary} onChange={e => setForm({ ...form, monthly_salary: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
