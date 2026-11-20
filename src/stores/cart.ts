import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // unique per product + variant combo
  productId: number
  slug: string
  name: string
  price: number
  image: string
  color?: string
  size?: string
  qty: number
  stock: number
}

export interface Coupon {
  code: string
  percent?: number
  fixedAmount?: number
}

export const COUPONS: Record<string, Coupon> = {
  WELCOME10: { code: 'WELCOME10', percent: 0.1 },
  ABC20: { code: 'ABC20', percent: 0.2 },
  FESTIVE15: { code: 'FESTIVE15', percent: 0.15 },
  SAVE100: { code: 'SAVE100', fixedAmount: 100 },
}

export const FREE_SHIPPING_THRESHOLD = 499 // Free delivery on orders ₹499+
export const FLAT_SHIPPING = 49 // ₹49 standard shipping charge in India

function itemKey(productId: number, color?: string, size?: string): string {
  return [productId, color ?? '', size ?? ''].join('|')
}

interface CartState {
  items: CartItem[]
  coupon: Coupon | null
  addItem: (item: Omit<CartItem, 'id' | 'qty'>, qty?: number) => void
  removeItem: (id: string) => void
  setQty: (id: string, qty: number) => void
  increment: (id: string) => void
  decrement: (id: string) => void
  clear: () => void
  applyCoupon: (code: string) => boolean
  removeCoupon: () => void
  count: () => number
  subtotal: () => number
  discount: () => number
  shipping: () => number
  gst: () => number
  total: () => number
  syncWithServer: () => Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,

      addItem(item, qty = 1) {
        const id = itemKey(item.productId, item.color, item.size)
        const existing = get().items.find((i) => i.id === id)
        let nextItems: CartItem[]

        if (existing) {
          const nextQty = Math.min(existing.stock, existing.qty + qty)
          nextItems = get().items.map((i) => (i.id === id ? { ...i, qty: nextQty } : i))
        } else {
          nextItems = [...get().items, { ...item, id, qty: Math.min(item.stock, qty) }]
        }

        set({ items: nextItems })

        // Sync with backend if token exists
        const token = localStorage.getItem('abccart_auth')
        if (token) {
          fetch('/api/cart/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JSON.parse(token)?.state?.token || ''}`,
            },
            body: JSON.stringify({
              productId: item.productId,
              quantity: qty,
              color: item.color,
              size: item.size,
            }),
          }).catch(() => {})
        }
      },

      removeItem(id) {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      setQty(id, qty) {
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, qty: Math.max(1, Math.min(i.stock, qty)) } : i
          ),
        })
      },

      increment(id) {
        const item = get().items.find((i) => i.id === id)
        if (item) get().setQty(id, item.qty + 1)
      },

      decrement(id) {
        const item = get().items.find((i) => i.id === id)
        if (item) get().setQty(id, item.qty - 1)
      },

      clear() {
        set({ items: [], coupon: null })
      },

      applyCoupon(code) {
        const found = COUPONS[code.trim().toUpperCase()]
        if (!found) return false
        set({ coupon: found })
        return true
      },

      removeCoupon() {
        set({ coupon: null })
      },

      count() {
        return get().items.reduce((sum, i) => sum + i.qty, 0)
      },

      subtotal() {
        return get().items.reduce((sum, i) => sum + i.price * i.qty, 0)
      },

      discount() {
        const c = get().coupon
        if (!c) return 0
        const sub = get().subtotal()
        if (c.fixedAmount) return Math.min(sub, c.fixedAmount)
        if (c.percent) return Math.round(sub * c.percent * 100) / 100
        return 0
      },

      shipping() {
        const sub = get().subtotal()
        if (sub === 0 || sub >= FREE_SHIPPING_THRESHOLD) return 0
        return FLAT_SHIPPING
      },

      gst() {
        const sub = get().subtotal()
        return Math.round(sub * 0.18 * 100) / 100
      },

      total() {
        return Math.max(0, get().subtotal() - get().discount() + get().shipping())
      },

      async syncWithServer() {
        const token = localStorage.getItem('abccart_auth')
        if (!token) return
        try {
          const parsed = JSON.parse(token)?.state?.token
          if (!parsed) return

          // Merge local items
          const localItems = get().items
          if (localItems.length > 0) {
            await fetch('/api/cart/merge', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${parsed}`,
              },
              body: JSON.stringify({ guestItems: localItems }),
            })
          }

          // Fetch full cart from server
          const res = await fetch('/api/cart', {
            headers: { Authorization: `Bearer ${parsed}` },
          })
          if (res.ok) {
            const data = await res.json()
            if (data.items) {
              const mapped: CartItem[] = data.items.map((it: any) => ({
                id: itemKey(it.product_id, it.color, it.size),
                productId: it.product_id,
                slug: it.slug,
                name: it.name,
                price: Number(it.price),
                image: it.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
                color: it.color,
                size: it.size,
                qty: it.quantity,
                stock: it.stock,
              }))
              set({ items: mapped })
            }
          }
        } catch {
          // Keep local state
        }
      },
    }),
    {
      name: 'abccart_cart',
      partialize: (s) => ({ items: s.items, coupon: s.coupon }),
    }
  )
)

export const FREE_SHIPPING = FREE_SHIPPING_THRESHOLD
