import { Menu as MenuIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatPanel } from '@/components/workspace/chat-panel'
import { ChatSidebar } from '@/components/workspace/chat-sidebar'
import { FilePreview } from '@/components/workspace/file-preview'
import { FileTree } from '@/components/workspace/file-tree'
import { SettingsDialog } from '@/components/workspace/settings-dialog'
import { BACKEND_URL, createId } from '@/lib/config'
import { buildFileTree, deleteChat, formatFileForRead, listChats, listFiles, readFile, saveChat, writeFile } from '@/lib/indexeddb'
import type { ChatSession, ModelOption, ProviderId, StoredFile, TranscriptMessage, UISettings } from '@/types'

const SETTINGS_KEY = 'agent-workbench-settings'
const ACTIVE_CHAT_KEY = 'agent-workbench-active-chat'
const DEFAULT_SETTINGS: UISettings = {
  provider: 'openrouter',
  model: '',
  openrouterApiKey: '',
  groqApiKey: '',
  nvidiaNimApiKey: '',
}
const MAX_ITERATIONS = 1000

function readStoredSettings(): UISettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return DEFAULT_SETTINGS
    }
    const parsed = JSON.parse(raw)
    if (parsed.apiKey && !parsed.openrouterApiKey) {
      parsed.openrouterApiKey = parsed.apiKey
    }
    if (parsed.nvidiaNimApiKey === undefined) {
      parsed.nvidiaNimApiKey = ''
    }
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function toConversation(messages: TranscriptMessage[]) {
  return messages
    .filter((message) => message.content.trim())
    .map((message) => ({ role: message.role, content: message.content }))
}

async function parseError(response: Response) {
  const text = await response.text()
  try {
    const payload = JSON.parse(text)
    return payload.detail || payload.message || JSON.stringify(payload)
  } catch {
    return text
  }
}

type MobileTab = 'chat' | 'files'

export default function App() {
  const [settings, setSettings] = useState<UISettings>(readStoredSettings)
  const [models, setModels] = useState<ModelOption[]>([])
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [files, setFiles] = useState<StoredFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [currentIteration, setCurrentIteration] = useState(0)
  const [chats, setChats] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(
    () => window.localStorage.getItem(ACTIVE_CHAT_KEY),
  )
  const isInitialMount = useRef(true)
  const hasRestored = useRef(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const [toast, setToast] = useState<{ message: string; detail?: string; type?: 'success' | 'error' } | null>(null)
  const conversationRef = useRef<TranscriptMessage[]>(messages)

  useEffect(() => {
    conversationRef.current = messages
  }, [messages])

  useEffect(() => {
    document.documentElement.classList.add('dark')
    void refreshFiles()
    void loadChats()
  }, [])

  useEffect(() => {
    if (!chats.length || hasRestored.current) return
    hasRestored.current = true
    const storedId = window.localStorage.getItem(ACTIVE_CHAT_KEY)
    if (storedId) {
      const match = chats.find((c) => c.id === storedId)
      if (match) {
        setActiveChatId(storedId)
        setMessages(match.messages)
      } else {
        window.localStorage.removeItem(ACTIVE_CHAT_KEY)
        setActiveChatId(null)
      }
    }
  }, [chats])

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (activeChatId) {
      window.localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId)
    } else {
      window.localStorage.removeItem(ACTIVE_CHAT_KEY)
    }
  }, [activeChatId])

  const messagesRef = useRef(messages)
  const activeChatIdRef = useRef(activeChatId)
  const chatsRef = useRef(chats)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { activeChatIdRef.current = activeChatId }, [activeChatId])
  useEffect(() => { chatsRef.current = chats }, [chats])

  const tree = useMemo(() => buildFileTree(files), [files])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) ?? null,
    [files, selectedPath],
  )

  async function refreshFiles() {
    const nextFiles = await listFiles()
    setFiles(nextFiles)
    setSelectedPath((current) => current ?? nextFiles[0]?.path ?? null)
  }

  async function loadChats() {
    const loadedChats = await listChats()
    setChats(loadedChats)
  }

  async function persistChat(chatId: string, msgs: TranscriptMessage[]) {
    const chat = chatsRef.current.find((c) => c.id === chatId)
    if (!chat) return
    const title =
      chat.title !== 'New Chat'
        ? chat.title
        : msgs.find((m) => m.role === 'user')?.content.slice(0, 50) || 'New Chat'
    const updated = { ...chat, title, messages: msgs, updatedAt: new Date().toISOString() }
    setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)))
    await saveChat(updated)
  }

  async function refreshModels(apiKey: string, provider: ProviderId): Promise<ModelOption[]> {
    if (!apiKey.trim()) {
      setSettingsError('Add an API key before fetching models.')
      return []
    }

    setSettingsError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/api/providers/${provider}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      if (!response.ok) {
        throw new Error(await parseError(response))
      }

      const payload = (await response.json()) as { models: ModelOption[] }
      setModels(payload.models)
      return payload.models
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to load models.')
      return []
    }
  }

  async function handleSaveSettings(nextSettings: UISettings) {
    const model = models.find((m) => m.id === nextSettings.model)
    const provider = (model?.provider as ProviderId) ?? nextSettings.provider
    setSettings({ ...nextSettings, provider })
  }

  async function submitToolResult(payload: {
    sessionId: string
    toolUseId: string
    name: string
    content: string
    isError: boolean
  }) {
    const response = await fetch(`${BACKEND_URL}/api/chat/tool-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(await parseError(response))
    }
  }

  async function handleToolCall(eventData: {
    sessionId: string
    toolUseId: string
    name: string
    arguments: Record<string, string>
    displayLabel: string
    displayPath: string
  }) {
    const { sessionId, toolUseId, name, arguments: args } = eventData

    try {
      let content = ''
      let isError = false

      if (name === 'file_write') {
        const record = await writeFile(args.file_path, args.content ?? '')
        content = JSON.stringify({
          ok: true,
          path: record.path,
          size: record.size,
          updatedAt: record.updatedAt,
        })
        setSelectedPath(record.path)
      } else if (name === 'file_read') {
        const file = await readFile(args.file_path)
        if (!file) {
          isError = true
          content = JSON.stringify({
            error: {
              type: 'file_not_found',
              message: `File not found: ${args.file_path}`,
              file_path: args.file_path,
            },
          })
        } else if (/\.(png|jpg|jpeg|gif|bmp|webp|svg|ico|avif|mp4|mp3|wav|ogg|webm|zip|gz|tar|pdf|bin|exe|dll|so|dmg|iso)$/i.test(args.file_path)) {
          isError = true
          content = JSON.stringify({
            error: {
              type: 'binary_file',
              message: `Cannot read "${args.file_path.split('/').pop()}" (this model does not support image/binary input). Inform the user.`,
              file_path: args.file_path,
            },
          })
        } else {
          content = formatFileForRead(file)
          setSelectedPath(file.path)
        }
      } else {
        isError = true
        content = JSON.stringify({
          error: {
            type: 'unsupported_tool',
            message: `Unsupported tool: ${name}`,
          },
        })
      }

      await submitToolResult({
        sessionId,
        toolUseId,
        name,
        content,
        isError,
      })
      await refreshFiles()
    } catch (error) {
      await submitToolResult({
        sessionId,
        toolUseId,
        name,
        content: JSON.stringify({
          error: {
            type: 'tool_execution_error',
            message: error instanceof Error ? error.message : 'Tool execution failed.',
          },
        }),
        isError: true,
      })
      await refreshFiles()
    }
  }

  async function consumeSseStream(response: Response, assistantId: string) {
    if (!response.body) {
      throw new Error('Streaming response body is not available.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex)
        buffer = buffer.slice(separatorIndex + 2)
        separatorIndex = buffer.indexOf('\n\n')
        if (!rawEvent.trim()) {
          continue
        }

        const lines = rawEvent.split('\n')
        let eventName = 'message'
        const dataLines: string[] = []

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim()
          }
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart())
          }
        }

        const eventData = dataLines.length ? JSON.parse(dataLines.join('\n')) : {}

        if (eventName === 'iteration') {
          setCurrentIteration(eventData.current ?? 0)
        }

        if (eventName === 'thinking') {
          setThinking(Boolean(eventData.active))
        }

        if (eventName === 'text_delta') {
          setThinking(false)
          const updatedMessages = messagesRef.current.map((message) =>
            message.id === assistantId
              ? { ...message, content: `${message.content}${eventData.delta ?? ''}`, status: 'streaming' as const }
              : message,
          )
          setMessages(updatedMessages)
          messagesRef.current = updatedMessages
          if (activeChatIdRef.current) {
            persistChat(activeChatIdRef.current, updatedMessages)
          }
        }

        if (eventName === 'tool_call') {
          setThinking(false)
          const updatedMessages = messagesRef.current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  chips: [
                    ...message.chips,
                    {
                      id: eventData.toolUseId,
                      label: `${eventData.displayLabel}:`,
                      path: eventData.displayPath,
                      status: 'pending' as const,
                    },
                  ],
                }
              : message,
          )
          setMessages(updatedMessages)
          messagesRef.current = updatedMessages
          if (activeChatIdRef.current) {
            persistChat(activeChatIdRef.current, updatedMessages)
          }
          void handleToolCall(eventData)
        }

        if (eventName === 'tool_result_ack') {
          const updatedMessages = messagesRef.current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  chips: message.chips.map((chip) =>
                    chip.id === eventData.toolUseId
                      ? { ...chip, status: (eventData.isError ? 'error' : 'done') as 'error' | 'done' }
                      : chip,
                  ),
                }
              : message,
          )
          setMessages(updatedMessages)
          messagesRef.current = updatedMessages
          if (activeChatIdRef.current) {
            persistChat(activeChatIdRef.current, updatedMessages)
          }
        }

        if (eventName === 'error') {
          const message = eventData.message ?? 'The agent failed to complete the request.'
          setRuntimeError(message)
          setThinking(false)
          setStreaming(false)
          setMessages((current) =>
            current.map((entry) =>
              entry.id === assistantId
                ? {
                    ...entry,
                    status: 'error',
                    content: entry.content || message,
                  }
                : entry,
            ),
          )
        }

        if (eventName === 'done') {
          setStreaming(false)
          setThinking(false)
          setMessages((current) =>
            current.map((entry) => (entry.id === assistantId ? { ...entry, status: 'done' } : entry)),
          )
          await refreshFiles()
        }
      }

      if (done) {
        break
      }
    }
  }

  function activeProvider(): ProviderId {
    const model = models.find((m) => m.id === settings.model)
    return (model?.provider as ProviderId) ?? settings.provider
  }

  function activeApiKey(): string {
    const provider = activeProvider()
    if (provider === 'groq') return settings.groqApiKey
    if (provider === 'nvidia-nim') return settings.nvidiaNimApiKey
    return settings.openrouterApiKey
  }

  async function handleSubmit() {
    if (streaming || !draft.trim()) {
      return
    }
    const apiKey = activeApiKey()
    if (!apiKey.trim() || !settings.model.trim()) {
      setRuntimeError('Add an API key and select a model in settings before chatting.')
      setSettingsOpen(true)
      return
    }

    setRuntimeError(null)
    setCurrentIteration(0)
    setStreaming(true)
    setThinking(true)

    const userId = createId('user')
    const assistantId = createId('assistant')
    const nextUserMessage: TranscriptMessage = {
      id: userId,
      role: 'user',
      content: draft.trim(),
      chips: [],
      status: 'done',
    }
    const nextAssistantMessage: TranscriptMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      chips: [],
      status: 'streaming',
    }

    const provider = activeProvider()
    const newMessages = [...conversationRef.current, nextUserMessage, nextAssistantMessage]
    const outgoingMessages = toConversation([...conversationRef.current, nextUserMessage])
    setMessages(newMessages)
    setDraft('')

    if (!activeChatIdRef.current) {
      const chatId = createId('chat')
      const newChat: ChatSession = {
        id: chatId,
        title: draft.trim().slice(0, 50) || 'New Chat',
        messages: newMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setActiveChatId(chatId)
      setChats((prev) => [...prev, newChat])
      chatsRef.current = [...chatsRef.current, newChat]
      messagesRef.current = newMessages
      await saveChat(newChat)
    } else {
      messagesRef.current = newMessages
      await persistChat(activeChatIdRef.current, newMessages)
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: outgoingMessages,
          apiKey,
          model: settings.model,
          provider,
        }),
      })

      if (!response.ok) {
        throw new Error(await parseError(response))
      }

      await consumeSseStream(response, assistantId)

      if (activeChatIdRef.current) {
        await persistChat(activeChatIdRef.current, messagesRef.current)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach the backend stream.'
      setRuntimeError(message)
      setThinking(false)
      setStreaming(false)
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId ? { ...entry, content: entry.content || message, status: 'error' } : entry,
        ),
      )
      if (activeChatIdRef.current) {
        await persistChat(activeChatIdRef.current, messagesRef.current)
      }
    }
  }

  function handleSwitchChat(chatId: string) {
    if (chatId === activeChatId) return

    const currentId = activeChatIdRef.current
    if (currentId) {
      const currentChat = chatsRef.current.find((c) => c.id === currentId)
      if (currentChat) {
        const updated = { ...currentChat, messages: conversationRef.current, updatedAt: new Date().toISOString() }
        setChats((prev) => prev.map((c) => (c.id === currentId ? updated : c)))
        saveChat(updated)
      }
    }

    const nextChat = chatsRef.current.find((c) => c.id === chatId)
    if (nextChat) {
      setActiveChatId(chatId)
      setMessages(nextChat.messages)
    }
    setSidebarOpen(false)
  }

  async function handleDeleteChat(chatId: string) {
    await deleteChat(chatId)
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (activeChatId === chatId) {
      setActiveChatId(null)
      setMessages([])
      setDraft('')
      setRuntimeError(null)
      setCurrentIteration(0)
    }
  }

  function handleResetSession() {
    setActiveChatId(null)
    setMessages([])
    setDraft('')
    setRuntimeError(null)
    setCurrentIteration(0)
    setToast({ message: 'Session reset', detail: 'Ready for a new task', type: 'success' })
  }

  function handleNewChat() {
    const currentId = activeChatIdRef.current
    if (currentId) {
      const currentChat = chatsRef.current.find((c) => c.id === currentId)
      if (currentChat) {
        const updated = { ...currentChat, messages: conversationRef.current, updatedAt: new Date().toISOString() }
        setChats((prev) => prev.map((c) => (c.id === currentId ? updated : c)))
        saveChat(updated)
      }
    }
    setActiveChatId(null)
    setMessages([])
    setDraft('')
    setRuntimeError(null)
    setCurrentIteration(0)
    setSidebarOpen(false)
  }

  return (
    <div id="app" className="h-screen w-screen overflow-hidden bg-[#272727]">
      <ChatSidebar
        open={sidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
        onNewChat={handleNewChat}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full bg-[#191919]">
        {/* LEFT SIDE: CHAT PANEL */}
        <div className="w-[440px] min-w-[380px] max-w-[520px] shrink-0 lg:w-[40%]">
          <div className="flex flex-col h-full m-3 rounded-3xl border border-white/5 overflow-hidden bg-[#1e1e1e]">
            <ChatPanel
              messages={messages}
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={() => void handleSubmit()}
              currentIteration={currentIteration}
              maxIterations={MAX_ITERATIONS}
              streaming={streaming}
              thinking={thinking}
              error={runtimeError}
              onMenuClick={() => setSidebarOpen(true)}
              onResetClick={handleResetSession}
              onSettingsClick={() => setSettingsOpen(true)}
            />
          </div>
        </div>

        {/* RIGHT SIDE: FILE PANEL */}
        <div className="flex-1 min-w-0 flex h-full">
          {/* File Explorer Sidebar */}
          <div className="w-56 lg:w-64 shrink-0">
            <FileTree tree={tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
          </div>

          {/* Code Editor Area */}
          <FilePreview file={selectedFile} />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'chat' ? (
            <div className="h-full flex flex-col bg-[#1e1e1e]">
              <ChatPanel
                messages={messages}
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={() => void handleSubmit()}
                currentIteration={currentIteration}
                maxIterations={MAX_ITERATIONS}
                streaming={streaming}
                thinking={thinking}
                error={runtimeError}
                onMenuClick={() => setSidebarOpen(true)}
                onResetClick={handleResetSession}
                onSettingsClick={() => setSettingsOpen(true)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col bg-[#1e1e1e]">
              {/* Mobile file browser header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-foreground">Files</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <MenuIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 flex min-h-0">
                <div className="w-48 shrink-0 border-r border-border/30 overflow-y-auto">
                  <FileTree tree={tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <FilePreview file={selectedFile} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex h-14 bg-[#232323] border-t border-border/30 shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 transition-colors ${
              mobileTab === 'chat' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">Chat</span>
          </button>
          <button
            onClick={() => setMobileTab('files')}
            className={`flex-1 flex items-center justify-center gap-2 transition-colors ${
              mobileTab === 'files' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm font-medium">Files</span>
          </button>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        models={models}
        error={settingsError}
        onSave={handleSaveSettings}
        onRefreshModels={refreshModels}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2d2d2d] border shadow-lg animate-fade-in ${
            toast.type === 'error' ? 'border-red-500/30' : 'border-emerald-500/30'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              toast.type === 'error' ? 'bg-red-500/20' : 'bg-emerald-500/20'
            }`}>
              {toast.type === 'error' ? (
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{toast.message}</p>
              {toast.detail && <p className="text-xs text-muted-foreground">{toast.detail}</p>}
            </div>
            <button onClick={() => setToast(null)} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
