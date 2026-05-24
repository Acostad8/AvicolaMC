import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate, formatNumber, getLabelFromValue, CAUSAS_MORTALIDAD } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Pencil, Clock, History, CheckCircle2 } from 'lucide-react'

function msDesdeCreacion(created_at) {
  if (!created_at) return Infinity
  return Date.now() - new Date(created_at).getTime()
}

function formatearCambios(ant, nue) {
  const etiquetas = {
    fecha:          'Fecha',
    cantidad_bajas: 'Cantidad de bajas',
    causa:          'Causa',
    causa_otra:     'Causa específica',
    observaciones:  'Observaciones',
  }
  const cambios = []
  for (const campo of Object.keys(etiquetas)) {
    const valAnt = campo === 'causa' ? getLabelFromValue(CAUSAS_MORTALIDAD, ant[campo]) : (ant[campo] ?? '—')
    const valNue = campo === 'causa' ? getLabelFromValue(CAUSAS_MORTALIDAD, nue[campo]) : (nue[campo] ?? '—')
    if (String(valAnt) !== String(valNue)) {
      cambios.push({ campo: etiquetas[campo], anterior: valAnt, nuevo: valNue })
    }
  }
  return cambios
}

export default function MortalidadDetalle() {
  const { id } = useParams()

  const { data: reg, isLoading } = useQuery({
    queryKey: ['mortalidad-detalle', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mortalidad')
        .select('*, galpon:galpones(nombre), lote:lotes(nombre_numero), registrado:perfiles(nombre_completo)')
        .eq('id', id)
        .single()
      return data
    },
  })

  const { data: auditoria } = useQuery({
    queryKey: ['auditoria-mortalidad', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria_mortalidad')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('mortalidad_id', id)
        .order('editado_at', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!reg) return null

  const msTranscurridos = msDesdeCreacion(reg.created_at)
  const dentroDeVentana = msTranscurridos <= 24 * 3600 * 1000
  const msRestantes     = Math.max(0, 24 * 3600 * 1000 - msTranscurridos)
  const horasRestantes  = Math.floor(msRestantes / 3600000)
  const minsRestantes   = Math.floor((msRestantes % 3600000) / 60000)

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader
        title="Detalle mortalidad"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mortalidad', href: '/dashboard/mortalidad' },
          { label: 'Detalle' },
        ]}
        actions={
          dentroDeVentana && (
            <Link to={`/dashboard/mortalidad/${id}/editar`}>
              <Button variant="secondary" icon={Pencil}>Editar</Button>
            </Link>
          )
        }
      />

      {/* ── Indicador de ventana de edición ── */}
      {dentroDeVentana ? (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Edición disponible por <strong>{horasRestantes}h {minsRestantes}min</strong> más</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-xs text-stone-500 dark:text-stone-400">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Registro bloqueado — el período de edición de 24 horas ha finalizado</span>
        </div>
      )}

      {/* ── Datos del registro ── */}
      <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-stone-500 dark:text-stone-400">Fecha</p><p className="font-semibold">{formatDate(reg.fecha)}</p></div>
        <div><p className="text-xs text-stone-500 dark:text-stone-400">Galpón</p><p className="font-semibold">{reg.galpon?.nombre}</p></div>
        <div><p className="text-xs text-stone-500 dark:text-stone-400">Lote</p><p className="font-semibold">{reg.lote?.nombre_numero}</p></div>
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Cantidad de bajas</p>
          <p className="font-bold text-red-600 dark:text-red-400 text-base">{formatNumber(reg.cantidad_bajas)}</p>
        </div>
        <div><p className="text-xs text-stone-500 dark:text-stone-400">Causa</p><p className="font-semibold">{getLabelFromValue(CAUSAS_MORTALIDAD, reg.causa)}</p></div>
        {reg.causa_otra && (
          <div><p className="text-xs text-stone-500 dark:text-stone-400">Causa específica</p><p className="font-semibold">{reg.causa_otra}</p></div>
        )}
        <div><p className="text-xs text-stone-500 dark:text-stone-400">Registrado por</p><p className="font-semibold">{reg.registrado?.nombre_completo || '—'}</p></div>
        <div><p className="text-xs text-stone-500 dark:text-stone-400">Fecha de registro</p><p className="font-semibold">{reg.created_at ? formatDate(reg.created_at) : '—'}</p></div>
        {reg.observaciones && (
          <div className="col-span-2"><p className="text-xs text-stone-500 dark:text-stone-400">Observaciones</p><p>{reg.observaciones}</p></div>
        )}
      </div>

      {/* ── Historial de ediciones ── */}
      {auditoria && auditoria.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center">
              <History className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">
              Historial de ediciones
            </h3>
            <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
              {auditoria.length} edición{auditoria.length !== 1 ? 'es' : ''}
            </span>
          </div>

          <ol className="relative border-l border-stone-200 dark:border-stone-700 space-y-5 ml-2">
            {auditoria.map((entrada, idx) => {
              const cambios = formatearCambios(entrada.datos_anteriores, entrada.datos_nuevos)
              return (
                <li key={entrada.id} className="ml-4">
                  {/* Punto del timeline */}
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-stone-900 bg-violet-400 dark:bg-violet-500" />

                  <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                        {entrada.editado?.nombre_completo || 'Usuario desconocido'}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                        {entrada.editado_at
                          ? new Date(entrada.editado_at).toLocaleString('es-CO', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>

                    {cambios.length === 0 ? (
                      <p className="text-xs text-stone-400 dark:text-stone-500 italic">Sin cambios registrados</p>
                    ) : (
                      <ul className="space-y-1">
                        {cambios.map(c => (
                          <li key={c.campo} className="text-xs text-stone-600 dark:text-stone-300">
                            <span className="font-medium">{c.campo}:</span>{' '}
                            <span className="line-through text-stone-400 dark:text-stone-500">{c.anterior || '—'}</span>
                            {' → '}
                            <span className="text-stone-800 dark:text-stone-100 font-medium">{c.nuevo || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
