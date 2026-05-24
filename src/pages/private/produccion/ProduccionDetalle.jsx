import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useConfig } from '../../../context/ConfigContext'
import { formatDate, formatNumber } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Egg, TrendingUp, User, Clock, Pencil, CheckCircle2, AlertCircle, History } from 'lucide-react'

/* ── Postura badge (umbrales desde Configuración) ── */
function PosturaBadge({ pct }) {
  const { config } = useConfig()
  const { postura_excelente: exc, postura_buena: bue } = config.produccion
  const n = parseFloat(pct) || 0
  if (n >= exc) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-3.5 w-3.5" />{n.toFixed(1)}%</span>
  if (n >= bue) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30"><TrendingUp className="h-3.5 w-3.5" />{n.toFixed(1)}%</span>
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"><AlertCircle className="h-3.5 w-3.5" />{n.toFixed(1)}%</span>
}

/* ── Detail item ── */
function Detail({ label, value, accent }) {
  return (
    <div className="space-y-1">
      <p className="detail-label">{label}</p>
      <p className={`detail-value ${accent || ''}`}>{value ?? '—'}</p>
    </div>
  )
}

/* ── Genera lista de cambios entre dos snapshots ── */
function formatearCambios(ant, nue) {
  const etiquetas = {
    huevos_producidos:   'Huevos producidos',
    consumo_alimento_kg: 'Consumo alimento (kg)',
    porcentaje_postura:  '% Postura',
    observaciones:       'Observaciones',
  }
  const cambios = []
  for (const campo of Object.keys(etiquetas)) {
    const valAnt = ant[campo] ?? '—'
    const valNue = nue[campo] ?? '—'
    if (String(valAnt) !== String(valNue)) {
      cambios.push({ campo: etiquetas[campo], anterior: valAnt, nuevo: valNue })
    }
  }
  return cambios
}

function msDesdeCreacion(created_at) {
  if (!created_at) return Infinity
  return Date.now() - new Date(created_at).getTime()
}

export default function ProduccionDetalle() {
  const { id } = useParams()
  const { isAdmin } = useAuth()

  /* ── Registro principal ── */
  const { data: reg, isLoading } = useQuery({
    queryKey: ['produccion-detalle', id],
    queryFn: async () => {
      const { data } = await supabase.from('produccion').select(`
        *,
        galpon:galpones(nombre),
        lote:lotes(nombre_numero, cantidad_aves_actuales, raza:razas(nombre)),
        registrado:perfiles(nombre_completo)
      `).eq('id', id).single()
      return data
    },
  })

  /* ── Auditoría ── */
  const { data: auditoria } = useQuery({
    queryKey: ['auditoria-produccion', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auditoria_produccion')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('produccion_id', id)
        .order('editado_at', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  /* ── Ventana de edición ── */
  const msTranscurridos  = msDesdeCreacion(reg?.created_at)
  const dentroDeVentana  = msTranscurridos <= 24 * 3600 * 1000
  const msRestantes      = Math.max(0, 24 * 3600 * 1000 - msTranscurridos)
  const horasRestantes   = Math.floor(msRestantes / 3600000)
  const minsRestantes    = Math.floor((msRestantes % 3600000) / 60000)
  const canEdit          = isAdmin || dentroDeVentana

  /* ── Loading / Not found ── */
  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <Egg className="h-6 w-6 text-amber-500" />
        </div>
        <p className="text-stone-400 dark:text-stone-500 text-sm">Cargando registro…</p>
      </div>
    </div>
  )

  if (!reg) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 dark:text-stone-500">Registro no encontrado.</p>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Detalle de producción"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Producción', href: '/dashboard/produccion' },
          { label: formatDate(reg.fecha) },
        ]}
        actions={
          canEdit && (
            <Link to={`/dashboard/produccion/${id}/editar`}>
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

      {/* ── Hero card ── */}
      <div className="card p-6 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-stone-900 dark:to-amber-950/20 border-amber-200 dark:border-amber-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20">
              <Egg className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">Huevos producidos</p>
              <p className="text-3xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                {formatNumber(reg.huevos_producidos)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">% Postura</p>
            <PosturaBadge pct={reg.porcentaje_postura} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-amber-200/60 dark:border-amber-900/30">
          <Detail label="Fecha"  value={formatDate(reg.fecha)} />
          <Detail label="Galpón" value={reg.galpon?.nombre} />
          <Detail label="Lote"   value={reg.lote?.nombre_numero} />
          <Detail label="Raza"   value={reg.lote?.raza?.nombre} />
        </div>
      </div>

      {/* ── Detalles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Producción */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title text-sm">Producción</h2>
          </div>
          <Detail label="Aves en lote"       value={formatNumber(reg.lote?.cantidad_aves_actuales)} />
          <Detail label="Huevos producidos"  value={formatNumber(reg.huevos_producidos)} accent="text-amber-600 dark:text-amber-400" />
          <Detail label="% Postura"          value={`${reg.porcentaje_postura ?? 0}%`} accent="text-green-600 dark:text-green-400" />
          <Detail label="Alimento consumido" value={reg.consumo_alimento_kg != null ? `${reg.consumo_alimento_kg} kg` : '—'} />
          {reg.consumo_alimento_kg > 0 && reg.huevos_producidos > 0 && (
            <Detail
              label="Eficiencia alimentaria"
              value={`${(reg.huevos_producidos / reg.consumo_alimento_kg).toFixed(2)} huevos/kg`}
              accent="text-blue-600 dark:text-blue-400"
            />
          )}
        </div>

        {/* Registro */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <h2 className="section-title text-sm">Registro</h2>
          </div>
          <Detail label="Registrado por"  value={reg.registrado?.nombre_completo} />
          <Detail label="Creado el"       value={formatDate(reg.created_at)} />
          <Detail label="ID del registro" value={<span className="font-mono text-xs text-stone-400 dark:text-stone-500">{reg.id?.slice(0, 8)}…</span>} />
        </div>
      </div>

      {/* ── Observaciones ── */}
      {reg.observaciones && (
        <div className="card p-5">
          <h2 className="section-title text-sm mb-3">Observaciones</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">
            {reg.observaciones}
          </p>
        </div>
      )}

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
            {auditoria.map((entrada) => {
              const cambios = formatearCambios(entrada.datos_anteriores, entrada.datos_nuevos)
              return (
                <li key={entrada.id} className="ml-4">
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
                            <span className="line-through text-stone-400 dark:text-stone-500">{c.anterior ?? '—'}</span>
                            {' → '}
                            <span className="text-stone-800 dark:text-stone-100 font-medium">{c.nuevo ?? '—'}</span>
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
