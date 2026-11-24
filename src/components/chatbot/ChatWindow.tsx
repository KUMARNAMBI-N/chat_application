import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  confirmChatAction,
  deleteConversation,
  fetchConversationDetail,
  fetchConversations,
  streamChatMessage,
  type ChatMessageItem,
  type ConversationSummary,
} from '@/services/chatbotService'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ChatLoadingIndicator from './ChatLoadingIndicator'
import SuggestedQuestions from './SuggestedQuestions'
import IconBase from '@/components/ui/IconBase'

interface Props {
  onMinimize: () => void
  onClose: () => void
}

const INITIAL_GREETING: ChatMessageItem = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your ABC Cart AI shopping assistant.\n\nI can help you find products, compare options, discover deals, track orders, and make shopping easier.\n\nWhat are you looking for today?",
  timestamp: new Date().toISOString(),
}

const INITIAL_SUGGESTIONS = [
  'Find mobiles under ₹25,000',
  'Compare top two smartphones',
  'Best deals today',
  'Track my order',
  'Help me choose a gift',
]

const ACTIVE_CONV_KEY = 'abccart_active_conv_id'

export default function ChatWindow({ onMinimize, onClose }: Props) {
  const { i18n } = useTranslation()
  const addCartItem = useCartStore((s) => s.addItem)
  const syncCart = useCartStore((s) => s.syncWithServer)
  const notifySuccess = useUiStore((s) => s.notifySuccess)

  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_CONV_KEY)
    } catch {
      return null
    }
  })
  const [messages, setMessages] = useState<ChatMessageItem[]>([INITIAL_GREETING])
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS)
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  function updateActiveConversationId(cid: string | null) {
    setConversationId(cid)
    try {
      if (cid) localStorage.setItem(ACTIVE_CONV_KEY, cid)
      else localStorage.removeItem(ACTIVE_CONV_KEY)
    } catch {
      // ignore storage errors
    }
  }

  // Restore persisted conversation across page refreshes
  useEffect(() => {
    const saved = conversationId
    if (!saved) return
    fetchConversationDetail(saved).then((detail) => {
      if (!detail || !detail.messages?.length) return
      const mapped: ChatMessageItem[] = detail.messages.map((m, idx) => ({
        id: `${detail.conversation_id}-${idx}`,
        role: m.role,
        content: m.content,
        products: m.metadata?.products,
        orders: m.metadata?.orders,
        comparison: m.metadata?.comparison,
        pendingAction: m.metadata?.pending_action,
        actionStatus: m.metadata?.pending_action ? 'confirmed' : undefined,
        timestamp: m.created_at,
      }))
      setMessages(mapped)
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loadingStatus])

  async function loadHistoryList() {
    const list = await fetchConversations()
    setConversations(list)
  }

  async function openConversation(cid: string) {
    const detail = await fetchConversationDetail(cid)
    if (!detail) return
    updateActiveConversationId(detail.conversation_id)
    const mapped: ChatMessageItem[] = detail.messages.map((m, idx) => ({
      id: `${cid}-${idx}`,
      role: m.role,
      content: m.content,
      products: m.metadata?.products,
      orders: m.metadata?.orders,
      comparison: m.metadata?.comparison,
      pendingAction: m.metadata?.pending_action,
      actionStatus: m.metadata?.pending_action ? 'confirmed' : undefined,
      timestamp: m.created_at,
    }))
    setMessages(mapped.length ? mapped : [INITIAL_GREETING])
    setShowHistory(false)
  }

  async function handleClear() {
    if (conversationId) {
      await deleteConversation(conversationId)
    }
    abortRef.current?.abort()
    updateActiveConversationId(null)
    setMessages([INITIAL_GREETING])
    setSuggestions(INITIAL_SUGGESTIONS)
    setError(null)
    setLoadingStatus(null)
    setShowHistory(false)
  }

  async function handleSend(text: string) {
    setError(null)
    setLastUserMessage(text)

    const userMsg: ChatMessageItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const assistantId = `a-${Date.now() + 1}`
    const assistantPlaceholder: ChatMessageItem = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder])
    setLoadingStatus('Understanding your request...')
    setSuggestions([])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChatMessage(
        text,
        conversationId,
        i18n.language || 'en',
        {
          onMeta: (cid) => updateActiveConversationId(cid),
          onStatus: (status) => setLoadingStatus(status),
          onToken: (chunk) => {
            setLoadingStatus(null)
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
            )
          },
          onProducts: (products) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, products } : m))
            )
          },
          onOrders: (orders) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, orders } : m))
            )
          },
          onComparison: (comparison) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, comparison } : m))
            )
          },
          onConfirmation: (action) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, pendingAction: action, actionStatus: 'pending' } : m
              )
            )
          },
          onDone: (payload) => {
            setLoadingStatus(null)
            if (payload.conversation_id) updateActiveConversationId(payload.conversation_id)
            if (payload.suggested_questions?.length) setSuggestions(payload.suggested_questions)
          },
          onError: (msg) => {
            setLoadingStatus(null)
            setError(msg)
          },
        },
        controller.signal
      )
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setLoadingStatus(null)
      setError(err?.message || 'AI assistant is currently unreachable. Please retry.')
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.trim().length > 0))
    }
  }

  async function handleConfirmAction(messageId: string, confirmed: boolean) {
    const target = messages.find((m) => m.id === messageId)
    if (!target?.pendingAction || !conversationId) return

    try {
      const res = await confirmChatAction(conversationId, target.pendingAction, confirmed)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionStatus: confirmed ? 'confirmed' : 'cancelled' } : m
        )
      )

      if (confirmed && res.success) {
        const p = target.pendingAction.payload
        if (target.pendingAction.action_type === 'add_to_cart' && p?.productId) {
          addCartItem(
            {
              productId: Number(p.productId),
              slug: p.slug,
              name: p.name,
              price: Number(p.price),
              image: p.image || '',
              color: p.color,
              size: p.size,
              stock: Number(p.stock ?? 10),
            },
            Number(p.quantity ?? 1)
          )
        } else {
          await syncCart()
        }
        notifySuccess(res.message)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `act-res-${Date.now()}`,
          role: 'assistant',
          content: res.message,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (err: any) {
      setError(err?.message || 'Could not complete cart action.')
    }
  }

  return (
    <div className="flex h-[min(620px,calc(100vh-6rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-themed bg-white shadow-theme-xl dark:bg-gray-dark">
      {/* Header */}
      <div className="flex items-center justify-between bg-brand-500 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-bold">
            AI
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">ABC Cart AI Assistant</h2>
            <p className="text-[11px] text-white/80">Smart shopping, deals & order help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Conversation history"
            onClick={() => {
              const next = !showHistory
              setShowHistory(next)
              if (next) loadHistoryList()
            }}
            className="rounded-lg p-1.5 text-white/85 hover:bg-white/15"
          >
            <IconBase name="clock" size={16} />
          </button>
          <button
            type="button"
            title="Clear conversation"
            onClick={handleClear}
            className="rounded-lg p-1.5 text-white/85 hover:bg-white/15"
          >
            <IconBase name="refresh" size={16} />
          </button>
          <button
            type="button"
            title="Minimize"
            onClick={onMinimize}
            className="rounded-lg p-1.5 text-white/85 hover:bg-white/15"
          >
            <span className="block h-0.5 w-3.5 bg-current" />
          </button>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/85 hover:bg-white/15"
          >
            <IconBase name="x" size={16} />
          </button>
        </div>
      </div>

      {/* Optional Conversation History Drawer */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent Conversations</h3>
            <button
              type="button"
              onClick={() => {
                updateActiveConversationId(null)
                setMessages([INITIAL_GREETING])
                setShowHistory(false)
              }}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              + New Chat
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">No saved conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.conversation_id}
                className="flex items-center justify-between gap-2 rounded-xl border border-themed p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <button
                  type="button"
                  onClick={() => openConversation(c.conversation_id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-semibold text-heading">{c.title}</p>
                  <p className="text-[10px] text-muted">{c.message_count} messages</p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteConversation(c.conversation_id)
                    loadHistoryList()
                  }}
                  className="text-muted hover:text-error-500"
                  title="Delete"
                >
                  <IconBase name="x" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Message Stream */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages
              .filter((m) => m.role === 'user' || m.content || m.products?.length || m.orders?.length || m.comparison || m.pendingAction)
              .map((m) => (
                <ChatMessage
                  key={m.id}
                  item={m}
                  onConfirmAction={handleConfirmAction}
                  onNavigate={onMinimize}
                />
              ))}

            {loadingStatus && <ChatLoadingIndicator status={loadingStatus} />}

            {error && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                <span>{error}</span>
                {lastUserMessage && (
                  <button
                    type="button"
                    onClick={() => handleSend(lastUserMessage)}
                    className="shrink-0 font-semibold underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {!loadingStatus && suggestions.length > 0 && (
              <div className="pt-1">
                <SuggestedQuestions questions={suggestions} onSelect={handleSend} disabled={!!loadingStatus} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={!!loadingStatus} />
        </>
      )}
    </div>
  )
}
