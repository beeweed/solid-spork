import { ChevronDown, ChevronRight, FileCode2, Folder } from 'lucide-react'
import { useState } from 'react'

import type { FileTreeNode, StoredFile } from '@/types'

interface FileTreeProps {
  tree: FileTreeNode[]
  files: StoredFile[]
  selectedPath: string | null
  onSelect: (path: string) => void
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const isDirectory = node.kind === 'directory'
  const isSelected = selectedPath === node.path

  return (
    <div>
      <button
        type="button"
        onClick={() => (isDirectory ? setOpen((value) => !value) : onSelect(node.path))}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
          isSelected ? 'bg-red-500/15 text-red-100' : 'text-zinc-300 hover:bg-white/6 hover:text-white'
        }`}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        {isDirectory ? (
          open ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />
        ) : (
          <span className="h-4 w-4" />
        )}
        {isDirectory ? <Folder className="h-4 w-4 text-red-300" /> : <FileCode2 className="h-4 w-4 text-zinc-400" />}
        <span className="min-w-0 truncate">{node.name}</span>
      </button>

      {isDirectory && open && node.children?.length ? (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FileTree({ tree, files, selectedPath, onSelect }: FileTreeProps) {
  return (
    <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] rounded-[1.75rem] border border-white/10 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Explorer</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Local file storage</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">{files.length} files</span>
      </div>

      <div className="overflow-y-auto space-y-1">
        {tree.length ? (
          tree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-sm text-zinc-500">
            Generated files appear here after the agent uses file tools.
          </div>
        )}
      </div>
    </section>
  )
}
