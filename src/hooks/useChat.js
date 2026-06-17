import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const FUNCTIONS_URL  = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-avicola`
const SESSION_KEY    = 'avicola_chat_v1'
const MAX_HISTORY    = 10   // máximo de mensajes enviados al modelo por request

function loadMessages() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]')
  } catch { return [] }
}

export function useChat() {
  const [messages, setMessages] = useState(loadMessages)
  const [isLoading, setIsLoading]   = useState(false)
  const msgsRef     = useRef(messages)
  const loadingRef  = useRef(false)

  useEffect(() => {
    msgsRef.current = messages
  }, [messages])

  useEffect(() => {
    try {
      const toSave = messages.map(({ _retryText, _retryBase, ...m }) => m)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave))
    } catch {}
  }, [messages])

  const _fetch = useCallback(async (msgsWithUser) => {
    loadingRef.current = true
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(FUNCTIONS_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: msgsWithUser
            .filter(m => !m.error)
            .slice(-MAX_HISTORY)
            .map(({ role, content }) => ({ role, content })),
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? 'Error del servidor')
      setMessages(prev => [...prev, { role: 'assistant', content: payload.response, ts: Date.now() }])
    } catch (err) {
      const lastUserIdx  = msgsWithUser.map(m => m.role).lastIndexOf('user')
      const retryText    = lastUserIdx >= 0 ? msgsWithUser[lastUserIdx].content : undefined
      const retryBase    = lastUserIdx >= 0 ? msgsWithUser.slice(0, lastUserIdx) : []
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: err.message, error: true, ts: Date.now(), _retryText: retryText, _retryBase: retryBase },
      ])
    } finally {
      loadingRef.current = false
      setIsLoading(false)
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
    setMessages([])
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }, [])

  return { messages, isLoading, sendMessage, retryMessage, clearMessages }
}
