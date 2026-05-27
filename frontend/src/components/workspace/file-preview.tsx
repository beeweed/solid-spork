import type { StoredFile } from '@/types'

interface FilePreviewProps {
  file: StoredFile | null
}

export function FilePreview({ file }: FilePreviewProps) {
  return (
    <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Preview</p>
          <h2 className="mt-1 max-w-full break-all text-sm font-medium text-zinc-200">
            {file?.path ?? 'No file selected'}
          </h2>
        </div>
        {file ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
            {file.size.toLocaleString()} bytes
          </span>
        ) : null}
      </div>

      <pre className="min-h-0 overflow-auto break-all rounded-[1.25rem] border border-white/8 bg-black/60 p-4 font-mono text-[12px] leading-6 text-zinc-300">
        {file?.content || 'Choose a file from the explorer to inspect its content.'}
      </pre>
    </section>
  )
}
