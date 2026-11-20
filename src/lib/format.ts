/**
 * Strict Indian Rupee (₹ INR) currency formatter for ABC Cart.
 * Conforms to en-IN locale, 2 decimal places, and Indian numbering system (lakhs & crores).
 * Examples: ₹499.00, ₹1,299.00, ₹12,999.00, ₹1,25,000.00
 */
export function formatPrice(value: number, _lang?: string): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export const formatINR = formatPrice

/** Percentage discount between an old (MRP) and current selling price. */
export function discountPercent(price: number, priceOld?: number): number {
  if (!priceOld || priceOld <= price) return 0
  return Math.round(((priceOld - price) / priceOld) * 100)
}

/** Numerical savings amount. */
export function savingsAmount(price: number, priceOld?: number): number {
  if (!priceOld || priceOld <= price) return 0
  return priceOld - price
}

/** Formatted savings string. */
export function formatSavings(price: number, priceOld?: number): string {
  const diff = savingsAmount(price, priceOld)
  return diff > 0 ? formatPrice(diff) : ''
}

/** Standard Indian GST rate calculation (default 18%). */
export function calculateGST(subtotal: number, rate = 0.18): number {
  return Math.round(subtotal * rate * 100) / 100
}

/** Indian Delivery rules: Free delivery on orders ₹499 and above, otherwise ₹49 flat. */
export function calculateDelivery(subtotal: number, threshold = 499, flatFee = 49): number {
  if (subtotal === 0 || subtotal >= threshold) return 0
  return flatFee
}
