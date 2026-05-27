export function ThinkingIndicator({ active }: { active: boolean }) {
  if (!active) {
    return null
  }

  return (
    <div className="relative inline-flex overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-zinc-300">
      <span className="thinking-sheen absolute inset-0" aria-hidden="true" />
      <span className="relative">thinking....</span>
    </div>
  )
}
