import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MessageCircle, X, Send, Trash2, Bot, RefreshCw, Copy, Check,
  Maximize2, Minimize2, Mic, Square, Sparkles, Clock, AlertCircle, ArrowUp,
} from 'lucide-react'
import { useChat } from '../../hooks/useChat'

/* ─────────────────── Hook: visualizador de audio del micrófono ───────────────────
 * Devuelve array de alturas (0..1) actualizado en tiempo real mientras hay stream.
 * Separado del SpeechRecognition — abrimos un segundo getUserMedia solo para visual.
 */
const BAR_COUNT = 48
function useAudioVisualizer(active) {
  const [bars, setBars] = useState(() => new Array(BAR_COUNT).fill(0))
  const audioCtxRef = useRef(null)
  const streamRef   = useRef(null)
  const analyserRef = useRef(null)
  const rafRef      = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const Ctx = window.AudioContext || window.webkitAudioContext
        const ctx = new Ctx()
        audioCtxRef.current = ctx
        const source   = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        source.connect(analyser)
        analyserRef.current = analyser
        const data = new Uint8Array(analyser.frequencyBinCount)
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT))
        const tick = () => {
          if (!analyserRef.current) return
          analyser.getByteFrequencyData(data)
          const next = new Array(BAR_COUNT)
          for (let i = 0; i < BAR_COUNT; i++) {
            const v = data[i * step] || 0
            next[i] = v / 255
          }
          setBars(next)
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        /* permiso denegado o sin dispositivo — mantener barras en 0 */
      }
    }

    function stop() {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      try { analyserRef.current?.disconnect() } catch { /* nop */ }
      analyserRef.current = null
      try { audioCtxRef.current?.close() } catch { /* nop */ }
      audioCtxRef.current = null
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setBars(new Array(BAR_COUNT).fill(0))
    }

    if (active) start()
    return () => { cancelled = true; stop() }
  }, [active])

  return bars
}

/* ─────────────────── Sugerencias contextuales ─────────────────── */
const SUGERENCIAS_GLOBALES = [
  '¿Cuántos huevos se produjeron hoy?',
  '¿Cuál es la mortalidad de esta semana?',
  '¿Hay insumos críticos?',
  '¿Qué tratamientos están activos?',
]

const SUGERENCIAS_POR_RUTA = {
  '/dashboard/galpones': [
    '¿Qué galpón tiene peor desempeño?',
    '¿Cuál es el galpón más ocupado?',
    'Resumen de todos los galpones activos',
  ],
  '/dashboard/lotes': [
    '¿Qué lote tiene mejor supervivencia?',
    '¿Cuántos lotes están activos?',
    '¿Hay lotes con mortalidad elevada?',
  ],
  '/dashboard/produccion': [
    '¿Producción hoy vs ayer?',
    '¿Qué galpón produce más huevos?',
    '¿Cuál es la postura promedio esta semana?',
  ],
  '/dashboard/mortalidad': [
    '¿Causa más común de mortalidad?',
    '¿Mortalidad total esta semana?',
    '¿Hay picos de mortalidad recientes?',
  ],
  '/dashboard/insumos': [
    '¿Qué insumos están críticos?',
    '¿Cuáles están próximos a agotarse?',
    '¿Cuánto alimento tengo en stock?',
  ],
  '/dashboard/tratamientos': [
    '¿Qué tratamientos están activos?',
    '¿Vacunaciones aplicadas esta semana?',
    '¿Cuántos tratamientos por antibiótico?',
  ],
  '/dashboard/predicciones': [
    '¿Cuál es la tendencia de producción?',
    'Proyección de huevos esta semana',
    '¿Mortalidad proyectada?',
  ],
  '/dashboard/gemelo-digital': [
    '¿Qué galpones están en estado crítico?',
    '¿Cuál es el score promedio?',
    '¿Qué lote requiere más atención?',
  ],
  '/dashboard/reportes': [
    'Resumen operativo del mes',
    'Producción total últimos 30 días',
    'Comparativo semana vs semana',
  ],
  '/dashboard/proveedores': [
    '¿Qué proveedores hay registrados?',
    '¿Proveedor con mayor volumen?',
  ],
  '/dashboard/empleados': [
    '¿Cuántos empleados activos?',
    'Lista de encargados por galpón',
  ],
}

function suggestionsForRoute(pathname) {
  const keys = Object.keys(SUGERENCIAS_POR_RUTA).sort((a, b) => b.length - a.length)
  for (const k of keys) if (pathname.startsWith(k)) return SUGERENCIAS_POR_RUTA[k]
  return SUGERENCIAS_GLOBALES
}

/* ─────────────────── Markdown ─────────────────── */
function renderInline(text, kp = '') {
  const parts = []
  const regex = /(`[^`\n]+`)|(\*\*[^*]+\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0, m, idx = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) parts.push(<code key={`${kp}-c-${idx++}`} className="px-1 py-0.5 rounded bg-stone-200/70 dark:bg-stone-700/80 text-stone-800 dark:text-stone-100 text-[12px] font-mono">{m[1].slice(1, -1)}</code>)
    else if (m[2]) parts.push(<strong key={`${kp}-b-${idx++}`} className="font-semibold">{m[2].slice(2, -2)}</strong>)
    else if (m[3]) parts.push(<a key={`${kp}-a-${idx++}`} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 underline underline-offset-2 hover:no-underline">{m[4]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 0 ? text : parts
}

function parseTable(lines) {
  if (lines.length < 2) return null
  if (!/^\s*\|?\s*[:\- ]+\|[:\- |]+$/.test(lines[1])) return null
  const split = r => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
  return { headers: split(lines[0]), rows: lines.slice(2).filter(l => l.includes('|')).map(split) }
}

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const blocks = []
  let bullets = [], numbered = [], codeLines = null, codeLang = '', tableLines = []
  let key = 0
  const flushB = () => { if (!bullets.length) return; blocks.push(<ul key={key++} className="space-y-1 my-1.5">{bullets.map((b, i) => <li key={i} className="flex gap-1.5 items-start leading-snug"><span className="text-primary-500 dark:text-primary-400 mt-[5px] flex-shrink-0 w-1 h-1 rounded-full bg-current" /><span className="flex-1">{renderInline(b, `ul-${key}-${i}`)}</span></li>)}</ul>); bullets = [] }
  const flushN = () => { if (!numbered.length) return; blocks.push(<ol key={key++} className="space-y-1 my-1.5 list-decimal list-inside marker:text-primary-500 marker:font-semibold">{numbered.map((b, i) => <li key={i} className="leading-snug">{renderInline(b, `ol-${key}-${i}`)}</li>)}</ol>); numbered = [] }
  const flushT = () => {
    if (!tableLines.length) return
    const p = parseTable(tableLines)
    if (p) {
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-gradient-to-r from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900">
              <tr>{p.headers.map((h, i) => <th key={i} className="px-2.5 py-2 text-left font-semibold text-stone-600 dark:text-stone-200 whitespace-nowrap border-b border-stone-200 dark:border-stone-700">{renderInline(h, `th-${key}-${i}`)}</th>)}</tr>
            </thead>
            <tbody>
              {p.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-stone-100 dark:border-stone-700/60 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                  {r.map((c, ci) => <td key={ci} className="px-2.5 py-1.5 text-stone-700 dark:text-stone-200 whitespace-nowrap tabular-nums">{renderInline(c, `td-${key}-${ri}-${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    } else tableLines.forEach((l, i) => blocks.push(<p key={`${key++}-${i}`} className="leading-relaxed">{renderInline(l, `p-${key}`)}</p>))
    tableLines = []
  }
  const flushC = () => {
    if (codeLines == null) return
    blocks.push(
      <pre key={key++} className="my-2 p-3 rounded-xl bg-stone-900 dark:bg-black/60 ring-1 ring-stone-800 text-stone-100 text-[12px] font-mono overflow-x-auto">
        {codeLang && <div className="text-[10px] text-primary-400 uppercase tracking-wider mb-1.5 font-sans">{codeLang}</div>}
        <code>{codeLines.join('\n')}</code>
      </pre>
    )
    codeLines = null; codeLang = ''
  }
  const flushAll = () => { flushB(); flushN(); flushT() }

  for (const line of lines) {
    if (/^```/.test(line)) {
      if (codeLines == null) { flushAll(); codeLines = []; codeLang = line.replace(/^```/, '').trim() }
      else flushC()
      continue
    }
    if (codeLines != null) { codeLines.push(line); continue }
    if (/^\s*\|?.*\|.*$/.test(line) && line.includes('|')) { flushB(); flushN(); tableLines.push(line); continue }
    else if (tableLines.length) flushT()
    const b = line.match(/^[-*•]\s+(.+)/)
    const n = line.match(/^(\d+)\.\s+(.+)/)
    if (b) { flushN(); bullets.push(b[1]) }
    else if (n) { flushB(); numbered.push(n[2]) }
    else if (line.trim() === '') flushAll()
    else { flushAll(); blocks.push(<p key={key++} className="leading-relaxed">{renderInline(line, `p-${key}`)}</p>) }
  }
  flushC(); flushAll()
  return blocks.length ? blocks : <span>{text}</span>
}

/* ─────────────────── Utils ─────────────────── */
function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function TypingDots({ sinceTs }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!sinceTs) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [sinceTs])
  const secs = sinceTs ? Math.max(0, Math.floor((now - sinceTs) / 1000)) : 0
  const showCounter = secs >= 3
  const slow = secs >= 20
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
        </div>
        {showCounter && (
          <span className={`text-[10px] tabular-nums ${slow ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-stone-400 dark:text-stone-500'}`}>{secs}s</span>
        )}
      </div>
      {slow && (
        <span className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight">El modelo tarda más de lo normal…</span>
      )}
    </div>
  )
}

function useCountdown(until) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until || until <= Date.now()) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

/* ─────────────────── Mensaje ─────────────────── */
function Message({ msg, onRetry }) {
  const isUser = msg.role === 'user'
  const ts = formatTime(msg.ts)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* nop */ }
  }
  const showCopy = !isUser && !msg.error && !msg._streaming && !msg.cancelled && msg.content?.length > 0

  // Rate limit especial
  if (msg.rateLimit) {
    return (
      <div className="flex gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 ring-2 ring-amber-100 dark:ring-amber-900/40">
          <Clock className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex flex-col gap-1 max-w-[88%]">
          <div className="text-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/50">
            <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Límite temporal del modelo
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-snug">
              El proveedor de IA (Groq) tiene un cupo por minuto en el plan gratuito. Pasados unos segundos podrás reintentar.
            </p>
          </div>
          {msg._retryText && (
            <button
              onClick={() => onRetry?.(msg._retryText, msg._retryBase ?? [])}
              className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Reintentar ahora
            </button>
          )}
          {ts && <span className="text-[10px] text-stone-400 dark:text-stone-500 pl-0.5">{ts}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 group ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-500/30 mt-0.5 ring-2 ring-white dark:ring-stone-900">
          <Bot className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-sm whitespace-pre-wrap shadow-primary-600/20'
            : msg.error
            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-tl-sm'
            : msg.cancelled
            ? 'bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 italic rounded-tl-sm'
            : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-sm space-y-0.5 border border-stone-150 dark:border-stone-700/60'
        }`}>
          {isUser || msg.error || msg.cancelled ? (
            <>
              {msg.content}
              {msg._streaming && <span className="inline-block w-1 h-3.5 ml-0.5 bg-current animate-pulse align-middle rounded-sm" />}
            </>
          ) : (
            <>
              {renderMarkdown(msg.content)}
              {msg._streaming && <span className="inline-block w-1 h-3.5 ml-0.5 bg-primary-500 animate-pulse align-middle rounded-sm" />}
            </>
          )}
        </div>
        <div className={`flex items-center gap-2 text-[10px] text-stone-400 dark:text-stone-500 ${isUser ? 'flex-row-reverse pr-0.5' : 'pl-0.5'}`}>
          {msg.error && msg._retryText && (
            <button onClick={() => onRetry?.(msg._retryText, msg._retryBase ?? [])} className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-semibold">
              <RefreshCw className="h-3 w-3" /> Reintentar
            </button>
          )}
          {showCopy && (
            <button onClick={copy} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-all" aria-label="Copiar respuesta">
              {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
            </button>
          )}
          {ts && <span>{ts}</span>}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── ChatBot principal ─────────────────── */
/* ─────────────────── Voice Recorder (modo escuchando) ─────────────────── */
function VoiceRecorder({ transcript, onCancel, onStop, onSend, canSend }) {
  const bars = useAudioVisualizer(true)
  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [transcript])

  return (
    <div className="flex-shrink-0 border-t border-stone-150 dark:border-stone-800 bg-gradient-to-b from-stone-50 to-white dark:from-stone-800/60 dark:to-stone-900 animate-fade-in">
      {/* Transcripción en vivo */}
      <div className="px-4 pt-3 pb-1">
        <div
          ref={scrollRef}
          className="text-sm text-stone-800 dark:text-stone-100 leading-snug min-h-[1.25rem] max-h-16 overflow-y-auto"
        >
          {transcript ? (
            <span>{transcript}<span className="inline-block w-1 h-3.5 ml-0.5 bg-red-500 animate-pulse align-middle rounded-sm" /></span>
          ) : (
            <span className="text-stone-400 dark:text-stone-500 italic text-xs flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Escuchando… empieza a hablar
            </span>
          )}
        </div>
      </div>

      {/* Controles + waveform */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        {/* Cancelar */}
        <button
          type="button"
          onClick={onCancel}
          className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label="Cancelar dictado"
          title="Cancelar y descartar"
        >
          <X className="h-4 w-4 text-stone-600 dark:text-stone-200" />
        </button>

        {/* Waveform */}
        <div className="flex-1 h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 flex items-center justify-center gap-[2px] overflow-hidden">
          {bars.map((v, i) => {
            const h = Math.max(3, v * 28)
            const centerBoost = 1 - Math.abs(i - bars.length / 2) / (bars.length / 2) * 0.3
            const opacity = 0.5 + v * 0.5
            return (
              <span
                key={i}
                style={{ height: `${h * centerBoost}px`, opacity }}
                className="w-[2px] rounded-full bg-gradient-to-t from-primary-500 to-primary-400 dark:from-primary-400 dark:to-amber-300 transition-[height] duration-75"
              />
            )
          })}
        </div>

        {/* Stop (termina grabación, mantiene texto) */}
        <button
          type="button"
          onClick={onStop}
          className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label="Detener grabación"
          title="Detener grabación (editar antes de enviar)"
        >
          <Square className="h-3.5 w-3.5 text-stone-700 dark:text-stone-200 fill-current" />
        </button>

        {/* Enviar */}
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 disabled:from-stone-300 disabled:to-stone-400 dark:disabled:from-stone-700 dark:disabled:to-stone-700 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all shadow-md shadow-primary-500/30 hover:shadow-lg hover:shadow-primary-500/40 disabled:shadow-none"
          aria-label="Enviar transcripción"
          title="Detener y enviar"
        >
          <ArrowUp className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  )
}

export default function ChatBot() {
  const [open, setOpen]         = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [input, setInput]       = useState('')
  const [listening, setListening] = useState(false)
  const [micError, setMicError]   = useState('')
  const { messages, isLoading, isStreaming, rateLimitUntil, pendingSince, sendMessage, retryMessage, clearMessages, abort } = useChat()
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const recRef    = useRef(null)
  const location  = useLocation()

  const contextSuggestions = useMemo(() => suggestionsForRoute(location.pathname), [location.pathname])
  const rateRemaining = useCountdown(rateLimitUntil)
  const rateLocked = rateRemaining > 0

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open, expanded])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(v => !v) }
      if (e.key === 'Escape' && open) { if (expanded) setExpanded(false); else setOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, expanded])

  const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

  const toggleMic = useCallback(() => {
    if (!SpeechRec) {
      setMicError('Tu navegador no soporta dictado por voz. Usa Chrome/Edge.')
      setTimeout(() => setMicError(''), 3500)
      return
    }
    if (listening) { try { recRef.current?.stop() } catch { /* nop */ } setListening(false); return }
    const rec = new SpeechRec()
    rec.lang = 'es-CO'; rec.interimResults = true; rec.continuous = true
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t; else interim += t
      }
      setInput(finalText + interim)
    }
    rec.onerror = (e) => { setListening(false); setMicError(e.error === 'not-allowed' ? 'Permiso de micrófono denegado.' : 'Error al dictar.'); setTimeout(() => setMicError(''), 3500) }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }, [SpeechRec, listening])

  const cancelMic = useCallback(() => {
    try { recRef.current?.abort?.() } catch { /* nop */ }
    try { recRef.current?.stop?.() } catch { /* nop */ }
    recRef.current = null
    setListening(false)
    setInput('')
  }, [])

  function handleSubmit(e) {
    e?.preventDefault?.()
    if (!input.trim() || isLoading || rateLocked) return
    if (listening) { try { recRef.current?.stop() } catch { /* nop */ } }
    sendMessage(input); setInput('')
  }
  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }
  function handleClear() { abort(); clearMessages() }

  const panelDims = expanded
    ? { width: 'min(calc(100vw - 2rem), 48rem)', height: 'min(calc(100vh - 6rem), 48rem)' }
    : { width: 'min(calc(100vw - 1rem), 22rem)', height: 'min(calc(100vh - 160px), 540px)' }

  const canSend = input.trim() && !isLoading && !rateLocked

  return (
    <>
      {open && expanded && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setExpanded(false)} aria-hidden="true" />
      )}

      {open && (
        <div
          className={`fixed z-50 flex flex-col bg-white dark:bg-stone-900 rounded-2xl shadow-2xl shadow-primary-900/10 dark:shadow-black/40 border border-stone-200 dark:border-stone-700 overflow-hidden transition-all duration-300 ${
            expanded ? 'bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2' : 'bottom-32 right-2'
          }`}
          style={panelDims}
          role="dialog"
          aria-label="Asistente AvicolaMC"
        >
          {/* Header con gradient animado */}
          <div className="relative flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 bg-[length:200%_100%] animate-gradient-x flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
            <div className="relative flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-60" />
                <div className="relative w-9 h-9 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                  <Bot className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate flex items-center gap-1.5">
                  Asistente AvicolaMC
                  <Sparkles className="h-3 w-3 text-amber-200" />
                </p>
                <p className="text-[11px] text-primary-100 flex items-center gap-1.5">
                  {isStreaming ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />Respondiendo…</>
                  ) : rateLocked ? (
                    <><Clock className="h-2.5 w-2.5" />Reintenta en {rateRemaining}s</>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />Datos en tiempo real</>
                  )}
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-1">
              <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-primary-100 hover:text-white hover:bg-white/15 rounded-lg transition-colors" title={expanded ? 'Reducir' : 'Expandir'} aria-label={expanded ? 'Reducir panel' : 'Expandir panel'}>
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              {messages.length > 0 && (
                <button onClick={handleClear} className="p-1.5 text-primary-100 hover:text-white hover:bg-white/15 rounded-lg transition-colors" title="Limpiar conversación" aria-label="Limpiar conversación">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-primary-100 hover:text-white hover:bg-white/15 rounded-lg transition-colors" aria-label="Cerrar asistente">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-stone-50/50 to-white dark:from-stone-900 dark:to-stone-900 scroll-smooth">
            {messages.length === 0 ? (
              <div className="space-y-4 animate-fade-in">
                {/* Welcome card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 to-amber-50 dark:from-stone-800/80 dark:to-stone-800/60 border border-primary-200/50 dark:border-stone-700 p-4">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl" />
                  <div className="relative flex items-start gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-500/30">
                      <Bot className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100">¡Hola! Soy tu asistente IA 👋</p>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                        Consulta producción, mortalidad, inventario y más — todo con datos en vivo de tu granja.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Sugerencias */}
                <div className="space-y-2">
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest font-bold flex items-center gap-1.5 px-1">
                    <Sparkles className="h-3 w-3 text-primary-500" />
                    Sugeridas para esta pantalla
                  </p>
                  <div className="space-y-1.5">
                    {contextSuggestions.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        disabled={rateLocked}
                        className="group w-full text-left text-xs text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-stone-200 dark:border-stone-700 hover:border-primary-300 dark:hover:border-primary-700 rounded-xl px-3 py-2.5 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{ animation: `fadeInUp 300ms ease-out ${i * 60}ms both` }}
                      >
                        <span className="w-6 h-6 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/60 transition-colors">
                          {i + 1}
                        </span>
                        <span className="flex-1 leading-tight">{s}</span>
                        <Send className="h-3 w-3 text-stone-300 dark:text-stone-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <Message key={i} msg={msg} onRetry={retryMessage} />)
            )}

            {isLoading && !isStreaming && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-500/30 ring-2 ring-white dark:ring-stone-900">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-white dark:bg-stone-800 rounded-2xl rounded-tl-sm border border-stone-150 dark:border-stone-700/60 shadow-sm">
                  <TypingDots sinceTs={pendingSince} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Mic error */}
          {micError && (
            <div className="mx-3 mb-2 px-3 py-2 text-[11px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              {micError}
            </div>
          )}

          {/* Rate limit banner global */}
          {rateLocked && (
            <div className="mx-3 mb-2 px-3 py-2 text-[11px] bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-2">
              <Clock className="h-3 w-3 flex-shrink-0 animate-pulse" />
              <span className="flex-1">Espera <strong className="tabular-nums">{rateRemaining}s</strong> para enviar otra consulta.</span>
            </div>
          )}

          {/* Input */}
          {/* ── Input / Modo voz ── */}
          {listening ? (
            <VoiceRecorder
              transcript={input}
              onCancel={cancelMic}
              onStop={() => { try { recRef.current?.stop() } catch { /* nop */ } setListening(false) }}
              onSend={() => handleSubmit()}
              canSend={!!input.trim()}
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-stone-150 dark:border-stone-800 flex-shrink-0 bg-white dark:bg-stone-900">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={rateLocked ? `Espera ${rateRemaining}s…` : 'Pregunta algo, o usa el micrófono…'}
                  disabled={isLoading || rateLocked}
                  className="w-full text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 disabled:opacity-60 transition-all"
                />
                {SpeechRec && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={isLoading || rateLocked}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all text-stone-400 dark:text-stone-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    aria-label="Dictar por voz"
                    title="Dictar por voz (es-CO)"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {isLoading ? (
                <button type="button" onClick={abort} className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-md shadow-red-500/30" aria-label="Detener respuesta" title="Detener respuesta">
                  <Square className="h-3.5 w-3.5 text-white fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 disabled:from-stone-200 disabled:to-stone-300 dark:disabled:from-stone-700 dark:disabled:to-stone-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-md shadow-primary-500/30 hover:shadow-lg hover:shadow-primary-500/40 disabled:shadow-none"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4 text-white" />
                </button>
              )}
            </form>
          )}

          {/* Footer hint */}
          <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-[9px]">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-[9px]">K</kbd>
              para abrir/cerrar
            </span>
            {expanded && <span>Esc para reducir</span>}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-16 right-2 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 group ${
          open
            ? 'bg-stone-600 hover:bg-stone-700 shadow-stone-600/30'
            : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 hover:scale-110 shadow-primary-500/40'
        }`}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente (Ctrl+K)'}
        title={open ? 'Cerrar' : 'Asistente IA · Ctrl+K'}
      >
        {!open && <span className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-30" />}
        {open
          ? <X className="h-6 w-6 text-white" />
          : <MessageCircle className="h-6 w-6 text-white relative" />
        }
        {!open && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </span>
        )}
      </button>
    </>
  )
}
