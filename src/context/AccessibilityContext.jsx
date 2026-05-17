import { createContext, useContext, useEffect, useState } from 'react'

const A11yCtx = createContext(null)

export function AccessibilityProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const v = localStorage.getItem('a11y-dark')
    return v !== null ? v === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [contrast, setContrast] = useState(() => localStorage.getItem('a11y-contrast') === 'true')
  const [textSize, setTextSize] = useState(() => localStorage.getItem('a11y-text') || 'md')
  const [noMotion, setNoMotion] = useState(() => {
    const v = localStorage.getItem('a11y-motion')
    return v !== null ? v === 'true' : window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('a11y-dark', dark)
  }, [dark])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', contrast)
    localStorage.setItem('a11y-contrast', contrast)
  }, [contrast])

  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize)
    localStorage.setItem('a11y-text', textSize)
  }, [textSize])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', noMotion)
    localStorage.setItem('a11y-motion', noMotion)
  }, [noMotion])

  return (
    <A11yCtx.Provider value={{ dark, setDark, contrast, setContrast, textSize, setTextSize, noMotion, setNoMotion }}>
      {children}
    </A11yCtx.Provider>
  )
}

export const useA11y = () => useContext(A11yCtx)
