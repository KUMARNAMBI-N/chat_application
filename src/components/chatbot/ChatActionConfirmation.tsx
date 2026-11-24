import { useState } from 'react'
import type { ChatPendingAction } from '@/services/chatbotService'
import { formatPrice } from '@/lib/format'

interface Props {
  action: ChatPendingAction
  status: 'pending' | 'confirmed' | 'cancelled'
  onDecision: (confirmed: boolean) => Promise<void>
}

export default function ChatActionConfirmation({ action, status, onDecision }: Props) {
  const [busy, setBusy] = useState(false)

  async function handle(confirmed: boolean) {
    setBusy(true)
    try {
      await onDecision(confirmed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="font-semibold text-heading">{action.title}</p>
      <p className="mt-1 text-body">{action.summary}</p>
      {action.payload?.price != null && (
        <p className="mt-1 text-[11px] font-medium text-muted">
          Price: {formatPrice(Number(action.payload.price))} · Qty: {action.payload.quantity ?? 1}
        </p>
      )}

      {status === 'pending' ? (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handle(true)}
            className="flex-1 rounded-lg bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? 'Processing...' : 'Confirm'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handle(false)}
            className="flex-1 rounded-lg border border-themed bg-white px-3 py-1.5 font-medium text-body hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
          {status === 'confirmed' ? '✓ Action confirmed' : '✕ Action cancelled'}
        </p>
      )}
    </div>
  )
}
