import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatDate, formatNumber, calcWeeksAge } from '../../../lib/utils'
import PageHeader from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ui/Modal'
import toast from 'react-hot-toast'
import { CheckCircle, PauseCircle } from 'lucide-react'

export default function LoteDetalle() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [confirmAction, setConfirmAction] = useState(null)

  const { data: lote, isLoading } = useQuery({
    queryKey: ['lote', id],
    queryFn: async () => {
      const { data } = await supabase.from('lotes').select(`*, galpon:galpones(nombre), raza:razas(nombre)`).eq('id', id).single()
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async (nuevoEstado) => {
      const { error } = await supabase.from('lotes').update({
        estado: nuevoEstado,
        fecha_salida: nuevoEstado === 'finalizado' ? new Date().toISOString().slice(0, 10) : lote.fecha_salida,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, nuevoEstado) => {
      qc.invalidateQueries(['lote', id])
      qc.invalidateQueries(['lotes'])
      toast.success(nuevoEstado === 'finalizado' ? 'Lote finalizado correctamente' : 'Lote suspendido')
      setConfirmAction(null)
    },
    onError: e => toast.error(e.message || 'Error al actualizar'),
  })

  if (isLoading) return <div className="text-center py-10 text-stone-400">Cargando...</div>
  if (!lote) return null

  const esActivo = lote.estado === 'activo'
  const esSuspendido = lote.estado === 'suspendido'

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`Lote ${lote.nombre_numero}`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lotes', href: '/dashboard/lotes' }, { label: lote.nombre_numero }]}
        actions={isAdmin && (esActivo || esSuspendido) && (
          <div className="flex gap-2">
            {esActivo && (
              <Button variant="secondary" size="sm" icon={PauseCircle} onClick={() => setConfirmAction('suspendido')}>
                Suspender
              </Button>
            )}
            {(esActivo || esSuspendido) && (
              <Button variant="danger" size="sm" icon={CheckCircle} onClick={() => setConfirmAction('finalizado')}>
                Finalizar lote
              </Button>
            )}
          </div>
        )}
      />

      {(lote.estado === 'finalizado' || lote.estado === 'suspendido') && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${lote.estado === 'suspendido' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {lote.estado === 'suspendido'
            ? 'Este lote está suspendido. No se pueden registrar producción, mortalidad ni tratamientos.'
            : 'Este lote ha finalizado su ciclo productivo. Se mantiene el historial completo.'}
        </div>
      )}

      <div className="card p-6 grid grid-cols-2 gap-4">
        <div><p className="text-xs text-stone-500">Galpón</p><p className="font-semibold">{lote.galpon?.nombre}</p></div>
        <div><p className="text-xs text-stone-500">Raza</p><p className="font-semibold">{lote.raza?.nombre || '—'}</p></div>
        <div><p className="text-xs text-stone-500">Estado</p><StatusBadge status={lote.estado} /></div>
        <div><p className="text-xs text-stone-500">Semanas de vida</p><p className="font-semibold">{lote.estado === 'activo' ? `${calcWeeksAge(lote.fecha_ingreso)} sem.` : '—'}</p></div>
        <div><p className="text-xs text-stone-500">Cantidad inicial</p><p className="font-semibold">{formatNumber(lote.cantidad_inicial_aves)}</p></div>
        <div><p className="text-xs text-stone-500">Aves actuales</p><p className="font-semibold">{formatNumber(lote.cantidad_aves_actuales)}</p></div>
        <div><p className="text-xs text-stone-500">Fecha de ingreso</p><p className="font-semibold">{formatDate(lote.fecha_ingreso)}</p></div>
        <div><p className="text-xs text-stone-500">Fecha de salida</p><p className="font-semibold">{formatDate(lote.fecha_salida)}</p></div>
        {lote.notas && <div className="col-span-2"><p className="text-xs text-stone-500">Notas</p><p className="text-sm text-stone-700">{lote.notas}</p></div>}
      </div>

      <ConfirmModal
        open={confirmAction === 'finalizado'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => mutation.mutate('finalizado')}
        loading={mutation.isPending}
        title="Finalizar lote"
        message={`¿Finalizar el lote "${lote.nombre_numero}"? El galpón quedará disponible para un nuevo lote y no se podrán registrar más movimientos.`}
        confirmLabel="Sí, finalizar"
      />

      <ConfirmModal
        open={confirmAction === 'suspendido'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => mutation.mutate('suspendido')}
        loading={mutation.isPending}
        title="Suspender lote"
        message={`¿Suspender el lote "${lote.nombre_numero}"? No se podrán registrar producción ni mortalidad mientras esté suspendido. Podrás finalizarlo después.`}
        confirmLabel="Sí, suspender"
      />
    </div>
  )
}
