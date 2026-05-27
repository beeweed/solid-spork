import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Separator from '@radix-ui/react-separator'
import { SendHorizonal } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { ThinkingIndicator } from '@/components/workspace/thinking-indicator'
import type { TranscriptMessage } from '@/types'

interface ChatPanelProps {
  messages: TranscriptMessage[]
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
  currentIteration: number
  maxIterations: number
  activeModel: string
  providerLabel: string
  streaming: boolean
  thinking: boolean
  error: string | null
}

export function ChatPanel({
  messages,
  draft,
  onDraftChange,
  onSubmit,
  currentIteration,
  maxIterations,
  activeModel,
  providerLabel,
  streaming,
  thinking,
  error,
}: ChatPanelProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const emptyState = useMemo(
    () => (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center text-sm leading-7 text-zinc-500">
        Start with a request such as creating a project structure, reading an existing file, or generating code into the local browser workspace.
      </div>
    ),
    [],
  )

  return (
    <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-[2rem] border border-white/10 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 pb-4 pt-1">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Live session</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Production ReAct agent</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{providerLabel}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{activeModel || 'No model selected'}</span>
          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-red-100">
            Iteration {currentIteration} / {maxIterations}
          </span>
        </div>
      </div>

      <Separator.Root className="mb-4 h-px bg-white/8" />

      <ScrollArea.Root className="min-h-0 overflow-hidden">
        <ScrollArea.Viewport ref={viewportRef} className="h-full max-w-full pr-3">
          <div className="space-y-7 pb-6">
            {messages.length ? (
              messages.map((message) => (
                <article key={message.id} className="max-w-full space-y-3">
                  {message.role === 'user' ? (
                    <div className="ml-auto max-w-[90%] break-words rounded-[1.6rem] rounded-br-md border border-red-400/20 bg-red-500/12 px-5 py-4 text-sm leading-7 text-red-50 shadow-[0_12px_48px_rgba(239,68,68,0.1)] sm:max-w-[78%]">
                      {message.content}
                    </div>
                  ) : (
                    <div className="max-w-full space-y-3">
                      <div className="break-words text-sm leading-7 whitespace-pre-wrap text-zinc-100">{message.content || (message.status === 'streaming' ? '' : ' ')}</div>
                      {message.chips.length ? (
                        <div className="flex flex-wrap gap-2">
                          {message.chips.map((chip) => (
                            <div
                              key={chip.id}
                              className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                                chip.status === 'error'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                  : chip.status === 'done'
                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                                    : 'border-white/10 bg-white/5 text-zinc-200'
                              }`}
                            >
                              <span className="uppercase tracking-[0.18em]">{chip.label}</span>
                              <span className="truncate text-zinc-300">{chip.path}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </article>
              ))
            ) : (
              emptyState
            )}
            <ThinkingIndicator active={thinking} />
            {error ? <div className="max-w-full break-words rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-2 touch-none p-0.5" orientation="vertical">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <div className="pt-4">
        <Separator.Root className="mb-4 h-px bg-white/8" />
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-black/70 p-3 sm:flex-row sm:items-end">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSubmit()
              }
            }}
            rows={4}
            placeholder="Ask the agent to read, create, or rewrite files in browser storage..."
            className="min-h-[7.5rem] flex-1 resize-none rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-zinc-600 focus:border-red-400/60"
          />
          <Button
            type="button"
            onClick={onSubmit}
            disabled={streaming || !draft.trim()}
            className="h-12 rounded-[1.2rem] bg-red-500 px-5 text-white hover:bg-red-400 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <SendHorizonal className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </section>
  )
}
