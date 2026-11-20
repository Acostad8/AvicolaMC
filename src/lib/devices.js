import { supabase } from './supabase'
import { getOrCreateFingerprint, detectPlataforma, getUserAgent } from './deviceId'
import { countPending } from './outbox'

export async function sendHeartbeat({ didSync = false } = {}) {
  if (!navigator.onLine) return { skipped: true, reason: 'offline' }
  try {
    const pending = await countPending()
    const { data, error } = await supabase.rpc('dispositivo_heartbeat', {
      p_fingerprint:   getOrCreateFingerprint(),
      p_user_agent:    getUserAgent(),
      p_plataforma:    detectPlataforma(),
      p_pending_count: pending,
      p_did_sync:      didSync,
    })
    if (error) return { ok: false, error }
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err }
  }
}

export async function fetchOtrosDevicesConPendientes() {
  if (!navigator.onLine) return []
  try {
    const { data, error } = await supabase.rpc('mis_dispositivos_con_pendientes', {
      p_fingerprint_actual: getOrCreateFingerprint(),
    })
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export async function listDispositivos() {
  const { data, error } = await supabase
    .from('dispositivos')
    .select('id, user_id, fingerprint, nombre, plataforma, last_sync, last_seen, pending_count, activo, perdida_aceptada, created_at, perfiles:user_id(nombre_completo, email, rol)')
    .order('last_seen', { ascending: false })
  if (error) throw error
  return data || []
}

export async function toggleActivo(id, activo) {
  const { error } = await supabase.from('dispositivos').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function aceptarPerdida(id) {
  const { error } = await supabase
    .from('dispositivos')
    .update({ perdida_aceptada: true, pending_count: 0 })
    .eq('id', id)
  if (error) throw error
}

export async function renombrarDispositivo(id, nombre) {
  const { error } = await supabase.from('dispositivos').update({ nombre }).eq('id', id)
  if (error) throw error
}
