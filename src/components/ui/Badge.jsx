import { cn } from '../../lib/utils'

const variants = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-stone-100 text-stone-700',
  amber: 'bg-amber-100 text-amber-800',
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
    activo: { label: 'Activo', variant: 'green' },
    inactivo: { label: 'Inactivo', variant: 'gray' },
    finalizado: { label: 'Finalizado', variant: 'blue' },
    suspendido: { label: 'Suspendido', variant: 'yellow' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
