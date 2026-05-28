import * as ScrollArea from '@radix-ui/react-scroll-area'
import { Check, MessageSquare, PencilLine, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { ChatSession } from '@/types'

interface ChatSidebarProps {
  open: boolean
  chats: ChatSession[]
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
  onRenameChat: (id: string, title: string) => void
  onNewChat: () => void
  onClose: () => void
}

function displayTitle(chat: ChatSession): string {
  if (chat.title && chat.title !== 'New Chat') return chat.title
  const firstUser = chat.messages.find((m) => m.role === 'user')
  if (firstUser) return firstUser.content.slice(0, 50)
  return 'New Chat'
}

export function ChatSidebar({
  open,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onNewChat,
  onClose,
}: ChatSidebarProps) {
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const longPressTimeoutRef = useRef<number | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setExpandedChatId(null)
      setRenamingChatId(null)
      setRenameValue('')
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [])

  function clearLongPressTimer() {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    pointerStartRef.current = null
  }

  function openChatActions(chat: ChatSession) {
    clearLongPressTimer()
    setExpandedChatId(chat.id)
    setRenamingChatId(null)
    setRenameValue(displayTitle(chat))
    suppressClickRef.current = true
  }

  function beginRename(chat: ChatSession) {
    setExpandedChatId(chat.id)
    setRenamingChatId(chat.id)
    setRenameValue(displayTitle(chat))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, chat: ChatSession) {
    if (event.button !== 0) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    clearLongPressTimer()
    longPressTimeoutRef.current = window.setTimeout(() => openChatActions(chat), 450)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointerStartRef.current || longPressTimeoutRef.current === null) return
    const deltaX = Math.abs(event.clientX - pointerStartRef.current.x)
    const deltaY = Math.abs(event.clientY - pointerStartRef.current.y)
    if (deltaX > 8 || deltaY > 8) {
      clearLongPressTimer()
    }
  }

  function handleRowClick(chatId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setExpandedChatId(null)
    setRenamingChatId(null)
    onSelectChat(chatId)
  }

  function submitRename(chat: ChatSession) {
    onRenameChat(chat.id, renameValue)
    setExpandedChatId(null)
    setRenamingChatId(null)
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 flex-col border-r border-white/10 bg-zinc-950/95 backdrop-blur-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100">
            Chats
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <Button
            onClick={onNewChat}
            className="w-full rounded-xl border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
          <ScrollArea.Viewport className="h-full">
            <div className="space-y-1 pb-4">
              {chats.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-zinc-500">
                  No chats yet. Start a new chat to begin.
                </p>
              )}
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`rounded-2xl border border-transparent transition-colors ${
                    chat.id === activeChatId ? 'bg-red-500/10' : 'hover:bg-white/5'
                  } ${expandedChatId === chat.id ? 'border-white/10 bg-white/[0.06]' : ''}`}
                  onPointerDown={(event) => handlePointerDown(event, chat)}
                  onPointerUp={clearLongPressTimer}
                  onPointerCancel={clearLongPressTimer}
                  onPointerLeave={clearLongPressTimer}
                  onPointerMove={handlePointerMove}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    openChatActions(chat)
                  }}
                  onClick={() => handleRowClick(chat.id)}
                >
                  <div
                    className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      chat.id === activeChatId
                        ? 'text-red-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{displayTitle(chat)}</span>
                  </div>

                  {expandedChatId === chat.id && (
                    <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-black/20 p-3" onClick={(event) => event.stopPropagation()}>
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Session ID</p>
                        <p className="mt-1 break-all font-mono text-xs text-zinc-200">{chat.sessionId ?? 'Not available yet'}</p>
                      </div>

                      {renamingChatId === chat.id ? (
                        <form
                          className="space-y-2"
                          onSubmit={(event) => {
                            event.preventDefault()
                            submitRename(chat)
                          }}
                        >
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-red-400/50"
                            placeholder="Rename chat"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-500/25"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Save name
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingChatId(null)
                                setRenameValue(displayTitle(chat))
                              }}
                              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => beginRename(chat)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/5"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedChatId(null)
                              setRenamingChatId(null)
                              onDeleteChat(chat.id)
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            className="flex w-2 touch-none p-0.5"
            orientation="vertical"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </aside>
    </>
  )
}
