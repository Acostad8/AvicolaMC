import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Pagination from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import {
  Shield, Filter, Download, ChevronDown, ChevronUp,
  LogIn, LogOut, KeyRound, Plus, Pencil, Trash2,
  RefreshCw, Search, X, AlertTriangle,
} from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────

const MODULOS = {
  produccion:          'Producción',
  mortalidad:          'Mortalidad',
  insumos:             'Insumos',
  movimientos_insumos: 'Movimientos',
  tratamientos:        'Tratamientos',
  perfiles:            'Usuarios',
  empleados:           'Empleados',
  proveedores:         'Proveedores',
  galpones:            'Galpones',
  lotes:               'Lotes',
  sesion:              'Sesión',
}

const OPERACIONES = {
  INSERT:          { label: 'Creación',       icon: Plus,       color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  UPDATE:          { label: 'Modificación',   icon: Pencil,     color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  DELETE:          { label: 'Eliminación',    icon: Trash2,     color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  LOGIN:           { label: 'Inicio sesión',  icon: LogIn,      color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
  LOGOUT:          { label: 'Cierre sesión',  icon: LogOut,     color: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700' },
  PASSWORD_CHANGE: { label: 'Cambio clave',   icon: KeyRound,   color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  RESET_PASSWORD:  { label: 'Reset clave',    icon: RefreshCw,  color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
}

const PAGE_SIZE_DEFAULT = 25

// ── Helpers ──────────────────────────────────────────────────────

function formatDT(ts) {
  return new Date(ts).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatD(ts) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function relativeTime(ts) {
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60_000)          return 'hace menos de 1 min'
  if (d < 3_600_000)       return `hace ${Math.floor(d / 60_000)} min`
  if (d < 86_400_000)      return `hace ${Math.floor(d / 3_600_000)} h`
  if (d < 7 * 86_400_000)  return `hace ${Math.floor(d / 86_400_000)} días`
  return formatD(ts)
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const AVATAR_PALETTE = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-600', 'bg-indigo-500', 'bg-teal-500',
]
function avatarBg(name) {
  if (!name) return AVATAR_PALETTE[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

const SKIP_DIFF_KEYS = new Set(['id', 'created_at', 'updated_at', 'editado_at', 'ultimo_acceso', 'avatar_url'])

// ── Subcomponentes ────────────────────────────────────────────────

function OperacionBadge({ operacion }) {
  const cfg = OPERACIONES[operacion] || { label: operacion, icon: Shield, color: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700' }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function ModuloBadge({ tabla }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
      {MODULOS[tabla] || tabla}
    </span>
  )
}

function DiffViewer({ anterior, nuevo, operacion }) {
  // Para eventos de sesión, mostrar los datos directamente
  if (['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'RESET_PASSWORD'].includes(operacion)) {
    const data = nuevo || anterior
    if (!data) return <p className="text-xs text-stone-400">Sin datos adicionales</p>
    return (
      <div className="space-y-1.5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-stone-500 dark:text-stone-400 capitalize w-28 flex-shrink-0">{k.replace(/_/g, ' ')}</span>
            <span className="text-stone-700 dark:text-stone-200">{String(v)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (!anterior && !nuevo) return <p className="text-xs text-stone-400">Sin datos de cambio registrados</p>

  if (operacion === 'INSERT') {
    const entries = Object.entries(nuevo || {}).filter(([k]) => !SKIP_DIFF_KEYS.has(k))
    return (
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-xs">
            <span className="font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide w-36 flex-shrink-0">{k.replace(/_/g, ' ')}</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 break-all">
              {String(v ?? '—')}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (operacion === 'DELETE') {
    const entries = Object.entries(anterior || {}).filter(([k]) => !SKIP_DIFF_KEYS.has(k))
    return (
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-xs">
            <span className="font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide w-36 flex-shrink-0">{k.replace(/_/g, ' ')}</span>
            <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/25 border border-red-100 dark:border-red-800/60 text-red-600 dark:text-red-400 line-through break-all">
              {String(v ?? '—')}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // UPDATE: mostrar solo campos que cambiaron
  const allKeys = new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})])
  const changed = [...allKeys].filter(k => {
    if (SKIP_DIFF_KEYS.has(k)) return false
    return JSON.stringify(anterior?.[k]) !== JSON.stringify(nuevo?.[k])
  })

  if (changed.length === 0) return <p className="text-xs text-stone-400">Sin diferencias detectadas en campos conocidos</p>

  return (
    <div className="space-y-2.5">
      {changed.map(k => (
        <div key={k} className="space-y-1">
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
            {k.replace(/_/g, ' ')}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/25 border border-red-100 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs line-through break-all max-w-[42%]">
              {String(anterior?.[k] ?? '—')}
            </span>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" fill="currentColor">
              <path d="M5 3l6 5-6 5V3z" />
            </svg>
            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold break-all max-w-[42%]">
              {String(nuevo?.[k] ?? '—')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, gradient, label, value, loading }) {
  if (loading) return (
    <div className="card p-4">
      <Skeleton className="h-10 w-10 rounded-xl mb-3" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-6 w-14" />
    </div>
  )
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-stone-400 dark:text-stone-500">{label}</p>
        <p className="text-xl font-black tabular-nums text-stone-900 dark:text-stone-50 leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────

export default function Auditoria() {
  const [filters, setFilters] = useState({ tabla: '', operacion: '', usuario_id: '', desde: '', hasta: '' })
  const [applied, setApplied] = useState({ tabla: '', operacion: '', usuario_id: '', desde: '', hasta: '' })
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT)
  const [expanded, setExpanded] = useState(null)
  const [showFilters, setShowFilters] = useState(true)

  const buildQuery = useCallback((q, f) => {
    if (f.tabla)      q = q.eq('tabla', f.tabla)
    if (f.operacion)  q = q.eq('operacion', f.operacion)
    if (f.usuario_id) q = q.eq('usuario_id', f.usuario_id)
    if (f.desde)      q = q.gte('created_at', f.desde + 'T00:00:00')
    if (f.hasta)      q = q.lte('created_at', f.hasta + 'T23:59:59.999')
    return q
  }, [])

  // ── Consulta paginada ──
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['auditoria', applied, page, pageSize],
    queryFn: async () => {
      const offset = (page - 1) * pageSize
      let q = supabase
        .from('auditoria')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      q = buildQuery(q, applied)
      const { data: rows, count, error } = await q
      if (error) throw error
      return { rows: rows || [], total: count || 0 }
    },
    staleTime: 30_000,
  })

  // ── Stats de hoy ──
  const { data: statsHoy } = useQuery({
    queryKey: ['auditoria-stats-hoy'],
    queryFn: async () => {
      const hoy = new Date().toISOString().slice(0, 10)
      const { data: rows } = await supabase
        .from('auditoria')
        .select('operacion, usuario_id')
        .gte('created_at', hoy + 'T00:00:00')
      const usuariosUnicos = new Set((rows || []).map(r => r.usuario_id).filter(Boolean))
      return { total: rows?.length || 0, usuarios: usuariosUnicos.size }
    },
    staleTime: 60_000,
  })

  // ── Usuarios distintos para el filtro ──
  const { data: usuariosFilter } = useQuery({
    queryKey: ['auditoria-usuarios-filter'],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('auditoria')
        .select('usuario_id, usuario_nombre')
        .not('usuario_id', 'is', null)
      const seen = new Set()
      return (rows || []).filter(r => {
        if (!r.usuario_id || seen.has(r.usuario_id)) return false
        seen.add(r.usuario_id)
        return true
      }).sort((a, b) => (a.usuario_nombre || '').localeCompare(b.usuario_nombre || ''))
    },
    staleTime: 300_000,
  })

  function applyFilters() {
    setApplied({ ...filters })
    setPage(1)
    setExpanded(null)
  }

  function clearFilters() {
    const empty = { tabla: '', operacion: '', usuario_id: '', desde: '', hasta: '' }
    setFilters(empty)
    setApplied(empty)
    setPage(1)
    setExpanded(null)
  }

  function toggleExpand(id) {
    setExpanded(prev => prev === id ? null : id)
  }

  async function exportPDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      // Obtener todos los registros con los filtros actuales (máx 500)
      let q = supabase
        .from('auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      q = buildQuery(q, applied)
      const { data: rows } = await q

      const doc = new jsPDF({ orientation: 'landscape' })
      const now = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Auditoría del Sistema — Avícola MC', 14, 18)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(`Generado: ${now}  ·  Total registros: ${rows?.length || 0}`, 14, 25)
      doc.setTextColor(0)

      autoTable(doc, {
        startY: 30,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        head: [['Fecha y hora', 'Usuario', 'Módulo', 'Operación', 'Registro ID', 'Descripción']],
        body: (rows || []).map(r => [
          formatDT(r.created_at),
          r.usuario_nombre || '—',
          MODULOS[r.tabla] || r.tabla,
          OPERACIONES[r.operacion]?.label || r.operacion,
          r.registro_id ? r.registro_id.slice(0, 8) + '…' : '—',
          r.descripcion || '—',
        ]),
      })

      doc.save(`auditoria_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      // jsPDF no disponible o fallo silencioso
    }
  }

  const totalPages = Math.ceil((data?.total || 0) / pageSize)
  const hasActiveFilters = Object.values(applied).some(Boolean)

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Auditoría del Sistema"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Auditoría' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Download} onClick={exportPDF} size="sm">
              Exportar PDF
            </Button>
            <Button
              variant="secondary"
              icon={showFilters ? ChevronUp : Filter}
              onClick={() => setShowFilters(v => !v)}
              size="sm"
            >
              {showFilters ? 'Ocultar filtros' : 'Filtros'}
            </Button>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Shield}  gradient="from-violet-500 to-violet-700" label="Total registros"   value={(data?.total ?? 0).toLocaleString('es-CO')} loading={isLoading} />
        <StatCard icon={Filter}  gradient="from-blue-500 to-blue-700"    label="Eventos hoy"       value={(statsHoy?.total ?? 0).toLocaleString('es-CO')} loading={!statsHoy} />
        <StatCard icon={LogIn}   gradient="from-emerald-500 to-emerald-700" label="Usuarios activos hoy" value={statsHoy?.usuarios ?? 0} loading={!statsHoy} />
        <StatCard icon={AlertTriangle} gradient="from-amber-500 to-amber-700" label="Módulos cubiertos" value={Object.keys(MODULOS).length} loading={false} />
      </div>

      {/* ── Filtros ── */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="w-6 h-6 bg-gradient-to-br from-stone-400 to-stone-600 rounded-md flex items-center justify-center">
              <Filter className="h-3 w-3 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400">Filtros</h3>
            {hasActiveFilters && (
              <span className="ml-auto text-xs text-primary-600 dark:text-primary-400 font-medium">Filtros activos</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Módulo */}
            <div>
              <label className="label">Módulo</label>
              <select
                value={filters.tabla}
                onChange={e => setFilters(f => ({ ...f, tabla: e.target.value }))}
                className="input-base"
              >
                <option value="">Todos los módulos</option>
                {Object.entries(MODULOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Operación */}
            <div>
              <label className="label">Operación</label>
              <select
                value={filters.operacion}
                onChange={e => setFilters(f => ({ ...f, operacion: e.target.value }))}
                className="input-base"
              >
                <option value="">Todas las operaciones</option>
                {Object.entries(OPERACIONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Usuario */}
            <div>
              <label className="label">Usuario</label>
              <select
                value={filters.usuario_id}
                onChange={e => setFilters(f => ({ ...f, usuario_id: e.target.value }))}
                className="input-base"
              >
                <option value="">Todos los usuarios</option>
                {(usuariosFilter || []).map(u => (
                  <option key={u.usuario_id} value={u.usuario_id}>{u.usuario_nombre}</option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label className="label">Desde</label>
              <input
                type="date"
                value={filters.desde}
                onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))}
                className="input-base"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="label">Hasta</label>
              <input
                type="date"
                value={filters.hasta}
                onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))}
                className="input-base"
              />
            </div>

            {/* Botones */}
            <div className="flex items-end gap-2">
              <Button icon={Search} onClick={applyFilters} className="flex-1">
                Buscar
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" icon={X} onClick={clearFilters} size="sm" aria-label="Limpiar filtros">
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="card overflow-hidden">

        {/* Cabecera de tabla */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {isLoading ? 'Cargando…' : (
              <>
                <span className="tabular-nums">{(data?.total || 0).toLocaleString('es-CO')}</span>
                {' '}eventos registrados
                {isFetching && !isLoading && <span className="ml-2 text-xs text-stone-400">actualizando…</span>}
              </>
            )}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Sin resultados */}
        {!isLoading && data?.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-3">
              <Shield className="h-7 w-7 text-stone-300 dark:text-stone-600" />
            </div>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
              {hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin registros de auditoría'}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 max-w-xs">
              {hasActiveFilters ? 'Prueba ajustando los criterios de búsqueda.' : 'Las actividades del sistema aparecerán aquí una vez que se aplique la migración de BD.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Filas */}
        {!isLoading && data?.rows.length > 0 && (
          <ol className="divide-y divide-stone-100 dark:divide-stone-800">
            {data.rows.map(row => {
              const isOpen = expanded === row.id
              const bg    = avatarBg(row.usuario_nombre)
              const tieneDetalle = row.datos_anteriores || row.datos_nuevos || row.descripcion

              return (
                <li key={row.id}>
                  {/* Fila principal */}
                  <button
                    type="button"
                    onClick={() => tieneDetalle && toggleExpand(row.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${tieneDetalle ? 'hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer' : 'cursor-default'} ${isOpen ? 'bg-stone-50 dark:bg-stone-800/40' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm ${bg}`}>
                      {initials(row.usuario_nombre)}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-tight truncate">
                          {row.usuario_nombre || <span className="text-stone-400 italic font-normal">Sistema</span>}
                        </p>
                        <OperacionBadge operacion={row.operacion} />
                        <ModuloBadge tabla={row.tabla} />
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                        {row.descripcion || (row.registro_id ? `ID: ${row.registro_id.slice(0, 8)}…` : '—')}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 tabular-nums">
                        {relativeTime(row.created_at)}
                      </p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 tabular-nums">
                        {formatDT(row.created_at)}
                      </p>
                    </div>

                    {/* Expand indicator */}
                    {tieneDetalle && (
                      <div className="flex-shrink-0 ml-1 text-stone-300 dark:text-stone-600">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    )}
                  </button>

                  {/* Detalle expandido */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800">
                      <div className="ml-12 space-y-4">

                        {/* Meta info */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-stone-400 dark:text-stone-500">
                          <span>ID evento: <code className="font-mono text-stone-500 dark:text-stone-400">{row.id?.slice(0, 12)}…</code></span>
                          {row.registro_id && (
                            <span>ID registro: <code className="font-mono text-stone-500 dark:text-stone-400">{row.registro_id?.slice(0, 12)}…</code></span>
                          )}
                          <span className="sm:hidden">{formatDT(row.created_at)}</span>
                        </div>

                        {/* Diff */}
                        {(row.datos_anteriores || row.datos_nuevos) && (
                          <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
                            <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-3">
                              {row.operacion === 'INSERT' ? 'Datos del registro creado' :
                               row.operacion === 'DELETE' ? 'Datos del registro eliminado' :
                               'Campos modificados'}
                            </p>
                            <DiffViewer
                              anterior={row.datos_anteriores}
                              nuevo={row.datos_nuevos}
                              operacion={row.operacion}
                            />
                          </div>
                        )}

                        {/* Descripción */}
                        {row.descripcion && !row.datos_anteriores && !row.datos_nuevos && (
                          <p className="text-sm text-stone-600 dark:text-stone-400 italic">{row.descripcion}</p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {/* Paginación */}
        {!isLoading && (data?.total || 0) > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={p => { setPage(p); setExpanded(null) }}
            pageSize={pageSize}
            onPageSizeChange={s => { setPageSize(s); setPage(1); setExpanded(null) }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
      </div>
    </div>
  )
}
