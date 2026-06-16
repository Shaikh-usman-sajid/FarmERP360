'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['all'] },
  { label: 'Animals', href: '/animals', icon: '🐐', roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager', 'employee', 'data_entry', 'investor', 'pallai_customer'] },
  { label: 'Milk Production', href: '/milk', icon: '🥛', roles: ['super_admin', 'owner', 'farm_manager', 'employee'] },
  { label: 'Vaccination', href: '/vaccination', icon: '💉', roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager', 'employee'] },
  { label: 'Treatments', href: '/treatments', icon: '🩺', roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager'] },
  { label: 'Inventory', href: '/inventory', icon: '📦', roles: ['super_admin', 'owner', 'farm_manager', 'data_entry'] },
  { label: 'Feed Management', href: '/feed', icon: '🌿', roles: ['super_admin', 'owner', 'farm_manager', 'employee', 'data_entry'] },
  { label: 'Agriculture', href: '/agriculture', icon: '🌾', roles: ['super_admin', 'owner', 'farm_manager'] },
  { label: 'Employees', href: '/employees', icon: '👥', roles: ['super_admin', 'owner', 'farm_manager'] },
  { label: 'Attendance', href: '/attendance', icon: '📅', roles: ['super_admin', 'owner', 'farm_manager', 'employee'] },
  { label: 'Tasks', href: '/tasks', icon: '✅', roles: ['super_admin', 'owner', 'farm_manager', 'employee'] },
  { label: '── Investors ──', href: '', icon: '', roles: ['super_admin', 'owner', 'accountant', 'investor'], divider: true, dividerLabel: 'Investors' },
  { label: 'Investor Management', href: '/investors', icon: '📈', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'My Investment', href: '/investors/portal', icon: '💼', roles: ['investor'] },
  { label: '── Pallai ──', href: '', icon: '', roles: ['super_admin', 'owner', 'farm_manager', 'accountant', 'pallai_customer'], divider: true, dividerLabel: 'Pallai' },
  { label: 'Pallai Overview', href: '/pallai', icon: '🏠', roles: ['super_admin', 'owner', 'farm_manager', 'accountant'] },
  { label: 'My Portal', href: '/pallai/portal', icon: '👤', roles: ['pallai_customer'] },
  { label: 'Animal Gallery', href: '/pallai/animal-gallery', icon: '🖼️', roles: ['super_admin', 'owner', 'farm_manager', 'accountant', 'pallai_customer'] },
  { label: 'Customer Ledger', href: '/pallai/ledger', icon: '📒', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Pallai Reports', href: '/pallai/reports', icon: '📊', roles: ['super_admin', 'owner', 'accountant', 'farm_manager'] },
  { label: 'Invoices', href: '/invoices', icon: '🧾', roles: ['super_admin', 'owner', 'accountant', 'data_entry'] },
  { label: 'Payments', href: '/payments', icon: '💳', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Reports', href: '/reports', icon: '📋', roles: ['super_admin', 'owner', 'accountant', 'farm_manager'] },
  { label: '── Accounting ──', href: '', icon: '', roles: ['super_admin', 'owner', 'accountant'], divider: true, dividerLabel: 'Accounting' },
  { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: '📒', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Journal Entries', href: '/accounting/journal-entries', icon: '📓', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'General Ledger', href: '/accounting/ledger', icon: '📔', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Trial Balance', href: '/accounting/trial-balance', icon: '⚖️', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Vendors', href: '/accounting/vendors', icon: '🏪', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Bills (AP)', href: '/accounting/bills', icon: '📄', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Payroll', href: '/accounting/payroll', icon: '💰', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Profit & Loss', href: '/accounting/profit-loss', icon: '📊', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Balance Sheet', href: '/accounting/balance-sheet', icon: '🏦', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Cash Flow', href: '/accounting/cash-flow', icon: '💧', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Receivables', href: '/accounting/receivables', icon: '💵', roles: ['super_admin', 'owner', 'accountant'] },
  { label: 'Users', href: '/users', icon: '⚙️', roles: ['super_admin', 'owner'] },
  { label: 'Help / Manual', href: '/help', icon: '📖', roles: ['all'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const role = user?.role || ''

  const visibleItems = navItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(role)
  )

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50" style={{ backgroundColor: '#1B4332' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#C9A84C' }}>
          🌿
        </div>
        <div>
          <div className="font-bold text-sm text-white">FarmERP360</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Livestock ERP</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {visibleItems.map(item => (
          item.divider ? (
            <div
              key={`divider-${item.dividerLabel || item.label}`}
              className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#C9A84C', opacity: 0.9 }}
            >
              {item.dividerLabel || item.label}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        ))}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: '#2D6A4F', color: '#C9A84C' }}>
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.full_name}</div>
            <div className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {user?.role?.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-1 text-left text-sm px-2 py-1.5 rounded transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
        >
          → Sign out
        </button>
      </div>
    </aside>
  )
}
