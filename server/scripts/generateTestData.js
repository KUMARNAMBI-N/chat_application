import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg

// Parse CLI flags (e.g. --customers=1000 --products=1000 --orders=2000)
function parseArgs(argv) {
  const opts = {
    customers: 1000,
    products: 1000,
    addresses: 1500,
    orders: 2000,
    reviews: 1000,
    carts: 550,
    wishlists: 550,
  }
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([a-zA-Z0-9_-]+)=(\d+)$/)
    if (m && m[1] in opts) {
      opts[m[1]] = Number(m[2])
    }
  }
  return opts
}

// Deterministic PRNG (Mulberry32) so datasets are reproducible & well-distributed
function createRng(seed = 20261121) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = createRng(20261121)
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(rng() * arr.length)]

function weightedPick(entries) {
  const r = rng()
  let acc = 0
  for (const [val, weight] of entries) {
    acc += weight
    if (r <= acc) return val
  }
  return entries[entries.length - 1][0]
}

function randomPastDate(daysBack = 365) {
  const now = Date.now()
  const offsetMs = Math.floor(rng() * daysBack * 24 * 60 * 60 * 1000)
  return new Date(now - offsetMs)
}

// Bulk parameterized multi-row insert helper
async function batchInsert(client, table, columns, rows, { chunkSize = 300, onConflict = '', returning = '' } = {}) {
  if (!rows.length) return []
  const returned = []
  const colList = columns.join(', ')

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const values = []
    const placeholders = chunk.map((row, rowIdx) => {
      const base = rowIdx * columns.length
      const ph = columns.map((_, colIdx) => {
        values.push(row[colIdx])
        return `$${base + colIdx + 1}`
      })
      return `(${ph.join(', ')})`
    })

    const sql = `INSERT INTO ${table} (${colList}) VALUES ${placeholders.join(', ')}${onConflict ? ` ${onConflict}` : ''}${returning ? ` RETURNING ${returning}` : ''}`
    const res = await client.query(sql, values)
    if (returning) {
      returned.push(...res.rows)
    }
  }
  return returned
}

// ---------------------------------------------------------------------------
// Realistic Domain Dictionaries (India-focused e-commerce)
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Rahul', 'Rohan', 'Karthik', 'Vikram', 'Nikhil', 'Siddharth', 'Pranav', 'Harsh', 'Varun', 'Manish',
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Myra', 'Kavya', 'Priya', 'Sneha', 'Meera', 'Divya',
  'Shreya', 'Pooja', 'Neha', 'Riya', 'Nandini', 'Lakshmi', 'Swathi', 'Aishwarya', 'Deepika', 'Tanvi',
  'Suresh', 'Ramesh', 'Ganesh', 'Aravind', 'Vignesh', 'Senthil', 'Prakash', 'Mahesh', 'Naveen', 'Ashwin',
  'Bhavana', 'Keerthi', 'Pavithra', 'Revathi', 'Gayathri', 'Harini', 'Sruthi', 'Vidya', 'Nithya', 'Aparna',
]

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Kumar', 'Reddy', 'Nair', 'Patel', 'Verma', 'Gupta', 'Singh', 'Mehta',
  'Joshi', 'Kulkarni', 'Deshmukh', 'Pillai', 'Menon', 'Subramanian', 'Krishnan', 'Rajan', 'Sundaram', 'Venkatesh',
  'Chatterjee', 'Banerjee', 'Roy', 'Das', 'Bose', 'Mishra', 'Tiwari', 'Pandey', 'Agarwal', 'Bansal',
  'Malhotra', 'Kapoor', 'Khanna', 'Bhatia', 'Rao', 'Naidu', 'Choudhary', 'Shetty', 'Hegde', 'Gowda',
]

const INDIAN_LOCATIONS = [
  { city: 'Bengaluru', state: 'Karnataka', pinBase: 560001, pinRange: 95, localities: ['Indiranagar', 'Koramangala', 'Whitefield', 'Jayanagar', 'HSR Layout', 'Electronic City', 'Malleshwaram', 'BTM Layout'] },
  { city: 'Chennai', state: 'Tamil Nadu', pinBase: 600001, pinRange: 95, localities: ['Adyar', 'Anna Nagar', 'Velachery', 'T. Nagar', 'Mylapore', 'OMR Sholinganallur', 'Porur', 'Tambaram'] },
  { city: 'Hyderabad', state: 'Telangana', pinBase: 500001, pinRange: 90, localities: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur', 'Kondapur', 'Kukatpally', 'Secunderabad', 'Begumpet'] },
  { city: 'Mumbai', state: 'Maharashtra', pinBase: 400001, pinRange: 98, localities: ['Bandra West', 'Andheri East', 'Powai', 'Juhu', 'Dadar', 'Lower Parel', 'Malad West', 'Borivali'] },
  { city: 'Pune', state: 'Maharashtra', pinBase: 411001, pinRange: 60, localities: ['Koregaon Park', 'Hinjewadi', 'Baner', 'Kothrud', 'Viman Nagar', 'Wakad', 'Aundh', 'Hadapsar'] },
  { city: 'Delhi', state: 'Delhi', pinBase: 110001, pinRange: 92, localities: ['Green Park', 'Saket', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Vasant Kunj', 'Hauz Khas', 'Janakpuri'] },
  { city: 'Coimbatore', state: 'Tamil Nadu', pinBase: 641001, pinRange: 45, localities: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Saibaba Colony', 'Race Course', 'Saravanampatti', 'Singanallur'] },
  { city: 'Madurai', state: 'Tamil Nadu', pinBase: 625001, pinRange: 25, localities: ['KK Nagar', 'Anna Nagar', 'SS Colony', 'Tallakulam', 'Goripalayam', 'Thirunagar'] },
  { city: 'Kochi', state: 'Kerala', pinBase: 682001, pinRange: 35, localities: ['Edappally', 'Kakkanad', 'MG Road', 'Vyttila', 'Fort Kochi', 'Palarivattom', 'Kaloor'] },
  { city: 'Kolkata', state: 'West Bengal', pinBase: 700001, pinRange: 95, localities: ['Salt Lake', 'Park Street', 'Ballygunge', 'New Town', 'Behala', 'Jadavpur', 'Alipore'] },
  { city: 'Ahmedabad', state: 'Gujarat', pinBase: 380001, pinRange: 60, localities: ['Navrangpura', 'Satellite', 'SG Highway', 'Bopal', 'Prahlad Nagar', 'Vastrapur', 'Maninagar'] },
  { city: 'Jaipur', state: 'Rajasthan', pinBase: 302001, pinRange: 35, localities: ['Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Mansarovar', 'Raja Park', 'Tonk Road'] },
  { city: 'Lucknow', state: 'Uttar Pradesh', pinBase: 226001, pinRange: 30, localities: ['Gomti Nagar', 'Hazratganj', 'Indira Nagar', 'Aliganj', 'Alambagh', 'Mahanagar'] },
  { city: 'Tirunelveli', state: 'Tamil Nadu', pinBase: 627001, pinRange: 15, localities: ['Palayamkottai', 'Vannarpettai', 'Melapalayam', 'NGO Colony', 'Tirunelveli Town', 'Maharaja Nagar'] },
  { city: 'Tenkasi', state: 'Tamil Nadu', pinBase: 627801, pinRange: 18, localities: ['Courtallam Road', 'Shencottai', 'Sankarankovil Road', 'Kadayanallur', 'Alangulam', 'Surandai'] },
]

const APARTMENTS = [
  'Green Heights', 'Sunrise Residency', 'Lotus Enclave', 'Emerald Towers', 'Palm Grove Apartments',
  'Prestige Parkview', 'Royal Courtyard', 'Silver Oak Villas', 'Lakeview Terrace', 'Skyline Plaza',
  'Harmony Homes', 'Shanti Niketan', 'Gokul Dham', 'Saffron Residency', 'Orchid Gardens',
]

const STREETS = [
  'MG Road', 'Station Road', 'Temple Street', 'Main Cross Road', 'Ring Road',
  'Bazaar Street', 'Park Avenue', 'Nehru Street', 'Gandhi Salai', 'Lake Road',
  'College Road', 'Bypass Road', 'Cathedral Road', 'High School Road', 'Market Lane',
]

const LANDMARKS = [
  'Near Metro Station', 'Opposite City Hospital', 'Next to Central Mall', 'Near Post Office',
  'Behind Bus Stand', 'Near Public Park', 'Opposite State Bank', 'Near National College',
  'Adjacent to Tech Park', 'Near Railway Crossing',
]

const CATEGORY_CATALOG = {
  eletronicos: {
    brands: ['NovaSound', 'Pulse', 'BoomGo', 'KeyForge', 'StreamCam', 'InfinityTech', 'ViewMax', 'AeroTech', 'VoltEdge', 'SonicCore'],
    adjectives: ['Pro', 'Ultra', 'Wireless', 'Smart', 'Compact', 'HD', 'Turbo', 'Studio', 'Acoustic', 'Ergonomic', 'NextGen', 'Stealth'],
    items: [
      'Bluetooth Headphones', 'ANC Earbuds', 'Smart Fitness Watch', 'Mechanical Gaming Keyboard', 'Portable Bluetooth Speaker',
      '4K UHD Webcam', 'RGB Wireless Mouse', 'USB-C Fast Charger 65W', 'Power Bank 20000mAh', 'Portable SSD 1TB',
      'IPS Gaming Monitor 27"', 'Ultrabook Laptop 15.6"', 'Android Tablet 11"', 'Noise Cancelling Headset', 'Smart Home Hub',
      'Action Camera 4K', 'Condenser Podcast Mic', 'Wi-Fi 6 Dual-Band Router', 'Smart LED Strip Kit', 'GaN Travel Adapter',
    ],
    priceRange: [699, 54999],
    colors: ['Matte Black', 'Silver', 'Midnight Blue', 'Graphite Grey', 'Pearl White'],
    sizes: ['Standard', 'Compact', 'Pro Edition'],
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop&q=80',
    ],
  },
  moda: {
    brands: ['Essential', 'UrbanFlow', 'Denim Co.', 'Primavera', 'Vastra', 'KalaCraft', 'ThreadLine', 'IndiWear'],
    adjectives: ['Premium Cotton', 'Oversized', 'Slim Fit', 'Classic', 'Breezy Linen', 'Printed', 'Tailored', 'Relaxed', 'Handloom', 'All-Season'],
    items: [
      'Crewneck T-Shirt', 'Oxford Button-Down Shirt', 'Stretch Denim Jeans', 'Fleece Pullover Hoodie', 'Floral Maxi Dress',
      'Cotton Kurta Set', 'Chino Trousers', 'All-Weather Windbreaker', 'Polo Collar T-Shirt', 'Denim Trucker Jacket',
      'Pleated Midi Skirt', 'Athleisure Joggers', 'Festive Silk Kurta', 'Casual Linen Shirt', 'Knit Cardigan Sweater',
    ],
    priceRange: [399, 4499],
    colors: ['Navy Blue', 'Charcoal', 'Olive Green', 'Ivory White', 'Maroon', 'Mustard Yellow'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=80',
    ],
  },
  casa: {
    brands: ['Aurora', 'Chef Master', 'Aconchego', 'ZenAir', 'HomeCraft', 'VedaLiving', 'KitchPro'],
    adjectives: ['Minimalist', 'Artisan', 'Non-Stick', 'Nordic', 'Ceramic', 'Stainless Steel', 'Plush', 'Bamboo', 'Modern', 'Eco'],
    items: [
      'LED Desk Lamp', 'Granite Cookware Set', 'Throw Blanket', 'Ultrasonic Aroma Diffuser', 'Espresso Coffee Maker',
      'Velvet Cushion Covers (Set of 2)', 'Insulated Lunch Box', 'Electric Kettle 1.8L', 'Cotton Bedsheet Queen',
      'Spice Rack Organizer', 'Ceramic Dinner Set (12-Pc)', 'Wall Mounted Shelf', 'Blackout Curtains Pair', 'Air Fryer 4.5L',
    ],
    priceRange: [349, 7999],
    colors: ['Warm Beige', 'Matte White', 'Walnut Brown', 'Slate Grey', 'Sage Green'],
    sizes: ['Standard', 'Large', 'Family Pack'],
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80',
    ],
  },
  esportes: {
    brands: ['SpeedRun', 'HydroFit', 'PowerLift', 'Adventure', 'FlexPro', 'PeakGear'],
    adjectives: ['Pro', 'Heavy-Duty', 'Anti-Slip', 'Insulated', 'Lightweight', 'Endurance', 'Trail', 'Flex'],
    items: [
      'Stainless Steel Water Bottle 1L', 'Adjustable Dumbbell Set', 'Hiking Backpack 30L', '6mm TPE Yoga Mat',
      'Resistance Bands Kit', 'Skipping Jump Rope', 'Badminton Racquet Pair', 'Gym Duffel Bag',
      'Foam Massage Roller', 'Cycling Helmet', 'Cricket Leather Ball Set', 'Ab Wheel Roller', 'Wrist Support Wraps',
    ],
    priceRange: [299, 6499],
    colors: ['Obsidian Black', 'Electric Blue', 'Crimson Red', 'Neon Green', 'Steel Grey'],
    sizes: ['Standard', 'Medium', 'Large'],
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop&q=80',
    ],
  },
  beleza: {
    brands: ['Glow', 'Pure', 'Essencia', 'IonDry', 'Botanica', 'AyurVeda', 'Lumina'],
    adjectives: ['Hydrating', 'Illuminating', 'Organic', 'Botanical', 'Dermatologist-Tested', 'Salon Pro', 'Velvet', 'Herbal'],
    items: [
      'Vitamin C Face Serum 30ml', 'Daily Skincare Kit', 'Eau De Parfum 100ml', 'Ionic Hair Dryer',
      'Matte Long-Stay Lipstick', 'SPF 50 Gel Sunscreen', 'Niacinamide Face Wash', 'Argan Hair Oil 200ml',
      'Beard Grooming Trimmer', 'Aloe Vera Soothing Gel', 'Charcoal Detox Mask', 'Shea Butter Body Lotion',
    ],
    priceRange: [249, 3999],
    colors: ['Natural', 'Rose Gold', 'Amber', 'Classic'],
    sizes: ['50ml', '100ml', '200ml', 'Full Kit'],
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop&q=80',
    ],
  },
  acessorios: {
    brands: ['Horizon', 'Heritage', 'Metro', 'CraftHide', 'ChronoX', 'VogueBag'],
    adjectives: ['Handcrafted', 'Polarized', 'RFID-Protected', 'Padded', 'Classic', 'Minimalist', 'Vintage', 'Executive'],
    items: [
      'UV400 Aviator Sunglasses', 'Genuine Leather Wallet', '15.6" Laptop Backpack', 'Snapback Baseball Cap',
      'Women Casual Handbag', 'Analog Chronograph Watch', 'Reversible Leather Belt', 'Crossbody Sling Bag',
      'Hard-Shell Cabin Trolley', 'Passport Travel Organizer', 'Canvas Tote Bag', 'Blue-Light Computer Glasses',
    ],
    priceRange: [349, 5999],
    colors: ['Tan Brown', 'Jet Black', 'Cognac', 'Navy', 'Burgundy'],
    sizes: ['One Size', 'Medium', 'Large'],
    images: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop&q=80',
    ],
  },
  calcados: {
    brands: ['SpeedRun', 'Heritage', 'Essential', 'StrideMax', 'UrbanStep', 'WalkCraft'],
    adjectives: ['Breathable', 'Cushioned', 'Handstitched', 'Lightweight', 'Everyday', 'Street', 'Pro', 'Memory-Foam'],
    items: [
      'Running Shoes', 'Urban White Sneakers', 'Formal Derby Leather Shoes', 'Comfort Slide Sandals',
      'Canvas Low-Top Sneakers', 'Trekking Outdoor Boots', 'Slip-On Walking Shoes', 'Loafer Driving Moccasins',
      'Cross-Training Gym Shoes', 'Ethnic Leather Kolhapuri', 'Mesh Sports Trainers',
    ],
    priceRange: [499, 5499],
    colors: ['White', 'Black', 'Tan', 'Navy Blue', 'Grey'],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop&q=80',
    ],
  },
  mercado: {
    brands: ['Chef Master', 'Essencia', 'Pure', 'ZenAir', 'FarmFresh', 'DesiHarvest', 'SpiceRoute'],
    adjectives: ['Organic', 'Farm-Fresh', 'Aged', 'Cold-Pressed', 'Himalayan', 'Artisanal', 'Roasted', 'Pure'],
    items: [
      'Basmati Rice 5kg', 'Wildflower Raw Honey 500g', 'California Almonds 500g', 'Darjeeling Green Tea 100g',
      'Filter Coffee Powder 500g', 'Extra Virgin Olive Oil 1L', 'A2 Bilona Cow Ghee 500ml', 'Kashmiri Saffron 2g',
      'Whole Cashew Nuts W240 500g', 'Rolled Oats 1kg', 'Peanut Butter Crunchy 1kg', 'Malabar Black Pepper 250g',
    ],
    priceRange: [199, 2499],
    colors: ['Standard Pack'],
    sizes: ['250g', '500g', '1kg', 'Combo Pack'],
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508061252445-5350f3ab0a55?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&h=600&fit=crop&q=80',
    ],
  },
}

const REVIEW_COMMENTS_BY_RATING = {
  5: [
    'Excellent quality for the price. Exceeded my expectations!',
    'Delivery was faster than expected and packaging was super neat.',
    'The product looks exactly like the pictures. Highly recommended.',
    'Super comfortable and totally worth buying. Will order again.',
    'Genuine brand quality, sturdy finish, and great value in INR.',
    'Bought this for my family and everyone loved it. Five stars!',
  ],
  4: [
    'Very good product overall. Slightly delayed delivery but worth the wait.',
    'Good quality for the price. Works smoothly as described.',
    'Nice finish and reliable build. Packaging could be a bit sturdier.',
    'Happy with the purchase. Fits well and looks clean.',
    'Solid value for money. Would definitely consider this brand again.',
  ],
  3: [
    'Decent product for everyday use, nothing extraordinary.',
    'Average build quality, okay for the discounted price.',
    'Looks fine, though the color is slightly different from the photo.',
    'Works as expected, but packaging could be better.',
  ],
  2: [
    'Expected better quality at this price point. Just okay.',
    'Item arrived with a minor scratch on the box. Average experience.',
    'Sizing felt slightly off compared to the chart.',
  ],
  1: [
    'Not satisfied with the material quality. Requested a replacement.',
    'Packaging was damaged during transit and delivery took too long.',
  ],
}

const COUPON_SEEDS = [
  ['WELCOME10', 10, 0, 499, 1],
  ['ABC20', 20, 0, 999, 1],
  ['FESTIVE15', 15, 0, 1499, 1],
  ['SAVE100', 0, 100, 799, 1],
  ['DIWALI25', 25, 0, 2499, 1],
  ['NEWUSER15', 15, 0, 599, 1],
  ['FREESHIP', 0, 49, 299, 1],
  ['SUMMER10', 10, 0, 699, 1],
  ['MONSOON20', 20, 0, 1299, 1],
  ['MEGA500', 0, 500, 4999, 1],
  ['SUPER12', 12, 0, 899, 1],
  ['FLASH15', 15, 0, 999, 1],
  ['VIP25', 25, 0, 3999, 1],
  ['FIRST200', 0, 200, 1199, 1],
  ['WEEKEND10', 10, 0, 499, 1],
  ['PAYDAY15', 15, 0, 1599, 1],
  ['APP10', 10, 0, 499, 1],
  ['TECH500', 0, 500, 7999, 1],
  ['FASHION20', 20, 0, 1499, 1],
  ['EXPIRED10', 10, 0, 499, 0],
]

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const opts = parseArgs(process.argv)
  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || 'abccart',
      })

  const client = await pool.connect()
  const startTime = Date.now()

  try {
    // 1. Safety check: confirm target database is abccart
    const dbCheck = await client.query('SELECT current_database() AS db')
    const currentDb = dbCheck.rows[0].db
    if (currentDb !== 'abccart') {
      throw new Error(`Safety abort: connected to "${currentDb}", expected "abccart".`)
    }
    console.log(`🔒 Connected to PostgreSQL database: ${currentDb}`)

    // Verify existing categories
    const catRes = await client.query('SELECT slug, name FROM categories ORDER BY id ASC')
    if (catRes.rows.length === 0) {
      throw new Error('No categories found. Start the server once so base schema & categories are initialized.')
    }
    const categorySlugs = catRes.rows.map((r) => r.slug).filter((s) => s in CATEGORY_CATALOG)
    console.log(`📂 Found ${categorySlugs.length} categories: ${categorySlugs.join(', ')}`)

    // Pre-compute bcrypt hash once for Test@12345 (safe, fast, compatible with /api/auth/login)
    const testPasswordHash = bcrypt.hashSync('Test@12345', 10)

    await client.query('BEGIN')

    // -----------------------------------------------------------------------
    // 2. Coupons (ensure 20 total without overwriting existing)
    // -----------------------------------------------------------------------
    console.log('🎟️  Seeding coupons...')
    await batchInsert(
      client,
      'coupons',
      ['code', 'discount_percent', 'discount_amount', 'min_order_amount', 'active'],
      COUPON_SEEDS,
      { onConflict: 'ON CONFLICT (code) DO NOTHING' }
    )

    // -----------------------------------------------------------------------
    // 3. Customers (1,000 realistic Indian accounts)
    // -----------------------------------------------------------------------
    console.log(`👥 Seeding ${opts.customers} customers...`)
    const customerRows = []
    for (let i = 1; i <= opts.customers; i++) {
      const first = FIRST_NAMES[(i - 1) % FIRST_NAMES.length]
      const last = LAST_NAMES[Math.floor((i - 1) / FIRST_NAMES.length + i * 7) % LAST_NAMES.length]
      const name = `${first} ${last}`
      const email = `seed_customer${String(i).padStart(4, '0')}@example.com`
      const mobile = `${pick(['98', '97', '96', '95', '94', '93', '91', '90', '89', '88', '70'])}${String(10000000 + ((i * 7919) % 89999999)).slice(0, 8)}`
      const createdAt = randomPastDate(365)
      customerRows.push([name, email, testPasswordHash, mobile, 'customer', createdAt, createdAt])
    }
    await batchInsert(
      client,
      'users',
      ['name', 'email', 'password_hash', 'mobile', 'role', 'created_at', 'updated_at'],
      customerRows,
      { onConflict: 'ON CONFLICT (email) DO NOTHING' }
    )

    const seededUsersRes = await client.query(
      "SELECT id, name, email, mobile FROM users WHERE email LIKE 'seed_customer%@example.com' ORDER BY id ASC"
    )
    const seededUsers = seededUsersRes.rows
    console.log(`   ✔ Available seeded customers: ${seededUsers.length}`)

    // -----------------------------------------------------------------------
    // 4. Products (1,000 realistic INR products across 8 categories)
    // -----------------------------------------------------------------------
    console.log(`📦 Seeding ${opts.products} products...`)
    const productRows = []
    const productMeta = []

    for (let i = 1; i <= opts.products; i++) {
      const catSlug = categorySlugs[(i - 1) % categorySlugs.length]
      const cfg = CATEGORY_CATALOG[catSlug]
      const brand = cfg.brands[(i * 3) % cfg.brands.length]
      const adj = cfg.adjectives[(i * 5) % cfg.adjectives.length]
      const item = cfg.items[(i * 7) % cfg.items.length]
      const edition = i > 200 ? ` Series ${((i % 9) + 1)}` : ''
      const name = `${brand} ${adj} ${item}${edition}`
      const sku = `ABC-${catSlug.slice(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`
      const slug = `seed-${slugify(`${brand}-${adj}-${item}`)}-${String(i).padStart(4, '0')}`

      const [minP, maxP] = cfg.priceRange
      const rawPrice = randInt(minP, maxP)
      // Round to realistic Indian retail price ending in 9 or 99
      const price = rawPrice >= 1000 ? Math.floor(rawPrice / 100) * 100 + 99 : Math.floor(rawPrice / 10) * 10 + 9
      const discountPct = pick([0, 10, 15, 20, 25, 30, 35, 40])
      const priceOld = discountPct > 0 ? Math.round((price / (1 - discountPct / 100)) / 10) * 10 - 1 : price
      const rating = Number((3.6 + rng() * 1.4).toFixed(2))
      const reviewsCount = randInt(5, 450)
      const stock = randInt(2, 120)
      const featured = rng() < 0.18 ? 1 : 0
      const bestseller = rng() < 0.2 ? 1 : 0
      const isNew = rng() < 0.22 ? 1 : 0
      const trending = rng() < 0.25 ? 1 : 0
      const specialOffer = discountPct >= 20 ? 1 : 0
      const description = `${name} (SKU: ${sku}) by ${brand}. Crafted for durability and everyday comfort with verified quality assurance, GST invoice, and fast delivery across India.`
      const createdAt = randomPastDate(365)

      productRows.push([
        slug, name, price, Math.max(price, priceOld), catSlug, brand,
        rating, reviewsCount, stock, description,
        featured, bestseller, isNew, trending, specialOffer, createdAt,
      ])
      productMeta.push({ slug, catSlug, price, stock, cfg })
    }

    await batchInsert(
      client,
      'products',
      [
        'slug', 'name', 'price', 'price_old', 'category_slug', 'brand',
        'rating', 'reviews_count', 'stock', 'description',
        'featured', 'bestseller', 'is_new', 'trending', 'special_offer', 'created_at',
      ],
      productRows,
      { onConflict: 'ON CONFLICT (slug) DO NOTHING' }
    )

    const seededProductsRes = await client.query(
      "SELECT id, slug, name, price, stock, category_slug FROM products WHERE slug LIKE 'seed-%' ORDER BY id ASC"
    )
    const seededProducts = seededProductsRes.rows
    const prodBySlug = new Map(seededProducts.map((p) => [p.slug, p]))
    console.log(`   ✔ Available seeded products: ${seededProducts.length}`)

    // -----------------------------------------------------------------------
    // 5. Product Images (2-3 per product -> ~2,500), Variants (~2,500), Inventory (1,000)
    // -----------------------------------------------------------------------
    const existingSeedImages = await client.query(
      "SELECT COUNT(*) AS c FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE p.slug LIKE 'seed-%'"
    )
    if (Number(existingSeedImages.rows[0].c) === 0) {
      console.log('🖼️  Seeding product images, variants, and inventory...')
      const imageRows = []
      const variantRows = []
      const inventoryRows = []

      for (const meta of productMeta) {
        const prod = prodBySlug.get(meta.slug)
        if (!prod) continue
        const { cfg } = meta

        // 2-3 images per product
        const imgCount = randInt(2, 3)
        for (let k = 0; k < imgCount; k++) {
          const url = cfg.images[(prod.id + k) % cfg.images.length]
          imageRows.push([prod.id, url, k])
        }

        // 2-3 variants per product
        const varCount = randInt(2, 3)
        for (let v = 0; v < varCount; v++) {
          const color = cfg.colors[(prod.id + v) % cfg.colors.length]
          const size = cfg.sizes[(prod.id + v) % cfg.sizes.length]
          const varStock = randInt(5, 45)
          const priceOverride = v === 0 ? null : Number(prod.price) + pick([0, 0, 100, 200])
          variantRows.push([prod.id, color, size, varStock, priceOverride])
        }

        // 1 inventory row per product
        inventoryRows.push([prod.id, prod.stock, randInt(0, Math.min(5, prod.stock)), 10])
      }

      await batchInsert(client, 'product_images', ['product_id', 'image_url', 'sort_order'], imageRows)
      await batchInsert(client, 'product_variants', ['product_id', 'color', 'size', 'stock', 'price_override'], variantRows)
      await batchInsert(
        client,
        'inventory',
        ['product_id', 'quantity', 'reserved', 'low_stock_threshold'],
        inventoryRows,
        { onConflict: 'ON CONFLICT (product_id) DO NOTHING' }
      )
      console.log(`   ✔ Inserted ${imageRows.length} images, ${variantRows.length} variants, ${inventoryRows.length} inventory rows`)
    } else {
      console.log('   ⏭️  Seeded product images/variants/inventory already present, skipping.')
    }

    // -----------------------------------------------------------------------
    // 6. Indian Addresses (1,500 addresses for seeded customers)
    // -----------------------------------------------------------------------
    const existingSeedAddresses = await client.query(
      "SELECT COUNT(*) AS c FROM addresses a JOIN users u ON a.user_id = u.id WHERE u.email LIKE 'seed_customer%@example.com'"
    )
    if (Number(existingSeedAddresses.rows[0].c) === 0) {
      console.log(`🏠 Seeding ${opts.addresses} Indian customer addresses...`)
      const addressRows = []
      for (let i = 0; i < opts.addresses; i++) {
        const user = seededUsers[i % seededUsers.length]
        const isDefault = i < seededUsers.length ? 1 : 0
        const loc = pick(INDIAN_LOCATIONS)
        const locality = pick(loc.localities)
        const flatNo = `${pick(['Flat', 'House', 'Door', 'Plot'])} ${randInt(101, 909)}, ${pick(APARTMENTS)}`
        const street = `${randInt(1, 140)} ${pick(STREETS)}, ${locality}`
        const landmark = pick(LANDMARKS)
        const pinCode = String(loc.pinBase + randInt(0, loc.pinRange))
        const createdAt = randomPastDate(365)

        addressRows.push([
          user.id, user.name, user.mobile, flatNo, street, landmark,
          loc.city, loc.state, pinCode, 'India', isDefault, createdAt,
        ])
      }
      await batchInsert(
        client,
        'addresses',
        ['user_id', 'full_name', 'mobile', 'address_line1', 'address_line2', 'landmark', 'city', 'state', 'pin_code', 'country', 'is_default', 'created_at'],
        addressRows
      )
      console.log(`   ✔ Inserted ${addressRows.length} addresses`)
    } else {
      console.log('   ⏭️  Seeded addresses already present, skipping.')
    }

    const userAddressesRes = await client.query(
      "SELECT a.user_id, a.full_name, a.mobile, a.address_line1, a.city, a.state, a.pin_code FROM addresses a JOIN users u ON a.user_id = u.id WHERE u.email LIKE 'seed_customer%@example.com' ORDER BY a.is_default DESC, a.id ASC"
    )
    const addrByUser = new Map()
    for (const a of userAddressesRes.rows) {
      if (!addrByUser.has(a.user_id)) addrByUser.set(a.user_id, a)
    }

    // -----------------------------------------------------------------------
    // 7. Orders (2,000), Order Items (~5,000), Payments (2,000)
    // -----------------------------------------------------------------------
    const existingSeedOrders = await client.query(
      "SELECT COUNT(*) AS c FROM orders WHERE order_number LIKE 'SEED-ORD-%'"
    )
    if (Number(existingSeedOrders.rows[0].c) === 0) {
      console.log(`🧾 Seeding ${opts.orders} orders, order items, and payments...`)
      const orderRows = []
      const pendingOrderItems = []
      const pendingPayments = []

      const statusWeights = [
        ['Delivered', 0.56],
        ['Shipped', 0.12],
        ['Out for Delivery', 0.06],
        ['Processing', 0.10],
        ['Confirmed', 0.06],
        ['Pending', 0.05],
        ['Cancelled', 0.05],
      ]
      const paymentMethods = ['UPI', 'Card', 'Net Banking', 'COD']

      for (let i = 1; i <= opts.orders; i++) {
        const user = seededUsers[randInt(0, seededUsers.length - 1)]
        const addr = addrByUser.get(user.id)
        const shippingAddress = addr
          ? `${addr.full_name}, ${addr.address_line1}, ${addr.city}, ${addr.state} - ${addr.pin_code} (Ph: ${addr.mobile})`
          : `${user.name}, MG Road, Bengaluru, Karnataka - 560001 (Ph: ${user.mobile})`

        const orderNumber = `SEED-ORD-${String(i).padStart(6, '0')}`
        const itemCount = weightedPick([[1, 0.2], [2, 0.3], [3, 0.28], [4, 0.14], [5, 0.08]])
        const pickedIds = new Set()
        const itemsForOrder = []
        let subtotal = 0

        for (let k = 0; k < itemCount; k++) {
          let prod = seededProducts[randInt(0, seededProducts.length - 1)]
          while (pickedIds.has(prod.id)) {
            prod = seededProducts[randInt(0, seededProducts.length - 1)]
          }
          pickedIds.add(prod.id)
          const qty = weightedPick([[1, 0.65], [2, 0.25], [3, 0.10]])
          const unitPrice = Number(prod.price)
          subtotal += unitPrice * qty
          const cfg = CATEGORY_CATALOG[prod.category_slug]
          itemsForOrder.push({
            productId: prod.id,
            productName: prod.name,
            price: unitPrice,
            quantity: qty,
            color: pick(cfg.colors),
            size: pick(cfg.sizes),
            imageUrl: pick(cfg.images),
          })
        }

        subtotal = Math.round(subtotal * 100) / 100
        const discountRate = weightedPick([[0, 0.55], [0.1, 0.25], [0.15, 0.12], [0.2, 0.08]])
        const discount = Math.round(subtotal * discountRate * 100) / 100
        const shipping = subtotal >= 499 ? 0 : 49
        const gst = Math.round(subtotal * 0.18 * 100) / 100
        const total = Math.round((subtotal - discount + shipping) * 100) / 100

        const status = weightedPick(statusWeights)
        const paymentMethod = pick(paymentMethods)
        let paymentStatus = 'Paid'
        if (status === 'Cancelled') paymentStatus = paymentMethod === 'COD' ? 'Failed' : 'Refunded'
        else if (status === 'Pending' || (paymentMethod === 'COD' && status !== 'Delivered')) paymentStatus = 'Pending'

        const createdAt = randomPastDate(365)

        orderRows.push([
          orderNumber, user.id, user.name, user.email, user.mobile,
          subtotal, discount, shipping, gst, total, 'INR',
          status, paymentMethod, paymentStatus, shippingAddress, createdAt,
        ])
        pendingOrderItems.push({ orderNumber, items: itemsForOrder })
        pendingPayments.push({
          orderNumber,
          transactionId: `TXN-SEED-${String(i).padStart(6, '0')}`,
          amount: total,
          paymentMethod,
          status: paymentStatus,
          createdAt,
        })
      }

      const insertedOrders = await batchInsert(
        client,
        'orders',
        [
          'order_number', 'user_id', 'customer_name', 'customer_email', 'customer_mobile',
          'subtotal', 'discount', 'shipping', 'gst', 'total', 'currency',
          'status', 'payment_method', 'payment_status', 'shipping_address', 'created_at',
        ],
        orderRows,
        { onConflict: 'ON CONFLICT (order_number) DO NOTHING', returning: 'id, order_number' }
      )

      const orderIdByNum = new Map(insertedOrders.map((o) => [o.order_number, o.id]))

      const orderItemRows = []
      for (const entry of pendingOrderItems) {
        const orderId = orderIdByNum.get(entry.orderNumber)
        if (!orderId) continue
        for (const it of entry.items) {
          orderItemRows.push([
            orderId, it.productId, it.productName, it.price,
            it.quantity, it.color, it.size, it.imageUrl,
          ])
        }
      }

      const paymentRows = []
      for (const p of pendingPayments) {
        const orderId = orderIdByNum.get(p.orderNumber)
        if (!orderId) continue
        paymentRows.push([orderId, p.transactionId, p.amount, 'INR', p.paymentMethod, p.status, p.createdAt])
      }

      await batchInsert(
        client,
        'order_items',
        ['order_id', 'product_id', 'product_name', 'price', 'quantity', 'color', 'size', 'image_url'],
        orderItemRows
      )
      await batchInsert(
        client,
        'payments',
        ['order_id', 'transaction_id', 'amount', 'currency', 'payment_method', 'status', 'created_at'],
        paymentRows,
        { onConflict: 'ON CONFLICT (transaction_id) DO NOTHING' }
      )
      console.log(`   ✔ Inserted ${insertedOrders.length} orders, ${orderItemRows.length} order items, ${paymentRows.length} payments`)
    } else {
      console.log('   ⏭️  Seeded orders/items/payments already present, skipping.')
    }

    // -----------------------------------------------------------------------
    // 8. Product Reviews (1,000 reviews with 40/30/15/10/5 rating distribution)
    // -----------------------------------------------------------------------
    const existingSeedReviews = await client.query(
      "SELECT COUNT(*) AS c FROM reviews r JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'seed_customer%@example.com'"
    )
    if (Number(existingSeedReviews.rows[0].c) === 0) {
      console.log(`⭐ Seeding ${opts.reviews} product reviews...`)
      const reviewRows = []
      const ratingWeights = [[5, 0.40], [4, 0.30], [3, 0.15], [2, 0.10], [1, 0.05]]

      for (let i = 0; i < opts.reviews; i++) {
        const user = seededUsers[randInt(0, seededUsers.length - 1)]
        const prod = seededProducts[randInt(0, seededProducts.length - 1)]
        const rating = weightedPick(ratingWeights)
        const comment = pick(REVIEW_COMMENTS_BY_RATING[rating])
        const createdAt = randomPastDate(330)
        reviewRows.push([prod.id, user.id, user.name, rating, comment, createdAt])
      }

      await batchInsert(
        client,
        'reviews',
        ['product_id', 'user_id', 'author_name', 'rating', 'comment', 'created_at'],
        reviewRows
      )
      console.log(`   ✔ Inserted ${reviewRows.length} reviews`)
    } else {
      console.log('   ⏭️  Seeded reviews already present, skipping.')
    }

    // -----------------------------------------------------------------------
    // 9. Carts (550: 450 customer + 100 guest) & Cart Items (~1,300+)
    // -----------------------------------------------------------------------
    const existingSeedCarts = await client.query(
      "SELECT COUNT(*) AS c FROM carts WHERE session_id LIKE 'seed_%'"
    )
    if (Number(existingSeedCarts.rows[0].c) === 0) {
      console.log(`🛒 Seeding ${opts.carts} carts and cart items...`)
      const guestCount = Math.min(100, Math.floor(opts.carts * 0.2))
      const authCount = Math.min(opts.carts - guestCount, seededUsers.length)
      const cartRows = []

      for (let i = 0; i < authCount; i++) {
        const user = seededUsers[i]
        const ts = randomPastDate(30)
        cartRows.push([user.id, `seed_auth_${user.id}`, ts, ts])
      }
      for (let g = 1; g <= guestCount; g++) {
        const ts = randomPastDate(14)
        cartRows.push([null, `seed_guest_${String(g).padStart(4, '0')}`, ts, ts])
      }

      const insertedCarts = await batchInsert(
        client,
        'carts',
        ['user_id', 'session_id', 'created_at', 'updated_at'],
        cartRows,
        { returning: 'id' }
      )

      const cartItemRows = []
      for (const c of insertedCarts) {
        const numItems = randInt(1, 4)
        const used = new Set()
        for (let k = 0; k < numItems; k++) {
          let prod = seededProducts[randInt(0, seededProducts.length - 1)]
          while (used.has(prod.id)) {
            prod = seededProducts[randInt(0, seededProducts.length - 1)]
          }
          used.add(prod.id)
          const qty = Math.min(prod.stock, randInt(1, 3))
          const cfg = CATEGORY_CATALOG[prod.category_slug]
          cartItemRows.push([c.id, prod.id, Math.max(1, qty), pick(cfg.colors), pick(cfg.sizes), randomPastDate(14)])
        }
      }

      await batchInsert(
        client,
        'cart_items',
        ['cart_id', 'product_id', 'quantity', 'color', 'size', 'created_at'],
        cartItemRows
      )
      console.log(`   ✔ Inserted ${insertedCarts.length} carts and ${cartItemRows.length} cart items`)
    } else {
      console.log('   ⏭️  Seeded carts & cart items already present, skipping.')
    }

    // -----------------------------------------------------------------------
    // 10. Wishlists (550) & Wishlist Items (~1,800+)
    // -----------------------------------------------------------------------
    const existingSeedWishlists = await client.query(
      "SELECT COUNT(*) AS c FROM wishlists w JOIN users u ON w.user_id = u.id WHERE u.email LIKE 'seed_customer%@example.com'"
    )
    if (Number(existingSeedWishlists.rows[0].c) === 0) {
      console.log(`❤️  Seeding ${opts.wishlists} wishlists and wishlist items...`)
      const wlCount = Math.min(opts.wishlists, seededUsers.length)
      const wlRows = []
      for (let i = 0; i < wlCount; i++) {
        wlRows.push([seededUsers[i].id, randomPastDate(180)])
      }

      const insertedWishlists = await batchInsert(
        client,
        'wishlists',
        ['user_id', 'created_at'],
        wlRows,
        { onConflict: 'ON CONFLICT (user_id) DO NOTHING', returning: 'id' }
      )

      const wlItemRows = []
      for (const w of insertedWishlists) {
        const numItems = randInt(2, 5)
        const used = new Set()
        for (let k = 0; k < numItems; k++) {
          let prod = seededProducts[randInt(0, seededProducts.length - 1)]
          while (used.has(prod.id)) {
            prod = seededProducts[randInt(0, seededProducts.length - 1)]
          }
          used.add(prod.id)
          wlItemRows.push([w.id, prod.id, randomPastDate(120)])
        }
      }

      await batchInsert(
        client,
        'wishlist_items',
        ['wishlist_id', 'product_id', 'created_at'],
        wlItemRows,
        { onConflict: 'ON CONFLICT (wishlist_id, product_id) DO NOTHING' }
      )
      console.log(`   ✔ Inserted ${insertedWishlists.length} wishlists and ${wlItemRows.length} wishlist items`)
    } else {
      console.log('   ⏭️  Seeded wishlists & wishlist items already present, skipping.')
    }

    await client.query('COMMIT')

    // -----------------------------------------------------------------------
    // 11. Final Table Counts & Integrity Verification
    // -----------------------------------------------------------------------
    const countQuery = `
      SELECT 'roles' AS table_name, COUNT(*)::int AS row_count FROM roles
      UNION ALL SELECT 'users', COUNT(*)::int FROM users
      UNION ALL SELECT 'categories', COUNT(*)::int FROM categories
      UNION ALL SELECT 'products', COUNT(*)::int FROM products
      UNION ALL SELECT 'product_images', COUNT(*)::int FROM product_images
      UNION ALL SELECT 'product_variants', COUNT(*)::int FROM product_variants
      UNION ALL SELECT 'inventory', COUNT(*)::int FROM inventory
      UNION ALL SELECT 'addresses', COUNT(*)::int FROM addresses
      UNION ALL SELECT 'orders', COUNT(*)::int FROM orders
      UNION ALL SELECT 'order_items', COUNT(*)::int FROM order_items
      UNION ALL SELECT 'payments', COUNT(*)::int FROM payments
      UNION ALL SELECT 'reviews', COUNT(*)::int FROM reviews
      UNION ALL SELECT 'carts', COUNT(*)::int FROM carts
      UNION ALL SELECT 'cart_items', COUNT(*)::int FROM cart_items
      UNION ALL SELECT 'wishlists', COUNT(*)::int FROM wishlists
      UNION ALL SELECT 'wishlist_items', COUNT(*)::int FROM wishlist_items
      UNION ALL SELECT 'coupons', COUNT(*)::int FROM coupons
      ORDER BY table_name;
    `
    const counts = await client.query(countQuery)
    let grandTotal = 0
    console.log('\n📊 Final PostgreSQL Record Counts (abccart):')
    for (const row of counts.rows) {
      grandTotal += row.row_count
      console.log(`   ${row.table_name.padEnd(20)} : ${row.row_count.toLocaleString()}`)
    }
    console.log(`   ${'TOTAL RECORDS'.padEnd(20)} : ${grandTotal.toLocaleString()}`)
    console.log(`\n✅ Completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('❌ Seed failed and rolled back:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
