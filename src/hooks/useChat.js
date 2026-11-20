import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-avicola?stream=1`
const SESSION_KEY   = 'avicola_chat_v1'
const MAX_HISTORY   = 10
// Watchdog: si pasa este tiempo sin recibir bytes del stream, abortamos
const STREAM_IDLE_TIMEOUT_MS = 30000
// Timeout total de la petición completa (tope duro)
const REQUEST_TIMEOUT_MS = 90000

function loadMessages() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]')
  } catch { return [] }
}

export function useChat() {
  const [messages, setMessages]   = useState(loadMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [rateLimitUntil, setRateLimitUntil] = useState(0)
  const [pendingSince, setPendingSince] = useState(0)
  const msgsRef     = useRef(messages)
  const loadingRef  = useRef(false)
  const abortRef    = useRef(null)

  useEffect(() => { msgsRef.current = messages }, [messages])

  useEffect(() => {
    try {
      const toSave = messages.map((msg) => {
        const { _retryText: _t, _retryBase: _b, _streaming: _s, ...rest } = msg
        void _t; void _b; void _s
        return rest
      })
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave))
    } catch { /* sessionStorage unavailable */ }
  }, [messages])

  const abort = useCallback(() => {
    try { abortRef.current?.abort() } catch { /* already aborted */ }
  }, [])

  const _fetch = useCallback(async (msgsWithUser) => {
    loadingRef.current = true
    setIsLoading(true)
    setIsStreaming(false)
    setPendingSince(Date.now())
    const ac = new AbortController()
    abortRef.current = ac

    // Timeout global (tope duro) — aborta si la petición completa supera el límite
    const hardTimeout = setTimeout(() => {
      try { ac.abort(new DOMException('timeout', 'TimeoutError')) } catch { /* nop */ }
    }, REQUEST_TIMEOUT_MS)

    // Watchdog de inactividad del stream (reiniciable con cada chunk)
    let idleTimer = null
    const resetIdleWatchdog = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        try { ac.abort(new DOMException('stream_idle', 'TimeoutError')) } catch { /* nop */ }
      }, STREAM_IDLE_TIMEOUT_MS)
    }
    const stopIdleWatchdog = () => { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null } }

    // Agrega placeholder vacío para ir rellenando
    const placeholder = { role: 'assistant', content: '', ts: Date.now(), _streaming: true }
    setMessages(prev => [...prev, placeholder])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sesión no válida. Por favor inicia sesión nuevamente.')

      const res = await fetch(FUNCTIONS_URL, {
        method:  'POST',
        signal:  ac.signal,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Accept':        'text/event-stream',
        },
        body: JSON.stringify({
          messages: msgsWithUser
            .filter(m => !m.error && !m._streaming)
            .slice(-MAX_HISTORY)
            .map(({ role, content }) => ({ role, content })),
        }),
      })

      const ct = res.headers.get('content-type') || ''
      if (!res.ok) {
        let errMsg = `Error del servidor (${res.status})`
        let code
        let retryAfter
        try {
          const body = await res.json()
          errMsg     = body?.error || errMsg
          code       = body?.code
          retryAfter = body?.retry_after
        } catch { /* no json */ }
        if (res.status === 429) {
          const secs = retryAfter || parseInt(res.headers.get('retry-after') || '20', 10)
          setRateLimitUntil(Date.now() + secs * 1000)
          const err = new Error(errMsg)
          err.code = 'rate_limit'
          err.retryAfter = secs
          throw err
        }
        const err = new Error(errMsg)
        err.code = code
        throw err
      }

      // Rama streaming
      if (ct.includes('text/event-stream') && res.body) {
        setIsStreaming(true)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let accumulated = ''
        let gotAny = false
        let streamErr = null

        resetIdleWatchdog()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          resetIdleWatchdog()
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const json = JSON.parse(payload)
              if (json.ping) continue
              if (json.error) { streamErr = new Error(json.error); continue }
              if (json.delta) {
                accumulated += json.delta
                gotAny = true
                setMessages(prev => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  if (last && last._streaming) {
                    copy[copy.length - 1] = { ...last, content: accumulated }
                  }
                  return copy
                })
              }
            } catch (err) {
              if (err?.message && err.message !== 'JSON.parse: unexpected character') throw err
            }
          }
        }
        stopIdleWatchdog()

        if (streamErr && !gotAny) throw streamErr
        if (!gotAny) {
          const e = new Error('El modelo no devolvió contenido. Reintenta con la pregunta.')
          e.code = 'empty_response'
          throw e
        }

        // Cerrar streaming
        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last && last._streaming) {
            copy[copy.length - 1] = { role: 'assistant', content: accumulated, ts: Date.now() }
          }
          return copy
        })
      } else {
        // Fallback JSON síncrono
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? 'Error del servidor')
        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last && last._streaming) {
            copy[copy.length - 1] = { role: 'assistant', content: payload.response, ts: Date.now() }
          } else {
            copy.push({ role: 'assistant', content: payload.response, ts: Date.now() })
          }
          return copy
        })
      }
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.message === 'timeout' || err?.message === 'stream_idle'
      const aborted = !isTimeout && err?.name === 'AbortError'
      const isRateLimit = err?.code === 'rate_limit'
      const lastUserIdx = msgsWithUser.map(m => m.role).lastIndexOf('user')
      const retryText   = lastUserIdx >= 0 ? msgsWithUser[lastUserIdx].content : undefined
      const retryBase   = lastUserIdx >= 0 ? msgsWithUser.slice(0, lastUserIdx) : []
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        let errMsg
        if (aborted)       errMsg = 'Respuesta cancelada.'
        else if (isTimeout) errMsg = 'Tiempo de espera agotado. El modelo tardó demasiado — reintenta.'
        else                errMsg = err.message || 'Error desconocido'
        const base = {
          role: 'assistant', content: errMsg,
          error: !aborted, cancelled: aborted,
          rateLimit: isRateLimit, retryAfter: err?.retryAfter,
          ts: Date.now(), _retryText: retryText, _retryBase: retryBase,
        }
        if (last && last._streaming) copy[copy.length - 1] = base
        else copy.push(base)
        return copy
      })
    } finally {
      clearTimeout(hardTimeout)
      stopIdleWatchdog()
      loadingRef.current = false
      setIsLoading(false)
      setIsStreaming(false)
      setPendingSince(0)
      abortRef.current = null
    }
  }, [])

  const sendMessage = useCallback((text) => {
    const trimmed = text?.trim()
    if (!trimmed || loadingRef.current) return
    const userMsg  = { role: 'user', content: trimmed, ts: Date.now() }
    const nextMsgs = [...msgsRef.current, userMsg]
    setMessages(nextMsgs)
    _fetch(nextMsgs)
  }, [_fetch])

  const retryMessage = useCallback((retryText, retryBase) => {
    if (loadingRef.current) return
    const userMsg  = { role: 'user', content: retryText, ts: Date.now() }
    const nextMsgs = [...retryBase, userMsg]
    setMessages(nextMsgs)
    _fetch(nextMsgs)
  }, [_fetch])

  const clearMessages = useCallback(() => {
    abort()
    setMessages([])
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* unavailable */ }
  }, [abort])

  return { messages, isLoading, isStreaming, rateLimitUntil, pendingSince, sendMessage, retryMessage, clearMessages, abort }
}
