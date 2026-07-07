'use client'
import Sidebar from './Sidebar'
import AuthGuard from './AuthGuard'
import NotificationBell from './NotificationBell'
import { useAuthStore } from '@/store/authStore'

function Header() {
  const { user } = useAuthStore()
  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-3 flex-shrink-0">
      <NotificationBell />
      {user && (
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
            {user.full_name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <span className="text-xs text-gray-600 font-medium max-w-[140px] truncate">
            {user.full_name ?? user.email}
          </span>
        </div>
      )}
    </header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen" style={{ backgroundColor: '#FDF6E3' }}>
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
