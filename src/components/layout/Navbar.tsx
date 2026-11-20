import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { categories } from '@/data/categories'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import IconBase from '@/components/ui/IconBase'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

export default function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const catRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  const cartCount = useCartStore((s) => s.count())
  const wishCount = useWishlistStore((s) => s.ids.length)
  const openCart = useUiStore((s) => s.openCartDrawer)
  const darkMode = useUiStore((s) => s.darkMode)
  const toggleDark = useUiStore((s) => s.toggleDarkMode)

  const user = useAuthStore((s) => s.user)
  const isAuth = !!user
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/busca?q=${encodeURIComponent(q)}`)
    setMobileOpen(false)
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition whitespace-nowrap ${
      isActive
        ? 'text-brand-600 bg-brand-50 font-semibold dark:bg-brand-500/15 dark:text-brand-400'
        : 'text-body hover:text-heading hover:bg-gray-100/70 dark:hover:bg-gray-800'
    }`

  return (
    <header className="surface-header sticky top-0 z-40 border-b border-themed bg-white/95 backdrop-blur dark:bg-gray-dark/95">
      {/* Main Header Bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((s) => !s)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-body hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          aria-label="Menu"
        >
          <IconBase name={mobileOpen ? 'x' : 'menu'} size={22} />
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-md transition hover:scale-105">
            <IconBase name="cart" size={20} />
          </span>
          <span className="text-xl font-bold tracking-tight text-heading">
            <span className="text-brand-600">ABC</span> Cart
          </span>
        </Link>

        {/* Search Input */}
        <form onSubmit={submitSearch} className="hidden flex-1 lg:block">
          <div className="relative mx-auto max-w-xl">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <IconBase name="search" size={18} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Indian brands, electronics, fashion, groceries..."
              className="h-11 w-full rounded-full border border-themed bg-gray-50 pl-11 pr-4 text-sm text-body placeholder:text-muted outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:focus:bg-gray-900"
            />
          </div>
        </form>

        {/* Action icons */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Dark Mode */}
          <button
            type="button"
            onClick={toggleDark}
            aria-label={t('common.theme')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-themed text-body transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <IconBase name={darkMode ? 'sun' : 'moon'} size={18} />
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Wishlist */}
          <Link
            to="/conta/favoritos"
            aria-label={t('common.wishlist')}
            className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-themed text-body transition hover:bg-gray-100 dark:hover:bg-gray-800 sm:flex"
          >
            <IconBase name="heart" size={18} />
            {wishCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white shadow-sm">
                {wishCount}
              </span>
            )}
          </Link>

          {/* Account Menu */}
          <div className="relative" ref={userMenuRef}>
            {isAuth ? (
              <div>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((s) => !s)}
                  className="flex h-10 items-center gap-2 rounded-full border border-themed px-3 text-sm font-medium text-heading transition hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[100px] truncate md:inline">{user.name.split(' ')[0]}</span>
                  <IconBase name="chevron-down" size={12} className="text-muted" />
                </button>

                {userMenuOpen && (
                  <div className="surface-card absolute right-0 z-50 mt-2 w-56 rounded-xl border p-2 shadow-theme-lg">
                    <div className="border-b border-themed px-3 py-2">
                      <p className="text-sm font-semibold text-heading truncate">{user.name}</p>
                      <p className="text-xs text-muted truncate">{user.email}</p>
                      {user.role === 'admin' && (
                        <span className="mt-1 inline-block rounded bg-warning-500/10 px-1.5 py-0.5 text-[10px] font-bold text-warning-700 dark:text-warning-400">
                          Admin Privileges
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-warning-700 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-500/10"
                        >
                          <IconBase name="shield-check" size={16} />
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        to="/conta"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <IconBase name="user" size={16} />
                        My Profile
                      </Link>
                      <Link
                        to="/conta/pedidos"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <IconBase name="package" size={16} />
                        My Orders
                      </Link>
                      <Link
                        to="/conta/enderecos"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <IconBase name="home" size={16} />
                        Delivery Addresses
                      </Link>
                    </div>
                    <div className="border-t border-themed pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <IconBase name="logout" size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                aria-label="Sign In"
                className="flex h-10 items-center gap-1.5 rounded-full border border-themed px-3.5 text-sm font-medium text-heading transition hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <IconBase name="user" size={18} />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>

          {/* Cart Icon */}
          <button
            type="button"
            onClick={openCart}
            aria-label={t('common.cart')}
            className="relative flex h-10 items-center gap-2 rounded-full bg-brand-500 px-3.5 text-white shadow-theme-md transition hover:bg-brand-600 active:scale-95"
          >
            <IconBase name="cart" size={18} />
            <span className="text-xs font-bold sm:text-sm">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation & Categories Bar (Task 2) */}
      <div className="border-t border-themed bg-white/70 dark:bg-gray-dark/70">
        <div className="mx-auto flex h-12 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* Left: All Categories Dropdown */}
          <div className="relative shrink-0" ref={catRef}>
            <button
              type="button"
              onClick={() => setCatOpen((s) => !s)}
              className="flex h-9 items-center gap-2 rounded-lg bg-brand-50 px-3.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400"
            >
              <IconBase name="menu" size={16} />
              <span>{t('nav.allCategories')}</span>
              <IconBase name="chevron-down" size={14} className={`transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
            </button>

            {catOpen && (
              <div className="surface-card absolute left-0 z-50 mt-2 w-64 rounded-xl border p-2 shadow-theme-lg">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/categoria/${c.slug}`}
                    onClick={() => setCatOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-body transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
                  >
                    <IconBase name={c.icon} size={18} className="text-brand-500" />
                    <span className="font-medium">{t(`categories.${c.slug}.name`)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Center: Navigation Links centered horizontally in remaining area */}
          <nav className="hidden flex-1 items-center justify-center gap-1.5 lg:flex lg:gap-3 xl:gap-5">
            <NavLink to="/produtos" className={navItemClass} end>
              {t('common.products')}
            </NavLink>
            <NavLink to="/categoria/eletronicos" className={navItemClass}>
              {t('categories.eletronicos.name')}
            </NavLink>
            <NavLink to="/categoria/moda" className={navItemClass}>
              {t('categories.moda.name')}
            </NavLink>
            <NavLink to="/categoria/casa" className={navItemClass}>
              {t('categories.casa.name')}
            </NavLink>
            <NavLink to="/categoria/esportes" className={navItemClass}>
              {t('categories.esportes.name')}
            </NavLink>
            <NavLink to="/sobre" className={navItemClass}>
              {t('common.about')}
            </NavLink>
            <NavLink to="/contato" className={navItemClass}>
              {t('common.contact')}
            </NavLink>
          </nav>

          {/* Right counter-balancer spacer */}
          <div className="hidden shrink-0 items-center justify-end lg:flex w-[140px]">
            {user?.role === 'admin' ? (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-lg bg-warning-500/10 px-2.5 py-1 text-xs font-semibold text-warning-700 transition hover:bg-warning-500/20 dark:text-warning-400"
              >
                <IconBase name="shield-check" size={13} />
                Admin Panel
              </Link>
            ) : (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                PAN India Delivery
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="surface-card border-t border-themed lg:hidden">
          <div className="space-y-4 px-4 py-4 sm:px-6">
            <form onSubmit={submitSearch}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBase name="search" size={18} />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="h-11 w-full rounded-full border border-themed bg-gray-50 pl-11 pr-4 text-sm text-body outline-none dark:bg-gray-900"
                />
              </div>
            </form>

            <nav className="flex flex-col gap-1">
              <Link
                to="/produtos"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-body hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('common.products')}
              </Link>

              <div className="my-1 border-t border-themed pt-1">
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">Categories</p>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/categoria/${c.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <IconBase name={c.icon} size={18} className="text-brand-500" />
                    {t(`categories.${c.slug}.name`)}
                  </Link>
                ))}
              </div>

              <div className="my-1 border-t border-themed pt-1">
                <Link
                  to="/sobre"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t('common.about')}
                </Link>
                <Link
                  to="/contato"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t('common.contact')}
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
