'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pallaiAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function PallaiLedgerPage() {
  const [selectedCustomer, setSelectedCustomer] = useState('')

  const { data: customers = [] } = useQuery({ queryKey: ['pallai-customers'], queryFn: () => pallaiAPI.listCustomers().then(r => r.data.data) })
  const { data: ledger = [], isLoading: loadingLedger } = useQuery({
    queryKey: ['pallai-ledger', selectedCustomer],
    queryFn: () => pallaiAPI.getCustomerLedger(selectedCustomer).then(r => r.data.data),
    enabled: !!selectedCustomer
  })
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['pallai-customer-subs', selectedCustomer],
    queryFn: () => pallaiAPI.getCustomerSubscriptions(selectedCustomer).then(r => r.data.data),
    enabled: !!selectedCustomer
  })

  const selectedCustomerData = (customers as any[]).find((c: any) => c.id === selectedCustomer)
  const totalBilled = (ledger as any[]).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)
  const totalPaid = (ledger as any[]).reduce((sum: number, e: any) => sum + Number(e.paid_amount || 0), 0)

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Customer Ledger</h1>
      </div>

      {/* Customer selector */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
        <select className="form-input max-w-md" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
          <option value="">— Choose a customer —</option>
          {(customers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.full_name} {c.phone ? '· ' + c.phone : ''}</option>)}
        </select>
      </div>

      {selectedCustomer && (
        <>
          {/* Customer summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="text-lg font-bold text-gray-900">{selectedCustomerData?.full_name}</div>
              <div className="text-sm text-gray-500">{selectedCustomerData?.phone || '—'}</div>
              <div className="text-xs text-gray-400">{selectedCustomerData?.cnic || ''}</div>
            </div>
            <div className="card p-4">
              <div className="text-xl font-bold text-blue-700">{(subscriptions as any[]).filter((s: any) => s.is_active).length}</div>
              <div className="text-sm text-gray-500">Active Subscriptions</div>
            </div>
            <div className="card p-4">
              <div className="text-xl font-bold text-gray-900">PKR {totalBilled.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Billed</div>
            </div>
            <div className="card p-4">
              <div className={`text-xl font-bold ${(totalBilled - totalPaid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                PKR {(totalBilled - totalPaid).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Outstanding</div>
            </div>
          </div>

          {/* Subscriptions */}
          {(subscriptions as any[]).length > 0 && (
            <div className="card p-4 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Subscriptions</h3>
              <div className="flex flex-wrap gap-3">
                {(subscriptions as any[]).map((s: any) => (
                  <div key={s.id} className="border border-gray-100 rounded-lg px-4 py-2 text-sm">
                    <span className="font-medium">{s.animal_name || 'Animal'}</span>
                    <span className="text-gray-500"> · {s.package_name}</span>
                    <span className="text-green-700 font-medium ml-2">PKR {Number(s.monthly_fee || 0).toLocaleString()}/mo</span>
                    <span className={s.is_active ? ' badge-active ml-2' : ' badge-inactive ml-2'}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ledger table */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Invoice Ledger</h3>
            </div>
            {loadingLedger ? <div className="p-8 text-center text-gray-400">Loading ledger...</div> :
              (ledger as any[]).length === 0 ? <div className="p-8 text-center text-gray-400">No invoices found for this customer</div> :
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">{['Date','Invoice #','Description','Amount','Paid','Balance','Status'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody>
                  {(ledger as any[]).map((e: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">{e.date}</td>
                      <td className="py-3 px-4 font-mono text-xs">{e.invoice_number || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{e.description}</td>
                      <td className="py-3 px-4 font-medium">PKR {Number(e.amount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-green-700">PKR {Number(e.paid_amount || 0).toLocaleString()}</td>
                      <td className={`py-3 px-4 font-semibold ${Number(e.balance || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>PKR {Number(e.balance || 0).toLocaleString()}</td>
                      <td className="py-3 px-4"><span className={e.status === 'paid' ? 'badge-active' : 'badge-info'}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="py-3 px-4 text-right text-gray-700">Totals:</td>
                  <td className="py-3 px-4">PKR {totalBilled.toLocaleString()}</td>
                  <td className="py-3 px-4 text-green-700">PKR {totalPaid.toLocaleString()}</td>
                  <td className={`py-3 px-4 ${(totalBilled - totalPaid) > 0 ? 'text-red-600' : 'text-green-600'}`}>PKR {(totalBilled - totalPaid).toLocaleString()}</td>
                  <td></td>
                </tr></tfoot>
              </table>
            }
          </div>
        </>
      )}

      {!selectedCustomer && (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📒</div>
          <div className="text-lg font-medium text-gray-500">Select a customer to view their ledger</div>
        </div>
      )}
    </DashboardLayout>
  )
}
