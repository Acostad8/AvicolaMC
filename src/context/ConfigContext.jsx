import { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'avicola-mc-config'

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
    postura_excelente:  90,
    postura_buena:      75,
    postura_regular:    50,
    alerta_mortalidad:   5,
  },
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return CONFIG_DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      granja:     { ...CONFIG_DEFAULTS.granja,     ...parsed.granja },
      produccion: { ...CONFIG_DEFAULTS.produccion, ...parsed.produccion },
    }
  } catch {
    return CONFIG_DEFAULTS
  }
}

const ConfigCtx = createContext(null)

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(load)

  const saveSection = useCallback((section, values) => {
    setConfig(prev => {
      const next = { ...prev, [section]: { ...prev[section], ...values } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
