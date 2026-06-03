import { History, CheckCircle2, AlertCircle } from 'lucide-react'
import { Skeleton } from './Skeleton'

/* ── Helpers ── */
function relativeTime(ts) {
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60_000)          return 'hace menos de 1 min'
  if (d < 3_600_000)       return `hace ${Math.floor(d / 60_000)} min`
  if (d < 86_400_000)      return `hace ${Math.floor(d / 3_600_000)}h`
  if (d < 7 * 86_400_000)  return `hace ${Math.floor(d / 86_400_000)} días`
  return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function absTime(ts) {
  return new Date(ts).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const AVATAR_PALETTE = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-600', 'bg-indigo-500', 'bg-teal-500',
]
function avatarColor(name) {
  if (!name) return AVATAR_PALETTE[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

/* ── Main component ── */

/**
 * @param {object}   props
 * @param {Array}    props.entries       Audit rows (with .editado, .editado_at, .datos_anteriores, .datos_nuevos)
 * @param {boolean}  props.loading       Show skeleton while fetching
 * @param {Function} props.formatCambios (datos_anteriores, datos_nuevos) => [{campo, anterior, nuevo}]
 * @param {string}   [props.emptyMessage] Custom text for empty state
 */
export default function AuditHistorial({ entries, loading, formatCambios, emptyMessage }) {
  const count = entries?.length ?? 0

  return (
    <div className="card p-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <History className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Historial de cambios</h3>
        {!loading && count > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            {count} {count === 1 ? 'modificación' : 'modificaciones'}
          </span>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-[88px] w-full rounded-xl" />)}
        </div>
      )}

      {/* ── Error (query finished but entries is undefined/null) ── */}
      {!loading && !entries && (
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
          <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">
            No se pudo cargar el historial. Verifica que la tabla de auditoría esté activa.
          </p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && entries && count === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Sin modificaciones</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 max-w-[240px]">
            {emptyMessage || 'Este registro no ha sido editado desde su creación.'}
          </p>
        </div>
      )}

      {/* ── Entries ── */}
      {!loading && count > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/50 rounded-xl px-3 py-2.5 mb-5">
            <span>
              <strong className="text-stone-700 dark:text-stone-200">{count}</strong>
              {' '}{count === 1 ? 'edición registrada' : 'ediciones registradas'}
            </span>
            <span className="text-stone-200 dark:text-stone-700">·</span>
            <span>
              Última: <strong className="text-stone-700 dark:text-stone-200">
                {relativeTime(entries[0].editado_at)}
              </strong>
            </span>
            <span className="text-stone-200 dark:text-stone-700">·</span>
            <span>
              por{' '}
              <strong className="text-stone-700 dark:text-stone-200">
                {entries[0].editado?.nombre_completo || 'usuario desconocido'}
              </strong>
            </span>
          </div>

          {/* Timeline */}
          <ol className="space-y-4">
            {entries.map((entrada, idx) => {
              const cambios   = formatCambios(entrada.datos_anteriores, entrada.datos_nuevos)
              const nombre    = entrada.editado?.nombre_completo
              const version   = count - idx
              const isLast    = idx === count - 1
              const bgAvatar  = avatarColor(nombre)

              return (
                <li key={entrada.id} className="relative flex gap-3 items-start">

                  {/* Connector line (not on last) */}
                  {!isLast && (
                    <div className="absolute left-5 top-11 bottom-[-1rem] w-px bg-stone-100 dark:bg-stone-800 z-0" />
                  )}

                  {/* Avatar column */}
                  <div className="relative z-10 flex flex-col items-center gap-0.5 flex-shrink-0 w-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${bgAvatar}`}>
                      {initials(nombre)}
                    </div>
                    <span className="text-[9px] font-bold tracking-wider text-violet-400 dark:text-violet-500">
                      v{version}
                    </span>
                  </div>

                  {/* Entry card */}
                  <div className="flex-1 min-w-0 bg-stone-50 dark:bg-stone-800/60 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-800">

                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
                          {nombre || 'Usuario desconocido'}
                        </p>
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                          {cambios.length === 0
                            ? 'Sin cambios detectados'
                            : <>Modificó <strong className="text-stone-600 dark:text-stone-300">{cambios.length}</strong> {cambios.length === 1 ? 'campo' : 'campos'}</>
                          }
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {entrada.editado_at ? (
                          <>
                            <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 tabular-nums leading-tight">
                              {relativeTime(entrada.editado_at)}
                            </p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums mt-0.5">
                              {absTime(entrada.editado_at)}
                            </p>
                          </>
                        ) : (
                          <span className="text-[11px] text-stone-400 dark:text-stone-500">—</span>
                        )}
                      </div>
                    </div>

                    {/* Diffs */}
                    {cambios.length > 0 && (
                      <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                        {cambios.map(c => (
                          <div key={c.campo} className="px-4 py-2.5 space-y-1.5">
                            <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                              {c.campo}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/25 border border-red-100 dark:border-red-800/60 text-red-600 dark:text-red-400 text-[11px] font-medium line-through break-all max-w-[42%]">
                                {String(c.anterior ?? '—')}
                              </span>
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" fill="currentColor">
                                <path d="M5 3l6 5-6 5V3z"/>
                              </svg>
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold break-all max-w-[42%]">
                                {String(c.nuevo ?? '—')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}

    </div>
  )
}
