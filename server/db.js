import 'dotenv/config'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { seedProducts } from './seedProducts.js'

const { Pool, Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'root',
  database: process.env.PGDATABASE || 'abccart',
}

let pool = null

function getPool() {
  if (!pool) {
    pool = process.env.DATABASE_URL
      ? new Pool({ connectionString: process.env.DATABASE_URL })
      : new Pool(dbConfig)
  }
  return pool
}

function convertPlaceholders(sql) {
  let idx = 0
  return sql.replace(/\?/g, () => `$${++idx}`)
}

function normalizeParams(params = []) {
  return params.map((p) => (p === undefined ? null : p))
}

async function ensureDatabaseExists() {
  if (process.env.DATABASE_URL) return

  const dbName = dbConfig.database
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`Invalid PostgreSQL database name: ${dbName}`)
  }

  const adminClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
  })

  await adminClient.connect()
  try {
    const existing = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    )
    if (existing.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`)
      console.log(`✅ Created PostgreSQL database: ${dbName}`)
    }
  } finally {
    await adminClient.end()
  }
}

// Unified async query wrapper (PostgreSQL)
export const dbWrapper = {
  async query(sql, params = []) {
    const res = await getPool().query(convertPlaceholders(sql), normalizeParams(params))
    return res.rows
  },
  async get(sql, params = []) {
    const res = await getPool().query(convertPlaceholders(sql), normalizeParams(params))
    return res.rows[0]
  },
  async run(sql, params = []) {
    let pgSql = convertPlaceholders(sql).trim()
    if (/^INSERT\b/i.test(pgSql) && !/\bRETURNING\b/i.test(pgSql)) {
      pgSql = `${pgSql.replace(/;$/, '')} RETURNING id`
    }
    const res = await getPool().query(pgSql, normalizeParams(params))
    return {
      lastInsertRowid: res.rows[0]?.id ?? 0,
      changes: res.rowCount ?? 0,
    }
  },
  async exec(sql) {
    return getPool().query(sql)
  },
}

export async function initDatabase() {
  await ensureDatabaseExists()

  const schemaFile = path.join(__dirname, 'schema.pg.sql')
  const schema = fs.readFileSync(schemaFile, 'utf8')
  await dbWrapper.exec(schema)

  // Seed default roles
  const roles = await dbWrapper.query('SELECT COUNT(*) as count FROM roles')
  if (Number(roles[0].count) === 0) {
    await dbWrapper.run("INSERT INTO roles (name, description) VALUES ('admin', 'System Administrator')")
    await dbWrapper.run("INSERT INTO roles (name, description) VALUES ('customer', 'Verified Store Customer')")
  }

  // Seed default users (admin & customer)
  const users = await dbWrapper.query('SELECT COUNT(*) as count FROM users')
  if (Number(users[0].count) === 0) {
    const adminPass = bcrypt.hashSync('admin123', 10)
    const custPass = bcrypt.hashSync('demo123', 10)

    await dbWrapper.run(
      `INSERT INTO users (name, email, password_hash, mobile, role)
       VALUES (?, ?, ?, ?, ?)`,
      ['ABC Cart Admin', 'admin@abccart.in', adminPass, '9876543210', 'admin']
    )

    await dbWrapper.run(
      `INSERT INTO users (name, email, password_hash, mobile, role)
       VALUES (?, ?, ?, ?, ?)`,
      ['Rahul Sharma', 'customer@abccart.in', custPass, '9812345678', 'customer']
    )
  }

  // Seed Categories
  const cats = await dbWrapper.query('SELECT COUNT(*) as count FROM categories')
  if (Number(cats[0].count) === 0) {
    const categorySeeds = [
      { slug: 'eletronicos', name: 'Electronics', icon: 'package', description: 'Gadgets, audio, computing & accessories', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop&q=80' },
      { slug: 'moda', name: 'Fashion', icon: 'tag', description: 'Apparel, western & ethnic wear', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&h=500&fit=crop&q=80' },
      { slug: 'casa', name: 'Home & Decor', icon: 'home', description: 'Kitchen, furnishings & living spaces', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&h=500&fit=crop&q=80' },
      { slug: 'esportes', name: 'Sports & Fitness', icon: 'zap', description: 'Gym equipment, outdoor & sportswear', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop&q=80' },
      { slug: 'beleza', name: 'Beauty & Personal Care', icon: 'star', description: 'Skincare, grooming & fragrances', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=500&fit=crop&q=80' },
      { slug: 'acessorios', name: 'Accessories', icon: 'gift', description: 'Watches, bags, wallets & eyewear', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop&q=80' },
      { slug: 'calcados', name: 'Footwear', icon: 'truck', description: 'Sneakers, formal shoes & sports trainers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop&q=80' },
      { slug: 'mercado', name: 'Grocery & Gourmet', icon: 'shopping-bag', description: 'Organics, staples, tea & gourmet treats', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop&q=80' },
    ]

    for (const c of categorySeeds) {
      await dbWrapper.run(
        'INSERT INTO categories (slug, name, icon, description, image) VALUES (?, ?, ?, ?, ?)',
        [c.slug, c.name, c.icon, c.description, c.image]
      )
    }
  }

  // Seed Coupons
  const coupons = await dbWrapper.query('SELECT COUNT(*) as count FROM coupons')
  if (Number(coupons[0].count) === 0) {
    await dbWrapper.run('INSERT INTO coupons (code, discount_percent, min_order_amount, active) VALUES (?, ?, ?, ?)', ['WELCOME10', 10, 499, 1])
    await dbWrapper.run('INSERT INTO coupons (code, discount_percent, min_order_amount, active) VALUES (?, ?, ?, ?)', ['ABC20', 20, 999, 1])
    await dbWrapper.run('INSERT INTO coupons (code, discount_percent, min_order_amount, active) VALUES (?, ?, ?, ?)', ['FESTIVE15', 15, 1499, 1])
  }

  // Seed Sample Orders for Admin Analytics
  const orders = await dbWrapper.query('SELECT COUNT(*) as count FROM orders')
  if (Number(orders[0].count) === 0) {
    const sampleOrders = [
      { num: 'ABC-ORD-9021', name: 'Amit Verma', email: 'amit@gmail.com', mobile: '9871122334', subtotal: 4499.00, discount: 449.90, shipping: 0, gst: 728.84, total: 4777.94, status: 'Delivered', method: 'UPI', address: 'B-14, Green Park, New Delhi, Delhi - 110016' },
      { num: 'ABC-ORD-9022', name: 'Priya Iyer', email: 'priya@gmail.com', mobile: '9845012345', subtotal: 2499.00, discount: 0, shipping: 0, gst: 449.82, total: 2948.82, status: 'Shipped', method: 'Credit Card', address: 'Flat 402, Sunrise Apts, Indiranagar, Bengaluru, Karnataka - 560038' },
      { num: 'ABC-ORD-9023', name: 'Kunal Patil', email: 'kunal@gmail.com', mobile: '9820054321', subtotal: 18499.00, discount: 2000.00, shipping: 0, gst: 2969.82, total: 19468.82, status: 'Processing', method: 'Net Banking', address: '201, Marine Drive Towers, Nariman Point, Mumbai, Maharashtra - 400021' },
      { num: 'ABC-ORD-9024', name: 'Sneha Roy', email: 'sneha@gmail.com', mobile: '9830098765', subtotal: 1499.00, discount: 150.00, shipping: 0, gst: 242.82, total: 1591.82, status: 'Confirmed', method: 'UPI', address: '12/A, Salt Lake Sector 1, Kolkata, West Bengal - 700064' },
      { num: 'ABC-ORD-9025', name: 'Rahul Sharma', email: 'customer@abccart.in', mobile: '9812345678', subtotal: 3499.00, discount: 349.90, shipping: 0, gst: 566.84, total: 3715.94, status: 'Out for Delivery', method: 'UPI', address: 'A-42, Bandra West, Mumbai, Maharashtra - 400050' },
    ]

    for (const o of sampleOrders) {
      const res = await dbWrapper.run(
        `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_mobile, subtotal, discount, shipping, gst, total, status, payment_method, payment_status, shipping_address)
         VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Success', ?)`,
        [o.num, o.name, o.email, o.mobile, o.subtotal, o.discount, o.shipping, o.gst, o.total, o.status, o.method, o.address]
      )
      const orderId = Number(res.lastInsertRowid)

      await dbWrapper.run(
        `INSERT INTO order_items (order_id, product_name, price, quantity, color, size, image_url)
         VALUES (?, 'Wireless Electronic Device', ?, 1, 'Black', 'Standard', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop')`,
        [orderId, o.subtotal]
      )

      await dbWrapper.run(
        `INSERT INTO payments (order_id, transaction_id, amount, currency, payment_method, status)
         VALUES (?, ?, ?, 'INR', ?, 'Success')`,
        [orderId, `TXN-${Date.now()}-${orderId}`, o.total, o.method]
      )
    }
  }

  // Seed sample address for Rahul Sharma
  const addresses = await dbWrapper.query('SELECT COUNT(*) as count FROM addresses')
  if (Number(addresses[0].count) === 0) {
    await dbWrapper.run(
      `INSERT INTO addresses (user_id, full_name, mobile, address_line1, address_line2, landmark, city, state, pin_code, country, is_default)
       VALUES (2, 'Rahul Sharma', '9812345678', 'Flat 304, Green Heights', 'Linking Road, Bandra West', 'Near National College', 'Mumbai', 'Maharashtra', '400050', 'India', 1)`
    )
  }

  // Seed Products with INR pricing
  await seedProducts()

  console.log(`✅ PostgreSQL database "${dbConfig.database}" initialized and seed verified on ${dbConfig.host}:${dbConfig.port}`)
}

export default dbWrapper
