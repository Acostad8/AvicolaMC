import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { formatDate, getLabelFromValue, CATEGORIAS_INSUMO } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Pencil, Plus, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'

export default function InsumoDetalle() {
  const { id } = useParams()
  const { isAdmin } = useAuth()

  const { data: insumo, isLoading } = useQuery({
    queryKey: ['insumo', id],
    queryFn: async () => {
      const { data } = await supabase.from('insumos').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: movimientos } = useQuery({
    queryKey: ['movimientos-insumo', id],
    queryFn: async () => {
      const { data } = await supabase.from('movimientos_insumos').select(`*, registrado:perfiles(nombre_completo)`).eq('insumo_id', id).order('fecha', { ascending: false }).limit(50)
      return data || []
    },
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!insumo) return null

  const stockBajo = insumo.stock_actual <= insumo.stock_minimo

  return (
    <div className="space-y-6">
      <PageHeader
        title={insumo.nombre}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insumos', href: '/dashboard/insumos' }, { label: insumo.nombre }]}
        actions={isAdmin && (
          <div className="flex gap-2">
            <Link to="/dashboard/insumos/movimiento/nuevo">
              <Button size="sm" icon={Plus}>Registrar movimiento</Button>
            </Link>
            <Link to={`/dashboard/insumos/${id}/editar`}>
              <Button variant="secondary" size="sm" icon={Pencil}>Editar</Button>
            </Link>
          </div>
        )}
      />

      {stockBajo && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Stock bajo el mínimo definido ({insumo.stock_minimo} {insumo.unidad_medida})
        </div>
      )}

      <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div><p className="text-xs text-stone-500">Categoría</p><p className="font-semibold">{getLabelFromValue(CATEGORIAS_INSUMO, insumo.categoria)}</p></div>
        <div><p className="text-xs text-stone-500">Unidad</p><p className="font-semibold">{insumo.unidad_medida}</p></div>
        <div>
          <p className="text-xs text-stone-500">Stock actual</p>
          <p className={`font-bold text-lg ${stockBajo ? 'text-red-600' : 'text-green-700'}`}>{insumo.stock_actual}</p>
        </div>
        <div><p className="text-xs text-stone-500">Stock mínimo</p><p className="font-semibold">{insumo.stock_minimo}</p></div>
        <div><p className="text-xs text-stone-500">Estado</p><StatusBadge status={insumo.estado} /></div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200">
          <h3 className="section-title">Historial de movimientos</h3>
        </div>
        {(movimientos || []).length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8">Sin movimientos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                {['Fecha', 'Tipo', 'Cantidad', 'Destino/Proveedor', 'Registrado por'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movimientos?.map(m => (
                <tr key={m.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">{formatDate(m.fecha)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.tipo === 'entrada' ? 'green' : 'red'}>{m.tipo === 'entrada' ? 'Entrada' : 'Salida'}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{m.cantidad} {insumo.unidad_medida}</td>
                  <td className="px-4 py-3 text-stone-600">{m.destino_proveedor || '—'}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{m.registrado?.nombre_completo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
