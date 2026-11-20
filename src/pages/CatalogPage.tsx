import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SortKey } from '@/data/types'
import Breadcrumb from '@/components/ui/Breadcrumb'
import CatalogView from '@/components/catalog/CatalogView'
import PromoCarousel from '@/components/common/PromoCarousel'

export default function CatalogPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const sort = (params.get('sort') as SortKey) || 'relevance'

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Promotional Carousel directly below navigation bar */}
      <PromoCarousel />

      {/* Breadcrumb and Page Header */}
      <div>
        <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('catalog.title') }]} />
        <h1 className="mt-3 text-2xl font-bold text-heading sm:text-3xl">{t('catalog.title')}</h1>
      </div>

      {/* Product Catalog Listing with Filters & Sorting */}
      <CatalogView initialSort={sort} />
    </div>
  )
}
