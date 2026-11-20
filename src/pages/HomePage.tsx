import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { categories } from '@/data/categories'
import { products } from '@/data/products'
import { useUiStore } from '@/stores/ui'
import ProductCard from '@/components/product/ProductCard'
import SectionHeader from '@/components/ui/SectionHeader'
import IconBase from '@/components/ui/IconBase'
import PromoCarousel from '@/components/common/PromoCarousel'

const BENEFITS = [
  { icon: 'truck', title: 'PAN India Free Delivery', desc: 'On all orders above ₹499' },
  { icon: 'shield-check', title: '100% Safe & Secure', desc: 'Verified contactless delivery' },
  { icon: 'refresh', title: 'Easy 30-Day Returns', desc: 'No questions asked return policy' },
  { icon: 'clock', title: '24/7 Customer Care', desc: 'Always ready to help you' },
]

export default function HomePage() {
  const { t } = useTranslation()
  const notify = useUiStore((s) => s.notifySuccess)
  const [email, setEmail] = useState('')

  const featured = products.filter((p) => p.featured).slice(0, 8)
  const bestsellers = products.filter((p) => p.bestseller).slice(0, 4)
  const newArrivals = products.filter((p) => p.isNew).slice(0, 4)
  const trending = products.filter((p) => p.trending).slice(0, 4)
  const specialOffers = products.filter((p) => p.specialOffer).slice(0, 4)
  const allProds = products.slice(0, 8)

  function subscribe(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    notify('Thank you for subscribing! Your ₹100 welcome voucher has been sent to your email.')
    setEmail('')
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. CATEGORY STRIP (Immediately below navigation header) */}
      <section className="border-b border-themed bg-white dark:bg-gray-dark py-4 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 scrollbar-none sm:justify-around sm:pb-0">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/categoria/${c.slug}`}
                className="group flex flex-col items-center gap-2 shrink-0 transition"
              >
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-brand-500 group-hover:shadow-theme-md transition-all duration-300 p-0.5 bg-gray-50 dark:bg-gray-800">
                  <img
                    src={c.image}
                    alt={t(`categories.${c.slug}.name`)}
                    className="h-full w-full object-cover rounded-xl transition duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-heading group-hover:text-brand-600 transition text-center max-w-[90px] leading-tight">
                  {t(`categories.${c.slug}.name`)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. PROMOTIONAL CAROUSEL SLIDER (Task 1 & Task 2) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PromoCarousel />
      </section>

      {/* Trust & Delivery Benefits */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="surface-card flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-2xl border p-4 text-center sm:text-left transition hover:shadow-theme-sm"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                <IconBase name={b.icon} size={24} />
              </span>
              <div>
                <p className="text-sm font-bold text-heading">{b.title}</p>
                <p className="text-xs text-muted mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Featured Products" linkTo="/produtos" linkLabel="View All Products" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 4. BEST SELLERS */}
      <section className="bg-gray-50/60 dark:bg-gray-900/30 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Best Sellers in India" linkTo="/produtos?sort=rating" linkLabel="See All Top Rated" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="New Arrivals" linkTo="/produtos?sort=newest" linkLabel="Explore Latest Items" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 6. TRENDING PRODUCTS */}
      <section className="bg-gray-50/60 dark:bg-gray-900/30 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Trending in India" linkTo="/produtos" linkLabel="View Trending" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. SPECIAL OFFERS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Special Deals & Discounts" linkTo="/produtos?sort=price-asc" linkLabel="All Deals" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {specialOffers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 8. ALL PRODUCTS PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Explore All Products" linkTo="/produtos" linkLabel="Open Full Catalog" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {allProds.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
        <div className="surface-card rounded-3xl border border-themed bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent p-8 text-center sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
            <IconBase name="mail" size={14} />
            Exclusive Newsletter Offers
          </span>
          <h2 className="mt-3 text-2xl font-bold text-heading sm:text-3xl">
            Get ₹100 OFF On Your First Order
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Subscribe for special discounts, upcoming mega sales, and new product alerts.
          </p>
          <form onSubmit={subscribe} className="mx-auto mt-6 flex max-w-md gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="h-11 flex-1 rounded-xl border border-themed bg-white px-4 text-sm text-body outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900"
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 active:scale-95"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
