# Agent Workbench

A production-grade browser-based AI coding workspace with a React + Vite frontend and a FastAPI backend. Features a real ReAct agent loop with native tool calling, streaming token-by-token over SSE, and browser IndexedDB-backed file storage.

## Architecture

```
┌─────────────┐     SSE Stream      ┌──────────────┐
│   FastAPI   │ ◄──────────────────► │  React +     │
│   Backend   │    Tool Results      │   Vite       │
│  (Python)   │                      │  Frontend    │
└──────┬──────┘                      └──────┬───────┘
       │                                    │
       │  httpx                             │  IndexedDB
       ▼                                    ▼
┌──────────────┐                    ┌───────────────┐
│  OpenAI API  │                    │  Browser File │
│  Compatible  │                    │  Storage      │
│  Providers   │                    │               │
└──────────────┘                    └───────────────┘
```

### Supported Model Providers

| Provider    | Base URL                              | Auth Header      |
|------------|----------------------------------------|------------------|
| OpenRouter  | `https://openrouter.ai/api/v1`        | `Bearer sk-or-v1-...` |
| Groq AI     | `https://api.groq.com/openai/v1`      | `Bearer gsk_...` |
| NVIDIA NIM  | `https://integrate.api.nvidia.com/v1` | `Bearer nvapi-...` |

All providers support native tool calling (function calling) and streaming chat completions.

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env   # or set VITE_BACKEND_URL
npm install
npm run build           # production build
npm run preview -- --host 0.0.0.0 --port 4173
```

For development:

```bash
cd frontend
npm run dev           # Vite dev server with hot reload + API proxy
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Backend API URL |

## Features

- **ReAct Agent Loop** — Runs up to 1000 iterations with native tool calling, automatic loop guard detection, and real-time SSE streaming.
- **Multi-Provider** — OpenRouter, Groq AI, and NVIDIA NIM. Add new providers by implementing the duck-typed provider interface.
- **Browser File System** — `file_write` and `file_read` tools backed by IndexedDB. Files persist across sessions in the browser.
- **Dark Professional UI** — Three-column layout with chat transcript, file explorer, and file preview. Tailwind CSS v4 + Radix UI.
- **Tool Call Visualization** — Inline chips show tool execution status (pending → done/error) within the assistant transcript.

## Tools

The agent has access to two file operations:

| Tool | Description |
|---|---|
| `file_write(path, content)` | Creates or overwrites a file at `/home/user/...` |
| `file_read(path)` | Reads file content with line numbers |

Both tools execute in the browser against IndexedDB — the backend never sees file contents.

## Adding a New Provider

1. Create `backend/src/services/<provider>.py` with `provider_id`, `list_models()`, and `stream_chat()`
2. Add base URL to `backend/src/config.py`
3. Register in `backend/src/services/provider_registry.py`
4. Add to `frontend/src/types.ts` (`ProviderId`, `PROVIDER_LABELS`, `UISettings`)
5. Add API key input in `frontend/src/components/workspace/settings-dialog.tsx`
6. Update `activeApiKey()` in `frontend/src/App.tsx`

## Project Structure

```
solid-spork/
├── backend/
│   ├── requirements.txt
│   └── src/
│       ├── config.py
│       ├── api_models.py
│       ├── main.py              # FastAPI app with SSE streaming
│       ├── agent/
│       │   ├── react_agent.py   # ReAct agent loop
│       │   ├── systemprompt.py  # System prompt constant
│       │   └── tool_registry.py # Tool definitions
│       └── services/
│           ├── provider_registry.py
│           ├── openrouter.py
│           ├── groq.py
│           ├── nvidia_nim.py
│           └── session_manager.py
├── frontend/
│   ├── .env.example
│   └── src/
│       ├── App.tsx
│       ├── types.ts
│       ├── lib/
│       │   ├── config.ts
│       │   ├── indexeddb.ts     # Browser file storage
│       │   └── utils.ts
│       └── components/
│           └── workspace/
│               ├── chat-panel.tsx
│               ├── file-tree.tsx
│               ├── file-preview.tsx
│               ├── settings-dialog.tsx
│               └── thinking-indicator.tsx
└── specs/
    ├── spec.md
    ├── agent-loop/
    ├── openrouter-settings/
    ├── frontend-workspace/
    └── indexeddb-file-storage/
```

## License

MIT
