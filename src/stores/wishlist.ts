import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  ids: number[]
  toggle: (id: number) => void
  has: (id: number) => boolean
  remove: (id: number) => void
  clear: () => void
  count: () => number
  syncWithServer: () => Promise<void>
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle(id) {
        const ids = get().ids
        const isPresent = ids.includes(id)
        const next = isPresent ? ids.filter((x) => x !== id) : [...ids, id]
        set({ ids: next })

        const token = localStorage.getItem('abccart_auth')
        if (token) {
          fetch('/api/wishlist/toggle', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JSON.parse(token)?.state?.token || ''}`,
            },
            body: JSON.stringify({ productId: id }),
          }).catch(() => {})
        }
      },

      has(id) {
        return get().ids.includes(id)
      },

      remove(id) {
        get().toggle(id)
      },

      clear() {
        set({ ids: [] })
      },

      count() {
        return get().ids.length
      },

      async syncWithServer() {
        const token = localStorage.getItem('abccart_auth')
        if (!token) return
        try {
          const parsed = JSON.parse(token)?.state?.token
          if (!parsed) return

          const res = await fetch('/api/wishlist', {
            headers: { Authorization: `Bearer ${parsed}` },
          })
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.productIds)) {
              set({ ids: data.productIds })
            }
          }
        } catch {
          // Keep local state
        }
      },
    }),
    { name: 'abccart_wishlist' }
  )
)
