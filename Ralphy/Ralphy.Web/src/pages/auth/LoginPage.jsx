import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await api.post('/auth/login', form)
      const { accessToken, refreshToken, user } = res.data.data

      login(accessToken, refreshToken, user)
      toast.success(`Welcome back, ${user.username}!`)
      navigate('/admin')
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid email or password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center
                    justify-center px-4">

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Ralphy"
            className="h-16 w-16 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Ralphy<span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Admin access only
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-900 border border-slate-800
                        rounded-xl p-6 shadow-xl">

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ralph@ralphy.com"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                             rounded-lg text-white placeholder-slate-500 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent transition pr-10"
                />
                {/* Show/hide password toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478
                               0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029
                               m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242
                               4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                               M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0
                               8.268 2.943 9.543 7a10.025 10.025 0 01-4.132
                               4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0
                               8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542
                               7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700
                         disabled:bg-blue-800 disabled:cursor-not-allowed
                         text-white font-semibold text-sm rounded-lg
                         transition-colors duration-200 flex items-center
                         justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white
                                  border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

          </form>
        </div>

        {/* Back to site */}
        <p className="text-center text-slate-500 text-xs mt-6">
          <a href="/" className="hover:text-slate-300 transition-colors">
            ← Back to Ralphy
          </a>
        </p>

      </div>
    </div>
  )
}