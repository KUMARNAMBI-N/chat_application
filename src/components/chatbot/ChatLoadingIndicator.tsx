interface Props {
  status: string
}

export default function ChatLoadingIndicator({ status }: Props) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-themed bg-gray-50 px-3.5 py-2.5 text-xs text-muted dark:bg-gray-800/80">
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
      </span>
      <span>{status || 'Thinking...'}</span>
    </div>
  )
}
