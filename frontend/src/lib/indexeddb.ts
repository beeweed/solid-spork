import type { FileTreeNode, StoredFile } from '@/types'

const DB_NAME = 'agent-workbench'
const STORE_NAME = 'files'
const VERSION = 1
const ROOT_PREFIX = '/home/user/'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'path' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)

    action(store)
      .then((value) => {
        transaction.oncomplete = () => {
          db.close()
          resolve(value)
        }
      })
      .catch((error) => {
        db.close()
        reject(error)
      })

    transaction.onerror = () => {
      db.close()
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    }
  })
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/').trim()
  if (!normalized.startsWith(ROOT_PREFIX)) {
    throw new Error(`Path must start with ${ROOT_PREFIX}`)
  }
  return normalized.endsWith('/') && normalized.length > ROOT_PREFIX.length ? normalized.slice(0, -1) : normalized
}

export async function writeFile(path: string, content: string): Promise<StoredFile> {
  const normalizedPath = normalizePath(path)
  const record: StoredFile = {
    path: normalizedPath,
    content,
    updatedAt: new Date().toISOString(),
    size: new Blob([content]).size,
  }

  return withStore('readwrite', async (store) => {
    await requestToPromise(store.put(record))
    return record
  })
}

export async function readFile(path: string): Promise<StoredFile | null> {
  const normalizedPath = normalizePath(path)
  return withStore('readonly', async (store) => {
    const result = await requestToPromise<StoredFile | undefined>(store.get(normalizedPath))
    return result ?? null
  })
}

export async function listFiles(): Promise<StoredFile[]> {
  return withStore('readonly', async (store) => {
    const records = await requestToPromise<StoredFile[]>(store.getAll())
    return [...records].sort((left, right) => left.path.localeCompare(right.path))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function formatFileForRead(file: StoredFile): string {
  return file.content
    .split(/\r?\n/)
    .map((line, index) => `${String(index + 1).padStart(4, ' ')}\t${line}`)
    .join('\n')
}

export function buildFileTree(files: StoredFile[]): FileTreeNode[] {
  type MutableNode = FileTreeNode & { childrenMap?: Map<string, MutableNode> }
  const root = new Map<string, MutableNode>()

  const getOrCreate = (collection: Map<string, MutableNode>, name: string, path: string, kind: 'directory' | 'file') => {
    const existing = collection.get(name)
    if (existing) {
      return existing
    }

    const created: MutableNode = {
      name,
      path,
      kind,
      children: kind === 'directory' ? [] : undefined,
      childrenMap: kind === 'directory' ? new Map() : undefined,
    }
    collection.set(name, created)
    return created
  }

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean)
    let currentMap = root
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isFile = index === segments.length - 1
      const node = getOrCreate(currentMap, segment, currentPath, isFile ? 'file' : 'directory')
      if (!isFile) {
        currentMap = node.childrenMap ?? new Map()
        node.childrenMap = currentMap
      }
    })
  }

  const finalize = (collection: Map<string, MutableNode>): FileTreeNode[] =>
    [...collection.values()]
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === 'directory' ? -1 : 1
        }
        return left.name.localeCompare(right.name)
      })
      .map((node) => ({
        name: node.name,
        path: node.path,
        kind: node.kind,
        children: node.childrenMap ? finalize(node.childrenMap) : undefined,
      }))

  return finalize(root)
}
