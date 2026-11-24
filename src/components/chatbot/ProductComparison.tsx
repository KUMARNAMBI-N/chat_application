import { Link } from 'react-router-dom'
import type { ChatComparisonData } from '@/services/chatbotService'

interface Props {
  comparison: ChatComparisonData
  onNavigate?: () => void
}

export default function ProductComparison({ comparison, onNavigate }: Props) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-themed bg-white text-xs dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-themed bg-gray-50 dark:bg-gray-800/70">
              <th className="px-2.5 py-2 font-semibold text-muted">Feature</th>
              {comparison.products.map((p) => (
                <th key={p.id} className="px-2.5 py-2 font-semibold text-heading">
                  <Link
                    to={p.product_url || `/produto/${p.slug}`}
                    onClick={onNavigate}
                    className="line-clamp-2 hover:text-brand-600"
                  >
                    {p.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.feature} className="border-b border-themed last:border-b-0">
                <td className="whitespace-nowrap px-2.5 py-2 font-medium text-muted">{row.feature}</td>
                {row.values.map((val, idx) => (
                  <td key={idx} className="px-2.5 py-2 text-body">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {comparison.verdict && (
        <div className="border-t border-themed bg-brand-50/60 px-3 py-2 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          Verdict: {comparison.verdict}
        </div>
      )}
    </div>
  )
}
