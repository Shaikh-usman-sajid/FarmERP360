'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

interface NavGroup {
  id: string
  label: string
  icon: string
  items: NavItem[]
}

const standaloneTop: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['all'] },
]

const navGroups: NavGroup[] = [
  {
    id: 'livestock',
    label: 'Livestock',
    icon: '🐄',
    items: [
      { label: 'Animals', href: '/animals', icon: '🐐', roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager', 'employee', 'data_entry', 'investor', 'pallai_customer'] },
      { label: 'Milk Production', href: '/milk', icon: '🥛', roles: ['super_admin', 'owner', 'farm_manager', 'employee'] },
      { label: 'Weight Tracking', href: '/livestock/weight', icon: '⚖️', roles: ['super_admin', 'owner', 'farm_manager', 'employee', 'data_entry'] },
      { label: 'Vaccination', href: '/vaccination', icon: '💉', roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager', 'employee'] },
      { label: 'Treatments', href: '/treatments', icon: '🩺', roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: '⚙️',
    items: [
      { label: 'Inventory', href: '/inventory', icon: '📦', roles: ['super_admin', 'owner', 'farm_manager', 'data_entry'] },
      { label: 'Feed Management', href: '/feed', icon: '🌿', roles: ['super_admin', 'owner', 'farm_manager', 'employee', 'data_entry'] },
      { label: 'Agriculture', href: '/agriculture', icon: '🌾', roles: ['super_admin', 'owner', 'farm_manager'] },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Tasks',
    icon: '👥',
    items: [
      { label: 'Employees', href: '/employees', icon: '👤', roles: ['super_admin', 'owner', 'farm_manager'] },
      { label: 'Attendance', href: '/attendance', icon: '📅', roles: ['super_admin', 'owner', 'farm_manager', 'employee'] },
      { label: 'Tasks', href: '/tasks', icon: '✅', roles: ['super_admin', 'owner', 'farm_manager', 'employee'] },
    ],
  },
  {
    id: 'investors',
    label: 'Investors',
    icon: '📈',
    items: [
      { label: 'Investor Management', href: '/investors', icon: '📊', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'My Investment', href: '/investors/portal', icon: '💼', roles: ['investor'] },
    ],
  },
  {
    id: 'pallai',
    label: 'Pallai',
    icon: '🏠',
    items: [
      { label: 'Pallai Overview', href: '/pallai', icon: '🏡', roles: ['super_admin', 'owner', 'farm_manager', 'accountant'] },
      { label: 'My Portal', href: '/pallai/portal', icon: '👤', roles: ['pallai_customer'] },
      { label: 'Animal Gallery', href: '/pallai/animal-gallery', icon: '🖼️', roles: ['super_admin', 'owner', 'farm_manager', 'accountant', 'pallai_customer'] },
      { label: 'Customer Ledger', href: '/pallai/ledger', icon: '📒', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Pallai Reports', href: '/pallai/reports', icon: '📋', roles: ['super_admin', 'owner', 'accountant', 'farm_manager'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: '💰',
    items: [
      { label: 'Invoices', href: '/invoices', icon: '🧾', roles: ['super_admin', 'owner', 'accountant', 'data_entry'] },
      { label: 'Payments', href: '/payments', icon: '💳', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Reports', href: '/reports', icon: '📊', roles: ['super_admin', 'owner', 'accountant', 'farm_manager'] },
      { label: 'Customer Analytics', href: '/reports?tab=Customers', icon: '👥', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Forecasting', href: '/forecasting', icon: '🔮', roles: ['super_admin', 'owner', 'farm_manager', 'accountant'] },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: '🏦',
    items: [
      { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: '📒', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Journal Entries', href: '/accounting/journal-entries', icon: '📓', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'General Ledger', href: '/accounting/ledger', icon: '📔', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Trial Balance', href: '/accounting/trial-balance', icon: '⚖️', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Vendors', href: '/accounting/vendors', icon: '🏪', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Bills (AP)', href: '/accounting/bills', icon: '📄', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Payroll', href: '/accounting/payroll', icon: '💵', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Profit & Loss', href: '/accounting/profit-loss', icon: '📈', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Balance Sheet', href: '/accounting/balance-sheet', icon: '🏦', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Cash Flow', href: '/accounting/cash-flow', icon: '💧', roles: ['super_admin', 'owner', 'accountant'] },
      { label: 'Receivables', href: '/accounting/receivables', icon: '💰', roles: ['super_admin', 'owner', 'accountant'] },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '🛡️',
    items: [
      { label: 'Users', href: '/users', icon: '👤', roles: ['super_admin', 'owner'] },
      { label: 'Animal Breeds', href: '/admin/breeds', icon: '🐄', roles: ['super_admin', 'owner'] },
      { label: 'Vaccine & Medicine Names', href: '/admin/vaccine-types', icon: '💉', roles: ['super_admin', 'owner'] },
      { label: 'Customer Categories', href: '/admin/customer-categories', icon: '🗂️', roles: ['super_admin', 'owner'] },
      { label: 'Customers', href: '/admin/customers', icon: '👥', roles: ['super_admin', 'owner'] },
      { label: 'Admin Settings', href: '/admin/settings', icon: '⚙️', roles: ['super_admin', 'owner'] },
    ],
  },
]

const standaloneBottom: NavItem[] = [
  { label: 'Help / Manual', href: '/help', icon: '📖', roles: ['all'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const role = user?.role || ''

  const isItemVisible = (item: NavItem) =>
    item.roles.includes('all') || item.roles.includes(role)

  const isGroupVisible = (group: NavGroup) =>
    group.items.some(isItemVisible)

  const isItemActive = (href: string) => pathname === href

  const isGroupActive = (group: NavGroup) =>
    group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))

  const getInitialOpenGroups = (): Record<string, boolean> => {
    const open: Record<string, boolean> = {}
    navGroups.forEach(group => {
      if (isGroupActive(group)) open[group.id] = true
    })
    return open
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups)

  useEffect(() => {
    navGroups.forEach(group => {
      if (isGroupActive(group)) {
        setOpenGroups(prev => ({ ...prev, [group.id]: true }))
      }
    })
  }, [pathname])

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

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
        {standaloneTop.filter(isItemVisible).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${isItemActive(item.href) ? 'active' : ''}`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {navGroups.filter(isGroupVisible).map(group => {
          const visibleItems = group.items.filter(isItemVisible)
          const isOpen = !!openGroups[group.id]
          const groupActive = isGroupActive(group)

          return (
            <div key={group.id} className="mt-0.5">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: groupActive ? '#C9A84C' : 'rgba(255,255,255,0.75)',
                  backgroundColor: groupActive ? 'rgba(201,168,76,0.12)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!groupActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  if (!groupActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{group.icon}</span>
                  <span>{group.label}</span>
                </div>
                <span
                  className="text-xs flex-shrink-0"
                  style={{
                    color: groupActive ? '#C9A84C' : 'rgba(255,255,255,0.35)',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  ▶
                </span>
              </button>

              {isOpen && (
                <div
                  className="mt-0.5 mb-1 space-y-0.5"
                  style={{ paddingLeft: '0.75rem' }}
                >
                  <div style={{ borderLeft: '1px solid rgba(201,168,76,0.25)', paddingLeft: '0.5rem' }}>
                    {visibleItems.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${isItemActive(item.href) ? 'active' : ''}`}
                        style={{ fontSize: '0.8125rem' }}
                      >
                        <span style={{ fontSize: '0.875rem' }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {standaloneBottom.filter(isItemVisible).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${isItemActive(item.href) ? 'active' : ''}`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: '#2D6A4F', color: '#C9A84C' }}
          >
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
