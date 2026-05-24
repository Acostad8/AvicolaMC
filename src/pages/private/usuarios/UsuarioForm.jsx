import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import PageHeader from '../../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const createSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['administrador', 'encargado']),
  estado: z.enum(['activo', 'inactivo']),
  empleado_id: z.string().optional(),
})

const editSchema = z.object({
  nombre_completo: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  rol: z.enum(['administrador', 'encargado']),
  estado: z.enum(['activo', 'inactivo']),
  empleado_id: z.string().optional(),
})

export default function UsuarioForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { perfil: currentUser } = useAuth()
  const qc = useQueryClient()

  const schema = isEdit ? editSchema : createSchema
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'encargado', estado: 'activo' },
  })

  const rolWatch   = watch('rol')
  const emailValue = watch('email')

  const { data: empleados } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const { data } = await supabase.from('empleados').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo')
      return data || []
    },
  })

  /* Emails ya registrados — para validación de duplicados */
  const { data: emailsExistentes } = useQuery({
    queryKey: ['perfiles-emails'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('id, email')
      return data || []
    },
  })

  const { data: perfilesConEmpleado } = useQuery({
    queryKey: ['perfiles-empleados'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('id, empleado_id').not('empleado_id', 'is', null)
      return data || []
    },
  })

  const empleadosOcupados = new Set(
    (perfilesConEmpleado || [])
      .filter(p => !isEdit || p.id !== id)
      .map(p => p.empleado_id)
  )
  const empleadosDisponibles = (empleados || []).filter(e => !empleadosOcupados.has(e.id))

  /* Valida duplicado en tiempo real: coincide con otro usuario (distinto al editado) */
  const emailDuplicado = useMemo(() => {
    const valor = (emailValue || '').trim().toLowerCase()
    if (!valor || !emailsExistentes?.length) return ''
    const existe = emailsExistentes.find(
      p => p.email?.toLowerCase() === valor && p.id !== id
    )
    return existe ? 'Este correo ya está registrado en el sistema' : ''
  }, [emailValue, emailsExistentes, id])

  const { data: galpones } = useQuery({
    queryKey: ['galpones-todos'],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id, nombre').eq('estado', 'activo').order('nombre')
      return data || []
    },
  })

  const { data: usuario } = useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  const { data: galponesAsignados } = useQuery({
    queryKey: ['galpones-encargado', id],
    queryFn: async () => {
      const { data } = await supabase.from('galpones').select('id').eq('encargado_id', id)
      return (data || []).map(g => g.id)
    },
    enabled: isEdit,
  })

  const [selectedGalpones, setSelectedGalpones] = useState([])

  useEffect(() => {
    if (galponesAsignados) setSelectedGalpones(galponesAsignados)
  }, [galponesAsignados])

  useEffect(() => {
    if (usuario) reset({ nombre_completo: usuario.nombre_completo, email: usuario.email || '', rol: usuario.rol, estado: usuario.estado, empleado_id: usuario.empleado_id || '' })
  }, [usuario, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      /* Verificación doble de email duplicado antes de cualquier operación */
      const emailNorm = values.email.trim().toLowerCase()
      const conflicto = (emailsExistentes || []).find(
        p => p.email?.toLowerCase() === emailNorm && p.id !== id
      )
      if (conflicto) throw new Error('Este correo ya está registrado en el sistema')

      if (isEdit) {
        if (id === currentUser?.id && values.estado === 'inactivo') throw new Error('No puedes desactivarte a ti mismo')
        if (id === currentUser?.id && values.rol !== 'administrador') throw new Error('No puedes quitarte el rol de administrador')

        const { error } = await supabase.from('perfiles').update({
          nombre_completo: values.nombre_completo,
          email: values.email,
          rol: values.rol,
          estado: values.estado,
          empleado_id: values.empleado_id || null,
        }).eq('id', id)
        if (error) throw error

        // Update galpon assignments
        if (values.rol === 'encargado') {
          await supabase.from('galpones').update({ encargado_id: null }).eq('encargado_id', id)
          if (selectedGalpones.length > 0) {
            await supabase.from('galpones').update({ encargado_id: id }).in('id', selectedGalpones)
          }
        }
      } else {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('super-api', {
          body: { email: values.email, password: values.password },
        })
        if (fnError) throw fnError
        if (fnData?.error) throw new Error(fnData.error)
        const authData = fnData

        const { error } = await supabase.from('perfiles').insert({
          id: authData.user.id,
          nombre_completo: values.nombre_completo,
          email: values.email,
          rol: values.rol,
          estado: values.estado,
          empleado_id: values.empleado_id || null,
        })
        if (error) throw error

        if (values.rol === 'encargado' && selectedGalpones.length > 0) {
          await supabase.from('galpones').update({ encargado_id: authData.user.id }).in('id', selectedGalpones)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['usuarios'])
      qc.invalidateQueries(['galpones'])
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
      navigate('/dashboard/usuarios')
    },
    onError: e => toast.error(e.message || 'Error al guardar'),
  })

  function toggleGalpon(galponId) {
    setSelectedGalpones(prev =>
      prev.includes(galponId) ? prev.filter(id => id !== galponId) : [...prev, galponId]
    )
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Usuarios', href: '/dashboard/usuarios' }, { label: isEdit ? 'Editar' : 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="card p-6 space-y-4">
        <Input label="Nombre completo" error={errors.nombre_completo?.message} {...register('nombre_completo')} />
        <Input label="Correo electrónico" type="email" error={errors.email?.message || emailDuplicado} {...register('email')} />
        {!isEdit && <Input label="Contraseña temporal (mínimo 8 caracteres)" type="password" error={errors.password?.message} {...register('password')} />}
        <Select label="Rol" options={[{ value: 'administrador', label: 'Administrador' }, { value: 'encargado', label: 'Encargado' }]} error={errors.rol?.message} {...register('rol')} />
        <Select label="Estado" options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} error={errors.estado?.message} {...register('estado')} />
        <Select
          label="Empleado vinculado (opcional)"
          options={[{ value: '', label: 'Sin vincular' }, ...empleadosDisponibles.map(e => ({ value: e.id, label: e.nombre_completo }))]}
          {...register('empleado_id')}
        />

        {rolWatch === 'encargado' && (
          <div>
            <label className="label">Galpones asignados</label>
            <div className="space-y-2 mt-1 max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-3">
              {(galpones || []).map(g => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedGalpones.includes(g.id)}
                    onChange={() => toggleGalpon(g.id)}
                    className="rounded border-stone-300 text-primary-600 focus:ring-primary-500"
                  />
                  {g.nombre}
                </label>
              ))}
              {(galpones || []).length === 0 && <p className="text-stone-400 text-xs">No hay galpones activos</p>}
            </div>
          </div>
        )}

        {isEdit && (
          <div className="border-t border-stone-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const { error } = await supabase.auth.resetPasswordForEmail(usuario?.email)
                if (!error) toast.success('Enlace de restablecimiento enviado al correo')
                else toast.error('Error al enviar enlace')
              }}
            >
              Restablecer contraseña
            </Button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending || isSubmitting} disabled={!!emailDuplicado}>{isEdit ? 'Guardar cambios' : 'Crear usuario'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/usuarios')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
