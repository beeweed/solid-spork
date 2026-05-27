# OpenRouter settings and model catalog

## Overview
Provide a settings surface where users can save an OpenRouter API key locally, fetch available models from OpenRouter, and select the active model/provider for chats.

## Goals
- Make API key entry simple and local to the browser.
- Fetch and display available models after key entry.
- Keep the provider abstraction open for more model vendors.

## Scope / non-goals
- In scope: API key form, provider selector, model selector, model refresh, validation errors.
- Non-goals: secure multi-user account storage, paid billing dashboards.

## User flows / UX / design notes
- User opens settings.
- User enters OpenRouter API key and saves.
- User clicks refresh models or models auto-load.
- User selects a model and closes settings.

## Functional requirements
- Persist provider, API key, and selected model in browser localStorage.
- Backend endpoint validates API key by requesting model list from OpenRouter.
- Show loading, success, and error states.
- Support future provider definitions through a provider registry shape.

## Data model / schema
- `ProviderSettings`: providerId, apiKey, selectedModel.
- `ModelOption`: id, name, context_length, pricing summary, supports_tools.

## API contracts
- `POST /api/providers/openrouter/models`: returns normalized model list for a supplied API key.

## Edge cases / failure modes
- Invalid key, rate limiting, empty model list, network failure.

## Acceptance criteria
- User can save key, fetch models, and change model without reloading.
- Selected model is used for subsequent chat requests.

## Test plan / test cases
- Backend test model normalization.
- Frontend test settings persistence and error handling.

## Implementation notes
- Only transmit API key to backend on explicit actions.
- Surface tool-calling capability badges when available.

## Status / open questions
- Status: done.
