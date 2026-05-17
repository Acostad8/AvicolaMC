import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, formatNumber, calcWeeksAge } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Pencil, Plus, Egg } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'

export default function GalponDetalle() {
  const { id } = useParams()
  const { isAdmin } = useAuth()

  const { data: galpon, isLoading } = useQuery({
    queryKey: ['galpon', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select(`
        *, encargado:perfiles(nombre_completo),
        lotes(*, raza:razas(nombre))
      `).eq('id', id).single()
      return data
    },
  })

  const { data: chart7 } = useQuery({
    queryKey: ['galpon-chart', id],
    queryFn: async () => {
      const desde = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const [{ data: prod }, { data: mort }] = await Promise.all([
        supabase.from('produccion').select('fecha, huevos_producidos').eq('galpon_id', id).gte('fecha', desde),
        supabase.from('mortalidad').select('fecha, cantidad_bajas').eq('galpon_id', id).gte('fecha', desde),
      ])
      return Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
        return {
          fecha: date.slice(5),
          huevos: (prod || []).filter(p => p.fecha === date).reduce((s, p) => s + p.huevos_producidos, 0),
          bajas: (mort || []).filter(m => m.fecha === date).reduce((s, m) => s + m.cantidad_bajas, 0),
        }
      })
    },
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!galpon) return <div className="text-center py-10 text-stone-400">Galpón no encontrado</div>

  const loteActivo = galpon.lotes?.find(l => l.estado === 'activo')
  const lotesAnteriores = galpon.lotes?.filter(l => l.estado !== 'activo') || []

  return (
    <div className="space-y-6">
      <PageHeader
        title={galpon.nombre}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Galpones', href: '/dashboard/galpones' },
          { label: galpon.nombre },
        ]}
        actions={isAdmin && (
          <Link to={`/dashboard/galpones/${id}/editar`}>
            <Button variant="secondary" icon={Pencil}>Editar</Button>
          </Link>
        )}
      />

      {/* Info general */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-stone-500">Estado</p>
          <div className="mt-1"><StatusBadge status={galpon.estado} /></div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500">Capacidad máxima</p>
          <p className="font-semibold text-stone-800 mt-1">{formatNumber(galpon.capacidad_maxima)} aves</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500">Encargado</p>
          <p className="font-semibold text-stone-800 mt-1">{galpon.encargado?.nombre_completo || 'Sin asignar'}</p>
        </div>
      </div>

      {galpon.descripcion && (
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Descripción</p>
          <p className="text-sm text-stone-700">{galpon.descripcion}</p>
        </div>
      )}

      {/* Lote activo */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Lote activo</h3>
          <Link to="/dashboard/lotes/nuevo">
            <Button size="sm" icon={Plus}>Nuevo lote</Button>
          </Link>
        </div>
        {loteActivo ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-stone-500">Lote</p><p className="font-semibold text-stone-800">{loteActivo.nombre_numero}</p></div>
            <div><p className="text-xs text-stone-500">Raza</p><p className="font-semibold text-stone-800">{loteActivo.raza?.nombre || '—'}</p></div>
            <div><p className="text-xs text-stone-500">Aves actuales</p><p className="font-semibold text-stone-800">{formatNumber(loteActivo.cantidad_aves_actuales)}</p></div>
            <div><p className="text-xs text-stone-500">Semanas de vida</p><p className="font-semibold text-stone-800">{calcWeeksAge(loteActivo.fecha_ingreso)} sem.</p></div>
            <div><p className="text-xs text-stone-500">Fecha de ingreso</p><p className="font-semibold text-stone-800">{formatDate(loteActivo.fecha_ingreso)}</p></div>
            <div><p className="text-xs text-stone-500">Cantidad inicial</p><p className="font-semibold text-stone-800">{formatNumber(loteActivo.cantidad_inicial_aves)}</p></div>
          </div>
        ) : (
          <p className="text-stone-400 text-sm">No hay lote activo en este galpón.</p>
        )}
      </div>

      {/* Gráficas 7 días */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-4">Producción — 7 días</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chart7 || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="huevos" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="Huevos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Mortalidad — 7 días</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart7 || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="bajas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Bajas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Acceso rápido */}
      <div className="flex gap-3">
        <Link to={`/dashboard/produccion/nuevo`}>
          <Button icon={Egg}>Registrar producción hoy</Button>
        </Link>
        <Link to={`/dashboard/produccion?galpon=${id}`}>
          <Button variant="secondary">Ver historial de producción</Button>
        </Link>
      </div>

      {/* Lotes anteriores */}
      {lotesAnteriores.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Lotes anteriores</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {['Lote', 'Raza', 'Ingreso', 'Salida', 'Estado'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-stone-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lotesAnteriores.map(l => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.nombre_numero}</td>
                    <td className="px-3 py-2">{l.raza?.nombre || '—'}</td>
                    <td className="px-3 py-2">{formatDate(l.fecha_ingreso)}</td>
                    <td className="px-3 py-2">{formatDate(l.fecha_salida)}</td>
                    <td className="px-3 py-2"><StatusBadge status={l.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
