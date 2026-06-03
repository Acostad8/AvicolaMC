import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2, Egg, Palette, Bird,
  Save, Sun, Moon, Type, ZapOff,
  Contrast, CheckCircle2, TrendingUp, AlertCircle,
  Phone, Mail, MapPin, Hash, Info,
  Bell, BellOff, BellRing, Trash2,
  ShieldCheck, Package, Activity, CalendarClock,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useA11y } from '../../../context/AccessibilityContext'
import { useConfig } from '../../../context/ConfigContext'
import { useAuth } from '../../../context/AuthContext'
import { useNotifications } from '../../../context/NotificationsContext'
import RazasList from '../razas/RazasList'
import toast from 'react-hot-toast'

/* ── Tabs ── */
const TABS = [
  { id: 'empresa',        label: 'Empresa',        icon: Building2 },
  { id: 'produccion',     label: 'Producción',     icon: Egg },
  { id: 'apariencia',     label: 'Apariencia',     icon: Palette },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'razas',          label: 'Razas',          icon: Bird },
]

/* ── Schema empresa ── */
const empresaSchema = z.object({
  nombre:    z.string().optional(),
  nit:       z.string().optional(),
  direccion: z.string().optional(),
  ciudad:    z.string().optional(),
  telefono:  z.string().optional(),
  email:     z.string().email('Email inválido').or(z.literal('')).optional(),
})

/* ── Schema producción ── */
const produccionSchema = z.object({
  postura_excelente:  z.coerce.number().int().min(1).max(100),
  postura_buena:      z.coerce.number().int().min(1).max(100),
  postura_regular:    z.coerce.number().int().min(1).max(100),
  alerta_mortalidad:  z.coerce.number().min(0).max(100),
}).refine(d => d.postura_excelente > d.postura_buena, {
  message: 'Excelente debe ser mayor que Buena',
  path: ['postura_excelente'],
}).refine(d => d.postura_buena > d.postura_regular, {
  message: 'Buena debe ser mayor que Regular',
  path: ['postura_buena'],
})

/* ── PosturaBadge preview ── */
function PosturaBadgePreview({ pct, excelente, buena, regular, label }) {
  const n = parseFloat(pct) || 0
  let cls, text, Icon
  if (n >= excelente) {
    cls  = 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    text = 'Excelente'
    Icon = CheckCircle2
  } else if (n >= buena) {
    cls  = 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
    text = 'Buena'
    Icon = TrendingUp
  } else if (n >= regular) {
    cls  = 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
    text = 'Regular'
    Icon = TrendingUp
  } else {
    cls  = 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
    text = 'Baja'
    Icon = AlertCircle
  }
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
      <span className="text-xs text-stone-500 dark:text-stone-400">{label}</span>
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
        <Icon className="h-3 w-3" />
        {text} · {n}%
      </span>
    </div>
  )
}

/* ── Toggle switch ── */
function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-stone-500 dark:text-stone-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{label}</p>
          {description && <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          checked ? 'bg-primary-500' : 'bg-stone-200 dark:bg-stone-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SECCIÓN: Empresa
═══════════════════════════════════════════════ */
function TabEmpresa() {
  const { config, saveSection } = useConfig()

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(empresaSchema),
    defaultValues: config.granja,
  })

  function onSubmit(values) {
    saveSection('granja', values)
    toast.success('Información de la empresa guardada')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Datos de la empresa</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">Información visible en reportes y exportaciones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Nombre de la granja"
            placeholder="Ej: Granja Avícola MC"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
        </div>
        <Input
          label="NIT / Razón social"
          placeholder="Ej: 900.123.456-7"
          error={errors.nit?.message}
          {...register('nit')}
        />
        <Input
          label="Ciudad"
          placeholder="Ej: Bogotá, D.C."
          error={errors.ciudad?.message}
          {...register('ciudad')}
        />
        <div className="sm:col-span-2">
          <Input
            label="Dirección"
            placeholder="Ej: Vereda El Encanto, Km 5 vía principal"
            error={errors.direccion?.message}
            {...register('direccion')}
          />
        </div>
        <Input
          label="Teléfono"
          type="tel"
          placeholder="Ej: +57 310 000 0000"
          error={errors.telefono?.message}
          {...register('telefono')}
        />
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="Ej: contacto@granjamc.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      {/* Vista previa */}
      {(config.granja.nombre || config.granja.ciudad) && (
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">Vista previa</p>
          {config.granja.nombre && <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{config.granja.nombre}</p>}
          {config.granja.nit && <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5"><Hash className="h-3 w-3" />{config.granja.nit}</p>}
          {config.granja.direccion && <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5"><MapPin className="h-3 w-3" />{config.granja.direccion}{config.granja.ciudad ? `, ${config.granja.ciudad}` : ''}</p>}
          {config.granja.telefono && <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5"><Phone className="h-3 w-3" />{config.granja.telefono}</p>}
          {config.granja.email && <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5"><Mail className="h-3 w-3" />{config.granja.email}</p>}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
        <Button type="submit" icon={Save}>
          Guardar información
        </Button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════
   SECCIÓN: Producción
═══════════════════════════════════════════════ */
function TabProduccion() {
  const { config, saveSection } = useConfig()

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(produccionSchema),
    defaultValues: config.produccion,
  })

  const excelente = Number(watch('postura_excelente')) || 90
  const buena     = Number(watch('postura_buena'))     || 75
  const regular   = Number(watch('postura_regular'))   || 50

  function onSubmit(values) {
    saveSection('produccion', {
      postura_excelente:  Number(values.postura_excelente),
      postura_buena:      Number(values.postura_buena),
      postura_regular:    Number(values.postura_regular),
      alerta_mortalidad:  Number(values.alerta_mortalidad),
    })
    toast.success('Umbrales de producción guardados')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Umbrales postura */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
            <Egg className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Umbrales de % Postura</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Definen el color de los indicadores en la lista de producción</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Input
              label="🟢 Excelente (≥ %)"
              type="number"
              min="1"
              max="100"
              error={errors.postura_excelente?.message}
              {...register('postura_excelente')}
            />
          </div>
          <div>
            <Input
              label="🟡 Buena (≥ %)"
              type="number"
              min="1"
              max="100"
              error={errors.postura_buena?.message}
              {...register('postura_buena')}
            />
          </div>
          <div>
            <Input
              label="🟠 Regular (≥ %)"
              type="number"
              min="1"
              max="100"
              error={errors.postura_regular?.message}
              {...register('postura_regular')}
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">Vista previa de indicadores</p>
          <PosturaBadgePreview pct={excelente}     excelente={excelente} buena={buena} regular={regular} label={`≥ ${excelente}%`} />
          <PosturaBadgePreview pct={buena}         excelente={excelente} buena={buena} regular={regular} label={`≥ ${buena}% y < ${excelente}%`} />
          <PosturaBadgePreview pct={regular}       excelente={excelente} buena={buena} regular={regular} label={`≥ ${regular}% y < ${buena}%`} />
          <PosturaBadgePreview pct={regular - 1}   excelente={excelente} buena={buena} regular={regular} label={`< ${regular}%`} />
        </div>
      </div>

      {/* Alerta mortalidad */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Alerta de mortalidad</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Porcentaje diario que activa el indicador de alerta</p>
          </div>
        </div>
        <div className="sm:w-64">
          <Input
            label="Mortalidad diaria de alerta (% del lote)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            error={errors.alerta_mortalidad?.message}
            {...register('alerta_mortalidad')}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
        <Button type="submit" icon={Save}>
          Guardar umbrales
        </Button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════
   SECCIÓN: Notificaciones
═══════════════════════════════════════════════ */
const NOTIF_CATEGORIES = [
  {
    key:         'sistema',
    label:       'Sistema',
    description: 'Confirmaciones al guardar, editar o eliminar registros.',
    icon:        ShieldCheck,
    gradient:    'from-blue-400 to-blue-600',
  },
  {
    key:         'produccion',
    label:       'Producción',
    description: 'Alertas de postura baja y avisos de registro de producción.',
    icon:        Package,
    gradient:    'from-amber-400 to-amber-600',
  },
  {
    key:         'mortalidad',
    label:       'Mortalidad',
    description: 'Alertas cuando la mortalidad supera el umbral configurado.',
    icon:        Activity,
    gradient:    'from-red-400 to-red-600',
  },
  {
    key:         'recordatorios',
    label:       'Recordatorios',
    description: 'Avisos de ventanas de edición y recordatorios del sistema.',
    icon:        CalendarClock,
    gradient:    'from-violet-400 to-violet-600',
  },
]

function TabNotificaciones() {
  const { config, saveSection } = useConfig()
  const { notifications, clearAll, unreadCount } = useNotifications()
  const prefs = config.notificaciones || {}

  function setMaster(val) {
    saveSection('notificaciones', { habilitadas: val })
    toast.success(val ? 'Notificaciones activadas' : 'Notificaciones desactivadas')
  }

  function setCategory(key, val) {
    saveSection('notificaciones', { [key]: val })
  }

  function handleClearHistory() {
    clearAll()
    toast.success('Historial de notificaciones eliminado')
  }

  const globalOn = prefs.habilitadas !== false

  return (
    <div className="space-y-6">

      {/* ── Interruptor maestro ── */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className={`w-10 h-10 bg-gradient-to-br ${globalOn ? 'from-primary-400 to-primary-600' : 'from-stone-400 to-stone-600'} rounded-xl flex items-center justify-center shadow-sm transition-all`}>
            {globalOn
              ? <BellRing className="h-5 w-5 text-white" />
              : <BellOff  className="h-5 w-5 text-white" />
            }
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Notificaciones y alertas</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {globalOn ? 'Las notificaciones están activas' : 'Todas las notificaciones están desactivadas'}
            </p>
          </div>
        </div>

        <div className={`rounded-2xl border-2 p-4 transition-all ${globalOn ? 'border-primary-200 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-900/10' : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                {globalOn ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {globalOn
                  ? 'Recibes alertas y confirmaciones en tiempo real.'
                  : 'No aparecerán alertas ni toasts mientras esté desactivado.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={globalOn}
              onClick={() => setMaster(!globalOn)}
              className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                globalOn ? 'bg-primary-500' : 'bg-stone-300 dark:bg-stone-600'
              }`}
              style={{ width: '3.25rem' }}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${globalOn ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Categorías ── */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-stone-400 to-stone-600 rounded-xl flex items-center justify-center shadow-sm">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Tipos de notificación</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Activa o desactiva cada categoría de forma independiente</p>
          </div>
        </div>

        <div className={`divide-y divide-stone-100 dark:divide-stone-800 transition-opacity ${!globalOn ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {NOTIF_CATEGORIES.map(cat => {
            const enabled = prefs[cat.key] !== false
            const Icon = cat.icon
            return (
              <div key={cat.key} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 bg-gradient-to-br ${cat.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{cat.label}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 leading-snug">{cat.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-disabled={!globalOn}
                  tabIndex={globalOn ? 0 : -1}
                  onClick={() => globalOn && setCategory(cat.key, !enabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    globalOn ? 'cursor-pointer' : 'cursor-not-allowed'
                  } ${
                    enabled ? 'bg-primary-500' : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Historial ── */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl flex items-center justify-center shadow-sm">
            <Trash2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Historial de notificaciones</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {notifications.length === 0
                ? 'El historial está vacío'
                : `${notifications.length} notificación${notifications.length !== 1 ? 'es' : ''} almacenada${notifications.length !== 1 ? 's' : ''} · ${unreadCount} sin leer`}
            </p>
          </div>
        </div>

        {notifications.length > 0 ? (
          <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Se eliminará todo el historial guardado en este dispositivo.
            </p>
            <button
              type="button"
              onClick={handleClearHistory}
              className="ml-4 flex-shrink-0 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        ) : (
          <p className="text-sm text-stone-400 dark:text-stone-500 px-1">No hay notificaciones en el historial.</p>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SECCIÓN: Apariencia
═══════════════════════════════════════════════ */
const TEXT_SIZES = [
  { value: 'sm', label: 'A', title: 'Pequeño' },
  { value: 'md', label: 'A', title: 'Normal' },
  { value: 'lg', label: 'A', title: 'Grande' },
  { value: 'xl', label: 'A', title: 'Muy grande' },
]

function TabApariencia() {
  const { dark, setDark, contrast, setContrast, textSize, setTextSize, noMotion, setNoMotion } = useA11y()

  return (
    <div className="space-y-6">
      {/* Tema */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
            <Palette className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Tema de la interfaz</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Elige entre modo claro u oscuro</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDark(false)}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              !dark
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
            }`}
          >
            <div className="w-10 h-10 bg-white border border-stone-200 rounded-xl flex items-center justify-center shadow-sm">
              <Sun className="h-5 w-5 text-amber-500" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Claro</span>
            {!dark && <span className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold">Activo</span>}
          </button>
          <button
            type="button"
            onClick={() => setDark(true)}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              dark
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
            }`}
          >
            <div className="w-10 h-10 bg-stone-900 border border-stone-700 rounded-xl flex items-center justify-center shadow-sm">
              <Moon className="h-5 w-5 text-violet-400" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Oscuro</span>
            {dark && <span className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold">Activo</span>}
          </button>
        </div>
      </div>

      {/* Tamaño de texto */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Type className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Tamaño de texto</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Ajusta el tamaño de fuente de la interfaz</p>
          </div>
        </div>
        <div className="flex gap-2">
          {TEXT_SIZES.map((s, i) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setTextSize(s.value)}
              title={s.title}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all ${
                textSize === s.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
              }`}
              style={{ fontSize: `${0.75 + i * 0.125}rem` }}
            >
              <span className="font-bold leading-none">{s.label}</span>
              <span className="text-[10px] font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accesibilidad */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
            <Contrast className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Accesibilidad</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Opciones de contraste y movimiento</p>
          </div>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          <Toggle
            checked={contrast}
            onChange={setContrast}
            label="Alto contraste"
            description="Aumenta el contraste del texto e interfaces"
            icon={Contrast}
          />
          <Toggle
            checked={noMotion}
            onChange={setNoMotion}
            label="Reducir animaciones"
            description="Minimiza transiciones y efectos de movimiento"
            icon={ZapOff}
          />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════ */
export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('empresa')
  const { isAdmin } = useAuth()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configuración' },
        ]}
      />

      {/* ── Tab bar ── */}
      <div className="card p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="card p-6">
        {activeTab === 'empresa'        && <TabEmpresa />}
        {activeTab === 'produccion'     && <TabProduccion />}
        {activeTab === 'apariencia'     && <TabApariencia />}
        {activeTab === 'notificaciones' && <TabNotificaciones />}
        {activeTab === 'razas'          && (
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-stone-100 dark:border-stone-800 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                <Bird className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Gestión de razas</p>
                <p className="text-xs text-stone-400 dark:text-stone-500">Administra las razas disponibles para los lotes</p>
              </div>
            </div>
            <RazasList embedded />
          </div>
        )}
      </div>

      {/* Nota localStorage */}
      {['empresa', 'produccion', 'notificaciones'].includes(activeTab) && (
        <div className="flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500 px-1">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>La configuración se sincroniza en todos los dispositivos. Se guarda localmente como respaldo sin conexión.</span>
        </div>
      )}
    </div>
  )
}
