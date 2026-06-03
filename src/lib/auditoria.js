import { supabase } from './supabase'

/**
 * Registra un evento de auditoría desde el frontend.
 * Usado para eventos de sesión que no pasan por triggers de BD.
 * No lanza excepciones: la auditoría nunca debe interrumpir el flujo principal.
 */
export async function registrarEvento({ tabla = 'sesion', operacion, registro_id, usuario_id, usuario_nombre, descripcion, datos_anteriores, datos_nuevos } = {}) {
  try {
    await supabase.from('auditoria').insert({
      tabla,
      operacion,
      registro_id: registro_id ?? null,
      usuario_id: usuario_id ?? null,
      usuario_nombre: usuario_nombre ?? null,
      descripcion: descripcion ?? null,
      datos_anteriores: datos_anteriores ?? null,
      datos_nuevos: datos_nuevos ?? null,
    })
  } catch {
    // silencioso por diseño
  }
}
