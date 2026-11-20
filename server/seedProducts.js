import { dbWrapper } from './db.js'

export const SEED_PRODUCTS = [
  // --- Electronics ---
  { name: 'NovaSound Pro Wireless Headphones', slug: 'fone-novasound-pro', price: 2499.00, priceOld: 4999.00, category: 'eletronicos', brand: 'NovaSound', rating: 4.7, reviewsCount: 214, stock: 32, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=80' },
  { name: 'Pulse X2 Smart Fitness Watch', slug: 'smartwatch-pulse-x2', price: 4499.00, priceOld: 7999.00, category: 'eletronicos', brand: 'Pulse', rating: 4.5, reviewsCount: 158, stock: 18, featured: 1, bestseller: 0, isNew: 1, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=80' },
  { name: 'BoomGo Outdoor Bluetooth Speaker', slug: 'caixa-som-boomgo', price: 1699.00, priceOld: 2999.00, category: 'eletronicos', brand: 'BoomGo', rating: 4.3, reviewsCount: 96, stock: 54, featured: 0, bestseller: 1, isNew: 0, trending: 0, specialOffer: 1, image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&h=600&fit=crop&q=80' },
  { name: 'KeyForge RGB Mechanical Keyboard', slug: 'teclado-keyforge-rgb', price: 3499.00, priceOld: 5499.00, category: 'eletronicos', brand: 'KeyForge', rating: 4.8, reviewsCount: 312, stock: 7, featured: 1, bestseller: 0, isNew: 0, trending: 1, specialOffer: 0, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop&q=80' },
  { name: 'StreamCam 4K UHD Pro Webcam', slug: 'webcam-streamcam-4k', price: 3199.00, priceOld: 4999.00, category: 'eletronicos', brand: 'StreamCam', rating: 4.2, reviewsCount: 44, stock: 15, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop&q=80' },
  { name: 'Precision Pro RGB Gaming Mouse', slug: 'mouse-precision-pro', price: 1499.00, priceOld: 2499.00, category: 'eletronicos', brand: 'KeyForge', rating: 4.8, reviewsCount: 145, stock: 24, featured: 1, bestseller: 0, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop&q=80' },
  { name: 'Infinity UltraSlim 15.6" Laptop', slug: 'notebook-ultraslim-infinity', price: 52999.00, priceOld: 64999.00, category: 'eletronicos', brand: 'InfinityTech', rating: 4.9, reviewsCount: 88, stock: 12, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop&q=80' },
  { name: 'AirBeats Pro TWS Wireless Earbuds', slug: 'fone-tws-airbeats', price: 1799.00, priceOld: 3499.00, category: 'eletronicos', brand: 'NovaSound', rating: 4.6, reviewsCount: 310, stock: 65, featured: 0, bestseller: 1, isNew: 1, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&q=80' },
  { name: 'Pulse Tab Pro 11" 128GB Tablet', slug: 'tablet-pro-retina', price: 26999.00, priceOld: 32999.00, category: 'eletronicos', brand: 'Pulse', rating: 4.7, reviewsCount: 112, stock: 19, featured: 1, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&q=80' },
  { name: 'ViewMax 27" 165Hz Gaming Monitor', slug: 'monitor-ultrawide-165hz', price: 18499.00, priceOld: 24999.00, category: 'eletronicos', brand: 'ViewMax', rating: 4.8, reviewsCount: 76, stock: 15, featured: 1, bestseller: 0, isNew: 1, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop&q=80' },
  { name: 'AeroTech 4K UHD Aerial Drone', slug: 'drone-aerial-4k', price: 22999.00, priceOld: 29999.00, category: 'eletronicos', brand: 'AeroTech', rating: 4.5, reviewsCount: 52, stock: 11, featured: 0, bestseller: 0, isNew: 1, trending: 1, specialOffer: 0, image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&h=600&fit=crop&q=80' },
  { name: 'Nova X Pro 5G Smartphone 256GB', slug: 'smartphone-nova-x-pro', price: 27999.00, priceOld: 34999.00, category: 'eletronicos', brand: 'Pulse', rating: 4.9, reviewsCount: 420, stock: 35, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop&q=80' },

  // --- Fashion ---
  { name: 'Essential Cotton Crewneck T-Shirt', slug: 'camiseta-essential', price: 599.00, priceOld: 999.00, category: 'moda', brand: 'Essential', rating: 4.6, reviewsCount: 187, stock: 120, featured: 0, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&h=600&fit=crop&q=80' },
  { name: 'UrbanFlow All-Weather Windbreaker', slug: 'jaqueta-urbanflow', price: 1999.00, priceOld: 2999.00, category: 'moda', brand: 'UrbanFlow', rating: 4.4, reviewsCount: 72, stock: 23, featured: 1, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop&q=80' },
  { name: 'Denim Co. Stretch Slim Jeans', slug: 'calca-jeans-denim', price: 1499.00, priceOld: 2499.00, category: 'moda', brand: 'Denim Co.', rating: 4.1, reviewsCount: 58, stock: 41, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 1, image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=600&fit=crop&q=80' },
  { name: 'Primavera Printed Floral Dress', slug: 'vestido-floral', price: 1799.00, priceOld: 2599.00, category: 'moda', brand: 'Primavera', rating: 4.7, reviewsCount: 134, stock: 16, featured: 0, bestseller: 0, isNew: 1, trending: 1, specialOffer: 0, image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=600&fit=crop&q=80' },
  { name: 'Streetwear Heavyweight Fleece Hoodie', slug: 'moletom-streetwear', price: 1599.00, priceOld: 2299.00, category: 'moda', brand: 'UrbanFlow', rating: 4.6, reviewsCount: 89, stock: 30, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop&q=80' },
  { name: 'Essential Slim Fit Oxford Shirt', slug: 'camisa-social-slim', price: 1199.00, priceOld: 1899.00, category: 'moda', brand: 'Essential', rating: 4.3, reviewsCount: 47, stock: 25, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=80' },

  // --- Home & Decor ---
  { name: 'Aurora Minimalist LED Desk Lamp', slug: 'luminaria-aurora', price: 1299.00, priceOld: 1999.00, category: 'casa', brand: 'Aurora', rating: 4.5, reviewsCount: 89, stock: 38, featured: 1, bestseller: 0, isNew: 0, trending: 0, specialOffer: 1, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop&q=80' },
  { name: 'Chef Master 5-Piece Granite Cookware', slug: 'panelas-chef-master', price: 3499.00, priceOld: 5499.00, category: 'casa', brand: 'Chef Master', rating: 4.8, reviewsCount: 203, stock: 12, featured: 0, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&h=600&fit=crop&q=80' },
  { name: 'Aconchego Plush Throw Blanket', slug: 'manta-aconchego', price: 899.00, priceOld: 1499.00, category: 'casa', brand: 'Aconchego', rating: 4.6, reviewsCount: 67, stock: 75, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=600&fit=crop&q=80' },
  { name: 'ZenAir Ultrasonic Aroma Diffuser', slug: 'difusor-zenair', price: 799.00, priceOld: 1299.00, category: 'casa', brand: 'ZenAir', rating: 4.3, reviewsCount: 51, stock: 60, featured: 0, bestseller: 0, isNew: 1, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop&q=80' },
  { name: 'Barista Gourmet Espresso Machine', slug: 'cafeteira-espresso', price: 4999.00, priceOld: 6999.00, category: 'casa', brand: 'Chef Master', rating: 4.7, reviewsCount: 115, stock: 14, featured: 1, bestseller: 0, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80' },
  { name: 'Velvet Plush Decor Cushions (Set of 2)', slug: 'almofada-velvet', price: 699.00, priceOld: 1199.00, category: 'casa', brand: 'Aconchego', rating: 4.4, reviewsCount: 42, stock: 45, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=600&fit=crop&q=80' },

  // --- Sports & Fitness ---
  { name: 'SpeedRun Pro Performance Shoes', slug: 'tenis-speedrun', price: 2999.00, priceOld: 4999.00, category: 'esportes', brand: 'SpeedRun', rating: 4.7, reviewsCount: 298, stock: 26, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80' },
  { name: 'HydroFit 1L Stainless Steel Bottle', slug: 'garrafa-hydrofit', price: 699.00, priceOld: 1199.00, category: 'esportes', brand: 'HydroFit', rating: 4.5, reviewsCount: 142, stock: 88, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 1, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop&q=80' },
  { name: 'PowerLift Adjustable Dumbbell Set', slug: 'halteres-powerlift', price: 3999.00, priceOld: 5999.00, category: 'esportes', brand: 'PowerLift', rating: 4.8, reviewsCount: 76, stock: 9, featured: 1, bestseller: 0, isNew: 0, trending: 1, specialOffer: 0, image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&h=600&fit=crop&q=80' },
  { name: 'Adventure Trail 30L Hiking Backpack', slug: 'mochila-trail-30l', price: 2199.00, priceOld: 3199.00, category: 'esportes', brand: 'Adventure', rating: 4.4, reviewsCount: 63, stock: 34, featured: 0, bestseller: 0, isNew: 1, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&h=600&fit=crop&q=80' },
  { name: 'EcoGrip 6mm Anti-Slip Yoga Mat', slug: 'tapete-yoga', price: 999.00, priceOld: 1499.00, category: 'esportes', brand: 'HydroFit', rating: 4.6, reviewsCount: 84, stock: 50, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop&q=80' },

  // --- Beauty & Personal Care ---
  { name: 'Glow Vitamin C Illuminating Serum', slug: 'serum-glow-vitc', price: 899.00, priceOld: 1399.00, category: 'beleza', brand: 'Glow', rating: 4.6, reviewsCount: 221, stock: 47, featured: 0, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=80' },
  { name: 'Pure Daily Routine 4-Step Skincare', slug: 'kit-pure-routine', price: 2199.00, priceOld: 3299.00, category: 'beleza', brand: 'Pure', rating: 4.7, reviewsCount: 95, stock: 21, featured: 1, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80' },
  { name: 'Essência Noir Eau De Parfum 100ml', slug: 'perfume-noir', price: 2499.00, priceOld: 3999.00, category: 'beleza', brand: 'Essência', rating: 4.5, reviewsCount: 118, stock: 15, featured: 0, bestseller: 0, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop&q=80' },
  { name: 'IonDry Pro Ionic Salon Hair Dryer', slug: 'secador-iondry', price: 1899.00, priceOld: 2799.00, category: 'beleza', brand: 'IonDry', rating: 4.3, reviewsCount: 54, stock: 28, featured: 0, bestseller: 0, isNew: 1, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop&q=80' },
  { name: 'Velvet Matte Long-Stay Lipstick', slug: 'batom-matte-velvet', price: 499.00, priceOld: 799.00, category: 'beleza', brand: 'Glow', rating: 4.5, reviewsCount: 73, stock: 62, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=600&fit=crop&q=80' },

  // --- Accessories ---
  { name: 'Horizon UV400 Polarized Sunglasses', slug: 'oculos-horizon', price: 1299.00, priceOld: 1999.00, category: 'acessorios', brand: 'Horizon', rating: 4.4, reviewsCount: 87, stock: 43, featured: 1, bestseller: 0, isNew: 0, trending: 0, specialOffer: 1, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&q=80' },
  { name: 'Heritage Handcrafted Leather Wallet', slug: 'carteira-heritage', price: 899.00, priceOld: 1499.00, category: 'acessorios', brand: 'Heritage', rating: 4.6, reviewsCount: 109, stock: 56, featured: 0, bestseller: 1, isNew: 0, trending: 1, specialOffer: 0, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=600&fit=crop&q=80' },
  { name: 'Metro 15.6" Padded Laptop Backpack', slug: 'mochila-metro-15', price: 1799.00, priceOld: 2499.00, category: 'acessorios', brand: 'Metro', rating: 4.5, reviewsCount: 132, stock: 30, featured: 0, bestseller: 0, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&q=80' },
  { name: 'Urban Style Snapback Cap', slug: 'bone-urban-style', price: 499.00, priceOld: 899.00, category: 'acessorios', brand: 'Horizon', rating: 4.3, reviewsCount: 39, stock: 48, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop&q=80' },

  // --- Footwear ---
  { name: 'StreetClassic Urban White Sneakers', slug: 'tenis-streetclassic', price: 1999.00, priceOld: 2999.00, category: 'calcados', brand: 'SpeedRun', rating: 4.6, reviewsCount: 142, stock: 35, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=600&fit=crop&q=80' },
  { name: 'Royal Derby Formal Leather Shoes', slug: 'sapato-royal-derby', price: 3299.00, priceOld: 4999.00, category: 'calcados', brand: 'Heritage', rating: 4.8, reviewsCount: 88, stock: 20, featured: 0, bestseller: 0, isNew: 1, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&h=600&fit=crop&q=80' },
  { name: 'Comfort Slide Everyday Sandals', slug: 'sandalia-slide-comfort', price: 799.00, priceOld: 1299.00, category: 'calcados', brand: 'Essential', rating: 4.3, reviewsCount: 53, stock: 40, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 1, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop&q=80' },

  // --- Grocery & Gourmet ---
  { name: 'Royal Heritage Aged Basmati Rice 5kg', slug: 'arroz-basmati-royal', price: 699.00, priceOld: 899.00, category: 'mercado', brand: 'Chef Master', rating: 4.8, reviewsCount: 310, stock: 80, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 0, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=600&fit=crop&q=80' },
  { name: 'Organic Pure Wildflower Honey 500g', slug: 'mel-organico-puro', price: 449.00, priceOld: 599.00, category: 'mercado', brand: 'Essência', rating: 4.7, reviewsCount: 165, stock: 65, featured: 0, bestseller: 0, isNew: 1, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop&q=80' },
  { name: 'Premium Roasted California Almonds 500g', slug: 'castanhas-almonds-500g', price: 799.00, priceOld: 1099.00, category: 'mercado', brand: 'Pure', rating: 4.9, reviewsCount: 220, stock: 50, featured: 1, bestseller: 1, isNew: 0, trending: 1, specialOffer: 1, image: 'https://images.unsplash.com/photo-1508061252445-5350f3ab0a55?w=600&h=600&fit=crop&q=80' },
  { name: 'Himalayan Organic Green Tea 100g', slug: 'cha-verde-himalaya', price: 349.00, priceOld: 499.00, category: 'mercado', brand: 'ZenAir', rating: 4.6, reviewsCount: 114, stock: 90, featured: 0, bestseller: 0, isNew: 0, trending: 0, specialOffer: 0, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&h=600&fit=crop&q=80' },
]

export function seedProducts() {
  const count = dbWrapper.get('SELECT COUNT(*) as count FROM products')
  if (count.count > 0) return

  for (const p of SEED_PRODUCTS) {
    const desc = `${p.name} from brand ${p.brand}. Premium quality, authentic design with 12 months manufacturer warranty and fast delivery across India.`
    const r = dbWrapper.run(
      `INSERT INTO products (slug, name, price, price_old, category_slug, brand, rating, reviews_count, stock, description, featured, bestseller, is_new, trending, special_offer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.slug, p.name, p.price, p.priceOld, p.category, p.brand, p.rating, p.reviewsCount, p.stock, desc, p.featured, p.bestseller, p.isNew, p.trending, p.specialOffer]
    )

    const productId = Number(r.lastInsertRowid)

    // Product Image
    dbWrapper.run(
      'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 0)',
      [productId, p.image]
    )

    // Inventory
    dbWrapper.run(
      'INSERT INTO inventory (product_id, quantity, reserved, low_stock_threshold) VALUES (?, ?, 0, 5)',
      [productId, p.stock]
    )
  }

  console.log(`✅ Seeded ${SEED_PRODUCTS.length} products with Indian Rupee (₹ INR) prices!`)
}
