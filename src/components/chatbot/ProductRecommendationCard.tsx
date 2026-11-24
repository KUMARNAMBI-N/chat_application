import { Link } from 'react-router-dom'
import { formatPrice } from '@/lib/format'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'
import type { ChatProductCard } from '@/services/chatbotService'
import IconBase from '@/components/ui/IconBase'

interface Props {
  product: ChatProductCard
  onNavigate?: () => void
}

export default function ProductRecommendationCard({ product, onNavigate }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const notify = useUiStore((s) => s.notifySuccess)
  const openCart = useUiStore((s) => s.openCartDrawer)

  function handleAddToCart() {
    if (!product.in_stock) return
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
      },
      1
    )
    notify(`${product.name} added to cart`)
    openCart()
  }

  return (
    <div className="flex gap-3 rounded-xl border border-themed bg-white p-2.5 shadow-xs transition hover:border-brand-300 dark:bg-gray-900">
      <Link
        to={product.product_url || `/produto/${product.slug}`}
        onClick={onNavigate}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
      >
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <IconBase name="package" size={20} />
          </div>
        )}
        {product.discount_percent > 0 && (
          <span className="absolute left-1 top-1 rounded bg-error-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{product.discount_percent}%
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{product.brand}</p>
          <Link
            to={product.product_url || `/produto/${product.slug}`}
            onClick={onNavigate}
            className="line-clamp-1 text-xs font-semibold text-heading hover:text-brand-600"
          >
            {product.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-2 text-[11px]">
            <span className="font-bold text-heading">{formatPrice(product.price)}</span>
            {product.price_old && product.price_old > product.price && (
              <span className="text-muted line-through">{formatPrice(product.price_old)}</span>
            )}
            <span className="text-warning-500">★ {product.rating.toFixed(1)}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <Link
            to={product.product_url || `/produto/${product.slug}`}
            onClick={onNavigate}
            className="flex-1 rounded-lg border border-themed px-2 py-1 text-center text-[11px] font-medium text-body hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            View
          </Link>
          <button
            type="button"
            disabled={!product.in_stock}
            onClick={handleAddToCart}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <IconBase name="cart" size={12} />
            {product.in_stock ? 'Add' : 'Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
