import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bird, Building2, Layers, Egg, Skull, Syringe, Package, TrendingUp,
  FileText, BarChart3, LayoutDashboard, Search, Plus, Eye, Pencil,
  CheckCircle2, MousePointer2, Activity,
} from 'lucide-react'

const SCENES = [
  { key: 'dashboard', label: 'Vista general',   desc: 'Panel con KPIs clave en tiempo real.' },
  { key: 'galpones',  label: 'Gestiona galpones', desc: 'Cuadrícula interactiva con estado y ocupación.' },
  { key: 'registro',  label: 'Registra actividad', desc: 'Captura producción, mortalidad y tratamientos.' },
  { key: 'analitica', label: 'Analiza y exporta', desc: 'Gráficos de tendencia y reportes PDF.' },
]

const CYCLE_MS = 5200

/* ═══════════════════════════════════════════════
   MARCO TIPO NAVEGADOR
═══════════════════════════════════════════════ */
function BrowserFrame({ children, path }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary-900/25 ring-1 ring-stone-900/10 dark:ring-white/10 bg-white dark:bg-stone-900">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-0.5 rounded-md bg-white dark:bg-stone-900 text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate max-w-[280px]">
            avicola-mc.app{path}
          </div>
        </div>
      </div>
      <div className="aspect-[16/10] bg-stone-50 dark:bg-stone-950 overflow-hidden relative">
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   APP SHELL (sidebar + header)
═══════════════════════════════════════════════ */
const NAV = [
  { k: 'dashboard', icon: LayoutDashboard },
  { k: 'galpones',  icon: Building2 },
  { k: 'lotes',     icon: Layers },
  { k: 'produccion',icon: Egg },
  { k: 'mortalidad',icon: Skull },
  { k: 'tratam',    icon: Syringe },
  { k: 'insumos',   icon: Package },
  { k: 'reportes',  icon: BarChart3 },
]

function AppShell({ active, children, title }) {
  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-10 border-r border-stone-200 dark:border-stone-800 py-2.5 flex flex-col items-center gap-1 bg-white dark:bg-stone-900 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-1">
          <Bird className="h-3 w-3 text-white" aria-hidden="true" />
        </div>
        <div className="w-5 h-px bg-stone-200 dark:bg-stone-700 mb-1" />
        {NAV.map(({ k, icon: Icon }) => (
          <div
            key={k}
            className={`relative w-7 h-6 rounded-md flex items-center justify-center ${
              active === k
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-stone-400 dark:text-stone-600'
            }`}
          >
            {active === k && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-primary-500" />}
            <Icon className="h-3 w-3" aria-hidden="true" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-7 border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 px-3 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[6px] uppercase tracking-wider text-stone-400 leading-none">Panel</p>
            <p className="text-[9px] font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight mt-0.5">{title}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-stone-100 dark:bg-stone-800" />
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
          </div>
        </div>
        <div className="flex-1 min-h-0 p-3">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CURSOR ANIMADO
═══════════════════════════════════════════════ */
function AnimatedCursor({ path }) {
  return (
    <motion.div
      className="absolute z-30 pointer-events-none drop-shadow"
      initial={path[0]}
      animate={path.slice(1)}
      transition={{ duration: path.length * 0.7, ease: [0.22, 1, 0.36, 1], times: path.map((_, i, a) => i / (a.length - 1)) }}
    >
      <MousePointer2 className="h-4 w-4 text-stone-800 dark:text-white fill-white dark:fill-stone-100" />
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   ESCENA 1 · Dashboard
═══════════════════════════════════════════════ */
function SceneDashboard() {
  return (
    <AppShell active="dashboard" title="Dashboard">
      <div className="h-full flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { lbl: 'Aves',    val: '12.8K', clr: 'text-amber-600 dark:text-amber-400',   icon: Bird },
            { lbl: 'Huevos',  val: '847',   clr: 'text-primary-600 dark:text-primary-400', icon: Egg },
            { lbl: 'Bajas',   val: '23',    clr: 'text-red-500 dark:text-red-400',       icon: Skull },
            { lbl: 'Postura', val: '92.4%', clr: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
          ].map((k, i) => (
            <motion.div
              key={k.lbl}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
              className="rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-1.5"
            >
              <div className="flex items-center justify-between">
                <k.icon className={`h-2.5 w-2.5 ${k.clr}`} />
                <p className="text-[6px] uppercase tracking-wider text-stone-400">{k.lbl}</p>
              </div>
              <p className={`text-[11px] font-bold tabular-nums ${k.clr} leading-tight mt-0.5`}>{k.val}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="flex-1 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-2 relative overflow-hidden"
        >
          <p className="text-[6px] uppercase tracking-wider text-stone-400 mb-1">Producción 30 días</p>
          <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="dashFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f59e0b" stopOpacity="0.55" />
                <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0,48 L20,42 L40,36 L60,30 L80,33 L100,22 L120,27 L140,18 L160,14 L180,10 L200,6"
              stroke="#d97706"
              strokeWidth="1.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.7, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.path
              d="M0,48 L20,42 L40,36 L60,30 L80,33 L100,22 L120,27 L140,18 L160,14 L180,10 L200,6 L200,60 L0,60 Z"
              fill="url(#dashFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.5 }}
            />
          </svg>
        </motion.div>

        <div className="grid grid-cols-2 gap-1.5 h-10">
          {['Mortalidad', 'Alimento'].map((lbl, i) => (
            <motion.div
              key={lbl}
              initial={{ opacity: 0, x: i === 0 ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
              className="rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-1.5 flex items-end gap-0.5"
            >
              {[40, 55, 35, 70, 45, 60, 30].map((h, j) => (
                <motion.div
                  key={j}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 1.4 + j * 0.05, duration: 0.4 }}
                  className={`flex-1 rounded-sm ${i === 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>
      <AnimatedCursor
        path={[
          { top: '55%', left: '15%' },
          { top: '55%', left: '15%' },
          { top: '18%', left: '40%' },
          { top: '18%', left: '40%' },
        ]}
      />
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════
   ESCENA 2 · Galpones (cuadrícula) con zoom
═══════════════════════════════════════════════ */
function SceneGalpones() {
  return (
    <AppShell active="galpones" title="Galpones">
      <motion.div
        className="h-full flex flex-col gap-2 origin-top-left"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1, 1.15], x: [0, 0, -20], y: [0, 0, -10] }}
        transition={{ duration: 4.8, times: [0, 0.6, 1], ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-5 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center px-1.5 gap-1">
            <Search className="h-2.5 w-2.5 text-stone-400" />
            <span className="text-[7px] text-stone-400">Buscar galpón…</span>
          </div>
          <div className="h-5 w-5 rounded-md bg-primary-600 flex items-center justify-center">
            <Plus className="h-2.5 w-2.5 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {[
            { nom: 'Galpón A', estado: 'En producción', clr: 'from-amber-400 to-amber-600',    badge: 'bg-amber-100 text-amber-700',       pct: 85 },
            { nom: 'Galpón B', estado: 'En producción', clr: 'from-amber-400 to-amber-600',    badge: 'bg-amber-100 text-amber-700',       pct: 72 },
            { nom: 'Galpón C', estado: 'Disponible',    clr: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-100 text-emerald-700',   pct: 0  },
            { nom: 'Galpón D', estado: 'En producción', clr: 'from-amber-400 to-amber-600',    badge: 'bg-amber-100 text-amber-700',       pct: 94 },
            { nom: 'Galpón E', estado: 'Mantenimiento', clr: 'from-blue-400 to-blue-600',       badge: 'bg-blue-100 text-blue-700',         pct: 0  },
            { nom: 'Galpón F', estado: 'En producción', clr: 'from-amber-400 to-amber-600',    badge: 'bg-amber-100 text-amber-700',       pct: 68 },
          ].map((g, i) => (
            <motion.div
              key={g.nom}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.35 }}
              className="rounded-md overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col"
            >
              <div className={`h-1 w-full bg-gradient-to-r ${g.clr}`} />
              <div className="p-1.5 flex flex-col gap-1 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <div className={`w-4 h-4 rounded-md bg-gradient-to-br ${g.clr} flex items-center justify-center flex-shrink-0`}>
                      <Building2 className="h-2 w-2 text-white" />
                    </div>
                    <p className="text-[7px] font-bold text-stone-800 dark:text-stone-100 truncate">{g.nom}</p>
                  </div>
                  <span className={`text-[6px] px-1 py-0.5 rounded-full ${g.badge} font-semibold whitespace-nowrap`}>{g.estado}</span>
                </div>
                <div className="h-0.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <motion.div
                    className={`h-full ${g.pct > 90 ? 'bg-red-500' : g.pct > 70 ? 'bg-amber-500' : g.pct > 0 ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${g.pct}%` }}
                    transition={{ delay: 0.5 + i * 0.07, duration: 0.6 }}
                  />
                </div>
                <div className="flex gap-0.5 mt-auto">
                  <div className="flex-1 h-3 rounded bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Eye className="h-1.5 w-1.5 text-stone-500" />
                  </div>
                  <div className="h-3 w-3 rounded bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Pencil className="h-1.5 w-1.5 text-stone-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <AnimatedCursor
        path={[
          { top: '75%', left: '85%' },
          { top: '40%', left: '30%' },
          { top: '40%', left: '30%' },
        ]}
      />
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════
   ESCENA 3 · Formulario de producción con zoom
═══════════════════════════════════════════════ */
function SceneRegistro() {
  return (
    <AppShell active="produccion" title="Nueva producción">
      <motion.div
        className="h-full flex gap-2 origin-center"
        initial={{ scale: 0.92 }}
        animate={{ scale: [0.92, 1, 1.08] }}
        transition={{ duration: 4.8, times: [0, 0.4, 1], ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex-1 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-2 flex flex-col gap-1.5">
          <p className="text-[7px] uppercase tracking-wider text-stone-400">Formulario diario</p>
          {[
            { lbl: 'Galpón',  fill: 'Galpón A — Lote #001', delay: 0.2 },
            { lbl: 'Fecha',   fill: '13/11/2026',           delay: 0.5 },
            { lbl: 'Huevos',  fill: '847',                  delay: 0.9, hl: true },
            { lbl: '% Postura', fill: '92.4',               delay: 1.3, hl: true },
            { lbl: 'Alimento (kg)', fill: '124',            delay: 1.7 },
          ].map(f => (
            <motion.div
              key={f.lbl}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: f.delay - 0.15, duration: 0.3 }}
            >
              <p className="text-[6px] uppercase tracking-wider text-stone-400 mb-0.5">{f.lbl}</p>
              <div className={`h-4 rounded-md border px-1 flex items-center ${
                f.hl
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                  : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
              }`}>
                <motion.span
                  className={`text-[7px] font-semibold ${f.hl ? 'text-primary-700 dark:text-primary-400' : 'text-stone-700 dark:text-stone-300'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: f.delay, duration: 0.25 }}
                >
                  {f.fill}
                </motion.span>
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 1, 0] }}
                  transition={{ delay: f.delay, duration: 0.8, times: [0, 0.9, 1] }}
                  className="inline-block w-px h-2 bg-primary-500 ml-0.5"
                  aria-hidden="true"
                />
              </div>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: [0.9, 1.05, 1] }}
            transition={{ delay: 2.3, duration: 0.5 }}
            className="mt-auto self-end px-2 py-1 rounded-md bg-primary-600 text-white text-[7px] font-semibold shadow-sm flex items-center gap-0.5"
          >
            <CheckCircle2 className="h-2 w-2" /> Guardar
          </motion.div>
        </div>

        <div className="w-24 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-1.5 flex flex-col gap-1">
          <p className="text-[6px] uppercase tracking-wider text-stone-400">Vista rápida</p>
          <div className="flex items-end gap-0.5 h-8 mt-1">
            {[55, 68, 72, 60, 78, 85, 92].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 1.5 + i * 0.06, duration: 0.4 }}
                className="flex-1 rounded-sm bg-gradient-to-t from-amber-500 to-amber-400"
              />
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
            className="text-[6px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-auto"
          >
            <Activity className="h-2 w-2" /> +8.3% vs ayer
          </motion.div>
        </div>
      </motion.div>
      <AnimatedCursor
        path={[
          { top: '30%', left: '20%' },
          { top: '50%', left: '35%' },
          { top: '85%', left: '55%' },
          { top: '85%', left: '55%' },
        ]}
      />
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════
   ESCENA 4 · Reportes + PDF con preview flotante
═══════════════════════════════════════════════ */
function SceneAnalitica() {
  return (
    <AppShell active="reportes" title="Reportes">
      <div className="h-full flex flex-col gap-2 relative">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['Producción', 'Mortalidad', 'Tratamientos', 'Comparativa'].map((t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className={`px-1.5 py-0.5 rounded-md text-[6px] font-semibold ${
                i === 0
                  ? 'bg-primary-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              {t}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex-1 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-2 relative overflow-hidden"
        >
          <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="repFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#d97706" stopOpacity="0.5" />
                <stop offset="1" stopColor="#d97706" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0,50 L25,44 L50,38 L75,30 L100,28 L125,18 L150,22 L175,10 L200,5"
              stroke="#d97706" strokeWidth="1.5" fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.path
              d="M0,50 L25,44 L50,38 L75,30 L100,28 L125,18 L150,22 L175,10 L200,5 L200,60 L0,60 Z"
              fill="url(#repFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            />
          </svg>
        </motion.div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <div className="h-4 w-12 rounded-md bg-stone-100 dark:bg-stone-800" />
            <div className="h-4 w-10 rounded-md bg-stone-100 dark:bg-stone-800" />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: [0.9, 1.08, 1] }}
            transition={{ delay: 1.8, duration: 0.5 }}
            className="px-2 py-1 rounded-md bg-primary-600 text-white text-[7px] font-semibold shadow-sm flex items-center gap-0.5"
          >
            <FileText className="h-2 w-2" /> Descargar PDF
          </motion.div>
        </div>

        {/* PDF preview flotante con zoom in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, x: 40, y: 20, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: -2 }}
          transition={{ delay: 2.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-2 right-2 w-28 h-36 rounded-md bg-white dark:bg-stone-100 shadow-2xl ring-1 ring-stone-900/20 overflow-hidden"
        >
          <div className="h-4 bg-primary-600" />
          <div className="p-1.5 space-y-0.5">
            <div className="h-1.5 w-full rounded bg-stone-800/70" />
            <div className="h-1 w-3/4 rounded bg-stone-400" />
            <div className="h-px w-full bg-stone-200 my-1" />
            <div className="grid grid-cols-2 gap-0.5">
              <div className="h-1 rounded bg-stone-300" />
              <div className="h-1 rounded bg-stone-200" />
              <div className="h-1 rounded bg-stone-300" />
              <div className="h-1 rounded bg-stone-200" />
            </div>
            <div className="mt-1 h-10 rounded bg-primary-100" />
            <div className="h-0.5 w-full bg-stone-200" />
            <div className="h-0.5 w-5/6 bg-stone-200" />
            <div className="h-0.5 w-4/6 bg-stone-200" />
          </div>
        </motion.div>
      </div>
      <AnimatedCursor
        path={[
          { top: '18%', left: '18%' },
          { top: '82%', left: '72%' },
          { top: '82%', left: '72%' },
        ]}
      />
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════ */
export default function HowItWorksDemo({ noMotion }) {
  const [idx, setIdx]       = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || noMotion) return
    const id = setInterval(() => setIdx(i => (i + 1) % SCENES.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [paused, noMotion])

  const scene = SCENES[idx]
  const paths = ['/dashboard', '/dashboard/galpones', '/dashboard/produccion/nuevo', '/dashboard/reportes']
  const sceneEl =
    idx === 0 ? <SceneDashboard /> :
    idx === 1 ? <SceneGalpones  /> :
    idx === 2 ? <SceneRegistro  /> :
                <SceneAnalitica />

  return (
    <div
      className="max-w-3xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <BrowserFrame path={paths[idx]}>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.key}
            initial={noMotion ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={noMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {sceneEl}
          </motion.div>
        </AnimatePresence>
      </BrowserFrame>

      {/* Caption + progress */}
      <div className="mt-5 text-center">
        <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
          <span className="text-primary-600 dark:text-primary-400">{idx + 1}. {scene.label}</span>
          <span className="text-stone-500 dark:text-stone-400 font-normal"> — {scene.desc}</span>
        </p>
        <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Escenas de la demostración">
          {SCENES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setIdx(i)}
              aria-label={`Escena ${i + 1}: ${s.label}`}
              aria-selected={i === idx}
              role="tab"
              className={`h-1.5 rounded-full transition-all ${
                i === idx
                  ? 'w-8 bg-primary-500'
                  : 'w-1.5 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400 dark:hover:bg-stone-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
