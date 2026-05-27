import { PanelRightOpen, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/workspace/chat-panel'
import { FileTree } from '@/components/workspace/file-tree'
import { SettingsDialog } from '@/components/workspace/settings-dialog'
import { BACKEND_URL, createId } from '@/lib/config'
import { buildFileTree, formatFileForRead, listFiles, readFile, writeFile } from '@/lib/indexeddb'
import type { ModelOption, StoredFile, TranscriptMessage, UISettings } from '@/types'

const SETTINGS_KEY = 'agent-workbench-settings'
const DEFAULT_SETTINGS: UISettings = {
  provider: 'openrouter',
  apiKey: '',
  model: '',
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
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
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
  try {
    const payload = await response.json()
    return payload.detail || payload.message || JSON.stringify(payload)
  } catch {
    return await response.text()
  }
}

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
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [currentIteration, setCurrentIteration] = useState(0)
  const conversationRef = useRef<TranscriptMessage[]>(messages)

  useEffect(() => {
    conversationRef.current = messages
  }, [messages])

  useEffect(() => {
    document.documentElement.classList.add('dark')
    void refreshFiles()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (settings.apiKey.trim()) {
      void refreshModels(settings.apiKey)
    }
  }, [settings.apiKey])

  const tree = useMemo(() => buildFileTree(files), [files])

  async function refreshFiles() {
    const nextFiles = await listFiles()
    setFiles(nextFiles)
    setSelectedPath((current) => current ?? nextFiles[0]?.path ?? null)
  }

  async function refreshModels(apiKey: string) {
    if (!apiKey.trim()) {
      setSettingsError('Add an OpenRouter API key before fetching models.')
      return
    }

    setSettingsLoading(true)
    setSettingsError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/api/providers/openrouter/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      if (!response.ok) {
        throw new Error(await parseError(response))
      }

      const payload = (await response.json()) as { models: ModelOption[] }
      setModels(payload.models)
      setSettings((current) => ({
        ...current,
        model:
          current.model && payload.models.some((model) => model.id === current.model)
            ? current.model
            : payload.models.find((model) => model.supports_tools)?.id ?? payload.models[0]?.id ?? '',
      }))
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to load models.')
    } finally {
      setSettingsLoading(false)
    }
  }

  async function handleSaveSettings(nextSettings: UISettings) {
    setSettings(nextSettings)
    if (nextSettings.apiKey.trim()) {
      await refreshModels(nextSettings.apiKey)
    }
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
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: `${message.content}${eventData.delta ?? ''}`, status: 'streaming' }
                : message,
            ),
          )
        }

        if (eventName === 'tool_call') {
          setThinking(false)
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    chips: [
                      ...message.chips,
                      {
                        id: eventData.toolUseId,
                        label: `${eventData.displayLabel}:`,
                        path: eventData.displayPath,
                        status: 'pending',
                      },
                    ],
                  }
                : message,
            ),
          )
          void handleToolCall(eventData)
        }

        if (eventName === 'tool_result_ack') {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    chips: message.chips.map((chip) =>
                      chip.id === eventData.toolUseId
                        ? { ...chip, status: eventData.isError ? 'error' : 'done' }
                        : chip,
                    ),
                  }
                : message,
            ),
          )
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

  async function handleSubmit() {
    if (streaming || !draft.trim()) {
      return
    }
    if (!settings.apiKey.trim() || !settings.model.trim()) {
      setRuntimeError('Add an OpenRouter API key and select a model in settings before chatting.')
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

    const outgoingMessages = toConversation([...conversationRef.current, nextUserMessage])
    setMessages((current) => [...current, nextUserMessage, nextAssistantMessage])
    setDraft('')

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: outgoingMessages,
          apiKey: settings.apiKey,
          model: settings.model,
          provider: settings.provider,
        }),
      })

      if (!response.ok) {
        throw new Error(await parseError(response))
      }

      await consumeSseStream(response, assistantId)
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
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(120,20,20,0.18),_transparent_24%),linear-gradient(180deg,#050505_0%,#090909_40%,#050505_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-white/10 bg-black/35 px-4 py-4 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/12 text-red-100 shadow-[0_0_45px_rgba(239,68,68,0.18)]">
              <PanelRightOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-zinc-500">Agent Workbench</p>
              <p className="mt-1 text-sm text-zinc-400">IndexedDB file workspace · OpenRouter runtime · FastAPI SSE</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 lg:inline-flex">
              Backend: {BACKEND_URL || '(proxy)'}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
              className="rounded-2xl border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </header>

        <main className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.95fr)]">
          <ChatPanel
            messages={messages}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={() => void handleSubmit()}
            currentIteration={currentIteration}
            maxIterations={MAX_ITERATIONS}
            activeModel={settings.model}
            providerLabel="OpenRouter"
            streaming={streaming}
            thinking={thinking}
            error={runtimeError}
          />
          <FileTree tree={tree} files={files} selectedPath={selectedPath} onSelect={setSelectedPath} />
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        models={models}
        loading={settingsLoading}
        error={settingsError}
        onSave={handleSaveSettings}
        onRefreshModels={refreshModels}
      />
    </div>
  )
}
