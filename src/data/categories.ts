import type { Category } from './types'

export const categories: Category[] = [
  {
    id: 9,
    slug: 'mobiles',
    name: 'Mobiles',
    icon: 'package',
    description: 'Flagship, 5G, gaming, foldable, camera & budget smartphones',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 1,
    slug: 'eletronicos',
    name: 'Electronics',
    icon: 'package',
    description: 'Gadgets, audio, computing & accessories',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 2,
    slug: 'moda',
    name: 'Fashion',
    icon: 'tag',
    description: 'Apparel, western & ethnic wear',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 3,
    slug: 'casa',
    name: 'Home & Decor',
    icon: 'home',
    description: 'Kitchen, furnishings & living spaces',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 4,
    slug: 'esportes',
    name: 'Sports & Fitness',
    icon: 'zap',
    description: 'Gym equipment, outdoor & sportswear',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 5,
    slug: 'beleza',
    name: 'Beauty & Care',
    icon: 'star',
    description: 'Skincare, grooming & fragrances',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 6,
    slug: 'acessorios',
    name: 'Accessories',
    icon: 'gift',
    description: 'Watches, bags, wallets & eyewear',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 7,
    slug: 'calcados',
    name: 'Footwear',
    icon: 'truck',
    description: 'Sneakers, formal shoes & sports trainers',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop&q=80',
  },
  {
    id: 8,
    slug: 'mercado',
    name: 'Grocery & Gourmet',
    icon: 'shopping-bag',
    description: 'Organics, staples, tea & gourmet treats',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop&q=80',
  },
]

export function findCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug)
}
