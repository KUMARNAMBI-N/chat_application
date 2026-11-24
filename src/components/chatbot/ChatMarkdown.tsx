import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  onNavigate?: () => void
}

function safeUrlTransform(url: string): string {
  const trimmed = (url || '').trim()
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:')
  ) {
    return trimmed
  }
  return ''
}

function SafeMarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false)
  const cleanSrc = safeUrlTransform(src || '')
  if (!cleanSrc || failed) return null
  return (
    <img
      src={cleanSrc}
      alt={alt || 'Product'}
      loading="lazy"
      onError={() => setFailed(true)}
      className="my-2 max-h-40 max-w-full rounded-lg border border-themed object-cover"
    />
  )
}

export default function ChatMarkdown({ content, onNavigate }: Props) {
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrlTransform}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-3 mb-1 text-base font-bold text-heading">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-2.5 mb-1 text-sm font-bold text-heading">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-xs font-bold uppercase tracking-wide text-heading">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-2 mb-0.5 text-xs font-semibold text-heading">{children}</h4>
          ),
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-heading">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-brand-400 pl-3 text-muted italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2.5 border-themed" />,
          code: ({ className, children }) => {
            const isBlock = Boolean(className)
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-gray-900 p-2.5 font-mono text-xs text-gray-100">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-xs text-heading dark:bg-gray-700">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-themed">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-themed px-2.5 py-1.5 font-semibold text-heading">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-themed px-2.5 py-1.5 text-body">{children}</td>
          ),
          a: ({ href, children }) => {
            const safeHref = safeUrlTransform(href || '')
            if (!safeHref) return <span>{children}</span>
            // Convert internal ABC Cart links to SPA navigation
            const localMatch = safeHref.match(/^https?:\/\/(?:www\.)?abccart\.(?:com|in)(\/.*)$/i)
            const internalPath = safeHref.startsWith('/') ? safeHref : localMatch?.[1]
            if (internalPath) {
              return (
                <Link
                  to={internalPath}
                  onClick={onNavigate}
                  className="font-medium text-brand-600 underline decoration-brand-400 underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                >
                  {children}
                </Link>
              )
            }
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 underline decoration-brand-400 underline-offset-2 hover:text-brand-700 dark:text-brand-400"
              >
                {children}
              </a>
            )
          },
          img: ({ src, alt }) => <SafeMarkdownImage src={src} alt={alt} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
