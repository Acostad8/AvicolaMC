import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'avicola-mc-config'
const CONFIG_ID = 1

export const CONFIG_DEFAULTS = {
  granja: {
    nombre:    '',
    nit:       '',
    direccion: '',
    ciudad:    '',
    telefono:  '',
    email:     '',
  },
  produccion: {
    postura_excelente:       90,
    postura_buena:           75,
    postura_regular:         50,
    alerta_mortalidad:        5,
    umbral_dias_tratamiento:  7,
    peso_promedio_huevo_g:   60,
  },
  notificaciones: {
    habilitadas:   true,
    sistema:       true,
    produccion:    true,
    mortalidad:    true,
    recordatorios: true,
  },
}

function mergeWithDefaults(data) {
  return {
    granja:         { ...CONFIG_DEFAULTS.granja,         ...(data?.granja         || {}) },
    produccion:     { ...CONFIG_DEFAULTS.produccion,     ...(data?.produccion     || {}) },
    notificaciones: { ...CONFIG_DEFAULTS.notificaciones, ...(data?.notificaciones || {}) },
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? mergeWithDefaults(JSON.parse(raw)) : CONFIG_DEFAULTS
  } catch {
    return CONFIG_DEFAULTS
  }
}

const ConfigCtx = createContext(null)

export function ConfigProvider({ children }) {
  // localStorage provides instant initial value while Supabase hydrates
  const [config, setConfig] = useState(loadLocal)

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('granja, produccion, notificaciones')
      .eq('id', CONFIG_ID)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        const merged = mergeWithDefaults(data)
        setConfig(merged)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      })
  }, [])

  const saveSection = useCallback((section, values) => {
    setConfig(prev => {
      const next = { ...prev, [section]: { ...prev[section], ...values } }
      // Optimistic local write so the UI never lags
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      // Sync the full config row to Supabase
      supabase
        .from('configuracion')
        .upsert({
          id:             CONFIG_ID,
          granja:         next.granja,
          produccion:     next.produccion,
          notificaciones: next.notificaciones,
          updated_at:     new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('[config] sync error:', error.message)
        })
      return next
    })
  }, [])

  return (
    <ConfigCtx.Provider value={{ config, saveSection }}>
      {children}
    </ConfigCtx.Provider>
  )
}

export const useConfig = () => useContext(ConfigCtx)
