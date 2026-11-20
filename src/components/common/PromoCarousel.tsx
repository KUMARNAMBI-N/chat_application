import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import IconBase from '@/components/ui/IconBase'

export interface PromoSlide {
  id: string
  tag: string
  title: string
  subtitle: string
  buttonText: string
  link: string
  image: string
  accentColor: string
  highlights?: string[]
}

export const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'electronics',
    tag: 'Top Tech • Up to 40% OFF',
    title: 'Upgrade Your Tech',
    subtitle: 'Explore the latest electronics and gadgets',
    buttonText: 'Shop Electronics',
    link: '/categoria/eletronicos',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80',
    accentColor: 'from-blue-600 to-indigo-700',
    highlights: ['Laptops & Computing', 'Smartphones & Watches', 'Pro Audio & Headphones'],
  },
  {
    id: 'fashion',
    tag: 'New Season • Flat 50% OFF',
    title: 'Discover Your Style',
    subtitle: 'Trending fashion for every occasion',
    buttonText: 'Shop Fashion',
    link: '/categoria/moda',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    accentColor: 'from-pink-600 to-rose-700',
    highlights: ['Men & Women Apparel', 'Designer Footwear', 'Trending Accessories'],
  },
  {
    id: 'home',
    tag: 'Cozy Living • Starting ₹499',
    title: 'Make Your Home Beautiful',
    subtitle: 'Discover stylish essentials for your home',
    buttonText: 'Explore Home',
    link: '/categoria/casa',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80',
    accentColor: 'from-amber-600 to-orange-700',
    highlights: ['Modern Furnishings', 'Kitchen Appliances', 'Ambient Home Decor'],
  },
  {
    id: 'sports',
    tag: 'Active Lifestyle • Free Delivery',
    title: 'Stay Active, Stay Fit',
    subtitle: 'Everything you need for an active lifestyle',
    buttonText: 'Shop Sports',
    link: '/categoria/esportes',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=80',
    accentColor: 'from-emerald-600 to-teal-700',
    highlights: ['Workout Equipment', 'Performance Footwear', 'Outdoor & Fitness Gear'],
  },
  {
    id: 'deals',
    tag: 'Limited Time • Mega Savings',
    title: 'Amazing Deals on ABC Cart',
    subtitle: 'Discover exciting offers across all categories',
    buttonText: 'View Deals',
    link: '/produtos',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80',
    accentColor: 'from-violet-600 to-purple-800',
    highlights: ['PAN India Free Shipping > ₹499', '100% Genuine Brands', '30-Day Easy Returns'],
  },
]

interface Props {
  className?: string
  slides?: PromoSlide[]
  autoPlayInterval?: number
}

export default function PromoCarousel({
  className = '',
  slides = PROMO_SLIDES,
  autoPlayInterval = 5000,
}: Props) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const total = slides.length

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total)
  }, [total])

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total)
  }, [total])

  const goToSlide = (index: number) => {
    setCurrent(index)
  }

  // Auto-play timer
  useEffect(() => {
    if (isPaused || total <= 1) return

    const timer = setInterval(() => {
      nextSlide()
    }, autoPlayInterval)

    return () => clearInterval(timer)
  }, [isPaused, nextSlide, autoPlayInterval, total])

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    if (diff > 50) {
      // Swiped left -> next
      nextSlide()
    } else if (diff < -50) {
      // Swiped right -> prev
      prevSlide()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide()
    } else if (e.key === 'ArrowRight') {
      nextSlide()
    }
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-theme-lg bg-gray-900 border border-themed transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional Categories Carousel"
    >
      {/* Slides wrapper */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="relative w-full shrink-0 min-h-[300px] sm:min-h-[360px] md:min-h-[400px] lg:min-h-[440px] flex items-center overflow-hidden"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${total}: ${slide.title}`}
          >
            {/* Background Image with Fallback */}
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105"
              loading={index === 0 ? 'eager' : 'lazy'}
            />

            {/* Premium Multi-layer Dark Gradient Overlays for High Legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-950/75 to-transparent sm:to-gray-950/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-transparent to-black/30" />

            {/* Slide Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-8 sm:py-12">
              <div className="max-w-xl text-white">
                {/* Badge / Tag */}
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/20 text-white shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                  {slide.tag}
                </div>

                {/* Main Heading */}
                <h2 className="mt-3.5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-sm">
                  {slide.title}
                </h2>

                {/* Subtitle */}
                <p className="mt-2.5 sm:mt-3 text-sm sm:text-base md:text-lg text-gray-200/90 leading-relaxed font-normal">
                  {slide.subtitle}
                </p>

                {/* Category Highlights */}
                {slide.highlights && slide.highlights.length > 0 && (
                  <div className="mt-4 hidden sm:flex flex-wrap gap-2 text-xs text-white/85">
                    {slide.highlights.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-black/30 px-2.5 py-1 backdrop-blur-sm border border-white/10"
                      >
                        <IconBase name="check" size={12} className="text-emerald-400" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    to={slide.link}
                    className="inline-flex h-11 sm:h-12 items-center gap-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 px-6 text-sm sm:text-base font-bold text-white shadow-theme-md transition-all duration-200 hover:shadow-brand-500/30"
                  >
                    <span>{slide.buttonText}</span>
                    <IconBase name="arrow-right" size={16} />
                  </Link>

                  <Link
                    to="/produtos"
                    className="hidden sm:inline-flex h-11 sm:h-12 items-center rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 active:scale-95 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200"
                  >
                    View All Products
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prev Navigation Arrow */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <IconBase name="chevron-left" size={22} />
      </button>

      {/* Next Navigation Arrow */}
      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <IconBase name="chevron-right" size={22} />
      </button>

      {/* Pagination Indicators (Pill + Dots) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/10">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all duration-300 rounded-full ${
              idx === current
                ? 'w-7 sm:w-8 h-2 sm:h-2.5 bg-brand-400 shadow-sm'
                : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

      {/* Slide Counter for screen readers & subtle display */}
      <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md border border-white/10">
        <span>{current + 1}</span>
        <span className="text-white/40">/</span>
        <span>{total}</span>
      </div>
    </div>
  )
}
