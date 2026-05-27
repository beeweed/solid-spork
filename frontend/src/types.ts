export type ProviderId = 'openrouter' | 'groq' | 'nvidia-nim'

/** Map of provider id → display label */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq AI',
  'nvidia-nim': 'NVIDIA NIM',
}

export interface UISettings {
  provider: ProviderId
  model: string
  openrouterApiKey: string
  groqApiKey: string
  nvidiaNimApiKey: string
}

export interface ModelOption {
  id: string
  name: string
  context_length?: number | null
  supports_tools: boolean
  pricing: Record<string, unknown>
  provider: string
}

export interface ToolChip {
  id: string
  label: string
  path: string
  status: 'pending' | 'done' | 'error'
}

export interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  chips: ToolChip[]
  status: 'idle' | 'streaming' | 'done' | 'error'
}

export interface StoredFile {
  path: string
  content: string
  updatedAt: string
  size: number
}

export interface FileTreeNode {
  name: string
  path: string
  kind: 'directory' | 'file'
  children?: FileTreeNode[]
}
