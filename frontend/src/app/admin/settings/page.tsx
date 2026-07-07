'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

type Tab = 'organization' | 'preferences' | 'integrations' | 'audit'

const BRAND = { dark: '#1B4332', green: '#2D6A4F', gold: '#C9A84C', cream: '#FDF6E3', cream2: '#F5EDD6' }

function Field({ label, name, value, onChange, type = 'text', placeholder = '', sensitive = false }: {
  label: string, name: string, value: string, onChange: (k: string, v: string) => void,
  type?: string, placeholder?: string, sensitive?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: BRAND.dark }}>{label}</label>
      <input
        type={sensitive ? 'password' : type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder || label}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
        style={{ borderColor: '#d1d5db', backgroundColor: '#fff', focusRingColor: BRAND.green } as React.CSSProperties}
        onFocus={e => { e.currentTarget.style.borderColor = BRAND.green; e.currentTarget.style.boxShadow = `0 0 0 2px ${BRAND.green}33` }}
        onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}
      />
    </div>
  )
}

function Toggle({ label, name, value, onChange, description }: {
  label: string, name: string, value: string, onChange: (k: string, v: string) => void, description?: string
}) {
  const on = value === 'true'
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium" style={{ color: BRAND.dark }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(name, on ? 'false' : 'true')}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
        style={{ backgroundColor: on ? BRAND.green : '#d1d5db' }}
      >
        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
          style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }} />
      </button>
    </div>
  )
}

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('organization')
  const [form, setForm] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg] = useState('')
  const [alertMsg, setAlertMsg] = useState('')
  const [testEmailAddr, setTestEmailAddr] = useState('')
  const [testEmailMsg, setTestEmailMsg] = useState('')
  const [emailAlertAddrs, setEmailAlertAddrs] = useState('')
  const [emailAlertMsg, setEmailAlertMsg] = useState('')
  const [auditFilter, setAuditFilter] = useState({ module: '', action: '', page: 1 })

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminAPI.getSettings().then(r => r.data.data),
  })

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', auditFilter],
    queryFn: () => adminAPI.getAuditLogs(auditFilter).then(r => r.data.data),
    enabled: tab === 'audit',
  })

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-preview'],
    queryFn: () => adminAPI.previewAlerts().then(r => r.data.data),
    enabled: tab === 'integrations',
  })

  useEffect(() => {
    if (settingsData) {
      const flat: Record<string, string> = {}
      Object.entries(settingsData).forEach(([k, v]: [string, any]) => {
        flat[k] = v.value ?? ''
      })
      setForm(flat)
    }
  }, [settingsData])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => adminAPI.updateSettings(data),
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ['admin-settings'] }); setTimeout(() => setSaved(false), 3000) },
  })

  const whatsappMutation = useMutation({
    mutationFn: () => adminAPI.testWhatsapp({ to: testPhone, message: testMsg || undefined }),
    onSuccess: () => setTestMsg('✅ Test message sent successfully!'),
    onError: (e: any) => setTestMsg('❌ ' + (e.response?.data?.detail || 'Failed')),
  })

  const emailMutation = useMutation({
    mutationFn: () => adminAPI.testEmail({ to: testEmailAddr }),
    onSuccess: () => setTestEmailMsg('✅ Test email sent successfully!'),
    onError: (e: any) => setTestEmailMsg('❌ ' + (e.response?.data?.detail || 'Failed')),
  })

  const alertsMutation = useMutation({
    mutationFn: (recipients: string[]) => adminAPI.sendAlerts({ recipients }),
    onSuccess: (r) => setAlertMsg(`✅ Sent to ${r.data.data.sent} recipient(s)`),
    onError: (e: any) => setAlertMsg('❌ ' + (e.response?.data?.detail || 'Failed')),
  })

  const emailAlertsMutation = useMutation({
    mutationFn: (emails: string[]) => adminAPI.sendEmailAlerts({ emails }),
    onSuccess: (r) => setEmailAlertMsg(`✅ Sent to ${r.data.data.sent} recipient(s)${r.data.data.failed ? ` (${r.data.data.failed} failed)` : ''}`),
    onError: (e: any) => setEmailAlertMsg('❌ ' + (e.response?.data?.detail || 'Failed')),
  })

  const onChange = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const tabs: { id: Tab, label: string, icon: string }[] = [
    { id: 'organization', label: 'Organization', icon: '🏢' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'audit', label: 'Audit Logs', icon: '📋' },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: BRAND.dark }}>Admin Settings</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Configure organization profile, system preferences, and integrations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: BRAND.cream2 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
              style={tab === t.id
                ? { backgroundColor: BRAND.dark, color: '#fff' }
                : { backgroundColor: 'transparent', color: '#6b7280' }}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading settings…</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor: BRAND.cream2 }}>

            {/* ── Organization ── */}
            {tab === 'organization' && (
              <div className="space-y-5">
                <h2 className="font-semibold text-lg mb-4" style={{ color: BRAND.dark }}>Organization Profile</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Farm / Organization Name" name="org_name" value={form.org_name || ''} onChange={onChange} placeholder="Hayo Farm" />
                  <Field label="Phone Number" name="org_phone" value={form.org_phone || ''} onChange={onChange} placeholder="+92 300 1234567" />
                  <Field label="Email Address" name="org_email" value={form.org_email || ''} onChange={onChange} placeholder="farm@example.com" />
                  <Field label="NTN (Tax Number)" name="org_ntn" value={form.org_ntn || ''} onChange={onChange} placeholder="1234567-8" />
                  <Field label="Registration Number" name="org_registration_no" value={form.org_registration_no || ''} onChange={onChange} />
                </div>
                <Field label="Address" name="org_address" value={form.org_address || ''} onChange={onChange} placeholder="Street, City, Province" />
              </div>
            )}

            {/* ── Preferences ── */}
            {tab === 'preferences' && (
              <div className="space-y-5">
                <h2 className="font-semibold text-lg mb-4" style={{ color: BRAND.dark }}>System Preferences</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Default Milk Price (PKR/liter)" name="milk_price_per_liter" value={form.milk_price_per_liter || ''} onChange={onChange} type="number" placeholder="120" />
                  <Field label="Currency" name="currency" value={form.currency || ''} onChange={onChange} placeholder="PKR" />
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: BRAND.dark }}>Fiscal Year Start Month</label>
                    <select
                      value={form.fiscal_year_start_month || '7'}
                      onChange={e => onChange('fiscal_year_start_month', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#d1d5db' }}
                    >
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={i+1} value={String(i+1)}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <Field label="Low Stock Alert (days remaining)" name="low_stock_alert_days" value={form.low_stock_alert_days || ''} onChange={onChange} type="number" placeholder="7" />
                  <Field label="Low Inventory Threshold (units)" name="low_inventory_threshold" value={form.low_inventory_threshold || ''} onChange={onChange} type="number" placeholder="10" />
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: BRAND.dark }}>Date Format</label>
                    <select
                      value={form.date_format || 'DD/MM/YYYY'}
                      onChange={e => onChange('date_format', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#d1d5db' }}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Integrations ── */}
            {tab === 'integrations' && (
              <div className="space-y-8">
                {/* WhatsApp */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#25D366' + '22' }}>📱</div>
                    <h3 className="font-semibold" style={{ color: BRAND.dark }}>WhatsApp Business API</h3>
                  </div>
                  <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: BRAND.cream }}>
                    <Toggle label="Enable WhatsApp Notifications" name="whatsapp_enabled" value={form.whatsapp_enabled || 'false'} onChange={onChange}
                      description="Send automated alerts via WhatsApp Business Cloud API" />
                  </div>
                  {form.whatsapp_enabled === 'true' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Phone Number ID" name="whatsapp_phone_number_id" value={form.whatsapp_phone_number_id || ''} onChange={onChange} sensitive placeholder="From Meta Business Dashboard" />
                        <Field label="Access Token" name="whatsapp_access_token" value={form.whatsapp_access_token || ''} onChange={onChange} sensitive placeholder="Long-lived access token" />
                        <Field label="Business Account ID" name="whatsapp_business_account_id" value={form.whatsapp_business_account_id || ''} onChange={onChange} sensitive />
                      </div>
                      {/* Alert Preview */}
                      {alertsData && (
                        <div className="mt-3 p-3 rounded-lg text-sm" style={{ backgroundColor: BRAND.cream }}>
                          <div className="font-medium mb-2" style={{ color: BRAND.dark }}>Current Alerts ({alertsData.total})</div>
                          {alertsData.alerts.length === 0
                            ? <div style={{ color: '#16a34a' }}>✅ No pending alerts</div>
                            : alertsData.alerts.map((a: any, i: number) => (
                              <div key={i} className="py-1" style={{ color: '#92400e' }}>{a.message}</div>
                            ))
                          }
                        </div>
                      )}
                      {/* Test & Send */}
                      <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Test Recipient (e.g. 923001234567)</label>
                          <div className="flex gap-2">
                            <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
                              placeholder="923001234567" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                            <button onClick={() => { setTestMsg(''); whatsappMutation.mutate() }}
                              disabled={!testPhone || whatsappMutation.isPending}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                              style={{ backgroundColor: BRAND.green }}>
                              {whatsappMutation.isPending ? '…' : 'Test'}
                            </button>
                          </div>
                          {testMsg && <div className="text-xs mt-1" style={{ color: testMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{testMsg}</div>}
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Send Alerts To (comma-separated numbers)</label>
                          <div className="flex gap-2">
                            <input id="alert-recipients" placeholder="923001234567,923009876543"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                            <button onClick={() => {
                              const el = document.getElementById('alert-recipients') as HTMLInputElement
                              const nums = el.value.split(',').map(s => s.trim()).filter(Boolean)
                              setAlertMsg(''); alertsMutation.mutate(nums)
                            }}
                              disabled={alertsMutation.isPending}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                              style={{ backgroundColor: BRAND.gold, color: BRAND.dark }}>
                              {alertsMutation.isPending ? '…' : 'Send Alerts'}
                            </button>
                          </div>
                          {alertMsg && <div className="text-xs mt-1" style={{ color: alertMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{alertMsg}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Easypaisa */}
                <div style={{ borderTop: `1px solid ${BRAND.cream2}`, paddingTop: '1.5rem' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#00984722' }}>💚</div>
                    <h3 className="font-semibold" style={{ color: BRAND.dark }}>Easypaisa</h3>
                  </div>
                  <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: BRAND.cream }}>
                    <Toggle label="Enable Easypaisa Payments" name="easypaisa_enabled" value={form.easypaisa_enabled || 'false'} onChange={onChange}
                      description="Accept payments via Easypaisa on invoices" />
                  </div>
                  {form.easypaisa_enabled === 'true' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Store ID" name="easypaisa_store_id" value={form.easypaisa_store_id || ''} onChange={onChange} sensitive />
                      <Field label="Hash Key" name="easypaisa_hash_key" value={form.easypaisa_hash_key || ''} onChange={onChange} sensitive />
                      <Field label="Easypaisa Account Number" name="easypaisa_account_num" value={form.easypaisa_account_num || ''} onChange={onChange} sensitive />
                    </div>
                  )}
                </div>

                {/* JazzCash */}
                <div style={{ borderTop: `1px solid ${BRAND.cream2}`, paddingTop: '1.5rem' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#f9731622' }}>🟠</div>
                    <h3 className="font-semibold" style={{ color: BRAND.dark }}>JazzCash</h3>
                  </div>
                  <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: BRAND.cream }}>
                    <Toggle label="Enable JazzCash Payments" name="jazzcash_enabled" value={form.jazzcash_enabled || 'false'} onChange={onChange}
                      description="Accept payments via JazzCash on invoices" />
                  </div>
                  {form.jazzcash_enabled === 'true' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Merchant ID" name="jazzcash_merchant_id" value={form.jazzcash_merchant_id || ''} onChange={onChange} sensitive />
                      <Field label="Password" name="jazzcash_password" value={form.jazzcash_password || ''} onChange={onChange} sensitive />
                      <Field label="Integrity Salt" name="jazzcash_integrity_salt" value={form.jazzcash_integrity_salt || ''} onChange={onChange} sensitive />
                    </div>
                  )}
                </div>

                {/* SMTP — Simple Auth */}
                <div style={{ borderTop: `1px solid ${BRAND.cream2}`, paddingTop: '1.5rem' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#3b82f622' }}>📧</div>
                    <div>
                      <h3 className="font-semibold" style={{ color: BRAND.dark }}>Email (SMTP — Simple Auth)</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Use for Gmail App Passwords, Hostinger, cPanel, Sendgrid SMTP</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: BRAND.cream }}>
                    <Toggle label="Enable SMTP Email" name="smtp_enabled" value={form.smtp_enabled || 'false'} onChange={onChange}
                      description="Send invoices and notifications via SMTP email" />
                  </div>
                  {form.smtp_enabled === 'true' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="SMTP Host" name="smtp_host" value={form.smtp_host || ''} onChange={onChange} placeholder="smtp.gmail.com" />
                        <Field label="Port" name="smtp_port" value={form.smtp_port || '587'} onChange={onChange} placeholder="587" type="number" />
                        <Field label="Username / Email" name="smtp_username" value={form.smtp_username || ''} onChange={onChange} placeholder="you@gmail.com" />
                        <Field label="Password / App Password" name="smtp_password" value={form.smtp_password || ''} onChange={onChange} sensitive placeholder="App password or SMTP password" />
                        <Field label="From Email" name="smtp_from_email" value={form.smtp_from_email || ''} onChange={onChange} placeholder="noreply@yourfarm.com" />
                        <Field label="From Name" name="smtp_from_name" value={form.smtp_from_name || ''} onChange={onChange} placeholder="FarmERP360" />
                      </div>
                      <div className="p-3 rounded-xl" style={{ backgroundColor: BRAND.cream }}>
                        <Toggle label="Use STARTTLS (recommended for port 587)" name="smtp_use_tls" value={form.smtp_use_tls || 'true'} onChange={onChange}
                          description="Disable only if using SSL on port 465" />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Send Test Email To</label>
                          <div className="flex gap-2">
                            <input value={testEmailAddr} onChange={e => setTestEmailAddr(e.target.value)}
                              placeholder="test@example.com" type="email" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                            <button onClick={() => { setTestEmailMsg(''); emailMutation.mutate() }}
                              disabled={!testEmailAddr || emailMutation.isPending}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                              style={{ backgroundColor: BRAND.green }}>
                              {emailMutation.isPending ? '…' : 'Send Test'}
                            </button>
                          </div>
                          {testEmailMsg && <div className="text-xs mt-1" style={{ color: testEmailMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{testEmailMsg}</div>}
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Send Farm Alerts To (comma-separated emails)</label>
                          <div className="flex gap-2">
                            <input value={emailAlertAddrs} onChange={e => setEmailAlertAddrs(e.target.value)}
                              placeholder="owner@farm.com,manager@farm.com" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                            <button
                              onClick={() => {
                                const emails = emailAlertAddrs.split(',').map(s => s.trim()).filter(Boolean)
                                setEmailAlertMsg('')
                                emailAlertsMutation.mutate(emails)
                              }}
                              disabled={!emailAlertAddrs.trim() || emailAlertsMutation.isPending}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
                              style={{ backgroundColor: BRAND.gold, color: BRAND.dark }}>
                              {emailAlertsMutation.isPending ? '…' : 'Send Alerts'}
                            </button>
                          </div>
                          {emailAlertMsg && <div className="text-xs mt-1" style={{ color: emailAlertMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{emailAlertMsg}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SMTP — OAuth2 (Microsoft 365) */}
                <div style={{ borderTop: `1px solid ${BRAND.cream2}`, paddingTop: '1.5rem' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#0078d422' }}>🔐</div>
                    <div>
                      <h3 className="font-semibold" style={{ color: BRAND.dark }}>Email (OAuth2 — Microsoft 365 / Azure)</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>For Microsoft 365 organizations using Modern Auth. Requires Azure App Registration.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: BRAND.cream }}>
                    <Toggle label="Enable OAuth2 Email (overrides SMTP)" name="smtp_oauth_enabled" value={form.smtp_oauth_enabled || 'false'} onChange={onChange}
                      description="When enabled, this takes priority over simple SMTP" />
                  </div>
                  {form.smtp_oauth_enabled === 'true' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Client ID (Application ID)" name="smtp_oauth_client_id" value={form.smtp_oauth_client_id || ''} onChange={onChange} sensitive />
                      <Field label="Client Secret" name="smtp_oauth_client_secret" value={form.smtp_oauth_client_secret || ''} onChange={onChange} sensitive />
                      <Field label="Tenant ID (Directory ID)" name="smtp_oauth_tenant_id" value={form.smtp_oauth_tenant_id || ''} onChange={onChange} placeholder="your-tenant-id or 'common'" />
                      <Field label="Refresh Token" name="smtp_oauth_refresh_token" value={form.smtp_oauth_refresh_token || ''} onChange={onChange} sensitive />
                      <Field label="Sender Email (must match Azure App)" name="smtp_oauth_from_email" value={form.smtp_oauth_from_email || ''} onChange={onChange} placeholder="noreply@yourdomain.com" />
                      <div className="flex items-end">
                        <div className="w-full">
                          <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Test Email</label>
                          <div className="flex gap-2">
                            <input value={testEmailAddr} onChange={e => setTestEmailAddr(e.target.value)}
                              placeholder="test@example.com" type="email" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                            <button onClick={() => { setTestEmailMsg(''); emailMutation.mutate() }}
                              disabled={!testEmailAddr || emailMutation.isPending}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                              style={{ backgroundColor: BRAND.green }}>
                              {emailMutation.isPending ? '…' : 'Test'}
                            </button>
                          </div>
                          {testEmailMsg && <div className="text-xs mt-1" style={{ color: testEmailMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{testEmailMsg}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Audit Logs ── */}
            {tab === 'audit' && (
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <input value={auditFilter.module} onChange={e => setAuditFilter(f => ({ ...f, module: e.target.value, page: 1 }))}
                    placeholder="Filter by module" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                  <input value={auditFilter.action} onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value, page: 1 }))}
                    placeholder="Filter by action" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: '#d1d5db' }} />
                </div>
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: BRAND.cream2 }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: BRAND.cream2 }}>
                        {['Timestamp', 'User', 'Role', 'Module', 'Action', 'Record'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: BRAND.dark }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditData?.items?.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">No audit logs found</td></tr>
                      )}
                      {auditData?.items?.map((log: any) => (
                        <tr key={log.id} className="border-t hover:bg-gray-50" style={{ borderColor: BRAND.cream2 }}>
                          <td className="px-4 py-3 text-xs text-gray-500">{log.created_at?.replace('T', ' ').slice(0, 19)}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: BRAND.dark }}>{log.user_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: BRAND.cream, color: BRAND.green }}>{log.user_role}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{log.module}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: log.action?.toLowerCase().includes('delet') ? '#fee2e2' : log.action?.toLowerCase().includes('creat') ? '#dcfce7' : '#fef3c7',
                                       color: log.action?.toLowerCase().includes('delet') ? '#dc2626' : log.action?.toLowerCase().includes('creat') ? '#16a34a' : '#92400e' }}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.record_id?.slice(0, 8)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {auditData && (
                  <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                    <span>Total: {auditData.total} entries</span>
                    <div className="flex gap-2">
                      <button disabled={auditFilter.page === 1}
                        onClick={() => setAuditFilter(f => ({ ...f, page: f.page - 1 }))}
                        className="px-3 py-1 rounded border disabled:opacity-40" style={{ borderColor: '#d1d5db' }}>← Prev</button>
                      <span className="px-3 py-1">Page {auditFilter.page}</span>
                      <button disabled={auditFilter.page * 50 >= auditData.total}
                        onClick={() => setAuditFilter(f => ({ ...f, page: f.page + 1 }))}
                        className="px-3 py-1 rounded border disabled:opacity-40" style={{ borderColor: '#d1d5db' }}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            {tab !== 'audit' && (
              <div className="flex items-center gap-3 mt-8 pt-6" style={{ borderTop: `1px solid ${BRAND.cream2}` }}>
                <button
                  onClick={() => updateMutation.mutate(form)}
                  disabled={updateMutation.isPending}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: BRAND.dark }}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                {saved && <span className="text-sm font-medium" style={{ color: '#16a34a' }}>✅ Settings saved</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
