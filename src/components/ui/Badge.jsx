import { cn } from '../../lib/utils'

const variants = {
  green:  'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400',
  red:    'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  blue:   'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400',
  gray:   'bg-stone-100  text-stone-700  dark:bg-stone-800     dark:text-stone-300',
  amber:  'bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    activo:      { label: 'Activo',      variant: 'green'  },
    inactivo:    { label: 'Inactivo',    variant: 'gray'   },
    finalizado:  { label: 'Finalizado',  variant: 'blue'   },
    suspendido:  { label: 'Suspendido',  variant: 'yellow' },
    pendiente:   { label: 'Pendiente',   variant: 'amber'  },
  }
  const s = map[status] ?? { label: status, variant: 'gray' }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
