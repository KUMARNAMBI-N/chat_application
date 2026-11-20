import { formatPrice, discountPercent, savingsAmount } from '@/lib/format'

interface Props {
  price: number
  priceOld?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBadge?: boolean
  showSavings?: boolean
  showMrpLabel?: boolean
  className?: string
}

const SIZES = {
  sm: 'text-sm font-semibold',
  md: 'text-base sm:text-lg font-bold',
  lg: 'text-xl sm:text-2xl font-bold',
  xl: 'text-2xl sm:text-3xl font-extrabold',
}

export default function PriceTag({
  price,
  priceOld,
  size = 'md',
  showBadge = true,
  showSavings = false,
  showMrpLabel = false,
  className = '',
}: Props) {
  const pct = discountPercent(price, priceOld)
  const savings = savingsAmount(price, priceOld)

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`text-heading tracking-tight ${SIZES[size]}`}>
          {formatPrice(price)}
        </span>
        {priceOld && priceOld > price && (
          <span className="text-xs text-muted line-through sm:text-sm">
            {showMrpLabel ? 'M.R.P.: ' : ''}{formatPrice(priceOld)}
          </span>
        )}
        {showBadge && pct > 0 && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            {pct}% OFF
          </span>
        )}
      </div>

      {showSavings && savings > 0 && (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          You Save: {formatPrice(savings)}
        </span>
      )}
    </div>
  )
}
