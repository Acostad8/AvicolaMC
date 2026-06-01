import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useConfig } from '../../../context/ConfigContext'
import { formatDate, formatNumber } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Egg, TrendingUp, User, Clock, Pencil,
  CheckCircle2, AlertCircle, History, Lock, ShieldCheck,
} from 'lucide-react'

/* ── Postura badge ── */
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
    const valAnt = ant?.[campo] ?? null
    const valNue = nue?.[campo] ?? null
    if (String(valAnt) !== String(valNue)) {
      cambios.push({ campo: etiquetas[campo], anterior: valAnt, nuevo: valNue })
    }
  }
  return cambios
}

function withinEditWindow(created_at) {
  if (!created_at) return false
  return Date.now() - new Date(created_at).getTime() < 24 * 3600 * 1000
}

function timeRemaining(created_at) {
  const ms = Math.max(0, 24 * 3600 * 1000 - (Date.now() - new Date(created_at).getTime()))
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return { h, m }
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
  const { data: auditoria, isLoading: loadingAudit } = useQuery({
    queryKey: ['auditoria-produccion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_produccion')
        .select('*, editado:perfiles(nombre_completo)')
        .eq('produccion_id', id)
        .order('editado_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
    retry: 1,
  })

  /* ── Ventana de edición ── */
  const dentroDeVentana = withinEditWindow(reg?.created_at)
  const canEdit = isAdmin || dentroDeVentana
  const { h: horasRest, m: minsRest } = reg?.created_at ? timeRemaining(reg.created_at) : { h: 0, m: 0 }

  /* ── Loading ── */
  if (isLoading) return (
    <div className="max-w-2xl space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="card p-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        <div className="card p-5 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
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
      {isAdmin ? (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 text-xs text-blue-700 dark:text-blue-300">
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Tienes acceso de administrador — puedes editar este registro en cualquier momento.</span>
        </div>
      ) : dentroDeVentana ? (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Edición disponible por <strong>{horasRest}h {minsRest}min</strong> más · Las modificaciones quedan registradas en el historial.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-xs text-stone-500 dark:text-stone-400">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Registro bloqueado — el período de edición de 24 horas ha finalizado.</span>
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
          <Detail label="Creado el"       value={new Date(reg.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
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

      {/* ── Historial de modificaciones (siempre visible) ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <History className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Historial de modificaciones</h3>
          {!loadingAudit && auditoria && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {auditoria.length} {auditoria.length === 1 ? 'modificación' : 'modificaciones'}
            </span>
          )}
        </div>

        {/* Estado de carga */}
        {loadingAudit && (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" />
                <Skeleton className="h-16 flex-1 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Sin modificaciones */}
        {!loadingAudit && auditoria?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <History className="h-6 w-6 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Sin modificaciones registradas</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {dentroDeVentana || isAdmin
                ? 'Cualquier edición que realices aparecerá aquí.'
                : 'Este registro fue guardado sin modificaciones dentro de su ventana de edición.'}
            </p>
          </div>
        )}

        {/* Error de carga */}
        {!loadingAudit && !auditoria && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>No se pudo cargar el historial. Verifica que la tabla de auditoría esté configurada en la base de datos.</span>
          </div>
        )}

        {/* Lista de modificaciones */}
        {!loadingAudit && auditoria && auditoria.length > 0 && (
          <ol className="relative border-l border-stone-200 dark:border-stone-700 space-y-4 ml-2">
            {auditoria.map((entrada) => {
              const cambios = formatearCambios(entrada.datos_anteriores, entrada.datos_nuevos)
              return (
                <li key={entrada.id} className="ml-5">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-stone-900 bg-violet-400 dark:bg-violet-500" />
                  <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-700/50 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-stone-400" />
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
                      <p className="text-xs text-stone-400 dark:text-stone-500 italic">Sin cambios en los valores registrados</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {cambios.map(c => (
                          <li key={c.campo} className="text-xs">
                            <span className="font-semibold text-stone-600 dark:text-stone-300">{c.campo}:</span>{' '}
                            <span className="line-through text-stone-400 dark:text-stone-500 bg-red-50 dark:bg-red-900/20 px-1 rounded">
                              {c.anterior ?? '—'}
                            </span>
                            <span className="mx-1 text-stone-400">→</span>
                            <span className="text-stone-800 dark:text-stone-100 font-medium bg-green-50 dark:bg-green-900/20 px-1 rounded">
                              {c.nuevo ?? '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
