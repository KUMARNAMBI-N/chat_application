import { useState } from 'react'
import ChatWindow from './ChatWindow'

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
          <ChatWindow onMinimize={() => setOpen(false)} onClose={() => setOpen(false)} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI shopping assistant' : 'Open AI shopping assistant'}
        className="group flex h-14 items-center gap-2.5 rounded-full bg-brand-500 px-5 text-white shadow-theme-xl transition-all duration-200 hover:scale-105 hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 10h.01" />
          <path d="M12 10h.01" />
          <path d="M16 10h.01" />
        </svg>
        <span className="hidden text-sm font-semibold sm:inline">
          {open ? 'Hide AI' : 'AI Assistant'}
        </span>
      </button>
    </div>
  )
}
