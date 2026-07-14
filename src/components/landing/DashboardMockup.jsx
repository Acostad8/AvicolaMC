import { motion, AnimatePresence } from 'framer-motion'

const MOCKUP_TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] }

function BrowserFrame({ title, children }) {
  return (
    <div className="relative w-full max-w-[560px] mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-primary-900/30 ring-1 ring-stone-900/10 dark:ring-white/10 bg-white dark:bg-stone-900">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-0.5 rounded-md bg-white dark:bg-stone-900 text-[10px] text-stone-500 dark:text-stone-400 font-medium">
            avicola-mc.app/{title}
          </div>
        </div>
      </div>
      <div className="aspect-[16/10] bg-stone-50 dark:bg-stone-950">
        {children}
      </div>
    </div>
  )
}

function Sidebar({ active }) {
  const items = ['dashboard', 'produccion', 'mortalidad', 'insumos']
  return (
    <div className="w-14 border-r border-stone-200 dark:border-stone-800 py-3 flex flex-col items-center gap-2 bg-white dark:bg-stone-900">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700" />
      <div className="w-6 h-px bg-stone-200 dark:bg-stone-700 my-1" />
      {items.map(k => (
        <div
          key={k}
          className={`w-8 h-8 rounded-lg ${active === k ? 'bg-primary-600/20 ring-1 ring-primary-500/40' : 'bg-stone-100 dark:bg-stone-800'}`}
        />
      ))}
    </div>
  )
}

function KpiCard({ label, value, delta, tone = 'primary' }) {
  const toneMap = {
    primary: 'text-primary-600 dark:text-primary-400',
    green:   'text-green-600 dark:text-green-400',
    red:     'text-red-500 dark:text-red-400',
    amber:   'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3">
      <p className="text-[9px] uppercase tracking-wider text-stone-400">{label}</p>
      <p className="text-lg font-black text-stone-800 dark:text-stone-100 mt-0.5 tabular-nums">{value}</p>
      <p className={`text-[10px] font-semibold ${toneMap[tone]}`}>{delta}</p>
    </div>
  )
}

/* ── Mockup: Dashboard ── */
function DashboardView() {
  return (
    <div className="flex h-full">
      <Sidebar active="dashboard" />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-stone-400">Panel general</p>
            <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Dashboard</p>
          </div>
          <div className="flex gap-1.5">
            <div className="w-16 h-6 rounded-md bg-stone-100 dark:bg-stone-800" />
            <div className="w-6 h-6 rounded-md bg-primary-600" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <KpiCard label="Aves"      value="12.4K" delta="+3.2%" tone="green" />
          <KpiCard label="Huevos/día" value="9,820" delta="+1.8%" tone="green" />
          <KpiCard label="Mortalidad" value="0.42%" delta="-0.1%" tone="green" />
          <KpiCard label="Alertas"   value="3"     delta="Revisar" tone="amber" />
        </div>

        <div className="flex-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">Producción últimos 30 días</p>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
          </div>
          <svg viewBox="0 0 300 90" className="w-full h-[calc(100%-1.5rem)]">
            <defs>
              <linearGradient id="grad1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(217 119 6)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="rgb(217 119 6)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 70 L25 60 L50 62 L75 45 L100 50 L125 32 L150 38 L175 25 L200 30 L225 18 L250 22 L275 10 L300 15 L300 90 L0 90 Z" fill="url(#grad1)" />
            <path d="M0 70 L25 60 L50 62 L75 45 L100 50 L125 32 L150 38 L175 25 L200 30 L225 18 L250 22 L275 10 L300 15" stroke="rgb(217 119 6)" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup: Producción ── */
function ProduccionView() {
  const bars = [55, 68, 72, 58, 80, 74, 90, 66, 82, 88, 95, 78]
  return (
    <div className="flex h-full">
      <Sidebar active="produccion" />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Producción diaria</p>
          <div className="px-2 py-1 rounded-md bg-primary-600 text-white text-[10px] font-semibold">+ Registrar</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <KpiCard label="Total mes" value="284K"  delta="Huevos"      tone="primary" />
          <KpiCard label="% Postura" value="79.4%" delta="Óptimo"      tone="green" />
          <KpiCard label="Galpones" value="8/8"    delta="Activos"     tone="green" />
        </div>

        <div className="flex-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3">
          <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-2">Últimos 12 días</p>
          <div className="flex items-end gap-1.5 h-[calc(100%-1.25rem)]">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-amber-400 to-orange-500" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup: Mortalidad ── */
function MortalidadView() {
  return (
    <div className="flex h-full">
      <Sidebar active="mortalidad" />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Mortalidad</p>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Alerta G-04
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">Tasa por galpón</p>
            <p className="text-[10px] text-stone-400">Últimos 7 días</p>
          </div>
          <svg viewBox="0 0 300 80" className="w-full h-16">
            <path d="M0 60 L50 55 L100 58 L150 40 L200 45 L250 30 L300 35" stroke="rgb(239 68 68)" strokeWidth="2" fill="none" strokeLinecap="round" />
            {[0,50,100,150,200,250,300].map((x,i) => (
              <circle key={i} cx={x} cy={[60,55,58,40,45,30,35][i]} r="2.5" fill="rgb(239 68 68)" />
            ))}
          </svg>
          <div className="mt-3 space-y-1.5">
            {[
              { g: 'G-01', c: 'Natural', n: 3, tone: 'text-stone-500' },
              { g: 'G-04', c: 'Enfermedad', n: 12, tone: 'text-red-500' },
              { g: 'G-07', c: 'Natural', n: 2, tone: 'text-stone-500' },
            ].map(r => (
              <div key={r.g} className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded-md bg-stone-50 dark:bg-stone-800/60">
                <span className="font-mono font-semibold text-stone-700 dark:text-stone-200">{r.g}</span>
                <span className="text-stone-500 dark:text-stone-400">{r.c}</span>
                <span className={`font-bold ${r.tone}`}>{r.n} aves</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup: Insumos ── */
function InsumosView() {
  return (
    <div className="flex h-full">
      <Sidebar active="insumos" />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Inventario de insumos</p>
          <div className="px-2 py-1 rounded-md bg-primary-600 text-white text-[10px] font-semibold">+ Ingresar</div>
        </div>

        <div className="flex gap-3 flex-1">
          <div className="w-1/3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 flex flex-col items-center justify-center">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90 absolute inset-0">
                <circle cx="50" cy="50" r="42" stroke="rgb(231 229 228)" strokeWidth="10" fill="none" />
                <circle cx="50" cy="50" r="42" stroke="rgb(217 119 6)" strokeWidth="10" fill="none" strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-lg font-black text-stone-800 dark:text-stone-100">75%</p>
              </div>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-2">Uso mensual</p>
          </div>

          <div className="flex-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-2">Stock actual</p>
            <div className="space-y-2">
              {[
                { n: 'Alimento inicial', p: 82, tone: 'bg-green-500' },
                { n: 'Vacuna Newcastle', p: 45, tone: 'bg-amber-500' },
                { n: 'Vitaminas',         p: 18, tone: 'bg-red-500' },
                { n: 'Desinfectante',     p: 63, tone: 'bg-green-500' },
              ].map(i => (
                <div key={i.n}>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-stone-600 dark:text-stone-300">{i.n}</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">{i.p}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div className={`h-full ${i.tone} rounded-full`} style={{ width: `${i.p}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const VIEWS = [DashboardView, ProduccionView, MortalidadView, InsumosView]
const TITLES = ['dashboard', 'produccion', 'mortalidad', 'insumos']

export default function DashboardMockup({ activeIndex = 0 }) {
  const idx = Math.max(0, Math.min(VIEWS.length - 1, activeIndex))
  const View = VIEWS[idx]
  return (
    <BrowserFrame title={TITLES[idx]}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          transition={MOCKUP_TRANSITION}
          className="h-full"
        >
          <View />
        </motion.div>
      </AnimatePresence>
    </BrowserFrame>
  )
}
