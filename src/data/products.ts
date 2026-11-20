import type { Product } from './types'

function unsplash(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`
}

/**
 * Curated and verified Unsplash photo sets mapped directly to each product.
 * Every photo ID matches the exact product type.
 */
const PRODUCT_IMAGES: Record<string, string[]> = {
  // --- Electronics ---
  'fone-novasound-pro': ['1505740420928-5e560c06d30e', '1546435770-a3e426bf472b', '1484704849700-f032a568e944'],
  'smartwatch-pulse-x2': ['1523275335684-37898b6baf30', '1508685096489-7aacd43bd3b1', '1579586337278-3befd40fd17a'],
  'caixa-som-boomgo': ['1545454675-3531b543be5d', '1608043152269-423dbba4e7e1', '1543512214-318c7553f230'],
  'teclado-keyforge-rgb': ['1587829741301-dc798b83add3', '1618384887929-16ec33fab9ef', '1595225476474-87563907a212'],
  'webcam-streamcam-4k': ['1516035069371-29a1b244cc32', '1526170375885-4d8ecf77b99f'],
  'mouse-precision-pro': ['1615663245857-ac93bb7c39e7', '1527864550417-7fd91fc51a46'],
  'notebook-ultraslim-infinity': ['1496181133206-80ce9b88a853', '1517336714731-489689fd1ca8', '1525547719571-a2d4ac8945e2'],
  'fone-tws-airbeats': ['1590658268037-6bf12165a8df', '1606220588913-b3aacb4d2f46'],
  'tablet-pro-retina': ['1544244015-0df4b3ffc6b0', '1561154464-82e9adf32764'],
  'monitor-ultrawide-165hz': ['1527443224154-c4a3942d3acf', '1547082299-de196ea013d6'],
  'drone-aerial-4k': ['1527977966376-1c8408f9f108', '1473968512647-3e447244af8f'],
  'smartphone-nova-x-pro': ['1511707171634-5f897ff02aa9', '1592750475338-74b7b21085ab'],

  // --- Fashion ---
  'camiseta-essential': ['1521572267360-ee0c2909d518', '1583743814966-8936f5b7be1a'],
  'jaqueta-urbanflow': ['1551028719-00167b16eac5', '1548883354-7622d03aca27'],
  'calca-jeans-denim': ['1541099649105-f69ad21f3246', '1542272604-787c3835535d'],
  'vestido-floral': ['1572804013309-59a88b7e92f1', '1515372039744-b8f02a3ae446'],
  'moletom-streetwear': ['1556905055-8f358a7a47b2', '1509967419530-da38b4704bc6'],
  'camisa-social-slim': ['1596755094514-f87e34085b2c', '1602810318383-e386cc2a3ccf'],

  // --- Home & Decor ---
  'luminaria-aurora': ['1507473885765-e6ed057f782c', '1513506003901-1e6a229e2d15'],
  'panelas-chef-master': ['1556911220-e15b29be8c8f'],
  'manta-aconchego': ['1584100936595-c0654b55a2e2', '1517841905240-472988babdf9'],
  'difusor-zenair': ['1608571423902-eed4a5ad8108', '1617897903246-719242758050'],
  'cafeteira-espresso': ['1514432324607-a09d9b4aefdd'],
  'almofada-velvet': ['1584100936595-c0654b55a2e2'],

  // --- Sports & Fitness ---
  'tenis-speedrun': ['1542291026-7eec264c27ff', '1491553895911-0055eca6402d'],
  'garrafa-hydrofit': ['1602143407151-7111542de6e8', '1523362628745-0c100150b504'],
  'halteres-powerlift': ['1584735935682-2f2b69dff9d2', '1583454110551-21f2fa2afe61'],
  'mochila-trail-30l': ['1622560480605-d83c853bc5c3', '1553062407-98eeb64c6a62'],
  'tapete-yoga': ['1601925260368-ae2f83cf8b7f', '1544367567-0f2fcb009e0b'],

  // --- Beauty & Personal Care ---
  'serum-glow-vitc': ['1620916566398-39f1143ab7be', '1598440947619-2c35fc9aa908'],
  'kit-pure-routine': ['1556228720-195a672e8a03', '1571781926291-c477ebfd024b'],
  'perfume-noir': ['1592945403244-b3fbafd7f539', '1547887537-6158d64c35b3'],
  'secador-iondry': ['1522337360788-8b13dee7a37e', '1527799820374-dcf8d9d4a388'],
  'batom-matte-velvet': ['1586495777744-4413f21062fa'],

  // --- Accessories ---
  'oculos-horizon': ['1572635196237-14b3f281503f', '1511499767150-a48a237f0083'],
  'carteira-heritage': ['1627123424574-724758594e93', '1559563458-527698bf5295'],
  'mochila-metro-15': ['1553062407-98eeb64c6a62', '1546938576-6e6a64f317cc'],
  'bone-urban-style': ['1588850561407-ed78c282e89b'],

  // --- Footwear ---
  'tenis-streetclassic': ['1560769629-975ec94e6a86', '1491553895911-0055eca6402d'],
  'sapato-royal-derby': ['1614252235316-8c857d38b5f4', '1533867617858-e7b97e060509'],
  'sandalia-slide-comfort': ['1608231387042-66d1773070a5', '1562183241-b937e95585b6'],

  // --- Grocery & Gourmet ---
  'arroz-basmati-royal': ['1586201375761-83865001e31c', '1536304993881-ff6e9eefa2a6'],
  'mel-organico-puro': ['1587049352846-4a222e784d38', '1558642452-9d2a7deb7f62'],
  'castanhas-almonds-500g': ['1508061252445-5350f3ab0a55', '1508746829417-e6f548d8d6ed'],
  'cha-verde-himalaya': ['1576092768241-dec231879fc3', '1597481499750-3e6b22637e12'],
}

const DEFAULT_FALLBACK_IMAGES = [
  '1523275335684-37898b6baf30',
  '1505740420928-5e560c06d30e',
  '1587829741301-dc798b83add3',
  '1496181133206-80ce9b88a853',
]

function imgHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Product photo gallery with verified high-resolution images. */
export function productImages(slug: string, count = 4): string[] {
  const ids = PRODUCT_IMAGES[slug]
  if (ids && ids.length > 0) {
    return Array.from({ length: count }, (_, i) => unsplash(ids[i % ids.length], 600, 600))
  }
  return Array.from({ length: count }, (_, i) =>
    unsplash(DEFAULT_FALLBACK_IMAGES[imgHash(`${slug}-${i}`) % DEFAULT_FALLBACK_IMAGES.length], 600, 600)
  )
}

const COLORS = ['#101828', '#465fff', '#f04438', '#12b76a', '#fdb022', '#ffffff']
const SIZES_CLOTHES = ['S', 'M', 'L', 'XL', 'XXL']
const SIZES_SHOES = ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']
const SIZES_NONE: string[] = []

const sampleReviews = (rating: number) => [
  { author: 'Aarav Patel', rating: Math.min(5, Math.round(rating)), date: '2026-04-12', comment: 'Outstanding product! Exceeded my expectations. Fast delivery across India!' },
  { author: 'Sneha Sharma', rating: Math.max(3, Math.round(rating) - 1), date: '2026-03-28', comment: 'Great build quality for the price in INR. Safe packaging and quick delivery.' },
  { author: 'Vikram Malhotra', rating: 5, date: '2026-03-02', comment: 'Loved it! Arrived safely packed and works perfectly.' },
]

type Seed = {
  name: string
  slug: string
  price: number
  priceOld?: number
  category: string
  brand: string
  rating: number
  reviewsCount: number
  stock: number
  sizes: string[]
  flags?: Partial<Pick<Product, 'featured' | 'bestseller' | 'isNew' | 'trending' | 'specialOffer'>>
}

const seeds: Seed[] = [
  // --- Electronics ---
  { name: 'NovaSound Pro Wireless Headphones', slug: 'fone-novasound-pro', price: 2499.00, priceOld: 4999.00, category: 'eletronicos', brand: 'NovaSound', rating: 4.7, reviewsCount: 214, stock: 32, sizes: SIZES_NONE, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },
  { name: 'Pulse X2 Smart Fitness Watch', slug: 'smartwatch-pulse-x2', price: 4499.00, priceOld: 7999.00, category: 'eletronicos', brand: 'Pulse', rating: 4.5, reviewsCount: 158, stock: 18, sizes: SIZES_NONE, flags: { featured: true, isNew: true, trending: true, specialOffer: true } },
  { name: 'BoomGo Outdoor Bluetooth Speaker', slug: 'caixa-som-boomgo', price: 1699.00, priceOld: 2999.00, category: 'eletronicos', brand: 'BoomGo', rating: 4.3, reviewsCount: 96, stock: 54, sizes: SIZES_NONE, flags: { bestseller: true, specialOffer: true } },
  { name: 'KeyForge RGB Mechanical Keyboard', slug: 'teclado-keyforge-rgb', price: 3499.00, priceOld: 5499.00, category: 'eletronicos', brand: 'KeyForge', rating: 4.8, reviewsCount: 312, stock: 7, sizes: SIZES_NONE, flags: { featured: true, trending: true } },
  { name: 'StreamCam 4K UHD Pro Webcam', slug: 'webcam-streamcam-4k', price: 3199.00, priceOld: 4999.00, category: 'eletronicos', brand: 'StreamCam', rating: 4.2, reviewsCount: 44, stock: 15, sizes: SIZES_NONE },
  { name: 'Precision Pro RGB Gaming Mouse', slug: 'mouse-precision-pro', price: 1499.00, priceOld: 2499.00, category: 'eletronicos', brand: 'KeyForge', rating: 4.8, reviewsCount: 145, stock: 24, sizes: SIZES_NONE, flags: { featured: true, trending: true, specialOffer: true } },
  { name: 'Infinity UltraSlim 15.6" Laptop', slug: 'notebook-ultraslim-infinity', price: 52999.00, priceOld: 64999.00, category: 'eletronicos', brand: 'InfinityTech', rating: 4.9, reviewsCount: 88, stock: 12, sizes: SIZES_NONE, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },
  { name: 'AirBeats Pro TWS Wireless Earbuds', slug: 'fone-tws-airbeats', price: 1799.00, priceOld: 3499.00, category: 'eletronicos', brand: 'NovaSound', rating: 4.6, reviewsCount: 310, stock: 65, sizes: SIZES_NONE, flags: { bestseller: true, isNew: true, trending: true, specialOffer: true } },
  { name: 'Pulse Tab Pro 11" 128GB Tablet', slug: 'tablet-pro-retina', price: 26999.00, priceOld: 32999.00, category: 'eletronicos', brand: 'Pulse', rating: 4.7, reviewsCount: 112, stock: 19, sizes: SIZES_NONE, flags: { featured: true } },
  { name: 'ViewMax 27" 165Hz Gaming Monitor', slug: 'monitor-ultrawide-165hz', price: 18499.00, priceOld: 24999.00, category: 'eletronicos', brand: 'ViewMax', rating: 4.8, reviewsCount: 76, stock: 15, sizes: SIZES_NONE, flags: { featured: true, isNew: true, trending: true, specialOffer: true } },
  { name: 'AeroTech 4K UHD Aerial Drone', slug: 'drone-aerial-4k', price: 22999.00, priceOld: 29999.00, category: 'eletronicos', brand: 'AeroTech', rating: 4.5, reviewsCount: 52, stock: 11, sizes: SIZES_NONE, flags: { isNew: true, trending: true } },
  { name: 'Nova X Pro 5G Smartphone 256GB', slug: 'smartphone-nova-x-pro', price: 27999.00, priceOld: 34999.00, category: 'eletronicos', brand: 'Pulse', rating: 4.9, reviewsCount: 420, stock: 35, sizes: SIZES_NONE, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },

  // --- Fashion ---
  { name: 'Essential Cotton Crewneck T-Shirt', slug: 'camiseta-essential', price: 599.00, priceOld: 999.00, category: 'moda', brand: 'Essential', rating: 4.6, reviewsCount: 187, stock: 120, sizes: SIZES_CLOTHES, flags: { bestseller: true, trending: true, specialOffer: true } },
  { name: 'UrbanFlow All-Weather Windbreaker', slug: 'jaqueta-urbanflow', price: 1999.00, priceOld: 2999.00, category: 'moda', brand: 'UrbanFlow', rating: 4.4, reviewsCount: 72, stock: 23, sizes: SIZES_CLOTHES, flags: { featured: true } },
  { name: 'Denim Co. Stretch Slim Jeans', slug: 'calca-jeans-denim', price: 1499.00, priceOld: 2499.00, category: 'moda', brand: 'Denim Co.', rating: 4.1, reviewsCount: 58, stock: 41, sizes: SIZES_CLOTHES, flags: { specialOffer: true } },
  { name: 'Primavera Printed Floral Dress', slug: 'vestido-floral', price: 1799.00, priceOld: 2599.00, category: 'moda', brand: 'Primavera', rating: 4.7, reviewsCount: 134, stock: 16, sizes: SIZES_CLOTHES, flags: { isNew: true, trending: true } },
  { name: 'Streetwear Heavyweight Fleece Hoodie', slug: 'moletom-streetwear', price: 1599.00, priceOld: 2299.00, category: 'moda', brand: 'UrbanFlow', rating: 4.6, reviewsCount: 89, stock: 30, sizes: SIZES_CLOTHES, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },
  { name: 'Essential Slim Fit Oxford Shirt', slug: 'camisa-social-slim', price: 1199.00, priceOld: 1899.00, category: 'moda', brand: 'Essential', rating: 4.3, reviewsCount: 47, stock: 25, sizes: SIZES_CLOTHES },

  // --- Home & Decor ---
  { name: 'Aurora Minimalist LED Desk Lamp', slug: 'luminaria-aurora', price: 1299.00, priceOld: 1999.00, category: 'casa', brand: 'Aurora', rating: 4.5, reviewsCount: 89, stock: 38, sizes: SIZES_NONE, flags: { featured: true, specialOffer: true } },
  { name: 'Chef Master 5-Piece Granite Cookware', slug: 'panelas-chef-master', price: 3499.00, priceOld: 5499.00, category: 'casa', brand: 'Chef Master', rating: 4.8, reviewsCount: 203, stock: 12, sizes: SIZES_NONE, flags: { bestseller: true, trending: true, specialOffer: true } },
  { name: 'Aconchego Plush Throw Blanket', slug: 'manta-aconchego', price: 899.00, priceOld: 1499.00, category: 'casa', brand: 'Aconchego', rating: 4.6, reviewsCount: 67, stock: 75, sizes: SIZES_NONE },
  { name: 'ZenAir Ultrasonic Aroma Diffuser', slug: 'difusor-zenair', price: 799.00, priceOld: 1299.00, category: 'casa', brand: 'ZenAir', rating: 4.3, reviewsCount: 51, stock: 60, sizes: SIZES_NONE, flags: { isNew: true } },
  { name: 'Barista Gourmet Espresso Machine', slug: 'cafeteira-espresso', price: 4999.00, priceOld: 6999.00, category: 'casa', brand: 'Chef Master', rating: 4.7, reviewsCount: 115, stock: 14, sizes: SIZES_NONE, flags: { featured: true, trending: true, specialOffer: true } },
  { name: 'Velvet Plush Decor Cushions (Set of 2)', slug: 'almofada-velvet', price: 699.00, priceOld: 1199.00, category: 'casa', brand: 'Aconchego', rating: 4.4, reviewsCount: 42, stock: 45, sizes: SIZES_NONE },

  // --- Sports & Fitness ---
  { name: 'SpeedRun Pro Performance Shoes', slug: 'tenis-speedrun', price: 2999.00, priceOld: 4999.00, category: 'esportes', brand: 'SpeedRun', rating: 4.7, reviewsCount: 298, stock: 26, sizes: SIZES_SHOES, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },
  { name: 'HydroFit 1L Stainless Steel Bottle', slug: 'garrafa-hydrofit', price: 699.00, priceOld: 1199.00, category: 'esportes', brand: 'HydroFit', rating: 4.5, reviewsCount: 142, stock: 88, sizes: SIZES_NONE, flags: { specialOffer: true } },
  { name: 'PowerLift Adjustable Dumbbell Set', slug: 'halteres-powerlift', price: 3999.00, priceOld: 5999.00, category: 'esportes', brand: 'PowerLift', rating: 4.8, reviewsCount: 76, stock: 9, sizes: SIZES_NONE, flags: { featured: true, trending: true } },
  { name: 'Adventure Trail 30L Hiking Backpack', slug: 'mochila-trail-30l', price: 2199.00, priceOld: 3199.00, category: 'esportes', brand: 'Adventure', rating: 4.4, reviewsCount: 63, stock: 34, sizes: SIZES_NONE, flags: { isNew: true } },
  { name: 'EcoGrip 6mm Anti-Slip Yoga Mat', slug: 'tapete-yoga', price: 999.00, priceOld: 1499.00, category: 'esportes', brand: 'HydroFit', rating: 4.6, reviewsCount: 84, stock: 50, sizes: SIZES_NONE },

  // --- Beauty & Personal Care ---
  { name: 'Glow Vitamin C Illuminating Serum', slug: 'serum-glow-vitc', price: 899.00, priceOld: 1399.00, category: 'beleza', brand: 'Glow', rating: 4.6, reviewsCount: 221, stock: 47, sizes: SIZES_NONE, flags: { bestseller: true, trending: true, specialOffer: true } },
  { name: 'Pure Daily Routine 4-Step Skincare', slug: 'kit-pure-routine', price: 2199.00, priceOld: 3299.00, category: 'beleza', brand: 'Pure', rating: 4.7, reviewsCount: 95, stock: 21, sizes: SIZES_NONE, flags: { featured: true } },
  { name: 'Essência Noir Eau De Parfum 100ml', slug: 'perfume-noir', price: 2499.00, priceOld: 3999.00, category: 'beleza', brand: 'Essência', rating: 4.5, reviewsCount: 118, stock: 15, sizes: SIZES_NONE, flags: { trending: true, specialOffer: true } },
  { name: 'IonDry Pro Ionic Salon Hair Dryer', slug: 'secador-iondry', price: 1899.00, priceOld: 2799.00, category: 'beleza', brand: 'IonDry', rating: 4.3, reviewsCount: 54, stock: 28, sizes: SIZES_NONE, flags: { isNew: true } },
  { name: 'Velvet Matte Long-Stay Lipstick', slug: 'batom-matte-velvet', price: 499.00, priceOld: 799.00, category: 'beleza', brand: 'Glow', rating: 4.5, reviewsCount: 73, stock: 62, sizes: SIZES_NONE },

  // --- Accessories ---
  { name: 'Horizon UV400 Polarized Sunglasses', slug: 'oculos-horizon', price: 1299.00, priceOld: 1999.00, category: 'acessorios', brand: 'Horizon', rating: 4.4, reviewsCount: 87, stock: 43, sizes: SIZES_NONE, flags: { featured: true, specialOffer: true } },
  { name: 'Heritage Handcrafted Leather Wallet', slug: 'carteira-heritage', price: 899.00, priceOld: 1499.00, category: 'acessorios', brand: 'Heritage', rating: 4.6, reviewsCount: 109, stock: 56, sizes: SIZES_NONE, flags: { bestseller: true, trending: true } },
  { name: 'Metro 15.6" Padded Laptop Backpack', slug: 'mochila-metro-15', price: 1799.00, priceOld: 2499.00, category: 'acessorios', brand: 'Metro', rating: 4.5, reviewsCount: 132, stock: 30, sizes: SIZES_NONE, flags: { trending: true, specialOffer: true } },
  { name: 'Urban Style Snapback Cap', slug: 'bone-urban-style', price: 499.00, priceOld: 899.00, category: 'acessorios', brand: 'Horizon', rating: 4.3, reviewsCount: 39, stock: 48, sizes: SIZES_NONE },

  // --- Footwear ---
  { name: 'StreetClassic Urban White Sneakers', slug: 'tenis-streetclassic', price: 1999.00, priceOld: 2999.00, category: 'calcados', brand: 'SpeedRun', rating: 4.6, reviewsCount: 142, stock: 35, sizes: SIZES_SHOES, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },
  { name: 'Royal Derby Formal Leather Shoes', slug: 'sapato-royal-derby', price: 3299.00, priceOld: 4999.00, category: 'calcados', brand: 'Heritage', rating: 4.8, reviewsCount: 88, stock: 20, sizes: SIZES_SHOES, flags: { isNew: true } },
  { name: 'Comfort Slide Everyday Sandals', slug: 'sandalia-slide-comfort', price: 799.00, priceOld: 1299.00, category: 'calcados', brand: 'Essential', rating: 4.3, reviewsCount: 53, stock: 40, sizes: SIZES_SHOES, flags: { specialOffer: true } },

  // --- Grocery & Gourmet ---
  { name: 'Royal Heritage Aged Basmati Rice 5kg', slug: 'arroz-basmati-royal', price: 699.00, priceOld: 899.00, category: 'mercado', brand: 'Chef Master', rating: 4.8, reviewsCount: 310, stock: 80, sizes: SIZES_NONE, flags: { featured: true, bestseller: true, trending: true } },
  { name: 'Organic Pure Wildflower Honey 500g', slug: 'mel-organico-puro', price: 449.00, priceOld: 599.00, category: 'mercado', brand: 'Essência', rating: 4.7, reviewsCount: 165, stock: 65, sizes: SIZES_NONE, flags: { isNew: true, trending: true, specialOffer: true } },
  { name: 'Premium Roasted California Almonds 500g', slug: 'castanhas-almonds-500g', price: 799.00, priceOld: 1099.00, category: 'mercado', brand: 'Pure', rating: 4.9, reviewsCount: 220, stock: 50, sizes: SIZES_NONE, flags: { featured: true, bestseller: true, trending: true, specialOffer: true } },
  { name: 'Himalayan Organic Green Tea 100g', slug: 'cha-verde-himalaya', price: 349.00, priceOld: 499.00, category: 'mercado', brand: 'ZenAir', rating: 4.6, reviewsCount: 114, stock: 90, sizes: SIZES_NONE },
]

export const products: Product[] = seeds.map((s, i) => ({
  id: i + 1,
  name: s.name,
  slug: s.slug,
  price: s.price,
  priceOld: s.priceOld,
  category: s.category,
  brand: s.brand,
  rating: s.rating,
  reviewsCount: s.reviewsCount,
  stock: s.stock,
  description: `${s.name} from premium brand ${s.brand}. High quality genuine build, backed with 12 months comprehensive warranty and fast safe delivery across India.`,
  variants: {
    colors: COLORS.slice(0, 4),
    sizes: s.sizes,
  },
  specs: [
    { label: 'Brand', value: s.brand },
    { label: 'Warranty', value: '12 Months National' },
    { label: 'Origin', value: 'India' },
    { label: 'SKU', value: `ABC-SKU-${1000 + i}` },
  ],
  reviews: sampleReviews(s.rating),
  ...s.flags,
  createdAt: new Date(2026, 0, 1 + i * 2).toISOString(),
  images: productImages(s.slug, 4),
}))

export const brands = Array.from(new Set(products.map((p) => p.brand))).sort()

export const priceBounds = {
  min: Math.floor(Math.min(...products.map((p) => p.price))),
  max: Math.ceil(Math.max(...products.map((p) => p.price))),
}

export function findProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function relatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit)
}
