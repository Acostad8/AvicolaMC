import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Trash2, Bot, Loader2, RefreshCw } from 'lucide-react'
import { useChat } from '../../hooks/useChat'

const SUGERENCIAS = [
  '¿Cuántos huevos se produjeron hoy?',
  '¿Cuál es la mortalidad de esta semana?',
  '¿Hay insumos críticos?',
  '¿Qué tratamientos están activos?',
]

function renderInline(text) {
  const parts = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 0 ? text : parts
}

function renderMarkdown(text) {
  const lines  = text.split('\n')
  const blocks = []
  let bullets  = []
  let key = 0

  const flush = () => {
    if (!bullets.length) return
    blocks.push(
      <ul key={key++} className="space-y-0.5 my-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5 items-start leading-snug">
            <span className="text-primary-400 dark:text-primary-500 mt-[3px] flex-shrink-0 text-[9px]">▸</span>
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    )
    bullets = []
  }

  for (const line of lines) {
    const bullet   = line.match(/^[-*•]\s+(.+)/)
    const numbered = line.match(/^\d+\.\s+(.+)/)
    if (bullet || numbered) {
      bullets.push((bullet || numbered)[1])
    } else if (line.trim() === '') {
      flush()
    } else {
      flush()
      blocks.push(<p key={key++} className="leading-relaxed">{renderInline(line)}</p>)
    }
  }
  flush()

  return blocks.length ? blocks : <span>{text}</span>
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 150, 300].map(delay => (
        <div
          key={delay}
          className="w-2 h-2 bg-stone-400 dark:bg-stone-500 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

function Message({ msg, onRetry }) {
  const isUser = msg.role === 'user'
  const ts = formatTime(msg.ts)

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
          <Bot className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
            : msg.error
            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-tl-sm'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-sm space-y-0.5'
        }`}>
          {isUser || msg.error ? msg.content : renderMarkdown(msg.content)}
        </div>
        <div className="flex items-center gap-2">
          {msg.error && msg._retryText && (
            <button
              onClick={() => onRetry?.(msg._retryText, msg._retryBase ?? [])}
              className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Reintentar
            </button>
          )}
          {ts && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500">{ts}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatBot() {
  const [open, setOpen]   = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage, retryMessage, clearMessages } = useChat()
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-32 right-2 z-50 flex flex-col bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden"
          style={{ width: 'min(calc(100vw - 1rem), 22rem)', height: 'min(calc(100vh - 160px), 520px)' }}
          role="dialog"
          aria-label="Asistente AvicolaMC"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-700 to-primary-600 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Asistente AvicolaMC</p>
                <p className="text-[11px] text-primary-200">Datos en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="p-1.5 text-primary-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Limpiar conversación"
                  aria-label="Limpiar conversación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-primary-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Cerrar asistente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-stone-700 dark:text-stone-300">
                    Hola, soy el asistente de AvicolaMC. Consulta producción, mortalidad, inventario y más con datos en tiempo real.
                  </div>
                </div>
                <div className="space-y-1.5 pl-9">
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wide font-medium">Preguntas rápidas</p>
                  {SUGERENCIAS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="block w-full text-left text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 border border-primary-100 dark:border-primary-900/40 rounded-xl px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <Message key={i} msg={msg} onRetry={retryMessage} />)
            )}

            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
                <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 px-3 py-3 border-t border-stone-100 dark:border-stone-800 flex-shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta..."
              disabled={isLoading}
              className="flex-1 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-primary-600 hover:bg-primary-700 disabled:bg-stone-200 dark:disabled:bg-stone-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
              aria-label="Enviar"
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 text-stone-400 animate-spin" />
                : <Send className="h-4 w-4 text-white" />
              }
            </button>
          </form>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-16 right-2 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-stone-600 hover:bg-stone-700'
            : 'bg-primary-600 hover:bg-primary-700 hover:scale-110'
        }`}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        {open
          ? <X className="h-6 w-6 text-white" />
          : <MessageCircle className="h-6 w-6 text-white" />
        }
      </button>
    </>
  )
}
