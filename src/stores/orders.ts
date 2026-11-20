import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from './cart'

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'

export type PaymentMethod = 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Cash on Delivery'

export interface Order {
  id: string
  orderNumber?: string
  createdAt: string
  items: CartItem[]
  subtotal: number
  discount: number
  shipping: number
  gst: number
  total: number
  payment: PaymentMethod
  status: OrderStatus
  shippingAddress: string
  trackingId?: string
}

interface OrdersState {
  orders: Order[]
  lastOrderId: string | null
  loading: boolean
  placeOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<string>
  getOrder: (id: string) => Order | undefined
  fetchOrders: () => Promise<void>
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      lastOrderId: null,
      loading: false,

      async placeOrder(orderData) {
        set({ loading: true })
        const token = localStorage.getItem('abccart_auth')
        let generatedId = `ABC-ORD-${Math.floor(100000 + Math.random() * 900000)}`

        try {
          if (token) {
            const parsedToken = JSON.parse(token)?.state?.token
            if (parsedToken) {
              const res = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${parsedToken}`,
                },
                body: JSON.stringify({
                  items: orderData.items,
                  shippingAddress: orderData.shippingAddress,
                  paymentMethod: orderData.payment,
                  discount: orderData.discount,
                }),
              })
              if (res.ok) {
                const data = await res.json()
                if (data.orderNumber) {
                  generatedId = data.orderNumber
                }
              }
            }
          }
        } catch {
          // fallback to local generation
        }

        const fullOrder: Order = {
          ...orderData,
          id: generatedId,
          orderNumber: generatedId,
          createdAt: new Date().toISOString(),
          status: 'Confirmed',
          trackingId: `IND-${Math.floor(10000000 + Math.random() * 90000000)}`,
        }

        set({
          orders: [fullOrder, ...get().orders],
          lastOrderId: generatedId,
          loading: false,
        })

        return generatedId
      },

      getOrder(id) {
        return get().orders.find((o) => o.id === id || o.orderNumber === id)
      },

      async fetchOrders() {
        const token = localStorage.getItem('abccart_auth')
        if (!token) return
        try {
          const parsedToken = JSON.parse(token)?.state?.token
          if (!parsedToken) return

          const res = await fetch('/api/orders', {
            headers: { Authorization: `Bearer ${parsedToken}` },
          })
          if (res.ok) {
            const serverOrders = await res.json()
            if (Array.isArray(serverOrders)) {
              const mapped: Order[] = serverOrders.map((so: any) => ({
                id: so.order_number || String(so.id),
                orderNumber: so.order_number,
                createdAt: so.created_at,
                subtotal: Number(so.subtotal),
                discount: Number(so.discount),
                shipping: Number(so.shipping),
                gst: Number(so.gst || 0),
                total: Number(so.total),
                payment: so.payment_method || 'UPI',
                status: so.status || 'Confirmed',
                shippingAddress: so.shipping_address,
                trackingId: `IND-${so.id}8921`,
                items: (so.items || []).map((it: any) => ({
                  id: String(it.id),
                  productId: it.product_id,
                  slug: it.product_name?.toLowerCase().replace(/\s+/g, '-'),
                  name: it.product_name,
                  price: Number(it.price),
                  image: it.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
                  color: it.color,
                  size: it.size,
                  qty: it.quantity,
                  stock: 20,
                })),
              }))
              set({ orders: mapped })
            }
          }
        } catch {
          // Keep local state
        }
      },
    }),
    { name: 'abccart_orders' }
  )
)
