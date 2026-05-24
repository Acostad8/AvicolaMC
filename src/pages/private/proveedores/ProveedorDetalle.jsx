import {  useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { getLabelFromValue, TIPOS_PROVEEDOR } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/Badge'
// import Button from '../../../components/ui/Button'
import {  Package, Bird } from 'lucide-react'

export default function ProveedorDetalle() {
  const { id } = useParams()

  const { data: proveedor, isLoading } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: insumos } = useQuery({
    queryKey: ['proveedor-insumos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores_insumos')
        .select('insumo:insumos(id, nombre, unidad_medida)')
        .eq('proveedor_id', id)
      return (data || []).map(r => r.insumo)
    },
  })

  const { data: razas } = useQuery({
    queryKey: ['proveedor-razas', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores_razas')
        .select('raza:razas(id, nombre, tipo)')
        .eq('proveedor_id', id)
      return (data || []).map(r => r.raza)
    },
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!proveedor) return null

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={proveedor.nombre}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Proveedores', href: '/dashboard/proveedores' }, { label: proveedor.nombre }]}
        // actions={
        //   <Link to={`/dashboard/proveedores/${id}/editar`}>
        //     <Button variant="secondary" size="sm" icon={Pencil}>Editar</Button>
        //   </Link>
        // }
      />

      <div className="card p-6 grid grid-cols-2 gap-4">
        <div><p className="text-xs text-stone-500">Tipo</p><p className="font-semibold">{getLabelFromValue(TIPOS_PROVEEDOR, proveedor.tipo_proveedor)}</p></div>
        <div><p className="text-xs text-stone-500">Estado</p><StatusBadge status={proveedor.estado} /></div>
        <div><p className="text-xs text-stone-500">Teléfono</p><p className="font-semibold">{proveedor.telefono || '—'}</p></div>
        <div><p className="text-xs text-stone-500">Correo</p><p className="font-semibold">{proveedor.correo || '—'}</p></div>
        {proveedor.direccion && (
          <div className="col-span-2"><p className="text-xs text-stone-500">Dirección</p><p className="font-semibold">{proveedor.direccion}</p></div>
        )}
        {proveedor.notas && (
          <div className="col-span-2"><p className="text-xs text-stone-500">Notas</p><p className="text-sm text-stone-700">{proveedor.notas}</p></div>
        )}
      </div>

      {/* Insumos */}
      <div className="card p-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Package className="h-4 w-4" /> Insumos suministrados
        </h3>
        {(insumos || []).length === 0 ? (
          <p className="text-stone-400 text-sm">Sin insumos asignados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {insumos.map(i => (
              <span key={i.id} className="badge bg-stone-100 text-stone-700">{i.nombre} ({i.unidad_medida})</span>
            ))}
          </div>
        )}
      </div>

      {/* Razas */}
      <div className="card p-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Bird className="h-4 w-4" /> Razas que provee
        </h3>
        {(razas || []).length === 0 ? (
          <p className="text-stone-400 text-sm">Sin razas asignadas</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {razas.map(r => (
              <span key={r.id} className="badge bg-amber-100 text-amber-800">{r.nombre} ({r.tipo})</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
