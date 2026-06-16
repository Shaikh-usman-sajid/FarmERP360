import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
}

interface AuthState {
  user: User | null
  access_token: string | null
  refresh_token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, access_token: string, refresh_token: string) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      setAuth: (user, access_token, refresh_token) => {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        set({ user, access_token, refresh_token, isAuthenticated: true })
      },
      clearAuth: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, access_token: null, refresh_token: null, isAuthenticated: false })
      },
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'farmerp360-auth',
      partialize: (state) => ({ user: state.user, access_token: state.access_token, refresh_token: state.refresh_token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// Role helpers
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  ACCOUNTANT: 'accountant',
  FARM_MANAGER: 'farm_manager',
  VET_MANAGER: 'vet_manager',
  EMPLOYEE: 'employee',
  DATA_ENTRY: 'data_entry',
  INVESTOR: 'investor',
  PALLAI_CUSTOMER: 'pallai_customer',
} as const

export const canAccess = (userRole: string, allowedRoles: string[]) => {
  return allowedRoles.includes(userRole)
}

export const isAdmin = (role: string) => [ROLES.SUPER_ADMIN, ROLES.OWNER].includes(role as any)
export const isFarmRole = (role: string) => [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FARM_MANAGER, ROLES.VET_MANAGER, ROLES.EMPLOYEE].includes(role as any)
