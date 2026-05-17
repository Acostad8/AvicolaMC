import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, downloadCSV, getLabelFromValue, CAUSAS_MORTALIDAD, TIPOS_TRATAMIENTO } from '../../lib/utils'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Download, FileText } from 'lucide-react'
import { TableSkeleton } from '../../components/ui/Skeleton'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const REPORTES = [
  { id: 'produccion', label: 'Producción de huevos' },
  { id: 'mortalidad', label: 'Mortalidad' },
  { id: 'tratamientos', label: 'Tratamientos veterinarios' },
  { id: 'insumos', label: 'Insumos y movimientos (solo Admin)' },
]

export default function Reportes() {
  const { isAdmin, perfil } = useAuth()
  const [activeReport, setActiveReport] = useState('produccion')
  const [filterGalpon, setFilterGalpon] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [filterExtra, setFilterExtra] = useState('')

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
    if (!reportData || reportData.length === 0) return <p className="text-stone-400 text-sm text-center py-8">Sin registros para los filtros aplicados</p>

    if (activeReport === 'produccion') return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50"><tr>{['Fecha', 'Galpón', 'Lote', 'Huevos', '% Postura', 'Alimento (kg)'].map(h => <th key={h} className="text-left px-3 py-2 font-semibold text-stone-600">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-100">
          {reportData.slice(0, 10).map(r => <tr key={r.id}><td className="px-3 py-2">{formatDate(r.fecha)}</td><td className="px-3 py-2">{r.galpon?.nombre}</td><td className="px-3 py-2">{r.lote?.nombre_numero}</td><td className="px-3 py-2 font-semibold">{r.huevos_producidos?.toLocaleString('es-CO')}</td><td className="px-3 py-2">{r.porcentaje_postura}%</td><td className="px-3 py-2">{r.consumo_alimento_kg}</td></tr>)}
        </tbody>
      </table>
    )

    if (activeReport === 'mortalidad') return (
      <table className="w-full text-xs">
        <thead className="bg-stone-50"><tr>{['Fecha', 'Galpón', 'Lote', 'Bajas', 'Causa'].map(h => <th key={h} className="text-left px-3 py-2 font-semibold text-stone-600">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-100">
          {reportData.slice(0, 10).map(r => <tr key={r.id}><td className="px-3 py-2">{formatDate(r.fecha)}</td><td className="px-3 py-2">{r.galpon?.nombre}</td><td className="px-3 py-2">{r.lote?.nombre_numero}</td><td className="px-3 py-2 text-red-700 font-semibold">{r.cantidad_bajas}</td><td className="px-3 py-2">{getLabelFromValue(CAUSAS_MORTALIDAD, r.causa)}</td></tr>)}
        </tbody>
      </table>
    )

    return <p className="text-stone-500 text-sm text-center py-4">{reportData.length} registro(s) encontrados</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y descargas"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reportes' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Selector de reporte */}
        <div className="card p-4 space-y-1">
          <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Tipo de reporte</p>
          {REPORTES.filter(r => isAdmin || r.id !== 'insumos').map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeReport === r.id ? 'bg-primary-100 text-primary-800 font-medium' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Filtros y resultados */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4 flex flex-wrap gap-3">
            <select className="input-base sm:w-48 bg-white" value={filterGalpon} onChange={e => setFilterGalpon(e.target.value)}>
              <option value="">Todos los galpones</option>
              {(galpones || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            {activeReport === 'mortalidad' && (
              <select className="input-base sm:w-48 bg-white" value={filterExtra} onChange={e => setFilterExtra(e.target.value)}>
                <option value="">Todas las causas</option>
                {CAUSAS_MORTALIDAD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
            {activeReport === 'tratamientos' && (
              <select className="input-base sm:w-48 bg-white" value={filterExtra} onChange={e => setFilterExtra(e.target.value)}>
                <option value="">Todos los tipos</option>
                {TIPOS_TRATAMIENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
            <input type="date" className="input-base sm:w-40" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} />
            <input type="date" className="input-base sm:w-40" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button icon={Download} onClick={() => downloadCSV(toCSVData(), `reporte-${activeReport}`)} disabled={!reportData?.length}>Descargar CSV</Button>
            <Button icon={FileText} variant="secondary" onClick={generatePDF} disabled={!reportData?.length}>Descargar PDF</Button>
            {reportData && <span className="text-sm text-stone-500 self-center">{reportData.length} registros</span>}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200">
              <p className="text-sm font-medium text-stone-700">Vista previa (primeros 10 registros)</p>
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
