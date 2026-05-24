import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadPerfil(userId) {
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data)
    // update last access
    await supabase.from('perfiles').update({ ultimo_acceso: new Date().toISOString() }).eq('id', userId)
  }

  useEffect(() => {
    // getSession() is the authoritative source: validates and refreshes the JWT.
    // We use it for the initial state and set loading=false only after it resolves.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadPerfil(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION: getSession() above is the validated source of truth.
      // Processing INITIAL_SESSION here can surface an expired token before the
      // refresh completes, causing a premature redirect to /dashboard.
      if (event === 'INITIAL_SESSION') return
      setSession(session)
      if (session?.user) {
        loadPerfil(session.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: perfilData } = await supabase
      .from('perfiles')
      .select('estado')
      .eq('id', data.user.id)
      .single()

    if (perfilData?.estado === 'inactivo') {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta está inactiva. Contacta al administrador.')
    }

    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    queryClient.clear()
    setPerfil(null)
    setSession(null)
  }

  async function refreshPerfil() {
    if (session?.user) await loadPerfil(session.user.id)
  }

  const isAdmin = perfil?.rol === 'administrador'
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
