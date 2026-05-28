import type { StoredFile } from '@/types'

interface FilePreviewProps {
  file: StoredFile | null
}

function getFileIcon(path: string): { color: string } {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return { color: 'text-blue-400' }
  if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.less')) return { color: 'text-purple-400' }
  if (path.endsWith('.json')) return { color: 'text-yellow-400' }
  if (path.endsWith('.js') || path.endsWith('.jsx')) return { color: 'text-yellow-400' }
  if (path.endsWith('.html')) return { color: 'text-orange-400' }
  return { color: 'text-green-400' }
}

export function FilePreview({ file }: FilePreviewProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] h-full">
      {/* Editor Tabs Bar */}
      <div className="flex items-center h-10 bg-[#1e1e1e] border-b border-border/30 px-2 gap-1 shrink-0 overflow-x-auto">
        {file ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background border-t-2 border-t-primary rounded-t-lg shrink-0">
            <svg className={`w-4 h-4 ${getFileIcon(file.path).color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-foreground">{file.path.split('/').pop()}</span>
            <button className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground">
            <span className="text-xs">No file selected</span>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {file && (
        <div className="flex items-center h-7 px-4 bg-[#1e1e1e] border-b border-border/20 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
            {file.path.split('/').map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className={i === arr.length - 1 ? 'text-foreground' : ''}>{part}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Code Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-6">
        {file ? (
          <pre className="hljs text-foreground/90">{file.content}</pre>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <p className="text-sm text-muted-foreground">Choose a file from the explorer to inspect its content.</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between h-6 px-3 bg-[#232323] border-t border-border/30 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span>{file ? file.path.endsWith('.tsx') || file.path.endsWith('.ts') ? 'TypeScript React' : file.path.endsWith('.css') ? 'CSS' : 'Plain Text' : '-'}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          {file && (
            <>
              <span>{(file.content || '').split('\n').length} lines</span>
              <span>{file.size.toLocaleString()} bytes</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
