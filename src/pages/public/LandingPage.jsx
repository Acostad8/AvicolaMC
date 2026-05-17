import { Link } from 'react-router-dom'
import { Bird, Building2, Egg, Skull, Syringe, Package, BarChart3, CheckCircle2 } from 'lucide-react'

const features = [
  { icon: Building2, title: 'Gestión de Galpones', desc: 'Administra cada galpón con su capacidad, estado y encargado asignado.' },
  { icon: Egg, title: 'Control de Producción', desc: 'Registra la producción diaria de huevos y el porcentaje de postura.' },
  { icon: Skull, title: 'Registro de Mortalidad', desc: 'Lleva el seguimiento de bajas por galpón con causa y observaciones.' },
  { icon: Syringe, title: 'Tratamientos Veterinarios', desc: 'Gestiona vacunaciones, medicaciones y desparasitaciones.' },
  { icon: Package, title: 'Control de Insumos', desc: 'Inventario de alimentos y medicamentos con alertas de stock bajo.' },
  { icon: BarChart3, title: 'Reportes y Descargas', desc: 'Genera reportes en CSV y PDF filtrados por fechas y galpón.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-farm-cream">
      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <Bird className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary-800 leading-none">Avícola MC</p>
              <p className="text-[10px] text-stone-400">Sistema de Gestión</p>
            </div>
          </div>
          <Link
            to="/login"
            className="btn-primary"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 bg-primary-100 border-4 border-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bird className="h-10 w-10 text-primary-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 leading-tight">
            Sistema de Gestión<br />
            <span className="text-primary-600">Avícola MC</span>
          </h1>
          <p className="mt-5 text-lg text-stone-600 max-w-xl mx-auto">
            Plataforma integral para la administración de granjas avícolas. Controla tus galpones, producción,
            mortalidad e insumos desde un solo lugar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 transition-colors shadow-md"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">Características principales</h2>
          <p className="text-stone-500 text-center mb-10">Todo lo que necesitas para gestionar tu granja avícola</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 flex gap-4">
                <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800 mb-1">{title}</h3>
                  <p className="text-sm text-stone-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-primary-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-8">¿Para quién es este sistema?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {[
              'Administradores de granjas avícolas que necesitan control total',
              'Encargados de galpones que registran producción diaria',
              'Gerentes que necesitan reportes y estadísticas en tiempo real',
              'Equipos veterinarios que gestionan tratamientos y vacunaciones',
            ].map(item => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
                <span className="text-amber-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-amber-50 transition-colors"
            >
              Comenzar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-6 px-4 text-center text-sm">
        <p>Sistema de Gestión Avícola MC &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
