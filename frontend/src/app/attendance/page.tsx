'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import toast from 'react-hot-toast'
import ExportButtons from '@/components/ui/ExportButtons'

const today = new Date().toISOString().split('T')[0]

export default function AttendancePage() {
  const qc = useQueryClient()
  const [showMark, setShowMark] = useState(false)
  const [form, setForm] = useState({ employee_id: '', date: today, status: 'present', check_in: '08:00', check_out: '17:00', notes: '' })

  const { data: attendance } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => employeesAPI.listAttendance({ per_page: 50, date_from: today, date_to: today }).then(r => r.data.data),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesAPI.list({ per_page: 100 }).then(r => r.data.data),
  })

  const markMutation = useMutation({
    mutationFn: (d: any) => employeesAPI.markAttendance(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Attendance marked!'); setShowMark(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const getEmpName = (id: string) => employees?.items?.find((e: any) => e.id === id)?.full_name || id.slice(0, 8)
  const presentToday = (attendance?.items ?? []).filter((a: any) => a.status === 'present').length
  const absentToday = (attendance?.items ?? []).filter((a: any) => a.status === 'absent').length

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Today: {presentToday} present, {absentToday} absent</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            columns={[
              { header: 'Employee Name', key: 'employee_name' },
              { header: 'Date', key: 'date' },
              { header: 'Status', key: 'status' },
              { header: 'Check In', key: 'check_in' },
              { header: 'Check Out', key: 'check_out' },
              { header: 'Remarks', key: 'remarks' },
            ]}
            rows={(attendance?.items ?? []).map((a: any) => ({
              employee_name: getEmpName(a.employee_id),
              date: a.date,
              status: a.status.replace('_', ' '),
              check_in: a.check_in || '',
              check_out: a.check_out || '',
              remarks: a.notes || '',
            }))}
            filename="farmerp360-attendance"
            title="Attendance Records"
          />
          <button onClick={() => setShowMark(true)} className="btn-primary">+ Mark Attendance</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Present Today', value: presentToday, color: 'text-green-700 bg-green-50' },
          { label: 'Absent Today', value: absentToday, color: 'text-red-700 bg-red-50' },
          { label: 'Total Employees', value: employees?.total ?? 0, color: 'text-blue-700 bg-blue-50' },
        ].map(item => (
          <div key={item.label} className={`card p-4 ${item.color}`}>
            <div className="text-2xl font-bold">{item.value}</div>
            <div className="text-sm font-medium mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Employee', 'Date', 'Status', 'Check In', 'Check Out', 'Notes'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(attendance?.items ?? []).map((a: any) => (
              <tr key={a.id} className="table-row">
                <td className="table-cell font-medium">{getEmpName(a.employee_id)}</td>
                <td className="table-cell">{a.date}</td>
                <td className="table-cell">
                  <span className={a.status === 'present' ? 'badge-active' : a.status === 'absent' ? 'badge-danger' : 'badge-warning'}>
                    {a.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="table-cell">{a.check_in || '—'}</td>
                <td className="table-cell">{a.check_out || '—'}</td>
                <td className="table-cell">{a.notes || '—'}</td>
              </tr>
            ))}
            {(attendance?.items ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No attendance records for today</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showMark && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Mark Attendance</h2>
              <button onClick={() => setShowMark(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); markMutation.mutate(form) }} className="p-5 space-y-4">
              <div>
                <label className="label">Employee *</label>
                <select className="input" required value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                  <option value="">Select employee...</option>
                  {(employees?.items ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code || 'No code'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Status *</label>
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="half_day">Half Day</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
                {form.status !== 'absent' && <>
                  <div>
                    <label className="label">Check In</label>
                    <input type="time" className="input" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Check Out</label>
                    <input type="time" className="input" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} />
                  </div>
                </>}
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMark(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={markMutation.isPending} className="btn-primary">{markMutation.isPending ? 'Saving...' : 'Mark'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
