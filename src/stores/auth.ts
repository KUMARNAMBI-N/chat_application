import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Address {
  id: number
  fullName: string
  mobile: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pinCode: string
  country?: string
  isDefault?: boolean
}

export interface User {
  id: number
  name: string
  email: string
  mobile?: string
  role: 'admin' | 'customer' | string
  addresses: Address[]
}

/** Suggested demo credentials for testing ABC Cart */
export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@abccart.in', password: 'admin123' },
  customer: { email: 'customer@abccart.in', password: 'demo123' },
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  isAuthenticated: () => boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, mobile?: string) => Promise<boolean>
  logout: () => void
  fetchProfile: () => Promise<void>
  addAddress: (addr: Omit<Address, 'id'>) => Promise<boolean>
  removeAddress: (id: number) => Promise<boolean>
  setDefaultAddress: (id: number) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      isAuthenticated() {
        return get().user !== null && !!get().token
      },

      async login(email, password) {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          const data = await res.json()
          if (!res.ok) {
            set({ loading: false, error: data.error || 'Login failed' })
            return false
          }

          const user = {
            ...data.user,
            addresses: data.user.addresses || [],
          }

          set({ user, token: data.token, loading: false })
          return true
        } catch (err: any) {
          set({ loading: false, error: err.message || 'Connection error' })
          return false
        }
      },

      async register(name, email, password, mobile) {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, mobile }),
          })
          const data = await res.json()
          if (!res.ok) {
            set({ loading: false, error: data.error || 'Registration failed' })
            return false
          }

          const user = {
            ...data.user,
            addresses: [],
          }

          set({ user, token: data.token, loading: false })
          return true
        } catch (err: any) {
          set({ loading: false, error: err.message || 'Connection error' })
          return false
        }
      },

      logout() {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        set({ user: null, token: null, error: null })
      },

      async fetchProfile() {
        const { token } = get()
        if (!token) return
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            set({ user: data.user })
          } else if (res.status === 401 || res.status === 403) {
            set({ user: null, token: null })
          }
        } catch {
          // Keep existing cached state on offline
        }
      },

      async addAddress(addr) {
        const { token, user } = get()
        if (!token || !user) return false
        try {
          const res = await fetch('/api/addresses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(addr),
          })
          if (res.ok) {
            const data = await res.json()
            const newAddress: Address = { ...addr, id: data.id }
            const currentAddresses = user.addresses || []
            const updated: Address[] = addr.isDefault
              ? [...currentAddresses.map((a) => ({ ...a, isDefault: false })), newAddress]
              : [...currentAddresses, newAddress]
            set({ user: { ...user, addresses: updated } })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      async removeAddress(id) {
        const { token, user } = get()
        if (!token || !user) return false
        try {
          const res = await fetch(`/api/addresses/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const updated = (user.addresses || []).filter((a) => a.id !== id)
            set({ user: { ...user, addresses: updated } })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      async setDefaultAddress(id) {
        const { token, user } = get()
        if (!token || !user) return false
        try {
          const res = await fetch(`/api/addresses/${id}/default`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const updated = (user.addresses || []).map((a) => ({
              ...a,
              isDefault: a.id === id,
            }))
            set({ user: { ...user, addresses: updated } })
            return true
          }
          return false
        } catch {
          return false
        }
      },
    }),
    {
      name: 'abccart_auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
)
