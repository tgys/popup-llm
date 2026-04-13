# popup-llm

A local LLM chat interface with detachable popup window support, including scripts that bind shortcut keys to the new popup. comes with several dark and light themes.

![Demo](demo.gif)

## Setup

### Backend
```bash
cd backend
npm install
npm run build
npm start
```
Server runs on port 8080.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Opens at http://localhost:5173

## Usage

- **Alt+D** - Detach chat to popup window
- **Cloud providers** - Configure API keys in Settings (gear icon)
- **Local models** - Download GGUF models from the Models tab

## Requirements

- Node.js 18+
- For local models: llama.cpp compatible system
