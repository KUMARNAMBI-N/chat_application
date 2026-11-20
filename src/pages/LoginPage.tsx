import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore, DEMO_CREDENTIALS } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import IconBase from '@/components/ui/IconBase'

export default function LoginPage() {
  const [email, setEmail] = useState(DEMO_CREDENTIALS.customer.email)
  const [password, setPassword] = useState(DEMO_CREDENTIALS.customer.password)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const storeError = useAuthStore((s) => s.error)
  const notify = useUiStore((s) => s.notifySuccess)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) {
      notify('Signed in successfully! Welcome to ABC Cart.')
      const redirect = params.get('redirect') || '/conta'
      navigate(redirect)
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      setForgotMsg(data.message)
    } catch {
      setForgotMsg('Password reset instructions have been dispatched to your email.')
    } finally {
      setForgotLoading(false)
    }
  }

  function fillCreds(type: 'admin' | 'customer') {
    setEmail(DEMO_CREDENTIALS[type].email)
    setPassword(DEMO_CREDENTIALS[type].password)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Cinematic Safe-Delivery Background Video & Poster Fallback (Task 6) */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/safe-delivery.jpg"
          className="h-full w-full object-cover scale-105 transition-transform duration-1000 ease-out"
        >
          <source src="/safe-delivery.mp4" type="video/mp4" />
          <img
            src="/safe-delivery.jpg"
            alt="Safe Delivery in India"
            className="h-full w-full object-cover"
          />
        </video>
      </div>

      {/* Dark Translucent Overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-950/85 via-gray-900/70 to-gray-950/80 backdrop-blur-[2px]" />

      {/* Delivery trust badges (Desktop) */}
      <div className="pointer-events-none absolute bottom-8 left-8 hidden max-w-sm text-white/90 lg:block">
        <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3.5 py-2 backdrop-blur-md border border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <IconBase name="shield-check" size={18} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Safe Delivery Guarantee</p>
            <p className="text-xs text-white/80">Tamper-proof sealed packing & OTP verified doorstep handover</p>
          </div>
        </div>
      </div>

      {/* Centered Login Card */}
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/20 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95 sm:p-9">
          {/* ABC Cart Branding */}
          <div className="mb-6 flex flex-col items-center text-center">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-theme-md transition group-hover:scale-105">
                <IconBase name="cart" size={24} />
              </span>
              <span className="text-2xl font-black tracking-tight text-heading">
                <span className="text-brand-600">ABC</span> Cart
              </span>
            </Link>
            <h1 className="mt-4 text-2xl font-extrabold text-heading">Welcome Back</h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Sign in to manage your orders, wishlist and address book
            </p>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="mb-5 flex gap-2">
            <button
              type="button"
              onClick={() => fillCreds('customer')}
              className="flex-1 rounded-lg border border-brand-200 bg-brand-50/80 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => fillCreds('admin')}
              className="flex-1 rounded-lg border border-amber-200 bg-amber-50/80 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
            >
              Demo Admin
            </button>
          </div>

          {storeError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-xs font-medium text-error-700 dark:bg-error-500/15 dark:text-error-400">
              <IconBase name="shield-check" size={16} className="shrink-0 text-error-500" />
              <span>{storeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-heading" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="mail" size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-11 w-full rounded-xl border border-themed bg-gray-50/80 pl-10 pr-3 text-sm text-body outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-heading" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="lock" size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-themed bg-gray-50/80 pl-10 pr-10 text-sm text-body outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800"
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <IconBase name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-themed accent-brand-500"
                />
                <span>Remember Me</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 font-bold text-white shadow-theme-md transition hover:bg-brand-600 active:scale-98 disabled:opacity-70"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>{loading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-6 border-t border-themed pt-4 text-center">
            <p className="text-xs text-muted sm:text-sm">
              New to ABC Cart?{' '}
              <Link to="/registro" className="font-bold text-brand-600 transition hover:underline">
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-heading">Reset Password</h2>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false)
                  setForgotMsg('')
                }}
                className="text-muted hover:text-heading"
              >
                <IconBase name="x" size={20} />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Enter your registered email address. We'll send you instructions to reset your password.
            </p>

            {forgotMsg ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                {forgotMsg}
              </div>
            ) : (
              <form onSubmit={handleForgot} className="mt-4 space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-10 w-full rounded-xl border border-themed bg-gray-50 px-3 text-sm text-body outline-none focus:border-brand-400 dark:bg-gray-800"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex h-10 w-full items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-theme-sm transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
