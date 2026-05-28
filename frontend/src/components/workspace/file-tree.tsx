import { useState } from 'react'

import type { FileTreeNode } from '@/types'

interface FileTreeProps {
  tree: FileTreeNode[]
  selectedPath: string | null
  onSelect: (path: string) => void
}

function extIcon(path: string): { icon: string; color: string } {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return { icon: 'code', color: 'text-blue-400' }
  if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.less')) return { icon: 'file', color: 'text-purple-400' }
  if (path.endsWith('.json')) return { icon: 'file', color: 'text-yellow-400' }
  if (path.endsWith('.js') || path.endsWith('.jsx')) return { icon: 'code', color: 'text-yellow-400' }
  if (path.endsWith('.html')) return { icon: 'code', color: 'text-orange-400' }
  if (path.endsWith('.md')) return { icon: 'file', color: 'text-blue-400' }
  return { icon: 'file', color: 'text-green-400' }
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
      <div
        onClick={() => (isDirectory ? setOpen((value) => !value) : onSelect(node.path))}
        className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-all duration-150 rounded-lg ${
          isSelected ? 'bg-primary/15 text-primary' : 'hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {isDirectory ? (
          <svg className={`w-3 h-3 ${isSelected ? 'text-primary' : 'text-muted-foreground'} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'} />
          </svg>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {isDirectory ? (
          <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
          </svg>
        ) : (
          <svg className={`w-4 h-4 ${extIcon(node.path).color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
        <span className={`text-[13px] truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{node.name}</span>
      </div>

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

export function FileTree({ tree, selectedPath, onSelect }: FileTreeProps) {
  return (
    <div className="bg-[#232323] border-r border-border/30 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {tree.length ? (
          tree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
          ))
        ) : (
          <div className="px-4 py-10 text-center text-xs text-muted-foreground">
            Generated files appear here after the agent uses file tools.
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <div className="p-2 border-t border-border/30 shrink-0">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Collapse</span>
        </button>
      </div>
    </div>
  )
}
