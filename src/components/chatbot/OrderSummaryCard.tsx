import { Link } from 'react-router-dom'
import { formatPrice } from '@/lib/format'
import type { ChatOrderCard } from '@/services/chatbotService'
import IconBase from '@/components/ui/IconBase'

interface Props {
  order: ChatOrderCard
  onNavigate?: () => void
}

const STATUS_STYLES: Record<string, string> = {
  Delivered: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
  Shipped: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  'Out for Delivery': 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  Processing: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  Confirmed: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  Pending: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  Cancelled: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
}

export default function OrderSummaryCard({ order, onNavigate }: Props) {
  const badgeCls = STATUS_STYLES[order.status] || STATUS_STYLES.Confirmed

  return (
    <div className="overflow-hidden rounded-xl border border-themed bg-white text-xs shadow-xs dark:bg-gray-900">
      {/* Header: Order Number + Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-themed bg-gray-50/80 px-3 py-2 dark:bg-gray-800/60">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Order Number</p>
          <p className="break-all font-bold text-heading">{order.order_number}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeCls}`}>
          {order.status}
        </span>
      </div>

      {/* Key Metadata Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-themed px-3 py-2.5">
        <div>
          <p className="text-[10px] text-muted">Order Date</p>
          <p className="font-medium text-heading">{order.created_at || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted">Total Amount</p>
          <p className="font-bold text-heading">{formatPrice(order.total)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted">Payment Method</p>
          <p className="font-medium text-heading">{order.payment_method || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted">Payment Status</p>
          <p className="font-medium text-heading">{order.payment_status || '—'}</p>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="border-b border-themed px-3 py-2">
          <p className="text-[10px] font-medium text-muted">Shipping Address</p>
          <p className="mt-0.5 leading-snug text-body break-words">{order.shipping_address}</p>
        </div>
      )}

      {/* Items Ordered */}
      {order.items.length > 0 && (
        <div className="px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Items Ordered ({order.items.length})
          </p>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={`${order.id}-${idx}`} className="flex items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-themed bg-gray-100 dark:bg-gray-800">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <IconBase name="package" size={14} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium text-heading">{item.product_name}</p>
                  <p className="text-[11px] text-muted">
                    Qty: {item.quantity} × {formatPrice(item.price)}
                    {item.color ? ` · ${item.color}` : ''}
                    {item.size ? ` · ${item.size}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Link */}
      <div className="border-t border-themed bg-gray-50/50 px-3 py-2 text-right dark:bg-gray-800/40">
        <Link
          to="/conta/pedidos"
          onClick={onNavigate}
          className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          View all orders →
        </Link>
      </div>
    </div>
  )
}
