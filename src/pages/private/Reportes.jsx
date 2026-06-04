import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useA11y } from '../../context/AccessibilityContext'
import { formatDate, downloadCSV, getLabelFromValue, CAUSAS_MORTALIDAD, TIPOS_TRATAMIENTO } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { Download, FileText, Egg, Skull, Syringe, Package, BarChart2, ChevronUp, ChevronDown, ArrowUpDown, Crown } from 'lucide-react'
import { TableSkeleton } from '../../components/ui/Skeleton'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const REPORTES = [
  { id: 'produccion',   label: 'Producción',   icon: Egg,       gradient: 'from-amber-400 to-amber-600',   desc: 'Huevos y % postura' },
  { id: 'mortalidad',   label: 'Mortalidad',   icon: Skull,     gradient: 'from-red-400 to-red-600',       desc: 'Bajas por galpón y causa' },
  { id: 'tratamientos', label: 'Tratamientos', icon: Syringe,   gradient: 'from-blue-400 to-blue-600',     desc: 'Vacunas y medicaciones' },
  { id: 'insumos',      label: 'Insumos',      icon: Package,   gradient: 'from-green-400 to-green-600',   desc: 'Stock y movimientos (Admin)' },
  { id: 'comparativa',  label: 'Comparativa',  icon: BarChart2, gradient: 'from-violet-400 to-violet-600', desc: 'Ranking entre galpones' },
]

export default function Reportes() {
  const { isAdmin, perfil } = useAuth()
  const { dark } = useA11y()

  const [activeReport, setActiveReport] = useState('produccion')
  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterDesde,  setFilterDesde]  = useState('')
  const [filterHasta,  setFilterHasta]  = useState('')
  const [filterExtra,  setFilterExtra]  = useState('')
  const [sortCol,      setSortCol]      = useState('score')
  const [sortDir,      setSortDir]      = useState('desc')
  const [page,         setPage]         = useState(0)

  const PAGE_SIZE = 25

  /* ── Galpones list ── */
  const { data: galpones } = useQuery({
    queryKey: ['galpones-select', isAdmin, perfil?.id],
    queryFn: async () => {
      let q = supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      if (!isAdmin) q = q.eq('encargado_id', perfil.id)
      const { data } = await q
      return data || []
    },
    enabled: !!perfil,
  })

  /* ── Main report data (producción / mortalidad / tratamientos / insumos) ── */
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reporte', activeReport, filterGalpon, filterDesde, filterHasta, filterExtra, isAdmin, perfil?.id],
    queryFn: async () => {
      if (activeReport === 'comparativa') return []
      if (activeReport === 'insumos' && !isAdmin) return []

      const galponIds = filterGalpon ? [filterGalpon] : (galpones || []).map(g => g.id)

      if (activeReport === 'produccion') {
        let q = supabase.from('produccion').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales), registrado:perfiles(nombre_completo)`).order('fecha', { ascending: false }).limit(500)
        if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
        if (filterDesde) q = q.gte('fecha', filterDesde)
        if (filterHasta) q = q.lte('fecha', filterHasta)
        const { data } = await q; return data || []
      }
      if (activeReport === 'mortalidad') {
        let q = supabase.from('mortalidad').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero), registrado:perfiles(nombre_completo)`).order('fecha', { ascending: false }).limit(500)
        if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
        if (filterDesde) q = q.gte('fecha', filterDesde)
        if (filterHasta) q = q.lte('fecha', filterHasta)
        if (filterExtra) q = q.eq('causa', filterExtra)
        const { data } = await q; return data || []
      }
      if (activeReport === 'tratamientos') {
        let q = supabase.from('tratamientos').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero)`).order('fecha_inicio', { ascending: false }).limit(500)
        if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
        if (filterDesde) q = q.gte('fecha_inicio', filterDesde)
        if (filterHasta) q = q.lte('fecha_inicio', filterHasta)
        if (filterExtra) q = q.eq('tipo', filterExtra)
        const { data } = await q; return data || []
      }
      if (activeReport === 'insumos') {
        const { data } = await supabase.from('insumos').select(`*, movimientos:movimientos_insumos(*, registrado:perfiles(nombre_completo))`).order('nombre')
        return data || []
      }
      return []
    },
    enabled: !!perfil && !!galpones,
  })

  /* ── Comparativa: producción ── */
  const { data: cmpProd, isLoading: loadingCmpProd } = useQuery({
    queryKey: ['cmp-prod', filterDesde, filterHasta, isAdmin, perfil?.id],
    queryFn: async () => {
      const galponIds = (galpones || []).map(g => g.id)
      let q = supabase.from('produccion').select('galpon_id, huevos_producidos, porcentaje_postura, consumo_alimento_kg')
      if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
      if (filterDesde) q = q.gte('fecha', filterDesde)
      if (filterHasta) q = q.lte('fecha', filterHasta)
      const { data } = await q; return data || []
    },
    enabled: activeReport === 'comparativa' && !!perfil && !!galpones,
  })

  /* ── Comparativa: mortalidad ── */
  const { data: cmpMort, isLoading: loadingCmpMort } = useQuery({
    queryKey: ['cmp-mort', filterDesde, filterHasta, isAdmin, perfil?.id],
    queryFn: async () => {
      const galponIds = (galpones || []).map(g => g.id)
      let q = supabase.from('mortalidad').select('galpon_id, cantidad_bajas')
      if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
      if (filterDesde) q = q.gte('fecha', filterDesde)
      if (filterHasta) q = q.lte('fecha', filterHasta)
      const { data } = await q; return data || []
    },
    enabled: activeReport === 'comparativa' && !!perfil && !!galpones,
  })

  /* ── Comparativa aggregation (group-by galpon) ── */
  const comparativaRows = useMemo(() => {
    if (!cmpProd || !cmpMort || !galpones) return []

    const map = {}
    galpones.forEach(g => {
      map[g.id] = { id: g.id, nombre: g.nombre, huevos: 0, postura_sum: 0, postura_count: 0, alimento: 0, bajas: 0, dias: 0 }
    })

    cmpProd.forEach(r => {
      if (!map[r.galpon_id]) return
      map[r.galpon_id].huevos        += r.huevos_producidos  || 0
      map[r.galpon_id].postura_sum   += r.porcentaje_postura || 0
      map[r.galpon_id].postura_count += 1
      map[r.galpon_id].alimento      += r.consumo_alimento_kg || 0
      map[r.galpon_id].dias          += 1
    })

    cmpMort.forEach(r => {
      if (!map[r.galpon_id]) return
      map[r.galpon_id].bajas += r.cantidad_bajas || 0
    })

    const rows = Object.values(map)
      .filter(r => r.dias > 0 || r.bajas > 0)
      .map(r => ({
        ...r,
        postura_prom: r.postura_count > 0 ? r.postura_sum / r.postura_count : 0,
        eficiencia:   r.alimento > 0 ? r.huevos / r.alimento : 0,
      }))

    // Score 0-100: postura 50% · eficiencia 30% · bajas inversas 20%
    if (rows.length > 0) {
      const maxPost = Math.max(...rows.map(r => r.postura_prom), 0.01)
      const maxEfic = Math.max(...rows.map(r => r.eficiencia),   0.01)
      const maxBaj  = Math.max(...rows.map(r => r.bajas),        0.01)
      rows.forEach(r => {
        r.score = Math.round(
          (r.postura_prom / maxPost) * 50 +
          (r.eficiencia   / maxEfic) * 30 +
          (1 - Math.min(r.bajas / maxBaj, 1)) * 20
        )
      })
    }
    return rows
  }, [cmpProd, cmpMort, galpones])

  /* ── Sorted comparativa ── */
  const sortedComparativa = useMemo(() => {
    if (!comparativaRows.length) return []
    return [...comparativaRows].sort((a, b) => {
      if (sortCol === 'nombre') {
        const cmp = (a.nombre || '').localeCompare(b.nombre || '')
        return sortDir === 'asc' ? cmp : -cmp
      }
      const av = a[sortCol] ?? 0
      const bv = b[sortCol] ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [comparativaRows, sortCol, sortDir])

  /* ── Summary stats ── */
  const summaryStats = useMemo(() => {
    if (activeReport === 'comparativa') {
      if (!comparativaRows.length) return null
      const totalH   = comparativaRows.reduce((s, r) => s + r.huevos, 0)
      const avgPost  = comparativaRows.reduce((s, r) => s + r.postura_prom, 0) / comparativaRows.length
      const totalB   = comparativaRows.reduce((s, r) => s + r.bajas, 0)
      const best     = [...comparativaRows].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
      return [
        { label: 'Galpones',          value: comparativaRows.length },
        { label: 'Huevos totales',    value: totalH.toLocaleString('es-CO') },
        { label: '% Postura prom.',   value: `${avgPost.toFixed(1)}%` },
        { label: 'Bajas totales',     value: totalB.toLocaleString('es-CO') },
        { label: 'Mejor rendimiento', value: best?.nombre || '—' },
      ]
    }
    if (!reportData?.length) return null
    if (activeReport === 'produccion') {
      const total = reportData.reduce((s, r) => s + (r.huevos_producidos || 0), 0)
      const avg   = reportData.reduce((s, r) => s + (r.porcentaje_postura || 0), 0) / reportData.length
      return [
        { label: 'Total huevos',       value: total.toLocaleString('es-CO') },
        { label: 'Promedio % postura', value: `${avg.toFixed(1)}%` },
        { label: 'Registros',          value: reportData.length },
      ]
    }
    if (activeReport === 'mortalidad') {
      const total = reportData.reduce((s, r) => s + (r.cantidad_bajas || 0), 0)
      return [
        { label: 'Total bajas', value: total.toLocaleString('es-CO') },
        { label: 'Registros',   value: reportData.length },
      ]
    }
    if (activeReport === 'tratamientos') {
      const activos = reportData.filter(r => r.estado === 'activo').length
      return [
        { label: 'Total',       value: reportData.length },
        { label: 'Activos',     value: activos },
        { label: 'Finalizados', value: reportData.length - activos },
      ]
    }
    if (activeReport === 'insumos') {
      const bajo = reportData.filter(r => r.stock_actual <= r.stock_minimo).length
      return [
        { label: 'Productos',  value: reportData.length },
        { label: 'Stock bajo', value: bajo },
      ]
    }
    return null
  }, [reportData, activeReport, comparativaRows])

  /* ── Export helpers ── */
  function toCSVData() {
    if (activeReport === 'comparativa') {
      return sortedComparativa.map((r, i) => ({
        '#':                    i + 1,
        'Galpón':               r.nombre,
        'Huevos totales':       r.huevos,
        '% Postura prom.':      r.postura_prom.toFixed(1),
        'Bajas totales':        r.bajas,
        'Alimento (kg)':        r.alimento.toFixed(1),
        'Eficiencia (h/kg)':    r.eficiencia > 0 ? r.eficiencia.toFixed(2) : '—',
        'Días registrados':     r.dias,
        'Puntaje rendimiento':  r.score ?? 0,
      }))
    }
    if (!reportData) return []
    if (activeReport === 'produccion') return reportData.map(r => ({
      Fecha: r.fecha, Galpón: r.galpon?.nombre, Lote: r.lote?.nombre_numero,
      'Aves vivas': r.lote?.cantidad_aves_actuales, 'Huevos producidos': r.huevos_producidos,
      '% Postura': r.porcentaje_postura, 'Consumo alimento (kg)': r.consumo_alimento_kg,
      Observaciones: r.observaciones || '', 'Registrado por': r.registrado?.nombre_completo,
    }))
    if (activeReport === 'mortalidad') return reportData.map(r => ({
      Fecha: r.fecha, Galpón: r.galpon?.nombre, Lote: r.lote?.nombre_numero,
      'Cantidad de bajas': r.cantidad_bajas, Causa: getLabelFromValue(CAUSAS_MORTALIDAD, r.causa),
      Observaciones: r.observaciones || '', 'Registrado por': r.registrado?.nombre_completo,
    }))
    if (activeReport === 'tratamientos') return reportData.map(r => ({
      'Fecha inicio': r.fecha_inicio, 'Fecha fin': r.fecha_fin || '', Galpón: r.galpon?.nombre,
      Lote: r.lote?.nombre_numero, Tipo: getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo),
      Producto: r.nombre_producto, Dosis: r.dosis_aplicacion, Responsable: r.responsable, Estado: r.estado,
    }))
    if (activeReport === 'insumos') return reportData.map(r => ({
      Producto: r.nombre, Categoría: r.categoria, Unidad: r.unidad_medida,
      'Stock actual': r.stock_actual, 'Stock mínimo': r.stock_minimo, Estado: r.estado,
    }))
    return []
  }

  function generatePDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Sistema de Gestión Avícola MC', 14, 20)
    doc.setFontSize(12)
    doc.text(activeReport === 'comparativa'
      ? 'Comparativa de rendimiento entre galpones'
      : `Reporte: ${REPORTES.find(r => r.id === activeReport)?.label}`, 14, 30)
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 37)
    const csvData = toCSVData()
    if (csvData.length > 0) {
      autoTable(doc, {
        startY: 44,
        head: [Object.keys(csvData[0])],
        body: csvData.map(row => Object.values(row).map(v => String(v ?? ''))),
        styles: { fontSize: 7 },
        headStyles: { fillColor: activeReport === 'comparativa' ? [109, 40, 217] : [217, 119, 6] },
      })
    }
    doc.save(`reporte-${activeReport}.pdf`)
  }

  const hasExportData = activeReport === 'comparativa' ? sortedComparativa.length > 0 : !!reportData?.length

  /* ── Comparativa table ── */
  const renderComparativa = () => {
    const loading = loadingCmpProd || loadingCmpMort
    if (loading) return <TableSkeleton rows={5} cols={8} />
    if (!sortedComparativa.length) return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-3">
          <BarChart2 className="h-7 w-7 text-stone-400 dark:text-stone-500" />
        </div>
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Sin datos de producción</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
          Registra producción o ajusta el rango de fechas para ver la comparativa
        </p>
      </div>
    )

    const toggle = col => {
      if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
      else { setSortCol(col); setSortDir('desc') }
    }
    const sortIcon = col => sortCol === col
      ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3 ml-0.5" /> : <ChevronUp className="h-3 w-3 ml-0.5" />
      : <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-0 group-hover:opacity-50 transition-opacity" />
    const th = (col, label, align = 'right') => (
      <th key={col} className={`px-3 py-2.5 font-semibold ${align === 'left' ? 'text-left' : 'text-right'}`}>
        <button
          onClick={() => toggle(col)}
          className={`inline-flex items-center group transition-colors hover:text-stone-800 dark:hover:text-stone-100 ${sortCol === col ? 'text-violet-600 dark:text-violet-400' : 'text-stone-400 dark:text-stone-500'}`}
        >
          {label}{sortIcon(col)}
        </button>
      </th>
    )

    return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
          <tr>
            <th className="w-8 px-3 py-2.5 text-left text-stone-400 dark:text-stone-500 font-semibold">#</th>
            {th('nombre',       'Galpón',          'left')}
            {th('huevos',       'Huevos totales')}
            {th('postura_prom', '% Postura prom.')}
            {th('bajas',        'Bajas totales')}
            {th('alimento',     'Alimento (kg)')}
            {th('eficiencia',   'Efic. h/kg')}
            {th('dias',         'Días')}
            {th('score',        'Rendimiento')}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {sortedComparativa.map((r, idx) => {
            const rank       = idx + 1
            const isTopByScore = rank === 1 && sortCol === 'score' && sortDir === 'desc'
            const postColor  = r.postura_prom >= 90 ? 'text-emerald-600 dark:text-emerald-400'
              : r.postura_prom >= 75 ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'
            const scoreClr   = r.score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : r.score >= 60 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            const barClr     = r.score >= 80 ? 'bg-emerald-500' : r.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
            return (
              <tr key={r.id} className={`hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors ${isTopByScore ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                {/* Rank */}
                <td className="px-3 py-2.5">
                  {isTopByScore
                    ? <Crown className="h-3.5 w-3.5 text-amber-500" />
                    : <span className={`font-bold tabular-nums ${rank === 2 ? 'text-stone-400' : rank === 3 ? 'text-amber-700/60 dark:text-amber-600/60' : 'text-stone-300 dark:text-stone-700'}`}>{rank}</span>
                  }
                </td>
                {/* Galpón */}
                <td className="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-100">{r.nombre}</td>
                {/* Huevos */}
                <td className="px-3 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {r.huevos.toLocaleString('es-CO')}
                </td>
                {/* Postura */}
                <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${postColor}`}>
                  {r.postura_prom.toFixed(1)}%
                </td>
                {/* Bajas */}
                <td className="px-3 py-2.5 text-right font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  {r.bajas.toLocaleString('es-CO')}
                </td>
                {/* Alimento */}
                <td className="px-3 py-2.5 text-right text-stone-500 dark:text-stone-400 tabular-nums">
                  {r.alimento > 0 ? r.alimento.toFixed(1) : '—'}
                </td>
                {/* Eficiencia */}
                <td className="px-3 py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {r.eficiencia > 0 ? r.eficiencia.toFixed(2) : '—'}
                </td>
                {/* Días */}
                <td className="px-3 py-2.5 text-right text-stone-400 dark:text-stone-500 tabular-nums">
                  {r.dias}
                </td>
                {/* Rendimiento */}
                <td className="px-3 py-2.5 text-right min-w-[110px]">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-12 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex-shrink-0">
                      <div className={`h-full rounded-full ${barClr}`} style={{ width: `${r.score ?? 0}%` }} />
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold min-w-[28px] justify-center ${scoreClr}`}>
                      {r.score ?? 0}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  /* ── Standard report tables ── */
  const renderPreview = () => {
    if (!reportData || reportData.length === 0) return (
      <p className="text-stone-400 dark:text-stone-500 text-sm text-center py-8">
        Sin registros para los filtros aplicados
      </p>
    )

    const totalPages = Math.ceil(reportData.length / PAGE_SIZE)
    const pageData   = reportData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const pager = totalPages > 1 && (
      <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
        <span>
          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, reportData.length)} de {reportData.length}{reportData.length === 500 ? '+' : ''} registros
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 rounded-lg disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
          >
            ← Anterior
          </button>
          <span className="px-2">{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 rounded-lg disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
          >
            Siguiente →
          </button>
        </div>
      </div>
    )

    if (activeReport === 'produccion') return (
      <>
        <table className="w-full text-xs">
          <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
            <tr>{['Fecha','Galpón','Lote','Huevos','% Postura','Alimento (kg)'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {pageData.map(r => (
              <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(r.fecha)}</td>
                <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.galpon?.nombre}</td>
                <td className="px-3 py-2 text-stone-500">{r.lote?.nombre_numero}</td>
                <td className="px-3 py-2 font-bold text-amber-600 dark:text-amber-400 tabular-nums">{r.huevos_producidos?.toLocaleString('es-CO')}</td>
                <td className="px-3 py-2 tabular-nums text-stone-700 dark:text-stone-300">{r.porcentaje_postura}%</td>
                <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.consumo_alimento_kg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pager}
      </>
    )

    if (activeReport === 'mortalidad') return (
      <>
        <table className="w-full text-xs">
          <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
            <tr>{['Fecha','Galpón','Lote','Bajas','Causa','Registrado por'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {pageData.map(r => (
              <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(r.fecha)}</td>
                <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.galpon?.nombre}</td>
                <td className="px-3 py-2 text-stone-500">{r.lote?.nombre_numero}</td>
                <td className="px-3 py-2 font-bold text-red-600 dark:text-red-400 tabular-nums">{r.cantidad_bajas}</td>
                <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{getLabelFromValue(CAUSAS_MORTALIDAD, r.causa)}</td>
                <td className="px-3 py-2 text-stone-400 dark:text-stone-500">{r.registrado?.nombre_completo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pager}
      </>
    )

    if (activeReport === 'tratamientos') return (
      <>
        <table className="w-full text-xs">
          <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
            <tr>{['Inicio','Galpón','Tipo','Producto','Responsable','Estado'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {pageData.map(r => (
              <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(r.fecha_inicio)}</td>
                <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.galpon?.nombre}</td>
                <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo)}</td>
                <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.nombre_producto}</td>
                <td className="px-3 py-2 text-stone-500">{r.responsable || '—'}</td>
                <td className="px-3 py-2"><StatusBadge status={r.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pager}
      </>
    )

    if (activeReport === 'insumos') return (
      <>
        <table className="w-full text-xs">
          <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
            <tr>{['Producto','Categoría','Unidad','Stock actual','Stock mínimo','Estado'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {pageData.map(r => {
              const bajo = r.stock_actual <= r.stock_minimo
              return (
                <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.nombre}</td>
                  <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.categoria}</td>
                  <td className="px-3 py-2 text-stone-500">{r.unidad_medida}</td>
                  <td className={`px-3 py-2 font-semibold tabular-nums ${bajo ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'}`}>{r.stock_actual}</td>
                  <td className="px-3 py-2 text-stone-500 tabular-nums">{r.stock_minimo}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.estado} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {pager}
      </>
    )

    return null
  }

  const activeReporteInfo = REPORTES.find(r => r.id === activeReport)
  const isComparativa     = activeReport === 'comparativa'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y descargas"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reportes' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Selector de reporte ── */}
        <div className="card p-4 space-y-2 h-fit">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
            Tipo de reporte
          </p>
          {REPORTES.filter(r => isAdmin || r.id !== 'insumos').map(r => {
            const Icon     = r.icon
            const isActive = activeReport === r.id
            return (
              <button
                key={r.id}
                onClick={() => {
                  setActiveReport(r.id)
                  setFilterExtra('')
                  setPage(0)
                  if (r.id === 'comparativa') setFilterGalpon('')
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${r.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-medium leading-tight truncate">{r.label}</p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight truncate">{r.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Filtros y resultados ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Galpón — hidden for comparativa (shows all) */}
              {!isComparativa && (
                <div>
                  <label className="label text-xs">Galpón</label>
                  <select className="input-base" value={filterGalpon} onChange={e => { setFilterGalpon(e.target.value); setPage(0) }}>
                    <option value="">Todos</option>
                    {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
              )}

              {activeReport === 'mortalidad' && (
                <div>
                  <label className="label text-xs">Causa</label>
                  <select className="input-base" value={filterExtra} onChange={e => { setFilterExtra(e.target.value); setPage(0) }}>
                    <option value="">Todas las causas</option>
                    {CAUSAS_MORTALIDAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}

              {activeReport === 'tratamientos' && (
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select className="input-base" value={filterExtra} onChange={e => { setFilterExtra(e.target.value); setPage(0) }}>
                    <option value="">Todos los tipos</option>
                    {TIPOS_TRATAMIENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {activeReport !== 'insumos' && (
                <>
                  <div>
                    <label className="label text-xs">Desde</label>
                    <input type="date" className="input-base" value={filterDesde} onChange={e => { setFilterDesde(e.target.value); setPage(0) }} />
                  </div>
                  <div>
                    <label className="label text-xs">Hasta</label>
                    <input type="date" className="input-base" value={filterHasta} onChange={e => { setFilterHasta(e.target.value); setPage(0) }} />
                  </div>
                </>
              )}
            </div>

            {/* Comparativa info note */}
            {isComparativa && (
              <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800 pt-3">
                Puntaje de rendimiento: <strong>% postura 50%</strong> · <strong>eficiencia alimentaria 30%</strong> · <strong>bajas inversas 20%</strong>. Ordenable por cualquier columna.
              </p>
            )}
          </div>

          {/* Summary stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {summaryStats.map(stat => (
                <div key={stat.label} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</p>
                  <p className="text-xl font-bold text-stone-900 dark:text-stone-50 tabular-nums mt-0.5 truncate">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-3 items-center flex-wrap">
            <Button icon={Download} onClick={() => downloadCSV(toCSVData(), `reporte-${activeReport}`)} disabled={!hasExportData}>
              Descargar CSV
            </Button>
            <Button icon={FileText} variant="secondary" onClick={generatePDF} disabled={!hasExportData}>
              Descargar PDF
            </Button>
            {isComparativa && sortedComparativa.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium">
                {sortedComparativa.length} galpones
              </span>
            )}
            {!isComparativa && reportData && reportData.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs font-medium">
                {reportData.length} registros
              </span>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700 flex items-center gap-2">
              {activeReporteInfo && (
                <div className={`w-6 h-6 bg-gradient-to-br ${activeReporteInfo.gradient} rounded-md flex items-center justify-center`}>
                  <activeReporteInfo.icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
              )}
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {isComparativa ? 'Ranking de galpones' : 'Resultados'}
              </p>
              {!isComparativa && reportData?.length === 500 && (
                <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Límite de 500 — aplica filtros de fecha para acotar
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              {isComparativa
                ? renderComparativa()
                : isLoading ? <TableSkeleton rows={4} cols={5} /> : renderPreview()
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
