interface Props {
  questions: string[]
  onSelect: (question: string) => void
  disabled?: boolean
}

export default function SuggestedQuestions({ questions, onSelect, disabled }: Props) {
  if (!questions.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(q)}
          className="rounded-full border border-themed bg-white px-2.5 py-1 text-[11px] font-medium text-body transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-brand-500/15"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
