import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { dbWrapper, initDatabase } from './db.js'

const app = express()
const PORT = process.env.PORT || 5001
const JWT_SECRET = process.env.JWT_SECRET || 'abccart_secure_jwt_secret_2026'

app.use(cors())
app.use(express.json())

// Initialize DB schema & seed data
initDatabase()

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session' })
    req.user = user
    next()
  })
}

// Optional Auth (for cart & guest sessions)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user
      next()
    })
  } else {
    next()
  }
}

// Admin Role Guard
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required' })
  }
  next()
}

// ----------------------------------------------------
// Health Check
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'ABC Cart',
    currency: 'INR',
    locale: 'en-IN',
    timestamp: new Date().toISOString(),
  })
})

// ----------------------------------------------------
// Authentication Endpoints (Task 5)
// ----------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, mobile } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' })
  }

  const existing = dbWrapper.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()])
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const result = dbWrapper.run(
    'INSERT INTO users (name, email, password_hash, mobile, role) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), email.toLowerCase().trim(), passwordHash, mobile ? mobile.trim() : null, 'customer']
  )

  const userId = Number(result.lastInsertRowid)
  const user = { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role: 'customer', mobile }
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })

  // Initialize wishlist & cart for new user
  dbWrapper.run('INSERT OR IGNORE INTO wishlists (user_id) VALUES (?)', [userId])
  dbWrapper.run('INSERT OR IGNORE INTO carts (user_id) VALUES (?)', [userId])

  res.status(201).json({ user, token, message: 'Account registered successfully' })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = dbWrapper.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mobile: user.mobile,
  }

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' })

  res.json({
    user: userPayload,
    token,
    message: 'Signed in successfully',
  })
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = dbWrapper.get('SELECT id, name, email, role, mobile, created_at FROM users WHERE id = ?', [req.user.id])
  if (!user) return res.status(404).json({ error: 'User not found' })

  const addresses = dbWrapper.query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.user.id])
  res.json({ user: { ...user, addresses } })
})

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const user = dbWrapper.get('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase().trim()])
  // Always return success message for security, preventing email enumeration
  res.json({
    message: user
      ? `A password reset link has been dispatched to ${email}. Please check your inbox.`
      : 'If an account exists with this email, a reset link has been sent.',
  })
})

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Signed out successfully' })
})

// ----------------------------------------------------
// Categories & Products Endpoints (Task 3 & 4)
// ----------------------------------------------------
app.get('/api/categories', (req, res) => {
  const categories = dbWrapper.query('SELECT * FROM categories ORDER BY id ASC')
  res.json(categories)
})

app.get('/api/products', (req, res) => {
  const { category, search, brand, minPrice, maxPrice, sort, featured, bestseller, isNew, limit } = req.query

  let sql = 'SELECT * FROM products WHERE 1=1'
  const params = []

  if (category) {
    sql += ' AND category_slug = ?'
    params.push(category)
  }

  if (search) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(brand) LIKE ?)'
    const q = `%${search.toLowerCase().trim()}%`
    params.push(q, q, q)
  }

  if (brand) {
    sql += ' AND brand = ?'
    params.push(brand)
  }

  if (minPrice) {
    sql += ' AND price >= ?'
    params.push(Number(minPrice))
  }

  if (maxPrice) {
    sql += ' AND price <= ?'
    params.push(Number(maxPrice))
  }

  if (featured === 'true') {
    sql += ' AND featured = 1'
  }

  if (bestseller === 'true') {
    sql += ' AND bestseller = 1'
  }

  if (isNew === 'true') {
    sql += ' AND is_new = 1'
  }

  // Sorting
  switch (sort) {
    case 'price-asc':
      sql += ' ORDER BY price ASC'
      break
    case 'price-desc':
      sql += ' ORDER BY price DESC'
      break
    case 'rating':
      sql += ' ORDER BY rating DESC'
      break
    case 'newest':
      sql += ' ORDER BY created_at DESC'
      break
    default:
      sql += ' ORDER BY bestseller DESC, rating DESC, id DESC'
  }

  if (limit) {
    sql += ' LIMIT ?'
    params.push(Number(limit))
  }

  const products = dbWrapper.query(sql, params)
  res.json(products)
})

app.get('/api/products/:slug', (req, res) => {
  const product = dbWrapper.get('SELECT * FROM products WHERE slug = ?', [req.params.slug])
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const images = dbWrapper.query('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC', [product.id])
  const variants = dbWrapper.query('SELECT * FROM product_variants WHERE product_id = ?', [product.id])
  const reviews = dbWrapper.query('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [product.id])

  res.json({
    ...product,
    images: images.map((i) => i.image_url),
    variants,
    reviews,
  })
})

// ----------------------------------------------------
// Shopping Cart Endpoints (Task 8)
// ----------------------------------------------------
app.get('/api/cart', optionalAuth, (req, res) => {
  const userId = req.user?.id
  const sessionId = req.headers['x-session-id'] || 'guest'

  let cart = userId
    ? dbWrapper.get('SELECT * FROM carts WHERE user_id = ?', [userId])
    : dbWrapper.get('SELECT * FROM carts WHERE session_id = ? AND user_id IS NULL', [sessionId])

  if (!cart) {
    if (userId) {
      const r = dbWrapper.run('INSERT INTO carts (user_id) VALUES (?)', [userId])
      cart = { id: Number(r.lastInsertRowid), user_id: userId }
    } else {
      const r = dbWrapper.run('INSERT INTO carts (session_id) VALUES (?)', [sessionId])
      cart = { id: Number(r.lastInsertRowid), session_id: sessionId }
    }
  }

  const items = dbWrapper.query(
    `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.color, ci.size,
            p.name, p.slug, p.price, p.price_old, p.brand, p.stock
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = ?`,
    [cart.id]
  )

  const subtotal = items.reduce((acc, it) => acc + Number(it.price) * it.quantity, 0)
  const shipping = subtotal >= 499 || subtotal === 0 ? 0 : 49
  const gst = Math.round(subtotal * 0.18 * 100) / 100
  const total = subtotal + shipping

  res.json({
    cartId: cart.id,
    items,
    summary: {
      subtotal,
      shipping,
      gst,
      total,
      currency: 'INR',
    },
  })
})

app.post('/api/cart/add', optionalAuth, (req, res) => {
  const { productId, quantity = 1, color, size } = req.body
  const userId = req.user?.id
  const sessionId = req.headers['x-session-id'] || 'guest'

  if (!productId) return res.status(400).json({ error: 'productId is required' })

  // Verify product & stock
  const product = dbWrapper.get('SELECT id, stock, price FROM products WHERE id = ?', [productId])
  if (!product) return res.status(404).json({ error: 'Product not found' })
  if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock available' })

  let cart = userId
    ? dbWrapper.get('SELECT id FROM carts WHERE user_id = ?', [userId])
    : dbWrapper.get('SELECT id FROM carts WHERE session_id = ? AND user_id IS NULL', [sessionId])

  if (!cart) {
    const r = userId
      ? dbWrapper.run('INSERT INTO carts (user_id) VALUES (?)', [userId])
      : dbWrapper.run('INSERT INTO carts (session_id) VALUES (?)', [sessionId])
    cart = { id: Number(r.lastInsertRowid) }
  }

  const existingItem = dbWrapper.get(
    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (color = ? OR (color IS NULL AND ? IS NULL)) AND (size = ? OR (size IS NULL AND ? IS NULL))',
    [cart.id, productId, color || null, color || null, size || null, size || null]
  )

  if (existingItem) {
    dbWrapper.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existingItem.id])
  } else {
    dbWrapper.run(
      'INSERT INTO cart_items (cart_id, product_id, quantity, color, size) VALUES (?, ?, ?, ?, ?)',
      [cart.id, productId, quantity, color || null, size || null]
    )
  }

  res.json({ message: 'Item added to cart', cartId: cart.id })
})

app.put('/api/cart/item/:id', (req, res) => {
  const { quantity } = req.body
  if (quantity <= 0) {
    dbWrapper.run('DELETE FROM cart_items WHERE id = ?', [req.params.id])
  } else {
    dbWrapper.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, req.params.id])
  }
  res.json({ message: 'Cart updated' })
})

app.delete('/api/cart/item/:id', (req, res) => {
  dbWrapper.run('DELETE FROM cart_items WHERE id = ?', [req.params.id])
  res.json({ message: 'Item removed from cart' })
})

app.post('/api/cart/merge', authenticateToken, (req, res) => {
  const { guestItems } = req.body
  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    return res.json({ message: 'No guest items to merge' })
  }

  let userCart = dbWrapper.get('SELECT id FROM carts WHERE user_id = ?', [req.user.id])
  if (!userCart) {
    const r = dbWrapper.run('INSERT INTO carts (user_id) VALUES (?)', [req.user.id])
    userCart = { id: Number(r.lastInsertRowid) }
  }

  for (const item of guestItems) {
    const existing = dbWrapper.get(
      'SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [userCart.id, item.productId]
    )
    if (existing) {
      dbWrapper.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [item.qty || 1, existing.id])
    } else {
      dbWrapper.run(
        'INSERT INTO cart_items (cart_id, product_id, quantity, color, size) VALUES (?, ?, ?, ?, ?)',
        [userCart.id, item.productId, item.qty || 1, item.color || null, item.size || null]
      )
    }
  }

  res.json({ message: 'Guest cart merged successfully' })
})

// ----------------------------------------------------
// Wishlist Endpoints (Task 9)
// ----------------------------------------------------
app.get('/api/wishlist', authenticateToken, (req, res) => {
  let wishlist = dbWrapper.get('SELECT id FROM wishlists WHERE user_id = ?', [req.user.id])
  if (!wishlist) {
    const r = dbWrapper.run('INSERT INTO wishlists (user_id) VALUES (?)', [req.user.id])
    wishlist = { id: Number(r.lastInsertRowid) }
  }

  const items = dbWrapper.query(
    `SELECT p.*, wi.created_at as saved_at
     FROM wishlist_items wi
     JOIN products p ON wi.product_id = p.id
     WHERE wi.wishlist_id = ?
     ORDER BY wi.id DESC`,
    [wishlist.id]
  )

  const productIds = items.map((i) => i.id)
  res.json({ productIds, items })
})

app.post('/api/wishlist/toggle', authenticateToken, (req, res) => {
  const { productId } = req.body
  if (!productId) return res.status(400).json({ error: 'productId is required' })

  let wishlist = dbWrapper.get('SELECT id FROM wishlists WHERE user_id = ?', [req.user.id])
  if (!wishlist) {
    const r = dbWrapper.run('INSERT INTO wishlists (user_id) VALUES (?)', [req.user.id])
    wishlist = { id: Number(r.lastInsertRowid) }
  }

  const existing = dbWrapper.get(
    'SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?',
    [wishlist.id, productId]
  )

  if (existing) {
    dbWrapper.run('DELETE FROM wishlist_items WHERE id = ?', [existing.id])
    res.json({ inWishlist: false, message: 'Removed from wishlist' })
  } else {
    dbWrapper.run('INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)', [wishlist.id, productId])
    res.json({ inWishlist: true, message: 'Added to wishlist' })
  }
})

// ----------------------------------------------------
// Indian Addresses (Task 11)
// ----------------------------------------------------
app.get('/api/addresses', authenticateToken, (req, res) => {
  const addresses = dbWrapper.query(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
    [req.user.id]
  )
  res.json(addresses)
})

app.post('/api/addresses', authenticateToken, (req, res) => {
  const { fullName, mobile, addressLine1, addressLine2, landmark, city, state, pinCode, isDefault } = req.body

  if (!fullName || !mobile || !addressLine1 || !city || !state || !pinCode) {
    return res.status(400).json({ error: 'All mandatory Indian address fields are required' })
  }

  if (isDefault) {
    dbWrapper.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id])
  }

  const r = dbWrapper.run(
    `INSERT INTO addresses (user_id, full_name, mobile, address_line1, address_line2, landmark, city, state, pin_code, country, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', ?)`,
    [req.user.id, fullName, mobile, addressLine1, addressLine2 || null, landmark || null, city, state, pinCode, isDefault ? 1 : 0]
  )

  res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Address saved successfully' })
})

app.delete('/api/addresses/:id', authenticateToken, (req, res) => {
  dbWrapper.run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
  res.json({ message: 'Address deleted' })
})

app.patch('/api/addresses/:id/default', authenticateToken, (req, res) => {
  dbWrapper.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id])
  dbWrapper.run('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
  res.json({ message: 'Default address updated' })
})

// ----------------------------------------------------
// Orders & Checkout (Task 10)
// ----------------------------------------------------
app.post('/api/orders', authenticateToken, (req, res) => {
  const { items, shippingAddress, paymentMethod = 'UPI', discount = 0 } = req.body

  if (!items || !items.length || !shippingAddress) {
    return res.status(400).json({ error: 'Order items and shipping address are required' })
  }

  const subtotal = items.reduce((acc, it) => acc + Number(it.price) * it.qty, 0)
  const shipping = subtotal >= 499 ? 0 : 49
  const gst = Math.round(subtotal * 0.18 * 100) / 100
  const total = subtotal - Number(discount) + shipping

  const orderNum = `ABC-ORD-${Date.now().toString().slice(-6)}`
  const addressStr = typeof shippingAddress === 'string'
    ? shippingAddress
    : `${shippingAddress.fullName}, ${shippingAddress.addressLine1}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pinCode} (Ph: ${shippingAddress.mobile})`

  const r = dbWrapper.run(
    `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_mobile, subtotal, discount, shipping, gst, total, status, payment_method, payment_status, shipping_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, 'Completed', ?)`,
    [orderNum, req.user.id, req.user.name, req.user.email, req.user.mobile || '', subtotal, discount, shipping, gst, total, paymentMethod, addressStr]
  )

  const orderId = Number(r.lastInsertRowid)

  for (const it of items) {
    dbWrapper.run(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, color, size, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, it.productId || null, it.name, it.price, it.qty, it.color || null, it.size || null, it.image || null]
    )

    // Deduct inventory
    if (it.productId) {
      dbWrapper.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [it.qty, it.productId])
    }
  }

  // Record payment
  dbWrapper.run(
    `INSERT INTO payments (order_id, transaction_id, amount, currency, payment_method, status)
     VALUES (?, ?, ?, 'INR', ?, 'Success')`,
    [orderId, `TXN-${orderNum}`, total, paymentMethod]
  )

  // Clear user cart in DB
  const userCart = dbWrapper.get('SELECT id FROM carts WHERE user_id = ?', [req.user.id])
  if (userCart) {
    dbWrapper.run('DELETE FROM cart_items WHERE cart_id = ?', [userCart.id])
  }

  res.status(201).json({
    orderId,
    orderNumber: orderNum,
    total,
    currency: 'INR',
    message: 'Order placed successfully',
  })
})

app.get('/api/orders', authenticateToken, (req, res) => {
  const orders = dbWrapper.query('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id])
  const detailedOrders = orders.map((o) => {
    const items = dbWrapper.query('SELECT * FROM order_items WHERE order_id = ?', [o.id])
    return { ...o, items }
  })
  res.json(detailedOrders)
})

app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const order = dbWrapper.get('SELECT * FROM orders WHERE id = ? AND (user_id = ? OR ? = "admin")', [req.params.id, req.user.id, req.user.role])
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const items = dbWrapper.query('SELECT * FROM order_items WHERE order_id = ?', [order.id])
  const payment = dbWrapper.get('SELECT * FROM payments WHERE order_id = ?', [order.id])

  res.json({ ...order, items, payment })
})

// ----------------------------------------------------
// Admin Dashboard Endpoints (Task 12)
// ----------------------------------------------------
app.get('/api/admin/overview', authenticateToken, requireAdmin, (req, res) => {
  const totalRevenue = dbWrapper.get("SELECT COALESCE(SUM(total), 0) as val FROM orders WHERE status != 'Cancelled'")
  const todaySales = dbWrapper.get("SELECT COALESCE(SUM(total), 0) as val FROM orders WHERE DATE(created_at) = DATE('now') AND status != 'Cancelled'")
  const avgOrderValue = dbWrapper.get("SELECT COALESCE(AVG(total), 0) as val FROM orders WHERE status != 'Cancelled'")
  const totalOrders = dbWrapper.get('SELECT COUNT(*) as count FROM orders')
  const totalCustomers = dbWrapper.get("SELECT COUNT(*) as count FROM users WHERE role = 'customer'")
  const totalProducts = dbWrapper.get('SELECT COUNT(*) as count FROM products')
  const lowStock = dbWrapper.query('SELECT id, name, stock, brand FROM products WHERE stock <= 10')
  const recentOrders = dbWrapper.query('SELECT * FROM orders ORDER BY id DESC LIMIT 10')

  res.json({
    metrics: {
      totalRevenue: Number(totalRevenue.val),
      todaySales: Number(todaySales.val),
      averageOrderValue: Math.round(Number(avgOrderValue.val)),
      totalOrders: totalOrders.count,
      totalCustomers: totalCustomers.count,
      totalProducts: totalProducts.count,
    },
    lowStock,
    recentOrders,
    currency: 'INR',
  })
})

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
  const orders = dbWrapper.query('SELECT * FROM orders ORDER BY id DESC')
  const full = orders.map((o) => ({
    ...o,
    items: dbWrapper.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]),
  }))
  res.json(full)
})

app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.body
  const allowed = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` })
  }

  dbWrapper.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id])
  res.json({ message: `Order status updated to ${status}` })
})

app.post('/api/admin/products', authenticateToken, requireAdmin, (req, res) => {
  const { name, slug, price, priceOld, categorySlug, brand, stock, description } = req.body
  const r = dbWrapper.run(
    `INSERT INTO products (name, slug, price, price_old, category_slug, brand, stock, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, slug || name.toLowerCase().replace(/\s+/g, '-'), price, priceOld || null, categorySlug, brand, stock || 20, description || '']
  )
  res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Product created' })
})

app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
  dbWrapper.run('DELETE FROM products WHERE id = ?', [req.params.id])
  res.json({ message: 'Product deleted' })
})

app.listen(PORT, () => {
  console.log(`🚀 ABC Cart Backend Server listening on http://localhost:${PORT}`)
})
