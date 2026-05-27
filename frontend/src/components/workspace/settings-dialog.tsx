import * as Dialog from '@radix-ui/react-dialog'
import { LoaderCircle, RefreshCw, Settings2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { ModelOption, UISettings } from '@/types'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: UISettings
  models: ModelOption[]
  loading: boolean
  error: string | null
  onSave: (settings: UISettings) => Promise<void> | void
  onRefreshModels: (apiKey: string) => Promise<void>
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  models,
  loading,
  error,
  onSave,
  onRefreshModels,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<UISettings>(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings, open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-white">Agent settings</Dialog.Title>
              <Dialog.Description className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                Connect OpenRouter, load tool-capable models, and keep the provider layer open for future vendors.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2 text-sm text-zinc-300">
              <span className="uppercase tracking-[0.25em] text-zinc-500">Provider</span>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">OpenRouter</div>
            </label>

            <label className="grid gap-2 text-sm text-zinc-300">
              <span className="uppercase tracking-[0.25em] text-zinc-500">API key</span>
              <input
                type="password"
                value={draft.apiKey}
                onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder="sk-or-v1-..."
                className="h-12 rounded-2xl border border-white/10 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400/60"
              />
            </label>

            <div className="grid gap-2 text-sm text-zinc-300">
              <span className="uppercase tracking-[0.25em] text-zinc-500">Model</span>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={draft.model}
                  onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                  className="h-12 rounded-2xl border border-white/10 bg-black/50 px-4 text-sm text-white outline-none transition focus:border-red-400/60"
                >
                  <option value="">Select a model</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}{model.supports_tools ? ' · tools' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-white/10 bg-white/5 px-5 text-zinc-100 hover:bg-white/10"
                  onClick={() => onRefreshModels(draft.apiKey)}
                  disabled={!draft.apiKey || loading}
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh models
                </Button>
              </div>
            </div>

            {error ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" className="rounded-2xl text-zinc-300 hover:bg-white/6 hover:text-white">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              className="rounded-2xl bg-red-500 px-5 text-white shadow-[0_12px_40px_rgba(239,68,68,0.3)] hover:bg-red-400"
              onClick={async () => {
                await onSave(draft)
                onOpenChange(false)
              }}
            >
              <Settings2 className="h-4 w-4" />
              Save settings
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
