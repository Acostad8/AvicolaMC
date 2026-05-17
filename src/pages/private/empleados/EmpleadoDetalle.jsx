import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Pencil } from 'lucide-react'

export default function EmpleadoDetalle() {
  const { id } = useParams()
  const { data: e, isLoading } = useQuery({
    queryKey: ['empleado', id],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('*').eq('id', id).single()
      return data
    },
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!e) return null

  return (
    <div className="max-w-xl">
      <PageHeader
        title={e.nombre_completo}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Empleados', href: '/dashboard/empleados' }, { label: e.nombre_completo }]}
        actions={
          <Link to={`/dashboard/empleados/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar</Button>
          </Link>
        }
      />
      <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-stone-500">Documento</p><p className="font-semibold">{e.documento_identidad || '—'}</p></div>
        <div><p className="text-xs text-stone-500">Cargo</p><p className="font-semibold">{e.cargo || '—'}</p></div>
        <div><p className="text-xs text-stone-500">Teléfono</p><p className="font-semibold">{e.telefono || '—'}</p></div>
        <div><p className="text-xs text-stone-500">Fecha de ingreso</p><p className="font-semibold">{formatDate(e.fecha_ingreso)}</p></div>
        <div><p className="text-xs text-stone-500">Estado</p><StatusBadge status={e.estado} /></div>
        {e.notas && <div className="col-span-2"><p className="text-xs text-stone-500">Notas</p><p>{e.notas}</p></div>}
      </div>
    </div>
  )
}
