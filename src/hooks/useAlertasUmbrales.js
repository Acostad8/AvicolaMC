import { useCallback } from 'react'
import { useNotify } from './useNotify'
import { useConfig } from '../context/ConfigContext'
import { supabase } from '../lib/supabase'
import { TIPOS_TRATAMIENTO } from '../lib/utils'

const SESSION_KEY = 'avicola-alertas-sesion'

function getSessionAlerts() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')) }
  catch { return new Set() }
}

function addSessionAlert(key) {
  const set = getSessionAlerts()
  set.add(key)
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]))
}

function hasSessionAlert(key) {
  return getSessionAlerts().has(key)
}

export function useAlertasUmbrales() {
  const { warning } = useNotify()
  const { config }  = useConfig()

  /**
   * Dispara alerta si la mortalidad registrada supera el umbral configurado.
   * Llamar justo después de guardar un registro de mortalidad (solo en creación).
   */
  const checkMortalidad = useCallback(({ cantidadBajas, avesAntes, galponNombre, loteNombre }) => {
    const umbral = Number(config.produccion?.alerta_mortalidad ?? 5)
    if (!avesAntes || avesAntes === 0 || !cantidadBajas) return
    const pct = (cantidadBajas / avesAntes) * 100
    if (pct >= umbral) {
      warning(
        `${pct.toFixed(1)}% de mortalidad en ${galponNombre} (${loteNombre}) — umbral: ${umbral}%`,
        { titulo: 'Alerta de mortalidad', categoria: 'mortalidad' }
      )
    }
  }, [config.produccion?.alerta_mortalidad, warning])

  /**
   * Dispara alerta si el stock post-movimiento cae al nivel mínimo o por debajo.
   * Llamar justo después de guardar una salida de inventario.
   */
  const checkStockMinimo = useCallback(({ insumoNombre, stockPost, stockMinimo, unidad }) => {
    if (!stockMinimo || stockMinimo === 0) return
    if (stockPost <= stockMinimo) {
      warning(
        `"${insumoNombre}": quedan ${stockPost} ${unidad} (mínimo: ${stockMinimo} ${unidad})`,
        { titulo: 'Stock bajo mínimo', categoria: 'sistema' }
      )
    }
  }, [warning])

  /**
   * Consulta tratamientos activos que llevan más días que el umbral configurado.
   * Usa sessionStorage para no repetir alertas en la misma sesión.
   * Llamar una vez al cargar el layout privado.
   */
  const checkTratamientosLargos = useCallback(async () => {
    const umbralDias = Number(config.produccion?.umbral_dias_tratamiento ?? 7)
    const hoy        = new Date()
    const limite     = new Date(hoy.getTime() - umbralDias * 24 * 3600 * 1000)
    const limiteStr  = limite.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('tratamientos')
      .select('id, tipo, fecha_inicio, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .eq('estado', 'activo')
      .lte('fecha_inicio', limiteStr)

    if (!data?.length) return

    const hoyStr = hoy.toISOString().slice(0, 10)
    for (const t of data) {
      const sessionKey = `trat-${t.id}-${hoyStr}`
      if (hasSessionAlert(sessionKey)) continue

      const dias      = Math.floor((hoy - new Date(t.fecha_inicio + 'T00:00:00')) / 86_400_000)
      const tipoLabel = TIPOS_TRATAMIENTO.find(tp => tp.value === t.tipo)?.label || t.tipo

      warning(
        `"${tipoLabel}" en ${t.galpon?.nombre || '—'} lleva ${dias} días activo sin completarse`,
        { titulo: 'Tratamiento prolongado', categoria: 'recordatorios' }
      )
      addSessionAlert(sessionKey)
    }
  }, [config.produccion?.umbral_dias_tratamiento, warning])

  return { checkMortalidad, checkStockMinimo, checkTratamientosLargos }
}
