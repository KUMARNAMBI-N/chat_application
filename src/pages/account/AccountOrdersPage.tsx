import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOrdersStore, type OrderStatus } from '@/stores/orders'
import { formatPrice } from '@/lib/format'
import IconBase from '@/components/ui/IconBase'
import EmptyState from '@/components/ui/EmptyState'

const STATUS_COLOR: Record<OrderStatus | string, string> = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  Processing: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  Shipped: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  'Out for Delivery': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  Delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
}

const FLOW = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']

export default function AccountOrdersPage() {
  const orders = useOrdersStore((s) => s.orders)
  const fetchOrders = useOrdersStore((s) => s.fetchOrders)
  const [expanded, setExpanded] = useState<string | null>(orders[0]?.id ?? null)

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  if (orders.length === 0) {
    return (
      <div className="surface-card rounded-3xl border p-8">
        <EmptyState
          icon="package"
          title="No Orders Found"
          description="You haven't placed any orders with ABC Cart yet."
          action={
            <Link to="/produtos" className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-theme-md hover:bg-brand-600">
              Start Shopping in INR
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-heading">Order History ({orders.length})</h2>
        <span className="text-xs font-semibold text-muted">All prices in Indian Rupees (₹)</span>
      </div>

      {orders.map((o) => {
        const isOpen = expanded === o.id
        const flowIndex = FLOW.indexOf(o.status)

        return (
          <div key={o.id} className="surface-card overflow-hidden rounded-2xl border shadow-sm transition">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : o.id)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
            >
              <div>
                <p className="font-bold text-heading">{o.id}</p>
                <p className="text-xs text-muted">
                  Ordered on {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[o.status] || 'bg-gray-100 text-body'}`}>
                  {o.status}
                </span>
                <span className="font-bold text-heading sm:text-base">{formatPrice(o.total)}</span>
                <IconBase name={isOpen ? 'chevron-down' : 'chevron-right'} size={18} className="text-muted" />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-themed bg-gray-50/30 p-5 dark:bg-gray-800/20">
                {/* Indian Delivery Tracking Timeline */}
                {o.status !== 'Cancelled' && flowIndex >= 0 && (
                  <div className="mb-6 rounded-2xl border border-themed bg-white p-4 dark:bg-gray-900/60">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Shipment Status</span>
                      <span className="text-xs font-medium text-emerald-600">Tracking ID: {o.trackingId || 'IND-LIVE'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      {FLOW.map((step, idx) => (
                        <div key={step} className="flex flex-1 items-center last:flex-none">
                          <div className="flex flex-col items-center">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                idx <= flowIndex ? 'bg-emerald-500 text-white shadow-sm' : 'border border-themed text-muted bg-gray-50 dark:bg-gray-800'
                              }`}
                            >
                              {idx <= flowIndex ? '✓' : idx + 1}
                            </span>
                            <span className="mt-1 text-[10px] font-medium text-muted text-center max-w-[65px] hidden sm:block">
                              {step}
                            </span>
                          </div>
                          {idx < FLOW.length - 1 && (
                            <span
                              className={`mx-2 h-0.5 flex-1 ${
                                idx < flowIndex ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery details */}
                <div className="mb-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-themed bg-white p-3 dark:bg-gray-900/60">
                    <p className="font-bold text-heading">Delivery Address</p>
                    <p className="mt-1 text-muted">{o.shippingAddress}</p>
                  </div>
                  <div className="rounded-xl border border-themed bg-white p-3 dark:bg-gray-900/60">
                    <p className="font-bold text-heading">Payment Information</p>
                    <p className="mt-1 text-muted">Mode: <strong>{o.payment}</strong></p>
                    <p className="text-muted">Currency: <strong>INR (₹)</strong></p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Items Summary</p>
                  {o.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 rounded-xl border border-themed bg-white p-3 dark:bg-gray-900/60">
                      <img src={it.image} alt={it.name} className="h-12 w-12 rounded-lg border object-cover" />
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="font-semibold text-heading truncate">{it.name}</p>
                        <p className="text-xs text-muted">Qty: {it.qty} × {formatPrice(it.price)}</p>
                      </div>
                      <span className="font-bold text-heading">{formatPrice(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-between border-t border-themed pt-3 text-sm font-bold text-heading">
                  <span>Total Amount (Incl. GST)</span>
                  <span className="text-brand-600 text-base">{formatPrice(o.total)}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
