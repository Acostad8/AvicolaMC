const KEY = 'avicola-mc-device-fp'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getOrCreateFingerprint() {
  try {
    let fp = localStorage.getItem(KEY)
    if (!fp) {
      fp = uuid()
      localStorage.setItem(KEY, fp)
    }
    return fp
  } catch {
    return uuid()
  }
}

export function detectPlataforma() {
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/windows|mac|linux/i.test(ua)) return 'desktop'
  return 'otro'
}

export function getUserAgent() {
  return navigator.userAgent || null
}
