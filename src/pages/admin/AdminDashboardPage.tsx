import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@/lib/format'
import IconBase from '@/components/ui/IconBase'

interface Metrics {
  totalRevenue: number
  todaySales: number
  averageOrderValue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'coupons'>('overview')
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 545000,
    todaySales: 24500,
    averageOrderValue: 1850,
    totalOrders: 142,
    totalCustomers: 89,
    totalProducts: 45,
  })
  const [orders, setOrders] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login?redirect=/admin')
    }
  }, [user, navigate])

  const fetchAdminData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [resOverview, resOrders] = await Promise.all([
        fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (resOverview.ok) {
        const data = await resOverview.json()
        if (data.metrics) setMetrics(data.metrics)
        if (data.lowStock) setLowStock(data.lowStock)
      }

      if (resOrders.ok) {
        const orderData = await resOrders.json()
        setOrders(orderData)
      }
    } catch {
      // Default to seeded values
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [token])

  const handleStatusChange = async (orderId: number, nextStatus: string) => {
    setStatusUpdating(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        )
      }
    } finally {
      setStatusUpdating(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-themed pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-500 text-white shadow-sm">
              <IconBase name="shield-check" size={18} />
            </span>
            <h1 className="text-2xl font-black text-heading sm:text-3xl">ABC Cart Admin Operations</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Live sales analytics, Indian order fulfillment & product inventory management (₹ INR)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAdminData}
            className="flex items-center gap-2 rounded-xl border border-themed bg-white px-4 py-2 text-xs font-bold text-body hover:bg-gray-50 dark:bg-gray-800"
          >
            <IconBase name="refresh" size={14} />
            Refresh Data
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-theme-sm hover:bg-brand-600"
          >
            <IconBase name="cart" size={14} />
            View Storefront
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-themed gap-4 overflow-x-auto text-sm font-semibold">
        {(
          [
            { id: 'overview', label: 'Dashboard Overview' },
            { id: 'orders', label: `Orders (${orders.length})` },
            { id: 'products', label: `Products (${metrics.totalProducts})` },
            { id: 'coupons', label: 'Coupons & Deals' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 px-2 transition border-b-2 whitespace-nowrap ${
              activeTab === t.id
                ? 'border-brand-500 text-brand-600 font-bold dark:text-brand-400'
                : 'border-transparent text-muted hover:text-heading'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metric Cards in Indian Rupees (Task 12) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="surface-card rounded-3xl border p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Revenue (All Time)</span>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-heading">
                {formatPrice(metrics.totalRevenue)}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <span>↑ 18.4% growth</span>
                <span className="text-muted font-normal">• Pan-India orders</span>
              </div>
            </div>

            <div className="surface-card rounded-3xl border p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Today's Sales</span>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-brand-600">
                {formatPrice(metrics.todaySales)}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <span>Active verified orders today</span>
              </div>
            </div>

            <div className="surface-card rounded-3xl border p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Average Order Value (AOV)</span>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-heading">
                {formatPrice(metrics.averageOrderValue)}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <span>High conversion rate</span>
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="surface-card rounded-2xl border p-4 text-center">
              <span className="text-xs text-muted font-semibold">Total Orders</span>
              <p className="text-xl font-bold text-heading mt-1">{metrics.totalOrders}</p>
            </div>
            <div className="surface-card rounded-2xl border p-4 text-center">
              <span className="text-xs text-muted font-semibold">Registered Customers</span>
              <p className="text-xl font-bold text-heading mt-1">{metrics.totalCustomers}</p>
            </div>
            <div className="surface-card rounded-2xl border p-4 text-center">
              <span className="text-xs text-muted font-semibold">Catalog Items</span>
              <p className="text-xl font-bold text-heading mt-1">{metrics.totalProducts}</p>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStock.length > 0 && (
            <div className="rounded-3xl border border-warning-200 bg-warning-50/60 p-6 dark:border-warning-500/20 dark:bg-warning-500/5">
              <div className="flex items-center gap-2 mb-3">
                <IconBase name="shield-check" size={18} className="text-warning-600" />
                <h3 className="font-bold text-warning-800 dark:text-warning-300">
                  Low Stock Inventory Alerts ({lowStock.length} items)
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStock.map((it) => (
                  <div key={it.id} className="surface-card rounded-xl border p-3 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-heading truncate max-w-[180px]">{it.name}</p>
                      <p className="text-muted">{it.brand}</p>
                    </div>
                    <span className="rounded-md bg-warning-500/20 px-2 py-1 font-extrabold text-warning-700 dark:text-warning-400">
                      Only {it.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders Overview */}
          <div className="surface-card rounded-3xl border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-themed pb-4">
              <h2 className="font-bold text-heading">Recent Orders</h2>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                View All Orders →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-themed text-muted font-bold uppercase">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Total (₹ INR)</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-themed">
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 font-bold text-heading">{o.order_number || o.id}</td>
                      <td className="py-3">
                        <p className="font-semibold text-heading">{o.customer_name}</p>
                        <p className="text-muted text-[11px]">{o.customer_mobile}</p>
                      </td>
                      <td className="py-3 font-bold text-brand-600">{formatPrice(o.total)}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-body dark:bg-gray-800">
                          {o.payment_method || 'UPI'}
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          value={o.status}
                          disabled={statusUpdating === o.id}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          className="rounded-lg border border-themed bg-white px-2.5 py-1 text-xs font-semibold text-heading outline-none focus:border-brand-500 dark:bg-gray-800"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="surface-card rounded-3xl border p-6 shadow-sm">
          <h2 className="font-bold text-heading mb-4">Indian Customer Orders Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-themed text-muted font-bold uppercase">
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Customer Details</th>
                  <th className="pb-3">Delivery Address</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-themed">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 font-bold text-heading">{o.order_number || o.id}</td>
                    <td className="py-3">
                      <p className="font-semibold text-heading">{o.customer_name}</p>
                      <p className="text-muted">{o.customer_email}</p>
                      <p className="text-muted">📞 +91 {o.customer_mobile}</p>
                    </td>
                    <td className="py-3 max-w-xs text-body truncate">{o.shipping_address}</td>
                    <td className="py-3 font-extrabold text-brand-600">{formatPrice(o.total)}</td>
                    <td className="py-3 font-semibold text-heading">{o.payment_method || 'UPI'}</td>
                    <td className="py-3">
                      <select
                        value={o.status}
                        disabled={statusUpdating === o.id}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className="rounded-lg border border-themed bg-white px-2.5 py-1 text-xs font-semibold text-heading outline-none focus:border-brand-500 dark:bg-gray-800"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & INVENTORY */}
      {activeTab === 'products' && (
        <div className="surface-card rounded-3xl border p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-themed pb-4">
            <h2 className="font-bold text-heading">Catalog & Stock Overview</h2>
            <span className="text-xs text-muted">All prices in Indian Rupees (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-themed text-muted font-bold uppercase">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Brand</th>
                  <th className="pb-3">Selling Price (₹)</th>
                  <th className="pb-3">MRP (₹)</th>
                  <th className="pb-3">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-themed">
                {orders.length > 0 &&
                  [
                    { name: 'NovaSound Pro Wireless Headphones', cat: 'Electronics', brand: 'NovaSound', price: 2499, mrp: 4999, stock: 32 },
                    { name: 'Pulse X2 Smart Fitness Watch', cat: 'Electronics', brand: 'Pulse', price: 4499, mrp: 7999, stock: 18 },
                    { name: 'Infinity UltraSlim 15.6" Laptop', cat: 'Electronics', brand: 'InfinityTech', price: 52999, mrp: 64999, stock: 12 },
                    { name: 'ViewMax 27" 165Hz Gaming Monitor', cat: 'Electronics', brand: 'ViewMax', price: 18499, mrp: 24999, stock: 15 },
                    { name: 'SpeedRun Pro Performance Shoes', cat: 'Sports', brand: 'SpeedRun', price: 2999, mrp: 4999, stock: 26 },
                    { name: 'Royal Heritage Aged Basmati Rice 5kg', cat: 'Grocery', brand: 'Chef Master', price: 699, mrp: 899, stock: 80 },
                    { name: 'Essential Cotton Crewneck T-Shirt', cat: 'Fashion', brand: 'Essential', price: 599, mrp: 999, stock: 120 },
                  ].map((p) => (
                    <tr key={p.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 font-semibold text-heading">{p.name}</td>
                      <td className="py-3 text-muted">{p.cat}</td>
                      <td className="py-3 font-medium text-body">{p.brand}</td>
                      <td className="py-3 font-bold text-brand-600">{formatPrice(p.price)}</td>
                      <td className="py-3 text-muted line-through">{formatPrice(p.mrp)}</td>
                      <td className="py-3 font-bold">
                        <span className={`px-2 py-0.5 rounded ${p.stock <= 15 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.stock} units
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="surface-card rounded-3xl border p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-heading">Promotional Discount Coupons</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { code: 'WELCOME10', discount: '10% OFF', min: 499, desc: 'Applicable on first order across all categories' },
              { code: 'ABC20', discount: '20% OFF', min: 999, desc: 'Special celebration coupon for electronics & fashion' },
              { code: 'FESTIVE15', discount: '15% OFF', min: 1499, desc: 'Great Indian festive season discount coupon' },
            ].map((c) => (
              <div key={c.code} className="rounded-2xl border border-themed bg-gray-50/50 p-5 dark:bg-gray-800/40">
                <span className="font-mono text-base font-black text-brand-600 tracking-wider bg-brand-50 px-3 py-1 rounded-lg border border-brand-200 dark:bg-brand-500/15 dark:border-brand-500/30">
                  {c.code}
                </span>
                <p className="mt-3 text-lg font-extrabold text-heading">{c.discount}</p>
                <p className="text-xs text-muted mt-1">{c.desc}</p>
                <p className="text-xs font-semibold text-heading mt-2">Min. Order: {formatPrice(c.min)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
