export function ThinkingIndicator({ active }: { active: boolean }) {
  if (!active) {
    return null
  }

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <div className="flex items-center gap-1 px-3 py-2">
        <div className="w-2 h-2 rounded-full bg-primary thinking-dot"></div>
        <div className="w-2 h-2 rounded-full bg-primary thinking-dot"></div>
        <div className="w-2 h-2 rounded-full bg-primary thinking-dot"></div>
      </div>
    </div>
  )
}
