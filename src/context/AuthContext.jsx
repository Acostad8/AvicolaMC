import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'
import { registrarEvento } from '../lib/auditoria'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

// Intervalo para verificar estado del perfil en BD (solo cuando el tab está activo)
const POLL_INTERVAL_MS = 3 * 60 * 1000 // 3 minutos

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [perfil, setPerfil]     = useState(null)
  const [loading, setLoading]   = useState(true)

  // true cuando el usuario cierra sesión explícitamente → evita toast de "sesión expirada"
  const manualSignOutRef = useRef(false)
  // espejo estable del estado session para usarlo dentro de closures y listeners
  const sessionRef       = useRef(null)
  // ID del intervalo de polling de estado
  const intervalRef      = useRef(null)

  async function loadPerfil(userId) {
    const { data } = await supabase
      .from('perfiles').select('*').eq('id', userId).single()
    setPerfil(data)
    await supabase
      .from('perfiles').update({ ultimo_acceso: new Date().toISOString() }).eq('id', userId)
    return data
  }

  // Limpia todo el estado de autenticación de forma consistente
  function clearAuthState() {
    setPerfil(null)
    setSession(null)
    sessionRef.current = null
    queryClient.clear()
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  // Inicia el polling periódico que verifica si la cuenta sigue activa en BD
  function startEstadoPolling(userId) {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      // No consultar si el tab está en segundo plano
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('perfiles').select('estado').eq('id', userId).single()
      if (data?.estado === 'inactivo') {
        toast.error('Tu cuenta ha sido desactivada por un administrador.', { id: 'account-disabled' })
        manualSignOutRef.current = true    // no mostrar toast de "sesión expirada"
        await supabase.auth.signOut()      // onAuthStateChange → clearAuthState()
      }
    }, POLL_INTERVAL_MS)
  }

  useEffect(() => {
    // getSession() valida y refresca el JWT — fuente de verdad inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      sessionRef.current = session
      if (session?.user) {
        loadPerfil(session.user.id)
          .then(() => startEstadoPolling(session.user.id))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Escucha cambios de autenticación (incluyendo otros tabs via BroadcastChannel)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'INITIAL_SESSION') return

      if (newSession?.user) {
        setSession(newSession)
        sessionRef.current = newSession
        loadPerfil(newSession.user.id).then(() => startEstadoPolling(newSession.user.id))
      } else {
        // Sesión terminada: distinguir cierre manual de expiración involuntaria
        const wasManual = manualSignOutRef.current
        manualSignOutRef.current = false
        clearAuthState()
        if (!wasManual) {
          toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', {
            id: 'session-expired',
          })
        }
      }
    })

    // Re-valida la sesión cada vez que el usuario vuelve al tab
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !sessionRef.current) return
      const { data: { session: current } } = await supabase.auth.getSession()
      if (!current) {
        // El JWT expiró mientras el tab estaba en segundo plano;
        // onAuthStateChange debería dispararse también, pero limpiamos
        // localmente por si hay retraso.
        clearAuthState()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(intervalRef.current)
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: perfilData } = await supabase
      .from('perfiles')
      .select('estado, nombre_completo')
      .eq('id', data.user.id)
      .single()

    if (perfilData?.estado === 'inactivo') {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta está inactiva. Contacta al administrador.')
    }

    registrarEvento({
      operacion: 'LOGIN',
      usuario_id: data.user.id,
      usuario_nombre: perfilData?.nombre_completo,
      descripcion: 'Inicio de sesión exitoso',
      datos_nuevos: { email: data.user.email },
    })

    return data
  }

  async function signOut() {
    if (session?.user) {
      await registrarEvento({
        operacion: 'LOGOUT',
        usuario_id: session.user.id,
        usuario_nombre: perfil?.nombre_completo,
        descripcion: 'Cierre de sesión',
      })
    }
    manualSignOutRef.current = true
    await supabase.auth.signOut()
    clearAuthState()
  }

  async function refreshPerfil() {
    if (session?.user) await loadPerfil(session.user.id)
  }

  const isAdmin    = perfil?.rol === 'administrador'
  const isEncargado = perfil?.rol === 'encargado'

  return (
    <AuthContext.Provider value={{ session, perfil, loading, isAdmin, isEncargado, signIn, signOut, refreshPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
