import toast from 'react-hot-toast'
import { useConfig } from '../context/ConfigContext'
import { useNotifications } from '../context/NotificationsContext'

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

    // Siempre guarda en el historial si las notificaciones están habilitadas
    if (globalOn) {
      addNotification({ titulo, mensaje, tipo, categoria })
    }

    // Muestra el toast solo si la categoría está habilitada
    if (!globalOn || !catOn) return

    switch (tipo) {
      case 'success': toast.success(titulo ? `${titulo}: ${mensaje}` : mensaje); break
      case 'error':   toast.error(titulo ? `${titulo}: ${mensaje}` : mensaje);   break
      case 'warning': toast(titulo ? `${titulo}: ${mensaje}` : mensaje, { icon: '⚠️' }); break
      default:        toast(titulo ? `${titulo}: ${mensaje}` : mensaje);          break
    }
  }

  return {
    notify,
    success: (mensaje, opts = {}) => notify({ tipo: 'success', mensaje, ...opts }),
    error:   (mensaje, opts = {}) => notify({ tipo: 'error',   mensaje, ...opts }),
    warning: (mensaje, opts = {}) => notify({ tipo: 'warning', mensaje, ...opts }),
    info:    (mensaje, opts = {}) => notify({ tipo: 'info',    mensaje, ...opts }),
  }
}
