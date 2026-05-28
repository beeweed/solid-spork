import * as Dialog from '@radix-ui/react-dialog'
import { LoaderCircle, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ModelOption, ProviderId, UISettings } from '@/types'
import { PROVIDER_LABELS } from '@/types'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: UISettings
  models: ModelOption[]
  error: string | null
  onSave: (settings: UISettings) => Promise<void> | void
  onRefreshModels: (apiKey: string, provider: ProviderId) => Promise<ModelOption[]>
}

const API_KEY_PLACEHOLDERS: Record<ProviderId, string> = {
  openrouter: 'sk-or-v1-...',
  groq: 'gsk_...',
  'nvidia-nim': 'nvapi-...',
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  models,
  error,
  onSave,
  onRefreshModels,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<UISettings>(settings)
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [modelSearch, setModelSearch] = useState('')
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(settings)
      setFetchError(null)
      setLoadingProvider(null)
      setModelSearch('')
    }
    wasOpen.current = open
  }, [open])

  const updateField = useCallback((field: keyof UISettings, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }, [])

  function providerApiKey(provider: ProviderId): string {
    if (provider === 'groq') return draft.groqApiKey
    if (provider === 'nvidia-nim') return draft.nvidiaNimApiKey
    return draft.openrouterApiKey
  }

  async function handleRefresh(provider: ProviderId) {
    const key = providerApiKey(provider)
    if (!key.trim()) return
    setLoadingProvider(provider)
    setFetchError(null)
    const fetched = await onRefreshModels(key, provider)
    if (fetched.length === 0) {
      setFetchError(`Failed to fetch ${PROVIDER_LABELS[provider]} models.`)
    } else if (!draft.model) {
      const first = fetched.find((m) => m.supports_tools) ?? fetched[0]
      if (first) setDraft((current) => ({ ...current, model: first.id }))
    }
    setLoadingProvider(null)
  }

  const anyLoading = loadingProvider !== null
  const displayError = fetchError ?? error

  const filteredModels = models.filter(
    (m) =>
      !modelSearch ||
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase()),
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,36rem)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/30 bg-[#2d2d2d] shadow-2xl overflow-hidden animate-fade-in">
          {/* Dialog Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Settings</Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">Configure your Vibe Coder</Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Dialog Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* API Key Section */}
            {(['openrouter', 'groq', 'nvidia-nim'] as ProviderId[]).map((provider) => {
              const keyField = ((): keyof UISettings => {
                if (provider === 'groq') return 'groqApiKey'
                if (provider === 'nvidia-nim') return 'nvidiaNimApiKey'
                return 'openrouterApiKey'
              })()
              return (
                <div key={provider} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <label className="text-sm font-medium text-foreground">{PROVIDER_LABELS[provider]} API Key</label>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#363638] rounded-xl px-4 py-3">
                      <input
                        type="password"
                        value={draft[keyField]}
                        onChange={(e) => updateField(keyField as keyof UISettings, e.target.value)}
                        placeholder={API_KEY_PLACEHOLDERS[provider]}
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleRefresh(provider)}
                      disabled={!draft[keyField].trim() || anyLoading}
                      className="px-3 py-2 rounded-xl bg-[#363638] text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-40"
                    >
                      {loadingProvider === provider ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <label className="text-sm font-medium text-foreground">Select Model</label>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search models..."
                  className="w-full bg-[#363638] rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Model List */}
              <div className="bg-[#363638] rounded-xl max-h-[280px] overflow-y-auto p-2 space-y-1">
                {filteredModels.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    {modelSearch ? 'No models match your search.' : 'Fetch models by adding an API key above.'}
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => updateField('model', model.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        draft.model === model.id
                          ? 'bg-primary/15 border border-primary/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{model.name}</div>
                        <div className="text-[10px] text-muted-foreground">{model.id}</div>
                      </div>
                      {draft.model === model.id && (
                        <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {displayError ? (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{displayError}</div>
            ) : null}
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30 bg-[#252525]">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={async () => {
                await onSave(draft)
                onOpenChange(false)
              }}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
