import * as ScrollArea from '@radix-ui/react-scroll-area'
import { MessageSquare, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ChatSession } from '@/types'

interface ChatSidebarProps {
  open: boolean
  chats: ChatSession[]
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
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
  onNewChat,
  onClose,
}: ChatSidebarProps) {
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
                  className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    chat.id === activeChatId
                      ? 'bg-red-500/15 text-red-100'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{displayTitle(chat)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="shrink-0 rounded-lg p-1 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
