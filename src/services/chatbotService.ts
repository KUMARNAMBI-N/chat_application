export interface ChatProductCard {
  id: number
  slug: string
  name: string
  brand: string
  category: string
  price: number
  price_old?: number | null
  discount_percent: number
  rating: number
  reviews_count: number
  stock: number
  in_stock: boolean
  image: string
  product_url: string
  reason?: string | null
}

export interface ChatComparisonRow {
  feature: string
  values: string[]
}

export interface ChatComparisonData {
  products: ChatProductCard[]
  rows: ChatComparisonRow[]
  verdict?: string | null
}

export interface ChatPendingAction {
  action_id: string
  action_type: 'add_to_cart' | 'update_cart_quantity' | 'remove_from_cart'
  title: string
  summary: string
  payload: Record<string, any>
}

export interface ChatOrderItem {
  product_name: string
  quantity: number
  price: number
  color?: string | null
  size?: string | null
  image_url?: string | null
}

export interface ChatOrderCard {
  id: number
  order_number: string
  status: string
  created_at: string
  payment_method: string
  payment_status: string
  total: number
  shipping_address?: string | null
  items: ChatOrderItem[]
}

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: ChatProductCard[]
  orders?: ChatOrderCard[]
  comparison?: ChatComparisonData | null
  pendingAction?: ChatPendingAction | null
  actionStatus?: 'pending' | 'confirmed' | 'cancelled'
  timestamp: string
}

export interface ConversationSummary {
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

const CHATBOT_BASE = '/ai'

function getGuestSessionId(): string {
  const key = 'abccart_chat_session'
  let sid = localStorage.getItem(key)
  if (!sid) {
    sid = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(key, sid)
  }
  return sid
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Session-Id': getGuestSessionId(),
  }
  try {
    const raw = localStorage.getItem('abccart_auth')
    if (raw) {
      const token = JSON.parse(raw)?.state?.token
      if (token) headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // ignore storage errors
  }
  return headers
}

export interface StreamCallbacks {
  onMeta?: (conversationId: string) => void
  onStatus?: (status: string) => void
  onToken?: (chunk: string) => void
  onProducts?: (products: ChatProductCard[]) => void
  onOrders?: (orders: ChatOrderCard[]) => void
  onComparison?: (comparison: ChatComparisonData) => void
  onConfirmation?: (action: ChatPendingAction) => void
  onDone?: (payload: { conversation_id: string; suggested_questions?: string[]; degraded?: boolean }) => void
  onError?: (message: string) => void
}

export async function streamChatMessage(
  message: string,
  conversationId: string | null,
  language: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      language,
    }),
    signal,
  })

  if (!res.ok) {
    let errText = `Chat service error (${res.status})`
    try {
      const j = await res.json()
      errText = j.detail || j.error || errText
    } catch {
      // keep default
    }
    throw new Error(errText)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Streaming is not supported in this browser.')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      if (!block.trim()) continue
      let eventName = 'message'
      let dataStr = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
      }
      if (!dataStr) continue
      try {
        const data = JSON.parse(dataStr)
        if (eventName === 'meta' && data.conversation_id) callbacks.onMeta?.(data.conversation_id)
        else if (eventName === 'status' && data.message) callbacks.onStatus?.(data.message)
        else if (eventName === 'token' && typeof data.content === 'string') callbacks.onToken?.(data.content)
        else if (eventName === 'products' && Array.isArray(data.products)) callbacks.onProducts?.(data.products)
        else if (eventName === 'orders' && Array.isArray(data.orders)) callbacks.onOrders?.(data.orders)
        else if (eventName === 'comparison') callbacks.onComparison?.(data)
        else if (eventName === 'confirmation') callbacks.onConfirmation?.(data)
        else if (eventName === 'done') callbacks.onDone?.(data)
        else if (eventName === 'error') callbacks.onError?.(data.message || 'Unknown error')
      } catch {
        // ignore malformed SSE chunk
      }
    }
  }
}

export async function confirmChatAction(
  conversationId: string,
  action: ChatPendingAction,
  confirmed: boolean
): Promise<{ success: boolean; message: string; data?: Record<string, any> }> {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/confirm-action`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      conversation_id: conversationId,
      action_id: action.action_id,
      action_type: action.action_type,
      payload: action.payload,
      confirmed,
    }),
  })
  if (!res.ok) {
    throw new Error('Could not process confirmation.')
  }
  return res.json()
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${CHATBOT_BASE}/api/conversations`, { headers: getAuthHeaders() })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchConversationDetail(conversationId: string): Promise<{
  conversation_id: string
  messages: Array<{ role: 'user' | 'assistant'; content: string; metadata?: Record<string, any>; created_at: string }>
} | null> {
  try {
    const res = await fetch(`${CHATBOT_BASE}/api/conversations/${encodeURIComponent(conversationId)}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    const res = await fetch(`${CHATBOT_BASE}/api/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch {
    return false
  }
}
