import { create } from 'zustand'
import type { Product } from '@/data/types'
import { products as fallbackProducts, productImages } from '@/data/products'

interface RawApiProduct {
  id: number
  slug: string
  name: string
  price: string | number
  price_old?: string | number | null
  category_slug?: string
  category?: string
  brand: string
  rating?: string | number
  reviews_count?: number
  stock: number
  description?: string
  featured?: number | boolean
  bestseller?: number | boolean
  is_new?: number | boolean
  trending?: number | boolean
  special_offer?: number | boolean
  created_at?: string
  image_url?: string | null
  images?: string[]
  variants?: Array<{ color?: string | null; size?: string | null }>
  reviews?: Array<{ author_name?: string; author?: string; rating: number; created_at?: string; comment?: string }>
}

function mapApiProduct(row: RawApiProduct): Product {
  const images =
    Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : row.image_url
        ? [row.image_url]
        : productImages(row.slug, 1)

  const colors = Array.isArray(row.variants)
    ? Array.from(new Set(row.variants.map((v) => v.color).filter((c): c is string => Boolean(c))))
    : []
  const sizes = Array.isArray(row.variants)
    ? Array.from(new Set(row.variants.map((v) => v.size).filter((s): s is string => Boolean(s))))
    : []

  const reviews = Array.isArray(row.reviews)
    ? row.reviews.map((r) => ({
        author: r.author_name || r.author || 'Verified Buyer',
        rating: Number(r.rating),
        date: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        comment: r.comment || '',
      }))
    : []

  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    price: Number(row.price),
    priceOld: row.price_old != null ? Number(row.price_old) : undefined,
    category: row.category_slug || row.category || 'eletronicos',
    brand: row.brand,
    rating: Number(row.rating ?? 4.5),
    reviewsCount: Number(row.reviews_count ?? reviews.length),
    stock: Number(row.stock ?? 0),
    description: row.description || '',
    variants: { colors, sizes },
    specs: [
      { label: 'Brand', value: row.brand },
      { label: 'Warranty', value: '12 Months Manufacturer Warranty' },
      { label: 'Delivery', value: 'PAN India Express Shipping' },
    ],
    reviews,
    featured: Boolean(row.featured),
    bestseller: Boolean(row.bestseller),
    isNew: Boolean(row.is_new),
    trending: Boolean(row.trending),
    specialOffer: Boolean(row.special_offer),
    createdAt: row.created_at || new Date().toISOString(),
    images,
  }
}

interface ProductsState {
  products: Product[]
  loaded: boolean
  loading: boolean
  fetchProducts: () => Promise<void>
  fetchProductBySlug: (slug: string) => Promise<Product | null>
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: fallbackProducts,
  loaded: false,
  loading: false,

  async fetchProducts() {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const rows: RawApiProduct[] = await res.json()
        if (Array.isArray(rows) && rows.length > 0) {
          set({ products: rows.map(mapApiProduct), loaded: true, loading: false })
          return
        }
      }
      set({ loading: false })
    } catch {
      set({ loading: false })
    }
  },

  async fetchProductBySlug(slug: string) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}`)
      if (!res.ok) return null
      const data: RawApiProduct = await res.json()
      return mapApiProduct(data)
    } catch {
      return null
    }
  },
}))
