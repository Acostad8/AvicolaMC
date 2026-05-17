import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
      <ShieldOff className="h-16 w-16 text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-stone-800 mb-2">Acceso denegado</h2>
      <p className="text-stone-500 max-w-sm">No tienes permisos para acceder a esta sección del sistema.</p>
      <Link to="/dashboard" className="mt-6 btn-primary">Volver al Dashboard</Link>
    </div>
  )
}
