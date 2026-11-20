import { Link } from 'react-router-dom'
import { useOrdersStore } from '@/stores/orders'
import { formatPrice } from '@/lib/format'
import IconBase from '@/components/ui/IconBase'
import EmptyState from '@/components/ui/EmptyState'

export default function OrderConfirmedPage() {
  const lastOrderId = useOrdersStore((s) => s.lastOrderId)
  const order = useOrdersStore((s) => (lastOrderId ? s.getOrder(lastOrderId) : undefined))

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon="package"
          title="No Recent Order Found"
          description="You haven't placed an order yet in this session."
          action={
            <Link to="/produtos" className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-theme-md hover:bg-brand-600">
              Explore Products
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-theme-sm dark:bg-emerald-500/15 dark:text-emerald-400">
          <IconBase name="shield-check" size={42} strokeWidth={2.5} />
        </span>
        <h1 className="mt-5 text-2xl font-black text-heading sm:text-3xl">Order Confirmed!</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Your order has been placed successfully and is being packed securely for safe delivery.
        </p>
      </div>

      <div className="surface-card mt-8 rounded-3xl border p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-themed pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted font-bold">Order Number</span>
            <p className="text-xl font-extrabold text-brand-600">{order.id}</p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-muted font-bold">Tracking ID</span>
            <p className="text-sm font-bold text-heading">{order.trackingId || 'IND-89123011'}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-gray-50/70 p-4 text-xs text-body dark:bg-gray-800/50">
          <p className="font-bold text-heading">Delivery Address:</p>
          <p className="mt-1 text-muted">{order.shippingAddress}</p>
          <p className="mt-2 font-bold text-heading">Payment Method: <span className="font-semibold text-emerald-600">{order.payment}</span></p>
        </div>

        <div className="mt-5 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 border-b border-themed pb-3">
              <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl border border-themed object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-heading truncate">{item.name}</p>
                <p className="text-xs text-muted">Qty: {item.qty} × {formatPrice(item.price)}</p>
              </div>
              <span className="text-sm font-bold text-heading">{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-between border-t border-themed pt-4 text-base font-extrabold text-heading">
          <span>Total Paid in INR</span>
          <span className="text-brand-600 text-lg">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Safe Delivery Steps */}
      <div className="surface-card mt-6 rounded-3xl border p-6 sm:p-8 shadow-sm">
        <h2 className="text-base font-bold text-heading">Safe & Contactless Delivery Journey</h2>
        <ol className="mt-4 space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15">
              1
            </span>
            <div className="text-sm">
              <p className="font-semibold text-heading">Order Placed & In Transit to Warehouse</p>
              <p className="text-xs text-muted">Your order is logged and verified with seller inventory.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15">
              2
            </span>
            <div className="text-sm">
              <p className="font-semibold text-heading">Tamper-Proof Box Sealing</p>
              <p className="text-xs text-muted">Items are packed securely and sanitized before dispatch.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15">
              3
            </span>
            <div className="text-sm">
              <p className="font-semibold text-heading">Safe Doorstep Delivery with OTP</p>
              <p className="text-xs text-muted">Our delivery partner will hand over the parcel safely at your door.</p>
            </div>
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/conta/pedidos"
            className="flex-1 flex h-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-theme-md hover:bg-brand-600"
          >
            Track in My Orders
          </Link>
          <Link
            to="/produtos"
            className="flex-1 flex h-11 items-center justify-center rounded-xl border border-themed bg-white text-sm font-semibold text-body hover:bg-gray-50 dark:bg-gray-800"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
