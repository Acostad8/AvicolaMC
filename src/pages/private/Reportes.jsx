import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useA11y } from '../../context/AccessibilityContext'
import { formatDate, downloadCSV, getLabelFromValue, CAUSAS_MORTALIDAD, TIPOS_TRATAMIENTO } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { Download, FileText, Egg, Skull, Syringe, Package } from 'lucide-react'
import { TableSkeleton } from '../../components/ui/Skeleton'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const REPORTES = [
  { id: 'produccion',   label: 'Producción',    icon: Egg,     gradient: 'from-amber-400 to-amber-600',  desc: 'Huevos y % postura' },
  { id: 'mortalidad',   label: 'Mortalidad',    icon: Skull,   gradient: 'from-red-400 to-red-600',      desc: 'Bajas por galpón y causa' },
  { id: 'tratamientos', label: 'Tratamientos',  icon: Syringe, gradient: 'from-blue-400 to-blue-600',    desc: 'Vacunas y medicaciones' },
  { id: 'insumos',      label: 'Insumos',       icon: Package, gradient: 'from-green-400 to-green-600',  desc: 'Stock y movimientos (Admin)' },
]

export default function Reportes() {
  const { isAdmin, perfil } = useAuth()
  const { dark } = useA11y()

  const [activeReport, setActiveReport] = useState('produccion')
  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterDesde, setFilterDesde]   = useState('')
  const [filterHasta, setFilterHasta]   = useState('')
  const [filterExtra, setFilterExtra]   = useState('')

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

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reporte', activeReport, filterGalpon, filterDesde, filterHasta, filterExtra, isAdmin, perfil?.id],
    queryFn: async () => {
      if (activeReport === 'insumos' && !isAdmin) return []

      const galponIds = filterGalpon ? [filterGalpon] : (galpones || []).map(g => g.id)

      if (activeReport === 'produccion') {
        let q = supabase.from('produccion').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero, cantidad_aves_actuales), registrado:perfiles(nombre_completo)`).order('fecha', { ascending: false })
        if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
        if (filterDesde) q = q.gte('fecha', filterDesde)
        if (filterHasta) q = q.lte('fecha', filterHasta)
        const { data } = await q
        return data || []
      }

      if (activeReport === 'mortalidad') {
        let q = supabase.from('mortalidad').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero), registrado:perfiles(nombre_completo)`).order('fecha', { ascending: false })
        if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
        if (filterDesde) q = q.gte('fecha', filterDesde)
        if (filterHasta) q = q.lte('fecha', filterHasta)
        if (filterExtra) q = q.eq('causa', filterExtra)
        const { data } = await q
        return data || []
      }

      if (activeReport === 'tratamientos') {
        let q = supabase.from('tratamientos').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero)`).order('fecha_inicio', { ascending: false })
        if (galponIds.length > 0) q = q.in('galpon_id', galponIds)
        if (filterDesde) q = q.gte('fecha_inicio', filterDesde)
        if (filterHasta) q = q.lte('fecha_inicio', filterHasta)
        if (filterExtra) q = q.eq('tipo', filterExtra)
        const { data } = await q
        return data || []
      }

      if (activeReport === 'insumos') {
        const { data } = await supabase.from('insumos').select(`*, movimientos:movimientos_insumos(*, registrado:perfiles(nombre_completo))`).order('nombre')
        return data || []
      }

      return []
    },
    enabled: !!perfil && !!galpones,
  })

  /* ── Summary stats ── */
  const summaryStats = useMemo(() => {
    if (!reportData?.length) return null
    if (activeReport === 'produccion') {
      const total = reportData.reduce((s, r) => s + (r.huevos_producidos || 0), 0)
      const avg   = reportData.reduce((s, r) => s + (r.porcentaje_postura || 0), 0) / reportData.length
      return [
        { label: 'Total huevos', value: total.toLocaleString('es-CO') },
        { label: 'Promedio % postura', value: `${avg.toFixed(1)}%` },
        { label: 'Registros', value: reportData.length },
      ]
    }
    if (activeReport === 'mortalidad') {
      const total = reportData.reduce((s, r) => s + (r.cantidad_bajas || 0), 0)
      return [
        { label: 'Total bajas', value: total.toLocaleString('es-CO') },
        { label: 'Registros', value: reportData.length },
      ]
    }
    if (activeReport === 'tratamientos') {
      const activos = reportData.filter(r => r.estado === 'activo').length
      return [
        { label: 'Total', value: reportData.length },
        { label: 'Activos', value: activos },
        { label: 'Finalizados', value: reportData.length - activos },
      ]
    }
    if (activeReport === 'insumos') {
      const bajo = reportData.filter(r => r.stock_actual <= r.stock_minimo).length
      return [
        { label: 'Productos', value: reportData.length },
        { label: 'Stock bajo', value: bajo },
      ]
    }
    return null
  }, [reportData, activeReport])

  function toCSVData() {
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
    doc.text(`Reporte: ${REPORTES.find(r => r.id === activeReport)?.label}`, 14, 30)
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 37)
    const csvData = toCSVData()
    if (csvData.length > 0) {
      autoTable(doc, {
        startY: 44,
        head: [Object.keys(csvData[0])],
        body: csvData.map(row => Object.values(row).map(v => String(v ?? ''))),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [217, 119, 6] },
      })
    }
    doc.save(`reporte-${activeReport}.pdf`)
  }

  const renderPreview = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <p className="text-stone-400 dark:text-stone-500 text-sm text-center py-8">
          Sin registros para los filtros aplicados
        </p>
      )
    }

    if (activeReport === 'produccion') return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
          <tr>
            {['Fecha', 'Galpón', 'Lote', 'Huevos', '% Postura', 'Alimento (kg)'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {reportData.slice(0, 15).map(r => (
            <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
              <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(r.fecha)}</td>
              <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.galpon?.nombre}</td>
              <td className="px-3 py-2 text-stone-500 dark:text-stone-500">{r.lote?.nombre_numero}</td>
              <td className="px-3 py-2 font-bold text-amber-600 dark:text-amber-400 tabular-nums">{r.huevos_producidos?.toLocaleString('es-CO')}</td>
              <td className="px-3 py-2 tabular-nums text-stone-700 dark:text-stone-300">{r.porcentaje_postura}%</td>
              <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.consumo_alimento_kg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activeReport === 'mortalidad') return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
          <tr>
            {['Fecha', 'Galpón', 'Lote', 'Bajas', 'Causa', 'Registrado por'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {reportData.slice(0, 15).map(r => (
            <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
              <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(r.fecha)}</td>
              <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.galpon?.nombre}</td>
              <td className="px-3 py-2 text-stone-500 dark:text-stone-500">{r.lote?.nombre_numero}</td>
              <td className="px-3 py-2 font-bold text-red-600 dark:text-red-400 tabular-nums">{r.cantidad_bajas}</td>
              <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{getLabelFromValue(CAUSAS_MORTALIDAD, r.causa)}</td>
              <td className="px-3 py-2 text-stone-400 dark:text-stone-500">{r.registrado?.nombre_completo || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activeReport === 'tratamientos') return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
          <tr>
            {['Inicio', 'Galpón', 'Tipo', 'Producto', 'Responsable', 'Estado'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {reportData.slice(0, 15).map(r => (
            <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
              <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(r.fecha_inicio)}</td>
              <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.galpon?.nombre}</td>
              <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{getLabelFromValue(TIPOS_TRATAMIENTO, r.tipo)}</td>
              <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.nombre_producto}</td>
              <td className="px-3 py-2 text-stone-500 dark:text-stone-500">{r.responsable || '—'}</td>
              <td className="px-3 py-2"><StatusBadge status={r.estado} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activeReport === 'insumos') return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
          <tr>
            {['Producto', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Estado'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-stone-500 dark:text-stone-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {reportData.slice(0, 15).map(r => {
            const bajo = r.stock_actual <= r.stock_minimo
            return (
              <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-100">{r.nombre}</td>
                <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.categoria}</td>
                <td className="px-3 py-2 text-stone-500 dark:text-stone-500">{r.unidad_medida}</td>
                <td className={`px-3 py-2 font-semibold tabular-nums ${bajo ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'}`}>
                  {r.stock_actual}
                </td>
                <td className="px-3 py-2 text-stone-500 dark:text-stone-500 tabular-nums">{r.stock_minimo}</td>
                <td className="px-3 py-2"><StatusBadge status={r.estado} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )

    return null
  }

  const activeReporteInfo = REPORTES.find(r => r.id === activeReport)

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
            const Icon = r.icon
            const isActive = activeReport === r.id
            return (
              <button
                key={r.id}
                onClick={() => { setActiveReport(r.id); setFilterExtra('') }}
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
              <div>
                <label className="label text-xs">Galpón</label>
                <select
                  className="input-base"
                  value={filterGalpon}
                  onChange={e => setFilterGalpon(e.target.value)}
                >
                  <option value="">Todos</option>
                  {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>

              {activeReport === 'mortalidad' && (
                <div>
                  <label className="label text-xs">Causa</label>
                  <select
                    className="input-base"
                    value={filterExtra}
                    onChange={e => setFilterExtra(e.target.value)}
                  >
                    <option value="">Todas las causas</option>
                    {CAUSAS_MORTALIDAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}

              {activeReport === 'tratamientos' && (
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select
                    className="input-base"
                    value={filterExtra}
                    onChange={e => setFilterExtra(e.target.value)}
                  >
                    <option value="">Todos los tipos</option>
                    {TIPOS_TRATAMIENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {activeReport !== 'insumos' && (
                <>
                  <div>
                    <label className="label text-xs">Desde</label>
                    <input
                      type="date"
                      className="input-base"
                      value={filterDesde}
                      onChange={e => setFilterDesde(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Hasta</label>
                    <input
                      type="date"
                      className="input-base"
                      value={filterHasta}
                      onChange={e => setFilterHasta(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Summary stats bar */}
          {summaryStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {summaryStats.map(stat => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3"
                >
                  <p className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</p>
                  <p className="text-xl font-bold text-stone-900 dark:text-stone-50 tabular-nums mt-0.5">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-3 items-center flex-wrap">
            <Button
              icon={Download}
              onClick={() => downloadCSV(toCSVData(), `reporte-${activeReport}`)}
              disabled={!reportData?.length}
            >
              Descargar CSV
            </Button>
            <Button
              icon={FileText}
              variant="secondary"
              onClick={generatePDF}
              disabled={!reportData?.length}
            >
              Descargar PDF
            </Button>
            {reportData && reportData.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs font-medium">
                {reportData.length} registros
              </span>
            )}
          </div>

          {/* Preview table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700 flex items-center gap-2">
              {activeReporteInfo && (
                <div className={`w-6 h-6 bg-gradient-to-br ${activeReporteInfo.gradient} rounded-md flex items-center justify-center`}>
                  <activeReporteInfo.icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
              )}
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Vista previa
                {reportData && reportData.length > 15 && (
                  <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-500 font-normal">
                    (primeros 15 de {reportData.length})
                  </span>
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              {isLoading ? <TableSkeleton rows={4} cols={5} /> : renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
