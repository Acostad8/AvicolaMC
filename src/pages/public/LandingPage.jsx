import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent, useMotionValue, useSpring } from 'framer-motion'
import {
  Bird, Building2, Egg, Skull, Syringe, Package, BarChart3,
  CheckCircle2, ChevronDown, Menu, X, ArrowUp,
  Users, TrendingUp, Shield, Clock, Star, Activity,
  Zap, FileText, Database, Bell, LayoutDashboard, AlertTriangle, Boxes,
  Sun, Sunrise, Sunset, Moon, Briefcase, HardHat,
  Sparkles, Mail, MessageCircle, Send, Phone, AtSign, Globe, HelpCircle, Plus, Minus,
  Wifi, ThumbsUp, ThumbsDown, MessageSquare, Search
} from 'lucide-react'
import { useA11y } from '../../context/AccessibilityContext'
import DashboardMockup from '../../components/landing/DashboardMockup'

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

function FeatureCard({ icon: Icon, title, desc, gradient, visible, noMotion, index, className = '' }) {
  return (
    <div
      className={`group bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-2xl p-6 hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-800/60 cursor-default ${className} ${!noMotion ? `transition-all duration-700 hover:-translate-y-1.5 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}` : ''}`}
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

/* ── Active section tracker ── */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    )
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [ids])
  return active
}

/* ── Scroll progress bar ── */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      style={{ scaleX: scrollYProgress, transformOrigin: '0% 50%' }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-500 via-amber-500 to-orange-500 z-[60] pointer-events-none"
      aria-hidden="true"
    />
  )
}

/* ── Announcement bar ── */
function AnnouncementBar({ onScrollTo }) {
  const KEY = 'avicola-mc-announce-v1'
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(KEY) === 'dismissed' } catch { return false }
  })
  if (hidden) return null
  const close = () => {
    try { localStorage.setItem(KEY, 'dismissed') } catch {}
    setHidden(true)
  }
  return (
    <div className="relative bg-gradient-to-r from-primary-700 via-amber-600 to-orange-600 text-white text-xs sm:text-sm py-2 px-10 text-center z-[55]">
      <span className="inline-flex items-center gap-2 flex-wrap justify-center">
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="font-medium">Nuevo: módulo de predicciones IA disponible</span>
        <button
          onClick={() => onScrollTo?.('features')}
          className="underline underline-offset-2 font-bold hover:opacity-80 transition"
        >
          Ver más →
        </button>
      </span>
      <button
        onClick={close}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition p-1"
        aria-label="Cerrar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ── FAQ accordion ── */
const FAQ_DATA = [
  { icon: HardHat,   tag: 'Uso diario',    q: '¿Necesito conocimientos técnicos para usarlo?', a: 'No. La interfaz está pensada para encargados de granja sin experiencia previa. Registras datos en menos de 30 segundos y el sistema te guía paso a paso.' },
  { icon: Wifi,      tag: 'Conectividad',  q: '¿Funciona sin conexión a internet?',             a: 'Requiere conexión para sincronizar datos, pero puedes seguir usando el navegador y sincronizar automáticamente al reconectar. Los registros no se pierden.' },
  { icon: FileText,  tag: 'Datos',         q: '¿Puedo exportar mis registros?',                 a: 'Sí. Todos los reportes se exportan en PDF y CSV, filtrables por fecha, galpón y tipo de registro. También puedes programar exportaciones automáticas.' },
  { icon: Users,     tag: 'Cuentas',       q: '¿Cuántos usuarios puedo tener?',                 a: 'Sin límite. Configura roles y permisos por usuario: administrador, encargado, supervisor y veterinario. Cada rol accede solo a lo necesario.' },
  { icon: Shield,    tag: 'Seguridad',     q: '¿Mis datos están seguros?',                      a: 'Datos cifrados en Supabase con backups automáticos diarios, control de acceso por rol y registro completo de auditoría de cada operación.' },
  { icon: Sparkles,  tag: 'Prueba',        q: '¿Hay un periodo de prueba?',                     a: 'Sí, 14 días completos sin necesidad de tarjeta. Al terminar decides si continuar. Sin compromiso, sin cargos ocultos.' },
]

function FAQItem({ icon: Icon, tag, q, a, open, onToggle, noMotion, delay = 0, feedback, onFeedback }) {
  return (
    <motion.div
      initial={noMotion ? false : { opacity: 0, y: 16 }}
      whileInView={noMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        open
          ? 'border-primary-400/70 dark:border-primary-500/50 bg-white dark:bg-stone-900 shadow-2xl shadow-primary-500/10'
          : 'border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 hover:border-primary-300 dark:hover:border-primary-700/50 hover:bg-white dark:hover:bg-stone-900 hover:shadow-lg hover:shadow-primary-500/5'
      }`}
    >
      {/* Gradient top accent when open */}
      {open && (
        <motion.div
          initial={noMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary-500 via-amber-500 to-orange-500 origin-left"
          aria-hidden="true"
        />
      )}

      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        {/* Contextual icon */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            open
              ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/40'
              : 'bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-800/40 ring-1 ring-stone-200 dark:ring-stone-700/60 text-primary-600 dark:text-primary-400 shadow-sm group-hover:ring-primary-300 dark:group-hover:ring-primary-700/60 group-hover:text-primary-700 dark:group-hover:text-primary-300 group-hover:scale-110 group-hover:rotate-3'
          }`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>

        {/* Tag + question */}
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 transition ${
            open ? 'text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500'
          }`}>
            {tag}
          </p>
          <p className={`font-bold text-sm md:text-base leading-snug transition ${
            open ? 'text-primary-700 dark:text-primary-300' : 'text-stone-800 dark:text-stone-100'
          }`}>
            {q}
          </p>
        </div>

        {/* Chevron */}
        <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white rotate-180 shadow-md shadow-primary-500/30'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 group-hover:text-primary-600 dark:group-hover:text-primary-400'
        }`}>
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={noMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-[76px]">
              <p className="text-sm md:text-[15px] text-stone-600 dark:text-stone-400 leading-relaxed">{a}</p>

              {/* Feedback row */}
              <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800/70 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">¿Fue útil?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onFeedback?.('up')}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      feedback === 'up'
                        ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 ring-1 ring-green-500/40'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                    Sí
                  </button>
                  <button
                    onClick={() => onFeedback?.('down')}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      feedback === 'down'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 ring-1 ring-red-500/40'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                    No
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FAQSection({ noMotion }) {
  const [openIdx, setOpenIdx] = useState(0)
  const [query, setQuery] = useState('')
  const [feedbacks, setFeedbacks] = useState({})

  const filtered = FAQ_DATA
    .map((item, i) => ({ ...item, __i: i }))
    .filter(item => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)
    })

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative py-24 md:py-28 px-4 bg-gradient-to-b from-white via-stone-50/50 to-white dark:from-stone-900 dark:via-stone-950/50 dark:to-stone-900 overflow-hidden"
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-[26rem] h-[26rem] bg-primary-200/25 dark:bg-primary-900/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 -left-20 w-[22rem] h-[22rem] bg-amber-200/20 dark:bg-amber-900/10 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

        {/* LEFT: sticky heading + contact card */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 rounded-full px-3 py-1 text-xs font-semibold mb-5">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Centro de ayuda
            </div>
            <h2
              id="faq-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-stone-900 dark:text-stone-50 leading-tight tracking-tight mb-4"
            >
              Resolvemos <span className="bg-gradient-to-r from-primary-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">todas tus dudas</span>
            </h2>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed mb-8 max-w-md">
              Encuentra respuestas rápidas a las preguntas más comunes sobre el sistema.
            </p>

            {/* Search input */}
            <div className="relative mb-8 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar una pregunta..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition shadow-sm"
                aria-label="Buscar en preguntas frecuentes"
              />
            </div>

            {/* Contact card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-6 shadow-2xl shadow-primary-500/20 max-w-md">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/30 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 ring-1 ring-white/30">
                  <MessageSquare className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <p className="text-white font-bold text-base mb-1">¿Aún tienes dudas?</p>
                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  Escríbenos y un miembro del equipo te responde en menos de 24h.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="mailto:jdacostas@ufpso.edu.co"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-primary-700 rounded-lg font-semibold text-xs hover:bg-amber-50 transition"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    Correo
                  </a>
                  <a
                    href="https://wa.me/573233886314"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 text-white border border-white/20 backdrop-blur-sm rounded-lg font-semibold text-xs hover:bg-white/20 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: FAQ list */}
        <div className="lg:col-span-8">
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-10 text-center">
                <Search className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto mb-3" aria-hidden="true" />
                <p className="text-stone-500 dark:text-stone-400 text-sm">
                  No hay resultados para <span className="font-semibold text-stone-700 dark:text-stone-200">"{query}"</span>
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              filtered.map((item, listIdx) => (
                <FAQItem
                  key={item.q}
                  icon={item.icon}
                  tag={item.tag}
                  q={item.q}
                  a={item.a}
                  open={openIdx === item.__i}
                  onToggle={() => setOpenIdx(openIdx === item.__i ? null : item.__i)}
                  noMotion={noMotion}
                  delay={listIdx * 0.06}
                  feedback={feedbacks[item.__i]}
                  onFeedback={(v) => setFeedbacks(f => ({ ...f, [item.__i]: f[item.__i] === v ? undefined : v }))}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Time-of-day hook ── */
function useTimeOfDay() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  const h = now.getHours()
  const m = now.getMinutes()
  const period =
    h >= 5  && h < 9  ? 'dawn'  :
    h >= 9  && h < 17 ? 'day'   :
    h >= 17 && h < 20 ? 'dusk'  :
                        'night'
  const overlays = {
    dawn:  'linear-gradient(135deg, rgba(253,232,208,0.55) 0%, rgba(251,199,156,0.35) 60%, rgba(249,160,110,0.15) 100%)',
    day:   'linear-gradient(135deg, rgba(255,248,236,0.35) 0%, rgba(255,230,196,0.25) 60%, rgba(255,216,163,0.15) 100%)',
    dusk:  'linear-gradient(135deg, rgba(255,204,136,0.45) 0%, rgba(255,151,112,0.4) 50%, rgba(176,96,144,0.35) 100%)',
    night: 'linear-gradient(135deg, rgba(30,27,58,0.6) 0%, rgba(45,30,75,0.5) 50%, rgba(61,30,61,0.4) 100%)',
  }
  const labels = { dawn: 'Amanece', day: 'Día activo', dusk: 'Atardece', night: 'Noche tranquila' }
  const icons  = { dawn: Sunrise,  day: Sun,           dusk: Sunset,     night: Moon }
  const pad = n => String(n).padStart(2, '0')
  return { period, hour: h, minute: m, timeStr: `${pad(h)}:${pad(m)}`, overlay: overlays[period], label: labels[period], Icon: icons[period] }
}

/* ── Live feed of events ── */
const FEED_EVENTS = [
  { icon: Egg,           text: 'G-03 registró 240 huevos',        tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  { icon: AlertTriangle, text: 'Stock bajo: Vitaminas',           tone: 'text-red-500 bg-red-50 dark:bg-red-950/40' },
  { icon: CheckCircle2,  text: 'Vacunación G-05 completada',      tone: 'text-green-600 bg-green-50 dark:bg-green-950/40' },
  { icon: Skull,         text: 'Mortalidad G-02: 3 aves',         tone: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
  { icon: FileText,      text: 'Reporte semanal generado',        tone: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  { icon: Package,       text: 'Ingreso: 20 sacos de alimento',   tone: 'text-primary-600 bg-primary-50 dark:bg-primary-950/40' },
]

function LiveFeed({ noMotion }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (noMotion) return
    const id = setInterval(() => setIdx(i => (i + 1) % FEED_EVENTS.length), 2800)
    return () => clearInterval(id)
  }, [noMotion])
  const ev = FEED_EVENTS[idx]
  const Icon = ev.icon
  return (
    <div className="rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl shadow-2xl ring-1 ring-stone-900/5 dark:ring-white/10 p-3 w-[260px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Actividad en vivo</span>
        <span className="flex items-center gap-1 text-[9px] text-green-600 dark:text-green-400 font-bold">
          <span className={`w-1.5 h-1.5 rounded-full bg-green-500 ${noMotion ? '' : 'animate-pulse'}`} />
          LIVE
        </span>
      </div>
      <motion.div
        key={idx}
        initial={noMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-2.5"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.tone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 leading-tight truncate">{ev.text}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Hace un instante</p>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Floating KPI ── */
function FloatingKpi({ noMotion }) {
  const val = useCountUp(12847, { duration: 2200, enabled: true })
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-2xl shadow-primary-500/40 ring-1 ring-white/10 p-4 text-white w-[200px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Egg className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Huevos hoy</span>
      </div>
      <p className="text-3xl font-black tabular-nums leading-none">
        {(noMotion ? 12847 : val).toLocaleString('es-CO')}
      </p>
      <p className="text-[10px] opacity-80 mt-1.5 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        +3.2% vs ayer
      </p>
    </div>
  )
}

/* ── Word-by-word reveal ── */
function AnimatedHeadline({ words, gradientWords = [], noMotion, className = '' }) {
  if (noMotion) {
    return (
      <h1 className={className}>
        {words.map((w, i) => (
          <span key={i} className={gradientWords.includes(i) ? 'bg-gradient-to-r from-primary-600 via-amber-500 to-orange-500 bg-clip-text text-transparent' : ''}>
            {w}{' '}
          </span>
        ))}
      </h1>
    )
  }
  return (
    <h1 className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          className={`inline-block mr-[0.25em] ${gradientWords.includes(i) ? 'bg-gradient-to-r from-primary-600 via-amber-500 to-orange-500 bg-clip-text text-transparent' : ''}`}
        >
          {w}
        </motion.span>
      ))}
    </h1>
  )
}

/* ── Hero mockup with tilt 3D ── */
function TiltMockup({ noMotion, activeIndex = 0 }) {
  const ref = useRef(null)
  const rawX = useMotionValue(0.5)
  const rawY = useMotionValue(0.5)
  const springX = useSpring(rawX, { stiffness: 120, damping: 20 })
  const springY = useSpring(rawY, { stiffness: 120, damping: 20 })
  const rotateY = useTransform(springX, [0, 1], [8, -8])
  const rotateX = useTransform(springY, [0, 1], [-8, 8])

  const onMove = (e) => {
    if (noMotion || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    rawX.set((e.clientX - r.left) / r.width)
    rawY.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => { rawX.set(0.5); rawY.set(0.5) }

  if (noMotion) {
    return <div ref={ref}><DashboardMockup activeIndex={activeIndex} /></div>
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="will-change-transform"
    >
      <DashboardMockup activeIndex={activeIndex} />
    </motion.div>
  )
}

/* ── Marquee of modules ── */
function ModulesMarquee({ noMotion }) {
  const items = [
    { icon: Building2, label: 'Galpones' },
    { icon: Egg,       label: 'Producción' },
    { icon: Skull,     label: 'Mortalidad' },
    { icon: Syringe,   label: 'Tratamientos' },
    { icon: Package,   label: 'Insumos' },
    { icon: BarChart3, label: 'Reportes' },
    { icon: Users,     label: 'Empleados' },
    { icon: Database,  label: 'Auditoría' },
  ]
  const track = [...items, ...items]

  return (
    <div className="relative overflow-hidden py-6 border-y border-stone-200/70 dark:border-stone-800/70 bg-white/40 dark:bg-stone-900/40 backdrop-blur-sm">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white dark:from-stone-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white dark:from-stone-950 to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={noMotion ? undefined : { x: ['0%', '-50%'] }}
        transition={noMotion ? undefined : { duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {track.map((it, i) => {
          const Icon = it.icon
          return (
            <div key={i} className="flex items-center gap-2 text-stone-500 dark:text-stone-400 flex-shrink-0">
              <Icon className="w-4 h-4 text-primary-500 dark:text-primary-400" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-wider">{it.label}</span>
              <span className="text-stone-300 dark:text-stone-700 mx-2">•</span>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

/* ── Persona configs ── */
const PERSONAS = {
  encargado: {
    icon: HardHat,
    label: 'Soy encargado',
    headline: ['Deja', 'de', 'contar', 'huevos', 'en', 'Excel.'],
    gradientWords: [3, 4],
    subtitle: 'Registra producción, mortalidad y tratamientos desde tu teléfono. En menos de 30 segundos, listo.',
    ctaLabel: 'Empezar a registrar',
    mockupIdx: 1,
  },
  gerente: {
    icon: Briefcase,
    label: 'Soy gerente',
    headline: ['Decide', 'con', 'datos', 'reales.', 'No', 'con', 'planillas.'],
    gradientWords: [2, 3],
    subtitle: 'KPIs, tendencias y alertas de toda tu operación en una sola pantalla. Exporta reportes en segundos.',
    ctaLabel: 'Ver dashboard',
    mockupIdx: 0,
  },
}

/* ── Hero section (persona-aware bento) ── */
function HeroSection({ noMotion, scrollTo }) {
  const heroRef = useRef(null)
  const spotX = useMotionValue(-500)
  const spotY = useMotionValue(-500)
  const [persona, setPersona] = useState('encargado')
  const tod = useTimeOfDay()

  const { scrollY } = useScroll()
  const blob1Y = useTransform(scrollY, [0, 800], [0, -120])
  const blob2Y = useTransform(scrollY, [0, 800], [0, -200])
  const blob3Y = useTransform(scrollY, [0, 800], [0,  100])
  const heroFade = useTransform(scrollY, [0, 400], [1, 0.6])
  const spotBg = useTransform(
    [spotX, spotY],
    ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(217,119,6,0.12), transparent 55%)`
  )

  const onMove = (e) => {
    if (noMotion || !heroRef.current) return
    const r = heroRef.current.getBoundingClientRect()
    spotX.set(e.clientX - r.left)
    spotY.set(e.clientY - r.top)
  }

  const p = PERSONAS[persona]
  const TodIcon = tod.Icon

  return (
    <section
      ref={heroRef}
      onMouseMove={onMove}
      aria-label="Presentación del sistema"
      className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-farm-cream to-orange-50/70 dark:from-stone-950 dark:via-stone-900 dark:to-amber-950/20 min-h-screen flex flex-col justify-center pt-28 md:pt-32 pb-28 md:pb-32 px-4"
    >
      {/* Time-of-day overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-[background] duration-[1500ms] mix-blend-soft-light"
        aria-hidden="true"
        style={{ background: tod.overlay }}
      />

      {/* Parallax blobs */}
      {!noMotion && (
        <>
          <motion.div style={{ y: blob1Y }} className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200/50 dark:bg-amber-900/20 rounded-full blur-3xl animate-blob pointer-events-none" />
          <motion.div style={{ y: blob2Y }} className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-orange-200/40 dark:bg-orange-900/15 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
          <motion.div style={{ y: blob3Y }} className="absolute top-1/2 left-1/3 w-64 h-64 bg-yellow-200/30 dark:bg-yellow-900/10 rounded-full blur-2xl animate-blob animation-delay-4000 pointer-events-none" />
        </>
      )}

      {/* Dot grid */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" aria-hidden="true" />

      {/* Cursor spotlight */}
      {!noMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: spotBg }}
        />
      )}

      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        aria-hidden="true"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <motion.div style={noMotion ? undefined : { opacity: heroFade }} className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

        {/* LEFT: text column */}
        <div className="lg:col-span-6 text-center lg:text-left">
          {/* Time-of-day badge + persona toggle — same row on sm+ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-center lg:justify-start gap-4 sm:gap-8 lg:gap-12 mb-6">
            <motion.div
              initial={noMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 self-center sm:self-auto"
            >
              <TodIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
              <span className="tabular-nums font-semibold text-stone-700 dark:text-stone-300">{tod.timeStr}</span>
              <span>en tu granja</span>
              <span className="text-stone-300 dark:text-stone-600">·</span>
              <span className="font-medium">{tod.label}</span>
            </motion.div>

            <motion.div
              initial={noMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              role="tablist"
              aria-label="Selecciona tu perfil"
              className="inline-flex p-1 bg-white/70 dark:bg-stone-800/70 backdrop-blur-sm border border-stone-200/60 dark:border-stone-700/60 rounded-xl gap-1 self-center sm:self-auto"
            >
              {Object.entries(PERSONAS).map(([key, cfg]) => {
                const Icon = cfg.icon
                const active = persona === key
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPersona(key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                        : 'text-stone-600 dark:text-stone-300 hover:text-primary-700 dark:hover:text-primary-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {cfg.label}
                  </button>
                )
              })}
            </motion.div>
          </div>

          {/* Headline word-by-word — re-animates on persona change */}
          <AnimatedHeadline
            key={`h-${persona}`}
            noMotion={noMotion}
            words={p.headline}
            gradientWords={p.gradientWords}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 dark:text-stone-50 leading-[1.05] tracking-tight"
          />

          {/* Subtitle */}
          <motion.p
            key={`s-${persona}`}
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 text-lg md:text-xl text-stone-600 dark:text-stone-400 max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            {p.subtitle}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-2xl font-bold text-base shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all hover:-translate-y-0.5"
            >
              <Bird className="w-4 h-4" aria-hidden="true" />
              {p.ctaLabel}
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <button
              onClick={() => scrollTo('features')}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-2xl font-semibold text-base hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-300 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              Conocer más
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={noMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-xs text-stone-500 dark:text-stone-400"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" aria-hidden="true" />
                ))}
              </div>
              <span className="font-semibold text-stone-700 dark:text-stone-300">4.9</span>
              <span>en satisfacción</span>
            </div>
            <span className="hidden sm:inline text-stone-300 dark:text-stone-700">•</span>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
              <span>Datos cifrados en Supabase</span>
            </div>
            <span className="hidden sm:inline text-stone-300 dark:text-stone-700">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary-500" aria-hidden="true" />
              <span>Disponible 24/7</span>
            </div>
          </motion.div>
        </div>

        {/* RIGHT: bento — mockup + floating cards */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end perspective-1200">
          <div className="w-full max-w-[560px] relative">
            {/* Glow */}
            {!noMotion && (
              <div className="absolute -inset-8 bg-gradient-to-br from-primary-500/20 via-amber-400/20 to-orange-500/20 rounded-[2rem] blur-3xl pointer-events-none" aria-hidden="true" />
            )}

            {/* Main mockup — reacts to persona */}
            <div className="relative">
              <TiltMockup noMotion={noMotion} activeIndex={p.mockupIdx} />
            </div>

            {/* Floating live feed — top-right */}
            <motion.div
              initial={noMotion ? false : { opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="hidden sm:block absolute -top-6 -right-4 lg:-right-8 z-20"
              style={!noMotion ? { animation: 'float-slow 6s ease-in-out infinite' } : undefined}
            >
              <LiveFeed noMotion={noMotion} />
            </motion.div>

            {/* Floating KPI — bottom-left */}
            <motion.div
              initial={noMotion ? false : { opacity: 0, x: -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden sm:block absolute -bottom-6 -left-4 lg:-left-8 z-20"
              style={!noMotion ? { animation: 'float-slow 7s ease-in-out infinite reverse' } : undefined}
            >
              <FloatingKpi noMotion={noMotion} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll hint */}
      {!noMotion && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-stone-400 dark:text-stone-600 animate-bounce-slow pointer-events-none z-10" aria-hidden="true">
          <span className="text-[11px] font-medium tracking-wider uppercase">Explorar</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      )}
    </section>
  )
}

/* ── Data ── */
const FEATURED_FEATURE = {
  icon: Sparkles,
  badge: 'NUEVO · IA',
  title: 'Predicciones con Inteligencia Artificial',
  desc: 'Anticipa mortalidad, curvas de postura y consumo de insumos con modelos entrenados sobre los datos reales de tu granja.',
  bullets: [
    'Alertas hasta 48h antes de una anomalía',
    'Recomendaciones automáticas por galpón',
    'Aprende con cada registro que ingresas',
  ],
}

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

const PREVIEW_SLIDES = [
  {
    icon: LayoutDashboard,
    badge: 'Dashboard',
    title: 'Todo tu operativo en una sola vista',
    desc: 'Métricas clave, tendencias y alertas actualizadas en tiempo real. Sin planillas ni cálculos manuales.',
    bullets: ['KPIs de aves, huevos y mortalidad', 'Gráfica de producción de 30 días', 'Alertas activas visibles al instante'],
  },
  {
    icon: Egg,
    badge: 'Producción',
    title: 'Registra la postura sin fricciones',
    desc: 'Ingresa la producción diaria por galpón y observa la curva de postura evolucionar automáticamente.',
    bullets: ['Comparativa por galpón', 'Porcentaje de postura automático', 'Exportación a PDF y CSV'],
  },
  {
    icon: AlertTriangle,
    badge: 'Mortalidad',
    title: 'Detecta anomalías antes que sea tarde',
    desc: 'Historial detallado de bajas por causa y galpón con alertas que saltan cuando algo se sale de lo normal.',
    bullets: ['Tasa por galpón en tiempo real', 'Clasificación por causa', 'Alertas automáticas por umbral'],
  },
  {
    icon: Boxes,
    badge: 'Insumos',
    title: 'Nunca más se te acaba el alimento',
    desc: 'Control de stock con notificaciones automáticas cuando un insumo cae bajo el mínimo configurado.',
    bullets: ['Barras de stock por producto', 'Aviso automático por umbral', 'Historial de entradas y salidas'],
  },
]

/* ── Sticky scroll preview section ── */
function StickyPreviewSection({ noMotion }) {
  const containerRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const i = Math.min(PREVIEW_SLIDES.length - 1, Math.max(0, Math.floor(p * PREVIEW_SLIDES.length + 0.05)))
    setActiveIdx(i)
  })

  return (
    <section
      id="preview"
      aria-labelledby="preview-heading"
      className="relative bg-gradient-to-b from-white via-stone-50 to-white dark:from-stone-900 dark:via-stone-950 dark:to-stone-900"
    >
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center px-4 pt-24 pb-10">
        <span className="text-xs font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">Recorrido interactivo</span>
        <h2 id="preview-heading" className="mt-2 text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-50">
          Ve cómo se siente el sistema
        </h2>
        <p className="mt-3 text-stone-500 dark:text-stone-400">
          Desplázate por cada módulo y observa el panel cambiar contigo.
        </p>
      </div>

      {/* Mobile / no-motion — tabs + single mockup */}
      <div className={`${noMotion ? 'block' : 'lg:hidden'} max-w-md mx-auto px-4 pb-20`}>
        <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl mb-5 overflow-x-auto no-scrollbar">
          {PREVIEW_SLIDES.map((s, i) => (
            <button
              key={s.badge}
              onClick={() => setActiveIdx(i)}
              className={`flex-1 min-w-max px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeIdx === i
                  ? 'bg-white dark:bg-stone-900 text-primary-700 dark:text-primary-400 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {s.badge}
            </button>
          ))}
        </div>
        <DashboardMockup activeIndex={activeIdx} />
        <div className="mt-6 text-center">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">{PREVIEW_SLIDES[activeIdx].title}</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">{PREVIEW_SLIDES[activeIdx].desc}</p>
        </div>
      </div>

      {/* Desktop — sticky scroll */}
      {!noMotion && (
        <div ref={containerRef} className="hidden lg:grid grid-cols-2 max-w-7xl mx-auto px-8 gap-16">
          {/* Left: 4 text blocks stacked vertically */}
          <div>
            {PREVIEW_SLIDES.map((s, i) => {
              const Icon = s.icon
              const active = activeIdx === i
              return (
                <div key={s.badge} className="min-h-screen flex items-center">
                  <motion.div
                    animate={{ opacity: active ? 1 : 0.25, x: active ? 0 : -12 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-md"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 text-xs font-semibold mb-4">
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      {s.badge}
                    </div>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-50 mb-4 leading-tight tracking-tight">
                      {s.title}
                    </h3>
                    <p className="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
                      {s.desc}
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {s.bullets.map(b => (
                        <li key={b} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                          <CheckCircle2 className="w-4 h-4 text-primary-500 dark:text-primary-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
              )
            })}
          </div>

          {/* Right: sticky mockup */}
          <div>
            <div className="sticky top-0 h-screen flex items-center justify-center">
              <DashboardMockup activeIndex={activeIdx} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const NAV_LINKS = [
  ['features', 'Características'],
  ['preview',  'En acción'],
  ['steps',    'Cómo funciona'],
  ['targets',  '¿Para quién?'],
  ['faq',      'FAQ'],
]
const NAV_IDS = NAV_LINKS.map(([id]) => id)

/* ── Main component ── */
export default function LandingPage() {
  const { noMotion } = useA11y()
  const [scrolled, setScrolled]       = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)
  const activeSection = useActiveSection(NAV_IDS)

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

      {/* Scroll progress bar */}
      <ScrollProgressBar />

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
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>

          {/* Logo */}
          <a href="#" aria-label="Inicio - Avícola MC" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className={`bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-primary-300 dark:group-hover:shadow-primary-900/60 transition-all duration-300 ${scrolled ? 'w-8 h-8' : 'w-9 h-9'}`}>
              <Bird className={`text-white transition-all ${scrolled ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-primary-800 dark:text-primary-400 leading-none">Avícola MC</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500">Sistema de Gestión</p>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-7" role="list">
            {NAV_LINKS.map(([id, label]) => {
              const active = activeSection === id
              return (
                <button
                  key={id}
                  role="listitem"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => scrollTo(id)}
                  className={`font-medium text-sm transition-colors relative py-1 ${
                    active
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-stone-600 dark:text-stone-300 hover:text-primary-700 dark:hover:text-primary-400'
                  }`}
                >
                  {label}
                  <span
                    className={`absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-primary-500 to-amber-500 transition-all duration-300 origin-left ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              )
            })}
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
          className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-5 pb-5 flex flex-col gap-3 border-b border-stone-200 dark:border-stone-700">
            {NAV_LINKS.map(([id, label]) => {
              const active = activeSection === id
              return (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`text-left py-2 font-medium transition-colors border-b border-stone-100 dark:border-stone-800 last:border-0 ${
                    active
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-stone-700 dark:text-stone-300 hover:text-primary-700 dark:hover:text-primary-400'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            <Link to="/login" className="btn-primary text-center rounded-xl mt-1">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content">

        {/* ────────── HERO ────────── */}
        <HeroSection noMotion={noMotion} scrollTo={scrollTo} />

        {/* ────────── MODULES MARQUEE ────────── */}
        <ModulesMarquee noMotion={noMotion} />

        {/* ────────── FEATURES (bento asimétrico) ────────── */}
        <section id="features" aria-labelledby="features-heading" className="relative py-24 px-4 bg-white dark:bg-stone-900 overflow-hidden">
          {/* Giant number bg */}
          <div className="pointer-events-none absolute -top-8 right-8 text-[18rem] leading-none font-black text-stone-100 dark:text-stone-800/40 select-none hidden lg:block" aria-hidden="true">
            7
          </div>

          <div ref={featRef} className="relative max-w-7xl mx-auto">
            <div className={`text-center mb-14 ${!noMotion ? `transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` : ''}`}>
              <span className="text-xs font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">Módulos del sistema</span>
              <h2 id="features-heading" className="mt-2 text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-50">
                Todo lo que necesitas en un solo lugar
              </h2>
              <p className="mt-3 text-stone-500 dark:text-stone-400 max-w-xl mx-auto">
                Cada módulo está diseñado para simplificar las tareas diarias de tu granja.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 lg:auto-rows-[220px]">

              {/* Featured — IA (span 6 col × 2 row) */}
              <div
                className={`lg:col-span-6 lg:row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-primary-600 to-amber-500 p-8 flex flex-col justify-between shadow-2xl shadow-primary-500/20 group cursor-default ${!noMotion ? `transition-all duration-700 hover:-translate-y-1.5 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}` : ''}`}
              >
                {/* Decorative sparkles */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full mb-5 ring-1 ring-white/30">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    {FEATURED_FEATURE.badge}
                  </span>
                  <div className={`w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/30 ${!noMotion ? 'group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500' : ''}`}>
                    <FEATURED_FEATURE.icon className="w-7 h-7 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">{FEATURED_FEATURE.title}</h3>
                  <p className="text-white/85 leading-relaxed max-w-md">{FEATURED_FEATURE.desc}</p>
                </div>

                <ul className="relative mt-6 space-y-2">
                  {FEATURED_FEATURE.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-sm text-white/90">
                      <CheckCircle2 className="w-4 h-4 text-amber-200 flex-shrink-0" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4 smaller cards next to featured */}
              {FEATURES.slice(0, 4).map((feat, i) => (
                <FeatureCard
                  key={feat.title}
                  {...feat}
                  visible={featVisible}
                  noMotion={noMotion}
                  index={i + 1}
                  className="lg:col-span-3"
                />
              ))}

              {/* 2 wider cards below */}
              {FEATURES.slice(4).map((feat, i) => (
                <FeatureCard
                  key={feat.title}
                  {...feat}
                  visible={featVisible}
                  noMotion={noMotion}
                  index={i + 5}
                  className="lg:col-span-6"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ────────── STICKY PREVIEW ────────── */}
        <StickyPreviewSection noMotion={noMotion} />

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

            {/* Desktop: horizontal 3-col with animated connector */}
            <div className="hidden md:grid grid-cols-3 gap-10 relative">
              <motion.div
                className="absolute top-10 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-0.5 bg-gradient-to-r from-primary-400 via-amber-400 to-primary-400 dark:from-primary-700 dark:via-amber-600 dark:to-primary-700 origin-left rounded-full"
                initial={noMotion ? false : { scaleX: 0 }}
                animate={stepsVisible ? { scaleX: 1 } : {}}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                aria-hidden="true"
              />
              {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
                <div
                  key={num}
                  className={`text-center relative ${!noMotion ? `transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}` : ''}`}
                  style={!noMotion ? { transitionDelay: `${i * 150}ms` } : {}}
                >
                  <div className="relative inline-block mb-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 mx-auto ring-4 ring-white dark:ring-stone-950 relative z-10">
                      <span className="text-2xl font-black text-white select-none">{num}</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shadow-sm z-20">
                      <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 mb-2 text-lg">{title}</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              ))}
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden relative pl-2">
              <motion.div
                className="absolute left-[42px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-primary-400 via-amber-400 to-primary-400 dark:from-primary-700 dark:via-amber-600 dark:to-primary-700 origin-top rounded-full"
                initial={noMotion ? false : { scaleY: 0 }}
                animate={stepsVisible ? { scaleY: 1 } : {}}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                aria-hidden="true"
              />
              <div className="space-y-10">
                {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
                  <div
                    key={num}
                    className={`flex items-start gap-5 ${!noMotion ? `transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}` : ''}`}
                    style={!noMotion ? { transitionDelay: `${i * 150}ms` } : {}}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 ring-4 ring-white dark:ring-stone-950 relative z-10">
                        <span className="text-2xl font-black text-white select-none">{num}</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shadow-sm z-20">
                        <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="font-bold text-stone-800 dark:text-stone-100 mb-1.5 text-lg">{title}</h3>
                      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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

        {/* ────────── FAQ ────────── */}
        <FAQSection noMotion={noMotion} />

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">

          {/* Top: brand + newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-12 border-b border-stone-800">
            {/* Brand col */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <Bird className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-100 leading-none">Avícola MC</p>
                  <p className="text-[11px] text-stone-500">Sistema de Gestión Avícola</p>
                </div>
              </div>
              <p className="text-sm text-stone-400 leading-relaxed max-w-sm">
                Control total de tu granja avícola: galpones, producción, mortalidad, insumos y reportes en tiempo real.
              </p>

              {/* Status + trust */}
              <div className="mt-5 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs text-stone-400">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />
                    <span className="relative rounded-full w-2 h-2 bg-green-500" />
                  </span>
                  <span className="font-medium">Todos los sistemas operativos</span>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-stone-400">
                  <Shield className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
                  <span>Datos cifrados en Supabase</span>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-stone-400">
                  <Globe className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />
                  <span>Hecho en Colombia 🇨🇴</span>
                </div>
              </div>
            </div>

            {/* Newsletter col */}
            <div className="lg:col-span-2 lg:pl-8">
              <p className="text-sm font-bold text-stone-100 uppercase tracking-wider mb-2">Novedades avícolas</p>
              <p className="text-sm text-stone-400 mb-4 max-w-md">
                Recibe tips de gestión, nuevas funciones y análisis del sector avícola una vez al mes.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); alert('¡Gracias! Suscripción registrada (demo).') }}
                className="flex flex-col sm:flex-row gap-2 max-w-md"
              >
                <label htmlFor="footer-email" className="sr-only">Tu correo electrónico</label>
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" aria-hidden="true" />
                  <input
                    id="footer-email"
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-primary-500/25 transition"
                >
                  Suscribirme
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>

          {/* Middle: 4-col links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-b border-stone-800">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-4">Producto</p>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => scrollTo('features')} className="text-stone-400 hover:text-primary-400 transition">Características</button></li>
                <li><button onClick={() => scrollTo('preview')} className="text-stone-400 hover:text-primary-400 transition">En acción</button></li>
                <li><button onClick={() => scrollTo('steps')} className="text-stone-400 hover:text-primary-400 transition">Cómo funciona</button></li>
                <li><Link to="/login" className="text-stone-400 hover:text-primary-400 transition">Iniciar sesión</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-4">Recursos</p>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => scrollTo('faq')} className="text-stone-400 hover:text-primary-400 transition">Preguntas frecuentes</button></li>
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Documentación</a></li>
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Guías rápidas</a></li>
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Novedades</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-4">Empresa</p>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Sobre nosotros</a></li>
                <li><button onClick={() => scrollTo('targets')} className="text-stone-400 hover:text-primary-400 transition">¿Para quién?</button></li>
                <li><a href="mailto:jdacostas@ufpso.edu.co" className="text-stone-400 hover:text-primary-400 transition inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Escribir correo</a></li>
                <li><a href="https://wa.me/573233886314" target="_blank" rel="noreferrer" className="text-stone-400 hover:text-green-400 transition inline-flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Chat WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-4">Legal</p>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Términos</a></li>
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Privacidad</a></li>
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Cookies</a></li>
                <li><a href="#" className="text-stone-400 hover:text-primary-400 transition">Seguridad</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-stone-500">
              &copy; {new Date().getFullYear()} Avícola MC. Todos los derechos reservados.
            </p>
            <p className="text-[11px] text-stone-600 font-mono">
              v1.2.0 · build stable
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
