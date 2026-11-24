import type { ChatMessageItem } from '@/services/chatbotService'
import ChatMarkdown from './ChatMarkdown'
import ProductRecommendationCard from './ProductRecommendationCard'
import OrderSummaryCard from './OrderSummaryCard'
import ProductComparison from './ProductComparison'
import ChatActionConfirmation from './ChatActionConfirmation'

interface Props {
  item: ChatMessageItem
  onConfirmAction: (messageId: string, confirmed: boolean) => Promise<void>
  onNavigate?: () => void
}

export default function ChatMessage({ item, onConfirmAction, onNavigate }: Props) {
  const isUser = item.role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {item.content && (
        <div
          className={`max-w-[92%] overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
            isUser
              ? 'whitespace-pre-wrap rounded-br-md bg-brand-500 text-white'
              : 'rounded-bl-md border border-themed bg-gray-50 text-heading dark:bg-gray-800/80'
          }`}
        >
          {isUser ? item.content : <ChatMarkdown content={item.content} onNavigate={onNavigate} />}
        </div>
      )}

      {!isUser && item.orders && item.orders.length > 0 && (
        <div className="mt-2 w-full space-y-2">
          {item.orders.map((ord) => (
            <OrderSummaryCard key={`${item.id}-ord-${ord.id}`} order={ord} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {!isUser && item.products && item.products.length > 0 && (
        <div className="mt-2 w-full space-y-2">
          {item.products.map((prod) => (
            <ProductRecommendationCard key={`${item.id}-${prod.id}`} product={prod} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {!isUser && item.comparison && (
        <div className="w-full">
          <ProductComparison comparison={item.comparison} onNavigate={onNavigate} />
        </div>
      )}

      {!isUser && item.pendingAction && (
        <div className="w-full">
          <ChatActionConfirmation
            action={item.pendingAction}
            status={item.actionStatus ?? 'pending'}
            onDecision={(confirmed) => onConfirmAction(item.id, confirmed)}
          />
        </div>
      )}
    </div>
  )
}
