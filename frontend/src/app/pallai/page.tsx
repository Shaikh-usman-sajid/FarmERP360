'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pallaiAPI, animalsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'

const TABS = ['Overview', 'Customers', 'Packages', 'Subscriptions', 'Billing']

export default function PallaiPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAddPackage, setShowAddPackage] = useState(false)
  const [showAddSubscription, setShowAddSubscription] = useState(false)
  const [showBilling, setShowBilling] = useState(false)
  const [customerForm, setCustomerForm] = useState({ full_name: '', phone: '', email: '', address: '', cnic: '' })
  const [packageForm, setPackageForm] = useState({ name: '', billing_model: 'monthly', price: '', includes_feed: false, includes_vet: false, description: '' })
  const [subForm, setSubForm] = useState({ customer_id: '', animal_id: '', package_id: '', start_date: '', monthly_fee: '', notes: '' })
  const [billingMonth, setBillingMonth] = useState('')
  const [showSend, setShowSend] = useState(false)
  const [sendMonth, setSendMonth] = useState('')
  const [sendChannels, setSendChannels] = useState({ whatsapp: true, email: true })
  const [sendResult, setSendResult] = useState<any>(null)
  const qc = useQueryClient()

  const { data: summary } = useQuery({ queryKey: ['pallai-summary'], queryFn: () => pallaiAPI.reportSummary().then(r => r.data.data) })
  const { data: customers = [] } = useQuery({ queryKey: ['pallai-customers'], queryFn: () => pallaiAPI.listCustomers().then(r => r.data.data) })
  const { data: packages = [] } = useQuery({ queryKey: ['pallai-packages'], queryFn: () => pallaiAPI.listPackages().then(r => r.data.data) })
  const { data: subscriptions = [] } = useQuery({ queryKey: ['pallai-subscriptions'], queryFn: () => pallaiAPI.listSubscriptions().then(r => r.data.data) })
  const { data: animals = [] } = useQuery({ queryKey: ['animals-simple'], queryFn: () => animalsAPI.list().then(r => r.data.data?.items || r.data.data || []) })

  const addCustomer = useMutation({
    mutationFn: (data: object) => pallaiAPI.createCustomer(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pallai-customers'] }); setShowAddCustomer(false); setCustomerForm({ full_name: '', phone: '', email: '', address: '', cnic: '' }) }
  })
  const addPackage = useMutation({
    mutationFn: (data: object) => pallaiAPI.createPackage(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pallai-packages'] }); setShowAddPackage(false) }
  })
  const addSub = useMutation({
    mutationFn: (data: object) => pallaiAPI.createSubscription(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pallai-subscriptions'] }); setShowAddSubscription(false) }
  })
  const generateBilling = useMutation({
    mutationFn: (data: object) => pallaiAPI.generateBilling(data),
    onSuccess: (res: any) => { alert(`Generated ${res.data.data?.invoices_generated ?? 0} invoices`); setShowBilling(false) }
  })
  const sendBilling = useMutation({
    mutationFn: (data: object) => pallaiAPI.sendBillingNotifications(data),
    onSuccess: (res: any) => setSendResult(res.data.data),
    onError: (e: any) => setSendResult({ error: e.response?.data?.detail || 'Failed' }),
  })

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Pallai Management</h1>
        <div className="flex gap-2 items-center">
          {activeTab === 'Customers' && (
            <ExportButtons
              columns={[
                { header: 'Name', key: 'Name' },
                { header: 'CNIC', key: 'CNIC' },
                { header: 'Phone', key: 'Phone' },
                { header: 'Address', key: 'Address' },
                { header: 'Status', key: 'Status' },
              ]}
              rows={(customers as any[]).map((c: any) => ({
                Name: c.full_name,
                CNIC: c.cnic || '',
                Phone: c.phone || '',
                Address: c.address || '',
                Status: c.is_active ? 'Active' : 'Inactive',
              }))}
              filename="farmerp360-pallai"
              title="Pallai"
            />
          )}
          {activeTab === 'Subscriptions' && (
            <ExportButtons
              columns={[
                { header: 'Customer', key: 'Customer' },
                { header: 'Package', key: 'Package' },
                { header: 'Animal', key: 'Animal' },
                { header: 'Start Date', key: 'Start Date' },
                { header: 'Status', key: 'Status' },
              ]}
              rows={(subscriptions as any[]).map((s: any) => ({
                Customer: s.customer_name || s.customer_id.slice(0, 8),
                Package: s.package_name || '',
                Animal: s.animal_name || '',
                'Start Date': s.start_date,
                Status: s.is_active ? 'Active' : 'Inactive',
              }))}
              filename="farmerp360-pallai"
              title="Pallai"
            />
          )}
          {activeTab === 'Customers' && <button className="btn-primary" onClick={() => setShowAddCustomer(true)}>+ Add Customer</button>}
          {activeTab === 'Packages' && <button className="btn-primary" onClick={() => setShowAddPackage(true)}>+ Add Package</button>}
          {activeTab === 'Subscriptions' && <button className="btn-primary" onClick={() => setShowAddSubscription(true)}>+ Add Subscription</button>}
          {activeTab === 'Billing' && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => { setSendResult(null); setShowSend(true) }}>Send to Customers</button>
              <button className="btn-primary" onClick={() => setShowBilling(true)}>Generate Invoices</button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5"><div className="text-2xl font-bold text-gray-900">{summary?.total_customers ?? '—'}</div><div className="text-sm text-gray-500 mt-1">Total Customers</div></div>
          <div className="card p-5"><div className="text-2xl font-bold text-green-700">{summary?.active_subscriptions ?? '—'}</div><div className="text-sm text-gray-500 mt-1">Active Subscriptions</div></div>
          <div className="card p-5"><div className="text-2xl font-bold text-blue-700">PKR {Number(summary?.monthly_revenue ?? 0).toLocaleString()}</div><div className="text-sm text-gray-500 mt-1">Monthly Revenue</div></div>
          <div className="card p-5"><div className="text-2xl font-bold text-red-600">PKR {Number(summary?.outstanding_balance ?? 0).toLocaleString()}</div><div className="text-sm text-gray-500 mt-1">Outstanding Balance</div></div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'Customers' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Name','Phone','Email','CNIC','Status'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(customers as any[]).map((c: any) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{c.full_name}</td>
                  <td className="py-3 px-4 text-gray-500">{c.phone || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{c.email || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{c.cnic || '—'}</td>
                  <td className="py-3 px-4"><span className={c.is_active ? 'badge-active' : 'badge-inactive'}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!(customers as any[]).length && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No customers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === 'Packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(packages as any[]).map((p: any) => (
            <div key={p.id} className="card p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-gray-900 text-lg">{p.name}</div>
                <div className="text-lg font-bold text-green-700">PKR {Number(p.price).toLocaleString()}</div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="badge-info">{p.billing_model}</span>
                {p.includes_feed && <span className="badge-active">Feed Included</span>}
                {p.includes_vet && <span className="badge-active">Vet Included</span>}
              </div>
              {p.description && <p className="text-sm text-gray-500 mt-2">{p.description}</p>}
            </div>
          ))}
          {!(packages as any[]).length && <div className="col-span-3 py-12 text-center text-gray-400">No packages yet</div>}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'Subscriptions' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Customer','Animal','Package','Start','Monthly Fee','Status'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {(subscriptions as any[]).map((s: any) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{s.customer_name || s.customer_id.slice(0,8)}</td>
                  <td className="py-3 px-4 text-gray-600">{s.animal_name || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{s.package_name || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{s.start_date}</td>
                  <td className="py-3 px-4 font-medium">PKR {Number(s.monthly_fee || 0).toLocaleString()}</td>
                  <td className="py-3 px-4"><span className={s.is_active ? 'badge-active' : 'badge-inactive'}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!(subscriptions as any[]).length && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No subscriptions yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'Billing' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Recurring Billing</h3>
            <p className="text-sm text-gray-500 mb-4">Generate monthly invoices for all active Pallai subscriptions. Invoices auto-generate on the 1st of each month.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 mb-4">
              Active subscriptions: <strong>{summary?.active_subscriptions ?? 0}</strong> ·
              Monthly revenue target: <strong>PKR {Number(summary?.monthly_revenue ?? 0).toLocaleString()}</strong>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Auto-Generation Schedule</div>
                <div className="font-medium text-gray-800">1st of every month</div>
                <div className="text-xs text-gray-400 mt-1">Generates for all active subscriptions</div>
              </div>
              <button className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:border-green-500 hover:bg-green-50 transition-colors"
                onClick={() => setShowBilling(true)}>
                <div className="text-2xl mb-1">📄</div>
                <div className="font-medium text-green-700">Generate Invoices</div>
                <div className="text-xs text-gray-500">Manually generate for a month</div>
              </button>
              <button className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                onClick={() => { setSendResult(null); setShowSend(true) }}>
                <div className="text-2xl mb-1">📬</div>
                <div className="font-medium text-blue-700">Send to Customers</div>
                <div className="text-xs text-gray-500">Send via WhatsApp &amp; Email</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="modal-overlay" onClick={() => setShowAddCustomer(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Add Pallai Customer</h3>
            <div className="space-y-3">
              <input className="form-input" placeholder="Full Name *" value={customerForm.full_name} onChange={e => setCustomerForm(f => ({...f, full_name: e.target.value}))} />
              <input className="form-input" placeholder="Phone" value={customerForm.phone} onChange={e => setCustomerForm(f => ({...f, phone: e.target.value}))} />
              <input className="form-input" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm(f => ({...f, email: e.target.value}))} />
              <input className="form-input" placeholder="CNIC" value={customerForm.cnic} onChange={e => setCustomerForm(f => ({...f, cnic: e.target.value}))} />
              <textarea className="form-input" placeholder="Address" rows={2} value={customerForm.address} onChange={e => setCustomerForm(f => ({...f, address: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => addCustomer.mutate(customerForm)} disabled={!customerForm.full_name || addCustomer.isPending}>
                {addCustomer.isPending ? 'Saving...' : 'Add Customer'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddCustomer(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {showAddPackage && (
        <div className="modal-overlay" onClick={() => setShowAddPackage(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Add Package</h3>
            <div className="space-y-3">
              <input className="form-input" placeholder="Package Name *" value={packageForm.name} onChange={e => setPackageForm(f => ({...f, name: e.target.value}))} />
              <select className="form-input" value={packageForm.billing_model} onChange={e => setPackageForm(f => ({...f, billing_model: e.target.value}))}>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="premium">Premium</option>
                <option value="custom">Custom</option>
              </select>
              <input className="form-input" placeholder="Price (PKR) *" type="number" value={packageForm.price} onChange={e => setPackageForm(f => ({...f, price: e.target.value}))} />
              <textarea className="form-input" placeholder="Description" rows={2} value={packageForm.description} onChange={e => setPackageForm(f => ({...f, description: e.target.value}))} />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={packageForm.includes_feed} onChange={e => setPackageForm(f => ({...f, includes_feed: e.target.checked}))} /> Includes Feed</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={packageForm.includes_vet} onChange={e => setPackageForm(f => ({...f, includes_vet: e.target.checked}))} /> Includes Vet</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => addPackage.mutate({...packageForm, price: Number(packageForm.price)})} disabled={!packageForm.name || !packageForm.price || addPackage.isPending}>
                {addPackage.isPending ? 'Saving...' : 'Add Package'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddPackage(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddSubscription && (
        <div className="modal-overlay" onClick={() => setShowAddSubscription(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Add Subscription</h3>
            <div className="space-y-3">
              <select className="form-input" value={subForm.customer_id} onChange={e => setSubForm(f => ({...f, customer_id: e.target.value}))}>
                <option value="">Select Customer *</option>
                {(customers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <select className="form-input" value={subForm.animal_id} onChange={e => setSubForm(f => ({...f, animal_id: e.target.value}))}>
                <option value="">Select Animal *</option>
                {(animals as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.tag_number} - {a.name || a.breed}</option>)}
              </select>
              <select className="form-input" value={subForm.package_id} onChange={e => setSubForm(f => ({...f, package_id: e.target.value}))}>
                <option value="">Select Package *</option>
                {(packages as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name} — PKR {Number(p.price).toLocaleString()}</option>)}
              </select>
              <input className="form-input" type="date" placeholder="Start Date *" value={subForm.start_date} onChange={e => setSubForm(f => ({...f, start_date: e.target.value}))} />
              <input className="form-input" placeholder="Monthly Fee (PKR)" type="number" value={subForm.monthly_fee} onChange={e => setSubForm(f => ({...f, monthly_fee: e.target.value}))} />
              <input className="form-input" placeholder="Notes" value={subForm.notes} onChange={e => setSubForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => addSub.mutate({...subForm, monthly_fee: subForm.monthly_fee ? Number(subForm.monthly_fee) : null})} disabled={!subForm.customer_id || !subForm.animal_id || !subForm.package_id || !subForm.start_date || addSub.isPending}>
                {addSub.isPending ? 'Saving...' : 'Add Subscription'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddSubscription(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Billing Modal */}
      {showBilling && (
        <div className="modal-overlay" onClick={() => setShowBilling(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Generate Monthly Invoices</h3>
            <p className="text-sm text-gray-500 mb-4">Create invoices for all active subscriptions for the selected billing month. Existing invoices for the same month are skipped.</p>
            <label className="label">Billing Month *</label>
            <input className="form-input" type="month" value={billingMonth} onChange={e => setBillingMonth(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1" onClick={() => generateBilling.mutate({ billing_month: billingMonth })} disabled={!billingMonth || generateBilling.isPending}>
                {generateBilling.isPending ? 'Generating...' : 'Generate Invoices'}
              </button>
              <button className="btn-secondary" onClick={() => setShowBilling(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoices Modal */}
      {showSend && (
        <div className="modal-overlay" onClick={() => setShowSend(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Send Invoices to Customers</h3>
            <p className="text-sm text-gray-500 mb-4">Send generated invoices to customers via WhatsApp and/or email. Configure integration in Admin → Settings → Integrations.</p>

            {!sendResult ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="label">Billing Month *</label>
                    <input className="form-input" type="month" value={sendMonth} onChange={e => setSendMonth(e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1">Only invoices generated for this month will be sent</p>
                  </div>
                  <div>
                    <label className="label">Send Via</label>
                    <div className="space-y-2 mt-1">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={sendChannels.whatsapp} onChange={e => setSendChannels(c => ({ ...c, whatsapp: e.target.checked }))}
                          className="h-4 w-4 text-green-600 rounded" />
                        <div>
                          <div className="text-sm font-medium">WhatsApp</div>
                          <div className="text-xs text-gray-500">Requires WhatsApp Business API configured in settings</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={sendChannels.email} onChange={e => setSendChannels(c => ({ ...c, email: e.target.checked }))}
                          className="h-4 w-4 text-green-600 rounded" />
                        <div>
                          <div className="text-sm font-medium">Email (SMTP / OAuth2)</div>
                          <div className="text-xs text-gray-500">Requires SMTP or OAuth2 email configured in settings</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button className="btn-primary flex-1"
                    onClick={() => {
                      const channels = []
                      if (sendChannels.whatsapp) channels.push('whatsapp')
                      if (sendChannels.email) channels.push('email')
                      sendBilling.mutate({ billing_month: sendMonth, channels })
                    }}
                    disabled={!sendMonth || (!sendChannels.whatsapp && !sendChannels.email) || sendBilling.isPending}>
                    {sendBilling.isPending ? 'Sending...' : 'Send Invoices'}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowSend(false)}>Cancel</button>
                </div>
              </>
            ) : sendResult.error ? (
              <div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{sendResult.error}</div>
                <button className="btn-secondary mt-3 w-full" onClick={() => setSendResult(null)}>Try Again</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{sendResult.whatsapp_sent}</div>
                    <div className="text-xs text-gray-600">WhatsApp Sent</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{sendResult.email_sent}</div>
                    <div className="text-xs text-gray-600">Emails Sent</div>
                  </div>
                  {sendResult.whatsapp_failed > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{sendResult.whatsapp_failed}</div>
                      <div className="text-xs text-gray-600">WA Failed</div>
                    </div>
                  )}
                  {sendResult.email_failed > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">{sendResult.email_failed}</div>
                      <div className="text-xs text-gray-600">Email Failed</div>
                    </div>
                  )}
                </div>
                {sendResult.errors?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 max-h-32 overflow-y-auto">
                    <div className="font-medium mb-1">Errors:</div>
                    {sendResult.errors.map((e: string, i: number) => <div key={i} className="text-red-600">{e}</div>)}
                  </div>
                )}
                <button className="btn-primary w-full" onClick={() => setShowSend(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
