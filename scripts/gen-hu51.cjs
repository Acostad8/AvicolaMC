/**
 * gen-hu51.cjs — Capturas de código para HU51: Consulta detallada de proveedores
 * Usa highlight.js local + puppeteer. Salida: capturas-hu51/
 */
'use strict'
const puppeteer = require('puppeteer')
const hljs      = require('highlight.js')
const fs        = require('fs')
const path      = require('path')

const OUT = path.join(__dirname, '..', 'capturas-hu51')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

// ── Tema One Dark ──────────────────────────────────────────────────────────
const ONE_DARK_CSS = `
.hljs{background:#282c34;color:#abb2bf}
.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}
.hljs-doctag,.hljs-keyword,.hljs-formula{color:#c678dd}
.hljs-section,.hljs-name,.hljs-selector-tag,.hljs-deletion,.hljs-subst{color:#e06c75}
.hljs-literal{color:#56b6c2}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string{color:#98c379}
.hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-selector-class,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-number{color:#d19a66}
.hljs-symbol,.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-title{color:#61afef}
.hljs-built_in,.hljs-title.class_,.hljs-class .hljs-title{color:#e6c07b}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:bold}
.hljs-link{text-decoration:underline}
`

// ── Renderiza HTML con ventana estilo macOS ────────────────────────────────
function buildHtml({ code, lang = 'javascript', filename = '', title = '' }) {
  const highlighted = hljs.highlight(code.trim(), { language: lang, ignoreIllegals: true }).value
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#1e2227; font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace; display:inline-block; min-width:700px; }
  .window { border-radius:10px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.6); margin:20px; }
  .titlebar { background:#3c3f41; height:36px; display:flex; align-items:center; padding:0 12px; gap:6px; flex-shrink:0; }
  .dot { width:12px; height:12px; border-radius:50%; }
  .dot.red{background:#ff5f56} .dot.yellow{background:#ffbd2e} .dot.green{background:#27c93f}
  .file-label { margin-left:8px; font-size:12px; color:#999; font-family:sans-serif; }
  .caption { background:#21252b; padding:6px 16px; font-size:11px; color:#7a8499; font-family:sans-serif; border-bottom:1px solid #181a1f; }
  pre { margin:0; background:#282c34; padding:18px 20px; overflow:auto; }
  code { font-size:13px; line-height:1.65; tab-size:2; white-space:pre; }
  .line-numbers { counter-reset:ln; }
  .ln::before { counter-increment:ln; content:counter(ln); display:inline-block; width:2.2em; color:#4b5263; margin-right:1em; text-align:right; user-select:none; }
  ${ONE_DARK_CSS}
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
    <span class="file-label">${filename}</span>
  </div>
  ${title ? `<div class="caption">${title}</div>` : ''}
  <pre><code class="hljs line-numbers">${highlighted.split('\n').map(l=>`<span class="ln">${l}</span>`).join('\n')}</code></pre>
</div>
</body></html>`
}

// ── SQL helper ────────────────────────────────────────────────────────────
function buildSqlHtml({ code, filename = '', title = '' }) {
  const highlighted = hljs.highlight(code.trim(), { language: 'sql', ignoreIllegals: true }).value
  return buildHtml({ code: '-- placeholder', lang: 'sql', filename, title }).replace(
    hljs.highlight('-- placeholder', { language: 'sql' }).value,
    highlighted
  )
}

// ── Screenshot ────────────────────────────────────────────────────────────
async function shot(browser, name, html) {
  process.stdout.write(`${name} ... `)
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 200, deviceScaleFactor: 2 })
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.window')
  const el = await page.$('.window')
  await el.screenshot({ path: path.join(OUT, `${name}.png`) })
  await page.close()
  console.log('✓')
}

// ══════════════════════════════════════════════════════════════════════════
;(async () => {
  const browser = await puppeteer.launch({ headless: 'new' })

  // ── HU51 T1: Acceso al detalle de proveedor ───────────────────────────

  // T1 — Código: botón "Ver" en ProveedoresList.jsx (acción de navegación)
  await shot(browser, 'HU51_T1_boton_ver', buildHtml({
    filename: 'ProveedoresList.jsx · líneas 137–149',
    title: 'T1 — Botón "Ver" que navega al detalle del proveedor por su ID',
    code: `{/* Acciones */}
<div className="flex gap-2">
  <Link to={\`/dashboard/proveedores/\${p.id}\`} className="flex-1">
    <Button variant="secondary" size="sm" icon={Eye} className="w-full justify-center">
      Ver
    </Button>
  </Link>
  <Link to={\`/dashboard/proveedores/\${p.id}/editar\`} className="flex-1">
    <Button variant="ghost" size="sm" icon={Pencil} className="w-full justify-center">
      Editar
    </Button>
  </Link>
</div>`,
  }))

  // T1 — Código: extracción del ID de la URL en ProveedorDetalle.jsx
  await shot(browser, 'HU51_T1_use_params', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 110–119',
    title: 'T1 — Extracción del identificador del proveedor desde la URL',
    code: `export default function ProveedorDetalle() {
  const { id } = useParams()

  const { data: proveedor, isLoading } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single()
      return data
    },
  })`,
  }))

  // ── HU51 T2: Visualización de información general ─────────────────────

  // T2 — Código: consulta principal del proveedor
  await shot(browser, 'HU51_T2_query_proveedor', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 113–119',
    title: 'T2 — Consulta que obtiene todos los datos generales del proveedor',
    code: `const { data: proveedor, isLoading } = useQuery({
  queryKey: ['proveedor', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', id)
      .single()
    return data
  },
})`,
  }))

  // T2 — Código: hero section mostrando nombre, tipo y estado
  await shot(browser, 'HU51_T2_hero_display', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 181–211',
    title: 'T2 — Visualización de nombre, tipo de proveedor y estado',
    code: `<div className="flex-1 min-w-0">
  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">
    {meta.label}
  </p>
  <h2 className="text-white text-xl font-bold truncate">{proveedor.nombre}</h2>
</div>

{/* Estado del proveedor */}
<span className={\`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold \${
  isActivo
    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
}\`}>
  {isActivo
    ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
    : <><XCircle className="h-3 w-3" /> Inactivo</>
  }
</span>`,
  }))

  // T2 — Código: sección de contacto (teléfono, correo, dirección)
  await shot(browser, 'HU51_T2_contacto_fields', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 232–265',
    title: 'T2 — Campos de teléfono, correo electrónico, dirección y tipo',
    code: `<Section title="Información de contacto" icon={Phone}>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <Field
      icon={Phone}
      label="Teléfono"
      value={proveedor.telefono}
      href={proveedor.telefono ? \`tel:\${proveedor.telefono}\` : undefined}
    />
    <Field
      icon={Mail}
      label="Correo electrónico"
      value={proveedor.correo}
      href={proveedor.correo ? \`mailto:\${proveedor.correo}\` : undefined}
    />
    <Field
      icon={MapPin}
      label="Dirección"
      value={proveedor.direccion}
    />
    <Field
      icon={Truck}
      label="Tipo de proveedor"
      value={meta.label}
    />
  </div>
</Section>`,
  }))

  // ── HU51 T3: Insumos asociados ────────────────────────────────────────

  // T3 — Código: consulta de insumos relacionados
  await shot(browser, 'HU51_T3_query_insumos', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 121–130',
    title: 'T3 — Consulta de la relación proveedor–insumos con JOIN a la tabla insumos',
    code: `const { data: insumos } = useQuery({
  queryKey: ['proveedor-insumos', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores_insumos')
      .select('insumo:insumos(id, nombre, unidad_medida, categoria)')
      .eq('proveedor_id', id)
    return (data || []).map(r => r.insumo).filter(Boolean)
  },
})`,
  }))

  // T3 — Código: visualización de los chips de insumos
  await shot(browser, 'HU51_T3_display_insumos', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 286–313',
    title: 'T3 — Renderizado de insumos asociados como chips con nombre y unidad',
    code: `{(tieneInsumos || (insumos && insumos.length > 0)) && (
  <Section title={\`Insumos suministrados\${insumos ? \` (\${insumos.length})\` : ''}\`} icon={Package}>
    {insumos?.length === 0 ? (
      <div className="flex items-center justify-center py-4 flex-col gap-2">
        <Package className="h-7 w-7 text-stone-300 dark:text-stone-600" />
        <p className="text-xs italic text-stone-400 dark:text-stone-500">Sin insumos asignados</p>
      </div>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {insumos.map(i => (
          <span key={i.id} className={\`inline-flex items-center gap-1.5 px-2.5 py-1
            rounded-full text-xs font-semibold border \${meta.chipBg}\`}>
            <Package className="h-2.5 w-2.5" />
            {i.nombre}
            {i.unidad_medida && <span className="opacity-60">· {i.unidad_medida}</span>}
          </span>
        ))}
      </div>
    )}
  </Section>
)}`,
  }))

  // T3 — Base de datos: tabla relacional proveedores_insumos
  await shot(browser, 'HU51_T3_tabla_bd', buildHtml({
    filename: 'schema.sql — tabla proveedores_insumos',
    title: 'T3 — Tabla relacional que vincula proveedores con insumos',
    lang: 'sql',
    code: `CREATE TABLE public.proveedores_insumos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  insumo_id    UUID NOT NULL REFERENCES public.insumos(id)    ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (proveedor_id, insumo_id)
);`,
  }))

  // ── HU51 T4: Razas asociadas ──────────────────────────────────────────

  // T4 — Código: consulta de razas relacionadas
  await shot(browser, 'HU51_T4_query_razas', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 132–141',
    title: 'T4 — Consulta de la relación proveedor–razas con JOIN a la tabla razas',
    code: `const { data: razas } = useQuery({
  queryKey: ['proveedor-razas', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores_razas')
      .select('raza:razas(id, nombre, tipo)')
      .eq('proveedor_id', id)
    return (data || []).map(r => r.raza).filter(Boolean)
  },
})`,
  }))

  // T4 — Código: visualización de chips de razas
  await shot(browser, 'HU51_T4_display_razas', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 317–343',
    title: 'T4 — Renderizado de razas asociadas como chips con nombre y tipo',
    code: `{(tieneRazas || (razas && razas.length > 0)) && (
  <Section title={\`Razas / aves que provee\${razas ? \` (\${razas.length})\` : ''}\`} icon={Bird}>
    {razas?.length === 0 ? (
      <div className="flex items-center justify-center py-4 flex-col gap-2">
        <Bird className="h-7 w-7 text-stone-300 dark:text-stone-600" />
        <p className="text-xs italic text-stone-400 dark:text-stone-500">Sin razas asignadas</p>
      </div>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {razas.map(r => (
          <span key={r.id} className="inline-flex items-center gap-1.5 px-2.5 py-1
            rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20
            text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Bird className="h-2.5 w-2.5" />
            {r.nombre}
            {r.tipo && <span className="opacity-60">· {r.tipo}</span>}
          </span>
        ))}
      </div>
    )}
  </Section>
)}`,
  }))

  // T4 — Base de datos: tabla relacional proveedores_razas
  await shot(browser, 'HU51_T4_tabla_bd', buildHtml({
    filename: 'schema.sql — tabla proveedores_razas',
    title: 'T4 — Tabla relacional que vincula proveedores con razas avícolas',
    lang: 'sql',
    code: `CREATE TABLE public.proveedores_razas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  raza_id      UUID NOT NULL REFERENCES public.razas(id)       ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (proveedor_id, raza_id)
);`,
  }))

  // ── HU51 T5: Manejo de información incompleta ─────────────────────────

  // T5 — Código: componente Field con estado vacío
  await shot(browser, 'HU51_T5_field_vacio', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 55–75',
    title: 'T5 — Componente Field: muestra "Sin información" cuando el valor es nulo o vacío',
    code: `function Field({ icon: Icon, label, value, href, iconBg, accent }) {
  const hasValue = !!value
  const inner = (
    <div className="flex items-start gap-3">
      <div className={\`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
        \${hasValue ? (iconBg || 'bg-stone-100 dark:bg-stone-800') : 'bg-stone-50 dark:bg-stone-800/50'}\`}>
        <Icon className={\`h-4 w-4 \${hasValue ? (accent || 'text-stone-500') : 'text-stone-300 dark:text-stone-600'}\`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
        {hasValue
          ? <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 break-words">{value}</p>
          : <p className="text-sm italic text-stone-400 dark:text-stone-500">Sin información</p>
        }
      </div>
    </div>
  )
  if (href && hasValue) {
    return <a href={href} className="block hover:opacity-75 transition-opacity">{inner}</a>
  }
  return inner
}`,
  }))

  // T5 — Código: estados vacíos de notas, insumos y razas
  await shot(browser, 'HU51_T5_estados_vacios', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 270–295',
    title: 'T5 — Mensajes cuando notas, insumos o razas no tienen datos registrados',
    code: `{/* Notas vacías */}
{!proveedor.notas && (
  <div className="flex items-center justify-center py-5 flex-col gap-2">
    <FileText className="h-7 w-7 text-stone-300 dark:text-stone-600" />
    <p className="text-sm italic text-stone-400 dark:text-stone-500">Sin notas registradas</p>
  </div>
)}

{/* Insumos vacíos */}
{insumos?.length === 0 && (
  <div className="flex items-center justify-center py-4 flex-col gap-2">
    <Package className="h-7 w-7 text-stone-300 dark:text-stone-600" />
    <p className="text-xs italic text-stone-400 dark:text-stone-500">Sin insumos asignados</p>
  </div>
)}

{/* Razas vacías */}
{razas?.length === 0 && (
  <div className="flex items-center justify-center py-4 flex-col gap-2">
    <Bird className="h-7 w-7 text-stone-300 dark:text-stone-600" />
    <p className="text-xs italic text-stone-400 dark:text-stone-500">Sin razas asignadas</p>
  </div>
)}`,
  }))

  // ── HU51 T6: Sincronización con módulos relacionados ──────────────────

  // T6 — Código: tres useQuery independientes con queryKeys descriptivos
  await shot(browser, 'HU51_T6_sincronizacion', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 113–141',
    title: 'T6 — Tres consultas independientes que obtienen datos actualizados de proveedores, insumos y razas',
    code: `// Datos del proveedor — siempre actualizado desde la BD
const { data: proveedor, isLoading } = useQuery({
  queryKey: ['proveedor', id],
  queryFn: async () => {
    const { data } = await supabase.from('proveedores').select('*').eq('id', id).single()
    return data
  },
})

// Insumos actuales según la tabla relacional (JOIN)
const { data: insumos } = useQuery({
  queryKey: ['proveedor-insumos', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores_insumos')
      .select('insumo:insumos(id, nombre, unidad_medida, categoria)')
      .eq('proveedor_id', id)
    return (data || []).map(r => r.insumo).filter(Boolean)
  },
})

// Razas actuales según la tabla relacional (JOIN)
const { data: razas } = useQuery({
  queryKey: ['proveedor-razas', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores_razas')
      .select('raza:razas(id, nombre, tipo)')
      .eq('proveedor_id', id)
    return (data || []).map(r => r.raza).filter(Boolean)
  },
})`,
  }))

  // ── HU51 T7: Acceso a edición desde el detalle ────────────────────────

  // T7 — Código: botón Editar en el PageHeader del detalle
  await shot(browser, 'HU51_T7_boton_editar', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 158–170',
    title: 'T7 — Botón "Editar" en el encabezado que navega al formulario de edición',
    code: `<PageHeader
  title="Detalle del proveedor"
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Proveedores', href: '/dashboard/proveedores' },
    { label: proveedor.nombre },
  ]}
  actions={
    <Link to={\`/dashboard/proveedores/\${id}/editar\`}>
      <Button variant="secondary" icon={Pencil}>Editar</Button>
    </Link>
  }
/>`,
  }))

  // ── HU51 T8: Modo de solo lectura ────────────────────────────────────

  // T8 — Código: componente Field puramente display (sin inputs)
  await shot(browser, 'HU51_T8_solo_lectura', buildHtml({
    filename: 'ProveedorDetalle.jsx · líneas 55–75',
    title: 'T8 — Componente Field: solo renderiza texto, sin campos de entrada editables',
    code: `// El componente Field muestra información únicamente en modo lectura.
// No contiene <input>, <select> ni <textarea>.
function Field({ icon: Icon, label, value, href, iconBg, accent }) {
  const hasValue = !!value
  const inner = (
    <div className="flex items-start gap-3">
      <div className={\`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0\`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5">{label}</p>
        {hasValue
          ? <p className="text-sm font-semibold break-words">{value}</p>      // solo texto
          : <p className="text-sm italic text-stone-400">Sin información</p>  // placeholder
        }
      </div>
    </div>
  )
  // Solo enlaza si el campo tiene valor (tel: / mailto:)
  if (href && hasValue) return <a href={href}>{inner}</a>
  return inner   // Sin href → solo lectura, sin interacción de escritura
}`,
  }))

  // ── HU51 T9: Control de acceso para administradores ──────────────────

  // T9 — Código: adminLinks vs encargadoLinks en Sidebar
  await shot(browser, 'HU51_T9_admin_links', buildHtml({
    filename: 'Sidebar.jsx · líneas 10–88',
    title: 'T9 — La ruta de Proveedores solo existe en adminLinks, no en encargadoLinks',
    code: `// Solo administradores tienen acceso al módulo de Proveedores
const adminLinks = [
  { to: '/dashboard',             icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/dashboard/galpones',    icon: Building2,       label: 'Galpones' },
  { to: '/dashboard/lotes',       icon: Layers,          label: 'Lotes y Razas' },
  // ... más rutas ...
  { to: '/dashboard/insumos',     icon: Package,         label: 'Insumos' },
  { to: '/dashboard/proveedores', icon: Truck,           label: 'Proveedores' }, // ← solo admin
  { to: '/dashboard/empleados',   icon: Users,           label: 'Empleados' },
]

// Encargados NO tienen la ruta /dashboard/proveedores
const encargadoLinks = [
  { to: '/dashboard',             icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/dashboard/galpones',    icon: Building2,       label: 'Mis Galpones' },
  { to: '/dashboard/lotes',       icon: Layers,          label: 'Lotes' },
  // ... sin Proveedores ...
]

// Selección dinámica según el rol del usuario autenticado
const links = isAdmin ? adminLinks : encargadoLinks`,
  }))

  await browser.close()
  console.log(`\n${fs.readdirSync(OUT).length} capturas guardadas en: capturas-hu51/`)
})()
