import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Bird, Building2, Egg, Skull, Syringe, Package, BarChart3,
  CheckCircle2, ChevronDown, Menu, X, ArrowUp,
  Users, TrendingUp, Shield, Clock, Star, Activity,
  Zap, FileText, Database, Bell
} from 'lucide-react'
import { useA11y } from '../../context/AccessibilityContext'

/* ── Hooks ── */
function useScrollAnimation(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

function useCountUp(target, { duration = 1800, enabled = false } = {}) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let current = 0
    const step = target / (duration / 16)
    const id = setInterval(() => {
      current = Math.min(current + step, target)
      setValue(Math.floor(current))
      if (current >= target) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [target, duration, enabled])
  return value
}

/* ── Sub-components ── */
function StatCard({ value, suffix, label, icon: Icon, enabled, noMotion, index }) {
  const count = useCountUp(value, { duration: 1600, enabled })
  return (
    <div
      className={`text-center ${!noMotion ? `transition-all duration-700 ${enabled ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}` : ''}`}
      style={!noMotion ? { transitionDelay: `${index * 120}ms` } : {}}
    >
      <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3 ring-1 ring-primary-600/30">
        <Icon className="w-7 h-7 text-primary-400" />
      </div>
      <p className="text-4xl md:text-5xl font-black text-white tabular-nums">
        {enabled ? count : 0}{suffix}
      </p>
      <p className="text-sm text-stone-400 mt-1 leading-snug">{label}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc, gradient, visible, noMotion, index }) {
  return (
    <div
      className={`group bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-2xl p-6 hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-800/60 cursor-default ${!noMotion ? `transition-all duration-700 hover:-translate-y-1.5 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}` : ''}`}
      style={!noMotion ? { transitionDelay: `${index * 75}ms` } : {}}
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 shadow-sm ${!noMotion ? 'group-hover:scale-110 transition-transform duration-300' : ''}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
    </div>
  )
}

/* ── Data ── */
const FEATURES = [
  { icon: Building2, title: 'Gestión de Galpones', desc: 'Administra cada galpón con su capacidad, estado y encargado asignado.', gradient: 'from-amber-400 to-orange-500' },
  { icon: Egg, title: 'Control de Producción', desc: 'Registra la producción diaria de huevos con porcentaje de postura y tendencias.', gradient: 'from-yellow-400 to-amber-500' },
  { icon: Skull, title: 'Registro de Mortalidad', desc: 'Seguimiento de bajas por galpón con causa, observaciones e historial.', gradient: 'from-red-400 to-rose-500' },
  { icon: Syringe, title: 'Tratamientos Veterinarios', desc: 'Gestiona vacunaciones, medicaciones y desparasitaciones con historial completo.', gradient: 'from-blue-400 to-cyan-500' },
  { icon: Package, title: 'Control de Insumos', desc: 'Inventario de alimentos y medicamentos con alertas automáticas de stock bajo.', gradient: 'from-green-400 to-emerald-500' },
  { icon: BarChart3, title: 'Reportes y Descargas', desc: 'Genera reportes en CSV y PDF filtrados por fechas, galpón y tipo de registro.', gradient: 'from-purple-400 to-violet-500' },
]

const STEPS = [
  { num: '01', icon: Database, title: 'Configura tu granja', desc: 'Registra tus galpones, razas y lotes de aves para comenzar a gestionar desde el primer día.' },
  { num: '02', icon: Activity, title: 'Registra diariamente', desc: 'Ingresa producción, mortalidad, tratamientos e insumos de forma rápida e intuitiva.' },
  { num: '03', icon: TrendingUp, title: 'Analiza y decide', desc: 'Obtén reportes detallados y estadísticas para tomar decisiones informadas sobre tu granja.' },
]

const TARGETS = [
  { icon: Users, title: 'Administradores', desc: 'Control total de la operación con visibilidad de todos los módulos y usuarios del sistema.', color: 'from-primary-700 to-primary-900' },
  { icon: Activity, title: 'Encargados de Galpón', desc: 'Registro ágil de producción diaria y eventos desde cualquier dispositivo.', color: 'from-amber-700 to-amber-900' },
  { icon: TrendingUp, title: 'Gerentes', desc: 'Reportes y estadísticas en tiempo real para tomar decisiones estratégicas.', color: 'from-green-700 to-green-900' },
  { icon: Syringe, title: 'Equipos Veterinarios', desc: 'Gestión completa de tratamientos, vacunas y plan sanitario de la granja.', color: 'from-blue-700 to-blue-900' },
]

const STATS = [
  { value: 6,   suffix: '',  label: 'Módulos integrados',      icon: Zap },
  { value: 100, suffix: '%', label: 'Datos protegidos',         icon: Shield },
  { value: 24,  suffix: '/7',label: 'Disponibilidad',           icon: Clock },
  { value: 3,   suffix: 's', label: 'Para generar un reporte',  icon: FileText },
]

/* ── Main component ── */
export default function LandingPage() {
  const { noMotion } = useA11y()
  const [scrolled, setScrolled]       = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30)
      setShowBackTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }, [])

  const [featRef,  featVisible]  = useScrollAnimation()
  const [stepsRef, stepsVisible] = useScrollAnimation()
  const [targRef,  targVisible]  = useScrollAnimation()
  const [statsRef, statsVisible] = useScrollAnimation(0.2)
  const [ctaRef,   ctaVisible]   = useScrollAnimation()

  return (
    <div className="min-h-screen flex flex-col bg-farm-cream dark:bg-stone-950 transition-colors duration-300">

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 z-[100] bg-primary-600 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg"
      >
        Saltar al contenido principal
      </a>

      {/* ────────── NAV ────────── */}
      <nav
        aria-label="Navegación principal"
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 dark:bg-stone-900/90 backdrop-blur-md shadow-sm border-b border-stone-200/60 dark:border-stone-700/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          {/* Logo */}
          <a href="#" aria-label="Inicio - Avícola MC" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-primary-300 dark:group-hover:shadow-primary-900/60 transition-shadow">
              <Bird className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-primary-800 dark:text-primary-400 leading-none">Avícola MC</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500">Sistema de Gestión</p>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7" role="list">
            {[['features', 'Características'], ['steps', 'Cómo funciona'], ['targets', '¿Para quién?']].map(([id, label]) => (
              <button
                key={id}
                role="listitem"
                onClick={() => scrollTo(id)}
                className="text-stone-600 dark:text-stone-300 hover:text-primary-700 dark:hover:text-primary-400 font-medium text-sm transition-colors relative after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-0.5 after:bg-primary-500 after:transition-all after:duration-300 hover:after:w-full"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex btn-primary px-5 rounded-xl shadow-md shadow-primary-500/20 hover:shadow-primary-500/40 transition-shadow"
            >
              Iniciar sesión
            </Link>
            <button
              className="md:hidden p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-5 pb-5 flex flex-col gap-3 border-b border-stone-200 dark:border-stone-700">
            {[['features', 'Características'], ['steps', 'Cómo funciona'], ['targets', '¿Para quién?']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left py-2 text-stone-700 dark:text-stone-300 font-medium hover:text-primary-700 dark:hover:text-primary-400 transition-colors border-b border-stone-100 dark:border-stone-800 last:border-0"
              >
                {label}
              </button>
            ))}
            <Link to="/login" className="btn-primary text-center rounded-xl mt-1">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content">

        {/* ────────── HERO ────────── */}
        <section
          aria-label="Presentación del sistema"
          className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-farm-cream to-orange-50/70 dark:from-stone-950 dark:via-stone-900 dark:to-amber-950/20 py-24 md:py-36 px-4"
        >
          {/* Animated blobs */}
          {!noMotion && (
            <>
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200/50 dark:bg-amber-900/20 rounded-full blur-3xl animate-blob pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-orange-200/40 dark:bg-orange-900/15 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-200/30 dark:bg-yellow-900/10 rounded-full blur-2xl animate-blob animation-delay-4000 pointer-events-none" />
            </>
          )}

          {/* Dot grid */}
          <div className="absolute inset-0 bg-grid-pattern pointer-events-none" aria-hidden="true" />

          <div className="relative max-w-5xl mx-auto text-center">

            {/* Badge */}
            <div className={`inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 rounded-full px-4 py-1.5 text-sm font-semibold mb-7 ${!noMotion ? 'animate-fade-in-up' : ''}`}>
              <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              Plataforma integral de gestión avícola
            </div>

            {/* Headline */}
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold text-stone-900 dark:text-stone-50 leading-tight tracking-tight ${!noMotion ? 'animate-fade-in-up animation-delay-100' : ''}`}>
              Gestiona tu granja avícola
              <br />
              <span className="bg-gradient-to-r from-primary-600 via-amber-500 to-orange-500 bg-clip-text text-transparent animate-gradient">
                con total control
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`mt-6 text-lg md:text-xl text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed ${!noMotion ? 'animate-fade-in-up animation-delay-200' : ''}`}>
              Plataforma completa para la administración de granjas avícolas. Controla galpones, producción, mortalidad, insumos y más desde un solo lugar.
            </p>

            {/* CTA buttons */}
            <div className={`mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 ${!noMotion ? 'animate-fade-in-up animation-delay-300' : ''}`}>
              <Link
                to="/login"
                className="inline-flex items-center gap-2.5 px-9 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-2xl font-bold text-base shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all hover:-translate-y-0.5"
              >
                <Bird className="w-4 h-4" aria-hidden="true" />
                Acceder al sistema
              </Link>
              <button
                onClick={() => scrollTo('features')}
                className="inline-flex items-center gap-2 px-9 py-3.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-2xl font-semibold text-base hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-300 transition-all hover:-translate-y-0.5 shadow-sm"
              >
                Conocer más
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Stats mini-row */}
            <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto ${!noMotion ? 'animate-fade-in-up animation-delay-500' : ''}`} role="list" aria-label="Características destacadas">
              {[
                { label: '6 módulos',    sub: 'de gestión integrados' },
                { label: 'PDF & CSV',    sub: 'exportación de reportes' },
                { label: 'Tiempo real',  sub: 'datos actualizados' },
                { label: 'Multi-rol',    sub: 'control de accesos' },
              ].map(({ label, sub }) => (
                <div
                  key={label}
                  role="listitem"
                  className="bg-white/75 dark:bg-stone-800/70 backdrop-blur-sm border border-white/80 dark:border-stone-700/50 rounded-2xl px-4 py-3 text-center shadow-sm"
                >
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">{label}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          {!noMotion && (
            <div className="absolute bottom-8 left-1/2 flex flex-col items-center gap-1 text-stone-400 dark:text-stone-600 animate-bounce-slow pointer-events-none" aria-hidden="true">
              <span className="text-[11px] font-medium tracking-wider uppercase">Explorar</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </section>

        {/* ────────── FEATURES ────────── */}
        <section id="features" aria-labelledby="features-heading" className="py-20 px-4 bg-white dark:bg-stone-900">
          <div ref={featRef} className="max-w-7xl mx-auto">
            <div className={`text-center mb-14 ${!noMotion ? `transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` : ''}`}>
              <span className="text-xs font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">Módulos del sistema</span>
              <h2 id="features-heading" className="mt-2 text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-50">
                Todo lo que necesitas en un solo lugar
              </h2>
              <p className="mt-3 text-stone-500 dark:text-stone-400 max-w-xl mx-auto">
                Cada módulo está diseñado para simplificar las tareas diarias de tu granja.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feat, i) => (
                <FeatureCard key={feat.title} {...feat} visible={featVisible} noMotion={noMotion} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ────────── HOW IT WORKS ────────── */}
        <section id="steps" aria-labelledby="steps-heading" className="py-20 px-4 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-stone-950 dark:to-stone-900/80">
          <div ref={stepsRef} className="max-w-5xl mx-auto">
            <div className={`text-center mb-14 ${!noMotion ? `transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` : ''}`}>
              <span className="text-xs font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">Proceso simple</span>
              <h2 id="steps-heading" className="mt-2 text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-50">
                ¿Cómo funciona?
              </h2>
              <p className="mt-3 text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Comienza a gestionar tu granja en tres pasos sencillos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px bg-gradient-to-r from-primary-200 via-amber-300 to-primary-200 dark:from-primary-900 dark:via-amber-800 dark:to-primary-900" aria-hidden="true" />

              {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
                <div
                  key={num}
                  className={`text-center ${!noMotion ? `transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}` : ''}`}
                  style={!noMotion ? { transitionDelay: `${i * 150}ms` } : {}}
                >
                  <div className="relative inline-block mb-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 mx-auto">
                      <span className="text-2xl font-black text-white select-none">{num}</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shadow-sm">
                      <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 mb-2 text-lg">{title}</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── TARGET USERS ────────── */}
        <section id="targets" aria-labelledby="targets-heading" className="py-20 px-4 bg-white dark:bg-stone-900">
          <div ref={targRef} className="max-w-6xl mx-auto">
            <div className={`text-center mb-14 ${!noMotion ? `transition-all duration-700 ${targVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` : ''}`}>
              <span className="text-xs font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">Usuarios del sistema</span>
              <h2 id="targets-heading" className="mt-2 text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-50">
                ¿Para quién es Avícola MC?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TARGETS.map(({ icon: Icon, title, desc, color }, i) => (
                <div
                  key={title}
                  className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-center ${!noMotion ? `transition-all duration-700 hover:-translate-y-1.5 hover:shadow-2xl ${targVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}` : ''}`}
                  style={!noMotion ? { transitionDelay: `${i * 100}ms` } : {}}
                >
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white/20">
                    <Icon className="h-7 w-7 text-amber-300" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-white mb-2 text-base">{title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Checklist */}
            <div className={`mt-12 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto ${!noMotion ? `transition-all duration-700 delay-300 ${targVisible ? 'opacity-100' : 'opacity-0'}` : ''}`} aria-label="Beneficios del sistema">
              {[
                'Acceso desde cualquier dispositivo con conexión a internet',
                'Control de permisos por rol: admin, operario y supervisor',
                'Notificaciones automáticas de stock bajo de insumos',
                'Historial completo de todas las operaciones registradas',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl px-4 py-3 border border-stone-100 dark:border-stone-700/50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-sm text-stone-600 dark:text-stone-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── STATS ────────── */}
        <section aria-label="Estadísticas del sistema" className="py-20 px-4 bg-stone-950 dark:bg-black">
          <div ref={statsRef} className="max-w-5xl mx-auto">
            <div className={`text-center mb-14 ${!noMotion ? `transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` : ''}`}>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-200">
                Diseñado para el control total
              </h2>
              <p className="mt-2 text-stone-500 max-w-md mx-auto text-sm">
                Cada detalle del sistema está pensado para maximizar tu eficiencia.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat, i) => (
                <StatCard key={stat.label} {...stat} enabled={statsVisible} noMotion={noMotion} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ────────── CTA ────────── */}
        <section aria-label="Llamada a la acción" className="py-28 px-4 bg-gradient-to-br from-amber-50/90 via-farm-cream to-orange-50/60 dark:from-stone-950 dark:via-stone-900 dark:to-amber-950/15">
          <div ref={ctaRef} className="max-w-3xl mx-auto text-center">
            <div className={`${!noMotion ? `transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}` : ''}`}>
              <div className={`w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl flex items-center justify-center mx-auto mb-7 shadow-2xl shadow-primary-500/30 ${!noMotion ? 'hover:rotate-3 transition-transform duration-300' : ''}`}>
                <Bird className="h-12 w-12 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-50 mb-4">
                Comienza a gestionar tu granja hoy
              </h2>
              <p className="text-stone-600 dark:text-stone-400 mb-10 text-lg max-w-xl mx-auto">
                Accede al sistema y lleva el control total de tu producción avícola desde cualquier lugar y en cualquier momento.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all hover:-translate-y-1"
              >
                <Bird className="w-5 h-5" aria-hidden="true" />
                Acceder al sistema
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ────────── FOOTER ────────── */}
      <footer className="bg-stone-900 dark:bg-stone-950 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <Bird className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-200 leading-none">Avícola MC</p>
                <p className="text-[10px] text-stone-500">Sistema de Gestión</p>
              </div>
            </div>

            {/* Links */}
            <nav aria-label="Navegación del pie de página">
              <ul className="flex items-center gap-6 text-sm">
                {[['features', 'Características'], ['steps', 'Cómo funciona'], ['targets', '¿Para quién?']].map(([id, label]) => (
                  <li key={id}>
                    <button
                      onClick={() => scrollTo(id)}
                      className="text-stone-500 hover:text-stone-200 transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <p className="text-xs text-stone-600">
              &copy; {new Date().getFullYear()} Avícola MC. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-24 right-6 z-30 w-10 h-10 bg-stone-700 hover:bg-stone-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-label="Volver al inicio de la página"
      >
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
