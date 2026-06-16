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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-700 to-green-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-2xl">🌿</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">FarmERP360</h1>
              <p className="text-green-200 text-sm">Enterprise Livestock ERP</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold mb-4 leading-tight">
            Manage Your Farm<br />Smarter, Faster.
          </h2>
          <p className="text-green-200 text-lg">
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
            <div key={item.label} className="bg-green-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-white font-semibold text-sm">{item.label}</div>
              <div className="text-green-300 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <span className="text-3xl">🌿</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">FarmERP360</h1>
              <p className="text-gray-500 text-sm">Enterprise Livestock ERP</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
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
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Demo Accounts — Click to Fill</p>
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
                  className="text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-green-400 hover:bg-green-50 transition-colors">
                  <div className="font-semibold text-gray-800">{d.label}</div>
                  <div className="text-gray-400 truncate">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
