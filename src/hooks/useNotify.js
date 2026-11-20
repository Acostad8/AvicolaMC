import { useConfig } from '../context/ConfigContext'
import { useNotifications } from '../context/NotificationsContext'
import { showToast } from '../components/ui/Toast'

/**
 * Hook para emitir notificaciones respetando las preferencias del usuario.
 *
 * Uso:
 *   const { success, error, warning, info } = useNotify()
 *   success('Registro guardado', { categoria: 'produccion', titulo: 'Producción' })
 *
 * Categorías disponibles: 'sistema' | 'produccion' | 'mortalidad' | 'recordatorio'
 */
export function useNotify() {
  const { config } = useConfig()
  const { addNotification } = useNotifications()

  function notify({ tipo = 'info', titulo = null, mensaje, categoria = 'sistema' }) {
    const prefs = config.notificaciones || {}
    const globalOn = prefs.habilitadas !== false
    const catOn    = prefs[categoria]  !== false

    if (globalOn) {
      addNotification({ titulo, mensaje, tipo, categoria })
    }
    if (!globalOn || !catOn) return

    showToast({ tipo, titulo: titulo || undefined, mensaje })
  }

  return {
    notify,
    success: (mensaje, opts = {}) => notify({ tipo: 'success', mensaje, ...opts }),
    error:   (mensaje, opts = {}) => notify({ tipo: 'error',   mensaje, ...opts }),
    warning: (mensaje, opts = {}) => notify({ tipo: 'warning', mensaje, ...opts }),
    info:    (mensaje, opts = {}) => notify({ tipo: 'info',    mensaje, ...opts }),
  }
}
