'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const performLogin = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await authAPI.login(email, password)
      const { access_token, refresh_token, user } = res.data
      setAuth(user, access_token, refresh_token)
      toast.success(`Welcome, ${user.full_name}!`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await performLogin(form.email, form.password)
  }

  const demoLogin = async (email: string, password: string) => {
    setForm({ email, password })
    await performLogin(email, password)
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FDF6E3' }}>
      {/* Left Panel — dark green brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#1B4332' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#C9A84C' }}>
              <span className="text-2xl">🌿</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">FarmERP360</h1>
              <p className="text-sm" style={{ color: 'rgba(201,168,76,0.8)' }}>Enterprise Livestock ERP</p>
            </div>
          </div>

          <h2 className="text-white text-4xl font-bold mb-4 leading-tight">
            Manage Your Farm<br />Smarter, Faster.
          </h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Complete livestock, dairy, agriculture, and investor management in one platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '🐐', label: 'Animal Management', desc: 'Complete lifecycle tracking' },
            { icon: '🥛', label: 'Dairy Operations', desc: 'Milk production & sales' },
            { icon: '📊', label: 'Investor Portal', desc: 'Transparency & ROI' },
            { icon: '🌾', label: 'Agriculture', desc: 'Field & crop management' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(45,106,79,0.6)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-white font-semibold text-sm">{item.label}</div>
              <div className="text-xs" style={{ color: 'rgba(201,168,76,0.75)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: '#FDF6E3' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1B4332' }}>
              <span className="text-xl">🌿</span>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1B4332' }}>FarmERP360</h1>
              <p className="text-gray-500 text-sm">Enterprise Livestock ERP</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1B4332' }}>Sign in to your account</h2>
          <p className="text-gray-500 text-sm mb-8">Enter your credentials to access the platform</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: '#F5EDD6', border: '1px solid #E5D9BF' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1B4332' }}>
              Demo Accounts — Click to Sign In
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '👑 Owner', email: 'owner@farmerp360.com', pass: 'Owner123!@#' },
                { label: '🌾 Farm Mgr', email: 'manager@farmerp360.com', pass: 'Mgr123!@#' },
                { label: '💰 Accountant', email: 'accountant@farmerp360.com', pass: 'Acc123!@#' },
                { label: '👩‍⚕️ Vet', email: 'vet@farmerp360.com', pass: 'Vet123!@#' },
                { label: '👷 Employee', email: 'employee@farmerp360.com', pass: 'Emp123!@#' },
                { label: '📈 Investor', email: 'investor1@farmerp360.com', pass: 'Inv123!@#' },
              ].map(d => (
                <button key={d.email} type="button"
                  onClick={() => demoLogin(d.email, d.pass)}
                  className="text-left text-xs rounded-lg px-3 py-2 transition-colors"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #E5D9BF', color: '#1B4332' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#C9A84C'
                    e.currentTarget.style.backgroundColor = '#FDF6E3'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E5D9BF'
                    e.currentTarget.style.backgroundColor = '#ffffff'
                  }}
                >
                  <div className="font-semibold">{d.label}</div>
                  <div className="truncate" style={{ color: '#6b7280' }}>{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
