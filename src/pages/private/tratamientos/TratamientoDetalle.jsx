import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, getLabelFromValue, TIPOS_TRATAMIENTO } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Pencil, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function TratamientoDetalle() {
  const { id } = useParams()
  const { isAdmin } = useAuth()

  const { data: t, isLoading } = useQuery({
    queryKey: ['tratamiento', id],
    queryFn: async () => {
      const { data } = await supabase.from('tratamientos').select(`*, galpon:galpones(nombre), lote:lotes(nombre_numero)`).eq('id', id).single()
      return data
    },
  })

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Sistema de Gestión Avícola MC', 14, 20)
    doc.setFontSize(12)
    doc.text('Registro de Tratamiento Veterinario', 14, 30)
    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Valor']],
      body: [
        ['Galpón', t.galpon?.nombre || ''],
        ['Lote', t.lote?.nombre_numero || ''],
        ['Fecha inicio', formatDate(t.fecha_inicio)],
        ['Fecha fin', formatDate(t.fecha_fin)],
        ['Tipo', getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)],
        ['Producto', t.nombre_producto],
        ['Dosis/Aplicación', t.dosis_aplicacion],
        ['Responsable', t.responsable],
        ['Estado', t.estado],
        ['Observaciones', t.observaciones || ''],
      ],
    })
    doc.save(`tratamiento-${id}.pdf`)
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!t) return null

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader
        title="Detalle del tratamiento"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tratamientos', href: '/dashboard/tratamientos' }, { label: 'Detalle' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={downloadPDF}>Descargar PDF</Button>
            {isAdmin && (
              <Link to={`/dashboard/tratamientos/${id}/editar`}>
                <Button variant="secondary" icon={Pencil}>Editar</Button>
              </Link>
            )}
          </div>
        }
      />
      <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-stone-500">Galpón</p><p className="font-semibold">{t.galpon?.nombre}</p></div>
        <div><p className="text-xs text-stone-500">Lote</p><p className="font-semibold">{t.lote?.nombre_numero}</p></div>
        <div><p className="text-xs text-stone-500">Fecha inicio</p><p className="font-semibold">{formatDate(t.fecha_inicio)}</p></div>
        <div><p className="text-xs text-stone-500">Fecha fin</p><p className="font-semibold">{formatDate(t.fecha_fin)}</p></div>
        <div><p className="text-xs text-stone-500">Tipo</p><p className="font-semibold">{getLabelFromValue(TIPOS_TRATAMIENTO, t.tipo)}</p></div>
        <div><p className="text-xs text-stone-500">Estado</p><StatusBadge status={t.estado} /></div>
        <div><p className="text-xs text-stone-500">Producto</p><p className="font-semibold">{t.nombre_producto}</p></div>
        <div><p className="text-xs text-stone-500">Responsable</p><p className="font-semibold">{t.responsable}</p></div>
        <div className="col-span-2"><p className="text-xs text-stone-500">Dosis / Aplicación</p><p>{t.dosis_aplicacion}</p></div>
        {t.observaciones && <div className="col-span-2"><p className="text-xs text-stone-500">Observaciones</p><p>{t.observaciones}</p></div>}
      </div>
    </div>
  )
}
