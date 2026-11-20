import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import IconBase from '@/components/ui/IconBase'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const register = useAuthStore((s) => s.register)
  const loading = useAuthStore((s) => s.loading)
  const notify = useUiStore((s) => s.notifySuccess)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match. Please verify.')
      return
    }

    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile && (cleanMobile.length !== 10 || !['6', '7', '8', '9'].includes(cleanMobile[0]))) {
      setError('Please enter a valid 10-digit Indian mobile number')
      return
    }

    const ok = await register(name, email, password, cleanMobile)
    if (ok) {
      notify('Account created successfully! Welcome to ABC Cart.')
      navigate('/conta')
    } else {
      setError('Failed to create account. Email may already be registered.')
    }
  }

  const inputCls =
    'h-11 w-full rounded-xl border border-themed bg-gray-50/80 pl-10 pr-3 text-sm text-body outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Background Poster Fallback & Video */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <img
          src="/safe-delivery.jpg"
          alt="Safe Delivery in India"
          className="h-full w-full object-cover scale-105"
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-950/85 via-gray-900/70 to-gray-950/80 backdrop-blur-[2px]" />

      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/20 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95 sm:p-9">
          <div className="mb-6 flex flex-col items-center text-center">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-theme-md transition group-hover:scale-105">
                <IconBase name="cart" size={24} />
              </span>
              <span className="text-2xl font-black tracking-tight text-heading">
                <span className="text-brand-600">ABC</span> Cart
              </span>
            </Link>
            <h1 className="mt-4 text-2xl font-extrabold text-heading">Create Account</h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Join ABC Cart for fast PAN India delivery & exclusive discounts
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-xs font-medium text-error-700 dark:bg-error-500/15 dark:text-error-400">
              <IconBase name="shield-check" size={16} className="shrink-0 text-error-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-heading">
                Full Name
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="user" size={18} />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-heading">
                Email Address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="mail" size={18} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Mobile (India) */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-heading">
                Mobile Number (+91)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="phone" size={18} />
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-heading">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="lock" size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-11 w-full rounded-xl border border-themed bg-gray-50/80 pl-10 pr-10 text-sm text-body outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800"
                />
                <button
                  type="button"
                  aria-label="Toggle password"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <IconBase name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-heading">
                Confirm Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="lock" size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 font-bold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-98 disabled:opacity-70"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>{loading ? 'Creating Account...' : 'Register Now'}</span>
            </button>
          </form>

          <div className="mt-5 border-t border-themed pt-4 text-center">
            <p className="text-xs text-muted sm:text-sm">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 transition hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
