import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useEffect, useRef } from 'react'

import { ThinkingIndicator } from '@/components/workspace/thinking-indicator'
import type { TranscriptMessage } from '@/types'

interface ChatPanelProps {
  messages: TranscriptMessage[]
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
  currentIteration: number
  maxIterations: number
  streaming: boolean
  thinking: boolean
  error: string | null
  onMenuClick: () => void
  onResetClick: () => void
  onSettingsClick: () => void
}

function FileCard({ chip }: { chip: { label: string; path: string; status: string } }) {
  const isDone = chip.status === 'done'
  const isPending = chip.status === 'pending'
  const isError = chip.status === 'error'

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#2a2a2c] border cursor-pointer transition-all duration-200 group ${
        isError
          ? 'border-red-500/20'
          : isPending
            ? 'border-primary/20 animate-pulse'
            : 'border-emerald-500/20 hover:bg-[#323234]'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isError ? 'bg-red-500/10' : isPending ? 'bg-primary/10' : 'bg-emerald-500/10'
        }`}
      >
        {isDone ? (
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : isPending ? (
          <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{chip.path}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-md ${
              isError
                ? 'bg-red-500/15 text-red-400'
                : isPending
                  ? 'bg-primary/15 text-primary animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {isError ? 'error' : isPending ? 'writing...' : 'created'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{chip.label}</span>
      </div>
      <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

export function ChatPanel({
  messages,
  draft,
  onDraftChange,
  onSubmit,
  currentIteration,
  maxIterations,
  streaming,
  thinking,
  error,
  onMenuClick,
  onResetClick,
  onSettingsClick,
}: ChatPanelProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const isStreaming = (message: TranscriptMessage) =>
    message.role === 'assistant' && message.status === 'streaming'

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#252525] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 lg:hidden"
            title="Chat History"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Vibe Coder</h1>
            <p className="text-[11px] text-muted-foreground">Autonomous AI Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Menu Button (desktop) */}
          <button
            onClick={onMenuClick}
            className="hidden lg:flex p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
            title="Chat History"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Reset Button */}
          <button
            onClick={onResetClick}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
            title="Reset Session"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {/* Settings Button */}
          <button
            onClick={onSettingsClick}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea.Root className="flex-1 min-h-0 overflow-hidden bg-[#1e1e1e]">
        <ScrollArea.Viewport ref={viewportRef} className="h-full">
          <div className="p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Describe what you want to build...</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  <div className="flex gap-3 justify-end animate-fade-in">
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-md bg-primary text-primary-foreground shadow-lg shadow-primary/10">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-muted-foreground mb-2 block">Vibe Coder</span>

                      {currentIteration > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                          <span className="text-[10px] font-medium text-primary">Iteration {currentIteration}/{maxIterations}</span>
                        </div>
                      )}

                      {message.content && (
                        <div className="text-sm leading-relaxed text-foreground/90 mb-3 whitespace-pre-wrap">
                          {message.content}
                          {isStreaming(message) && (
                            <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 animate-pulse align-middle" />
                          )}
                        </div>
                      )}

                      {message.chips.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {message.chips.map((chip) => (
                            <FileCard key={chip.id} chip={chip} />
                          ))}
                        </div>
                      )}

                      {message.chips.map((chip) => (
                        <div key={chip.id} className="rounded-xl bg-[#2d2d2f] border border-border/30 overflow-hidden mb-2">
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{chip.label.replace(':', '')}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                chip.status === 'error'
                                  ? 'bg-red-500/15 text-red-400'
                                  : chip.status === 'done'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-primary/15 text-primary'
                              }`}
                            >
                              {chip.status === 'error' ? 'error' : chip.status === 'done' ? 'success' : 'pending'}
                            </span>
                            <svg className="w-4 h-4 text-muted-foreground ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />

            <ThinkingIndicator active={thinking} />

            {error ? (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                  {error}
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-2 touch-none p-0.5" orientation="vertical">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Input Area */}
      <div className="p-4 bg-[#252525] border-t border-border/30 shrink-0">
        <div className="relative">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSubmit()
              }
            }}
            placeholder="Describe what you want to build..."
            className="w-full min-h-[100px] max-h-[200px] bg-[#323234] rounded-2xl px-4 py-4 pr-14 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 transition-all"
            rows={3}
          />
          <button
            onClick={onSubmit}
            disabled={streaming || !draft.trim()}
            className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
