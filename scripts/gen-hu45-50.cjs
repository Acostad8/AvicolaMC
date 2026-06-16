const puppeteer = require('puppeteer')
const hljs      = require('highlight.js')
const path      = require('path')
const fs        = require('fs')

const OUT_DIR = path.join(__dirname, '..', 'capturas-hu45-50')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const THEME = `
.hljs{color:#abb2bf;background:#1e2127}
.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}
.hljs-doctag,.hljs-keyword,.hljs-formula{color:#c678dd}
.hljs-section,.hljs-name,.hljs-selector-tag,.hljs-deletion,.hljs-subst{color:#e06c75}
.hljs-literal{color:#56b6c2}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string{color:#98c379}
.hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-selector-class,
.hljs-selector-attr,.hljs-selector-pseudo,.hljs-number{color:#d19a66}
.hljs-symbol,.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-title{color:#61afef}
.hljs-built_in,.hljs-title.class_,.hljs-class .hljs-title{color:#e6c07b}
.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:bold}
`

function buildHtml(title, langLabel, highlighted) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#282c34;font-family:'Segoe UI',system-ui,sans-serif;display:inline-block}
.window{background:#1e2127;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.7);border:1px solid #3d4351;min-width:720px;max-width:960px}
.titlebar{background:#21252b;padding:10px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #3d4351}
.dots{display:flex;gap:6px}.dot{width:12px;height:12px;border-radius:50%}
.r{background:#ff5f57}.y{background:#febc2e}.g{background:#28c840}
.filename{color:#9da5b4;font-size:12px;font-weight:500;flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{background:#2c313a;color:#61afef;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:.5px;flex-shrink:0}
pre{margin:0;padding:20px 24px;background:#1e2127;overflow:visible}
code{font-family:'Cascadia Code','Fira Code',Consolas,'Courier New',monospace;font-size:13px;line-height:1.7;background:transparent}
${THEME}
</style></head><body>
<div class="window">
  <div class="titlebar">
    <div class="dots"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div></div>
    <div class="filename">${title}</div>
    <div class="badge">${langLabel}</div>
  </div>
  <pre><code class="hljs">${highlighted}</code></pre>
</div>
</body></html>`
}

const SNIPPETS = [

// ═══════════════════════════════════════════════════════════════
// HU 45 — EDICIÓN DE INSUMOS
// ═══════════════════════════════════════════════════════════════

{
  file: 'HU45_T1_boton_editar.png',
  title: 'HU45·T1 · InsumosList.jsx — Botón Editar en listado · líneas 252–259',
  lang: 'javascript',
  code: `{/* Ver: disponible para todos los usuarios */}
<Link to={\`/dashboard/insumos/\${ins.id}\`}>
  <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
</Link>

{/* Editar: solo visible para administradores */}
{isAdmin && (
  <Link to={\`/dashboard/insumos/\${ins.id}/editar\`}>
    <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
  </Link>
)}`,
},
{
  file: 'HU45_T2_carga_datos.png',
  title: 'HU45·T2 · InsumoForm.jsx — Consulta por ID y carga en formulario · líneas 165–180',
  lang: 'javascript',
  code: `// Consulta el insumo por su ID (isEdit = !!id del useParams)
const { data: insumo } = useQuery({
  queryKey: ['insumo', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('insumos').select('*').eq('id', id).single()
    return data
  },
  enabled: isEdit,  // solo ejecuta si estamos editando
})

// Precarga los datos en el formulario cuando llegan
useEffect(() => {
  if (insumo) reset({
    nombre:        insumo.nombre,
    categoria:     insumo.categoria,
    unidad_medida: insumo.unidad_medida,
    stock_minimo:  insumo.stock_minimo,
    estado:        insumo.estado,
  })
}, [insumo, reset])`,
},
{
  file: 'HU45_T3_validaciones.png',
  title: 'HU45·T3 · InsumoForm.jsx — Schema de validación · líneas 20–26',
  lang: 'javascript',
  code: `const schema = z.object({
  nombre:        z.string().min(1, 'Requerido'),
  categoria:     z.string().min(1, 'Requerido'),
  unidad_medida: z.string().min(1, 'Requerido'),
  stock_minimo:  z.coerce.number()
                   .int('Debe ser un número entero')
                   .nonnegative('Debe ser 0 o más'),
  estado:        z.enum(['activo', 'inactivo']),
})

// El mismo schema aplica tanto a creación como a edición
const { register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
})`,
},
{
  file: 'HU45_T4_update_bd.png',
  title: 'HU45·T4 · InsumoForm.jsx — UPDATE en la base de datos · líneas 184–196',
  lang: 'javascript',
  code: `const mutation = useMutation({
  mutationFn: async (values) => {
    if (isEdit) {
      // Captura snapshot anterior para auditoría
      const datosAnteriores = {
        nombre: insumo.nombre, categoria: insumo.categoria,
        unidad_medida: insumo.unidad_medida,
        stock_minimo: insumo.stock_minimo, estado: insumo.estado,
      }
      const datosNuevos = { ...values }

      // Actualización del registro en la BD
      const { error } = await supabase
        .from('insumos').update(values).eq('id', id)
      if (error) throw error

      // Nota: stock_actual NO se modifica aquí,
      // solo se gestiona mediante movimientos de inventario
    }
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['insumos'] })
    toast.success('Insumo actualizado')
    navigate(\`/dashboard/insumos/\${id}\`)
  },
})`,
},
{
  file: 'HU45_T5_consistencia.png',
  title: 'HU45·T5 · schema.sql — FK insumos → movimientos · líneas 153–163',
  lang: 'sql',
  code: `-- La edición solo modifica metadatos del insumo.
-- El stock_actual es intocable desde el formulario de edición.
-- Solo se actualiza mediante movimientos de inventario (FK).

CREATE TABLE IF NOT EXISTS movimientos_insumos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha             DATE NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  insumo_id         UUID NOT NULL REFERENCES insumos(id),  -- FK integridad
  cantidad          DECIMAL(10,2) NOT NULL,
  destino_proveedor TEXT,
  observaciones     TEXT,
  registrado_por    UUID REFERENCES perfiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
-- La FK garantiza que no se pueden eliminar insumos con movimientos`,
},
{
  file: 'HU45_T6_cancelar.png',
  title: 'HU45·T6 · InsumoForm.jsx — Cancelar edición · líneas 309–311',
  lang: 'javascript',
  code: `{/* Botón Cancelar: redirige sin guardar ni llamar a la BD */}
<Button
  type="button"
  variant="secondary"
  onClick={() => navigate('/dashboard/insumos')}
>
  Cancelar
</Button>`,
},
{
  file: 'HU45_T7_auditoria.png',
  title: 'HU45·T7 · InsumoForm.jsx — Auditoría explícita en edición · líneas 197–200',
  lang: 'javascript',
  code: `// Tras actualizar el insumo, registra la auditoría
await supabase.from('auditoria_insumos').insert({
  insumo_id:        id,
  editado_por:      perfil.id,       // usuario autenticado
  datos_anteriores: datosAnteriores, // snapshot antes del cambio
  datos_nuevos:     datosNuevos,     // snapshot después del cambio
  // editado_at se genera automáticamente con DEFAULT NOW()
})`,
},
{
  file: 'HU45_T8_acceso.png',
  title: 'HU45·T8 · InsumosList.jsx — Editar solo para admins · líneas 255–259',
  lang: 'javascript',
  code: `const { isAdmin } = useAuth()  // rol del usuario autenticado

// En la tabla de insumos:
{isAdmin && (
  <Link to={\`/dashboard/insumos/\${ins.id}/editar\`}>
    <Button variant="ghost" size="sm" icon={Pencil}>Editar</Button>
  </Link>
)}
// Un encargado solo ve el botón "Ver", nunca "Editar"`,
},

// ═══════════════════════════════════════════════════════════════
// HU 46 — DETALLE DE INSUMO
// ═══════════════════════════════════════════════════════════════

{
  file: 'HU46_T1_boton_ver.png',
  title: 'HU46·T1 · InsumosList.jsx — Botón "Ver" en listado · líneas 252–254',
  lang: 'javascript',
  code: `{/* Ver: disponible para todos los usuarios autenticados */}
<Link to={\`/dashboard/insumos/\${ins.id}\`}>
  <Button variant="ghost" size="sm" icon={Eye}>Ver</Button>
</Link>`,
},
{
  file: 'HU46_T2_info_general.png',
  title: 'HU46·T2 · InsumoDetalle.jsx — Consulta y visualización · líneas 105–111',
  lang: 'javascript',
  code: `export default function InsumoDetalle() {
  const { id }      = useParams()
  const { isAdmin } = useAuth()

  // Consulta la información completa del insumo
  const { data: insumo, isLoading } = useQuery({
    queryKey: ['insumo', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('insumos').select('*').eq('id', id).single()
      return data
    },
  })

  // Renderiza: nombre, categoría, unidad, stock actual,
  // stock mínimo, estado — con hero card + stat cards
}`,
},
{
  file: 'HU46_T3_stock_bajo.png',
  title: 'HU46·T3 · InsumoDetalle.jsx — Lógica de alerta de stock · líneas 145–146, 200–213',
  lang: 'javascript',
  code: `// Cálculo de niveles de alerta — líneas 145-146
const isBajo   = insumo.stock_actual <= insumo.stock_minimo
const isCritic = insumo.stock_actual === 0

// Badge visual mostrado en el hero card — líneas 200-213
{(isBajo || isCritic) && (
  <div className={\`flex items-center gap-1.5 px-2.5 py-1 rounded-full
    text-xs font-semibold \${
      isCritic
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700'
    }\`}>
    <AlertTriangle className="h-3 w-3" />
    {isCritic
      ? 'Sin existencias'
      : \`Bajo el mínimo (\${insumo.stock_minimo})\`
    }
  </div>
)}`,
},
{
  file: 'HU46_T4_historial.png',
  title: 'HU46·T4 · InsumoDetalle.jsx — Consulta de movimientos · líneas 113–124',
  lang: 'javascript',
  code: `// Consulta todos los movimientos del insumo ordenados por fecha
const { data: movimientos } = useQuery({
  queryKey: ['movimientos-insumo', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('movimientos_insumos')
      .select('*, registrado:perfiles(nombre_completo)')
      .eq('insumo_id', id)               // filtrado por insumo
      .order('fecha', { ascending: false }) // más recientes primero
      .limit(50)
    return data || []
  },
})
// Tabla muestra: fecha, tipo (entrada/salida), cantidad,
// destino/proveedor y usuario que registró el movimiento`,
},
{
  file: 'HU46_T5_acciones.png',
  title: 'HU46·T5 · InsumoDetalle.jsx — Botones de acción · líneas 161–170',
  lang: 'javascript',
  code: `{/* Solo administradores ven los botones de acción */}
actions={isAdmin && (
  <div className="flex gap-2">

    {/* Acceso directo a registrar movimiento */}
    <Link to="/dashboard/insumos/movimiento/nuevo">
      <Button size="sm" icon={Plus}>Movimiento</Button>
    </Link>

    {/* Acceso directo a editar el insumo */}
    <Link to={\`/dashboard/insumos/\${id}/editar\`}>
      <Button variant="secondary" size="sm" icon={Pencil}>Editar</Button>
    </Link>

  </div>
)}`,
},
{
  file: 'HU46_T6_estado_vacio.png',
  title: 'HU46·T6 · InsumoDetalle.jsx — Estado vacío sin movimientos · líneas 258–265',
  lang: 'javascript',
  code: `{(movimientos || []).length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
    <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl
                    flex items-center justify-center mb-3">
      <Boxes className="h-7 w-7 text-stone-400 dark:text-stone-500" />
    </div>
    <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
      Sin movimientos registrados
    </p>
    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
      Las entradas y salidas de este insumo aparecerán aquí.
    </p>
  </div>
) : (
  // tabla de movimientos...
)}`,
},
{
  file: 'HU46_T7_trigger_stock.png',
  title: 'HU46·T7 · schema.sql — Trigger actualización automática de stock · líneas 202–216',
  lang: 'sql',
  code: `-- Función: actualiza stock_actual al insertar un movimiento
CREATE OR REPLACE FUNCTION fn_movimiento_update_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    -- Entrada: suma la cantidad al stock
    UPDATE insumos
    SET stock_actual = stock_actual + NEW.cantidad
    WHERE id = NEW.insumo_id;

  ELSIF NEW.tipo = 'salida' THEN
    -- Salida: resta la cantidad (mínimo 0)
    UPDATE insumos
    SET stock_actual = GREATEST(0, stock_actual - NEW.cantidad)
    WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movimiento_update_stock
  AFTER INSERT ON movimientos_insumos
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_update_stock();`,
},
{
  file: 'HU46_T8_acceso.png',
  title: 'HU46·T8 · InsumoDetalle.jsx — Control de acceso · líneas 103, 161, 331',
  lang: 'javascript',
  code: `export default function InsumoDetalle() {
  const { isAdmin } = useAuth()   // obtiene el rol

  // Botones Editar y Movimiento: solo admin — línea 161
  actions={isAdmin && ( <div className="flex gap-2">...</div> )}

  // Historial de auditoría: solo admin — línea 331
  {isAdmin && (
    <AuditHistorial
      entries={auditoria}
      loading={loadingAudit}
      formatCambios={formatCambiosInsumo}
      emptyMessage="Este insumo no ha sido editado desde su creación."
    />
  )}
  // La info pública (nombre, stock, movimientos) es visible
  // para todos los usuarios autenticados
}`,
},

// ═══════════════════════════════════════════════════════════════
// HU 47 — MOVIMIENTOS DE INVENTARIO
// ═══════════════════════════════════════════════════════════════

{
  file: 'HU47_T1_schema_form.png',
  title: 'HU47·T1 · MovimientoForm.jsx — Schema del formulario · líneas 21–28',
  lang: 'javascript',
  code: `const schema = z.object({
  fecha:             z.string().min(1, 'Requerido'),
  tipo:              z.enum(['entrada', 'salida']),
  insumo_id:         z.string().min(1, 'Selecciona un producto'),
  cantidad:          z.coerce.number().positive('Debe ser mayor a 0'),
  destino_proveedor: z.string().optional(),
  observaciones:     z.string().optional(),
})`,
},
{
  file: 'HU47_T2_tipo_movimiento.png',
  title: 'HU47·T2 · MovimientoForm.jsx — Selector de tipo de movimiento · líneas 282–317',
  lang: 'javascript',
  code: `{/* Admin: puede elegir entre Entrada y Salida */}
{isAdmin ? (
  <div className="grid grid-cols-2 gap-3">
    {[
      { val: 'entrada', label: 'Entrada', desc: 'Compra o recepción de stock' },
      { val: 'salida',  label: 'Salida',  desc: 'Consumo o uso interno' },
    ].map(({ val, label, desc }) => (
      <label key={val} className="cursor-pointer rounded-2xl border-2 p-4 ...">
        <input type="radio" value={val} {...register('tipo')} />
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-stone-400">{desc}</p>
      </label>
    ))}
  </div>
) : (
  // Encargado: solo puede registrar salidas
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
    <p>Como encargado, puedes registrar
       <strong>salidas</strong> de inventario.</p>
  </div>
)}`,
},
{
  file: 'HU47_T3_validaciones.png',
  title: 'HU47·T3 · MovimientoForm.jsx — Validaciones en campos · líneas 354–391',
  lang: 'javascript',
  code: `<Select
  label="Producto del inventario"
  options={(insumos || []).map(i => ({
    value: i.id,
    label: \`\${i.nombre} — \${i.stock_actual} disponibles\`,
  }))}
  placeholder="Seleccionar producto"
  error={errors.insumo_id?.message}  // → 'Selecciona un producto'
  {...register('insumo_id')}
/>

<Input
  label="Cantidad"
  type="number" step="0.01" min="0.01"
  error={errors.cantidad?.message}   // → 'Debe ser mayor a 0'
  {...register('cantidad')}
/>

{/* Mensaje de stock insuficiente en tiempo real */}
{stockInsuficiente && (
  <p className="text-xs text-red-600">
    La cantidad supera el stock disponible
    ({insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}).
  </p>
)}`,
},
{
  file: 'HU47_T4_validacion_stock.png',
  title: 'HU47·T4 · MovimientoForm.jsx — Validación de stock para salidas · líneas 234–241',
  lang: 'javascript',
  code: `// Cálculo reactivo — se actualiza con cada keystroke
const sinStock          = tipo === 'salida'
                          && insumoSeleccionado?.stock_actual === 0
const stockInsuficiente = tipo === 'salida'
                          && insumoSeleccionado
                          && Number(cantidad) > insumoSeleccionado.stock_actual

// Guardia en la mutación antes de insertar — línea 240
mutationFn: async (values) => {
  const insumo = (insumos || []).find(i => i.id === values.insumo_id)
  if (values.tipo === 'salida' && insumo
      && values.cantidad > insumo.stock_actual) {
    throw new Error(
      \`Stock insuficiente. Disponible: \${insumo.stock_actual} \${insumo.unidad_medida}\`
    )
  }
  // ...
}

// Botón deshabilitado si no hay stock — línea 436
<Button disabled={stockInsuficiente || sinStock}>
  Registrar movimiento
</Button>`,
},
{
  file: 'HU47_T5_proveedor_condicional.png',
  title: 'HU47·T5 · MovimientoForm.jsx — Campo proveedor condicional · líneas 395–419',
  lang: 'javascript',
  code: `{/* El label cambia según el tipo de movimiento */}
<FormSection title={tipo === 'entrada' ? 'Proveedor' : 'Destino'}>

  {tipo === 'entrada' ? (
    // Entrada: selector de proveedores vinculados al insumo
    <Select
      label="Proveedor (opcional)"
      options={opcionesProveedores}
      placeholder="Seleccionar proveedor"
      {...register('destino_proveedor')}
    />
  ) : (
    // Salida: campo libre para indicar destino/uso
    <Input
      label="Destino o uso (opcional)"
      placeholder="Ej: Galpón 1, tratamiento sanitario…"
      {...register('destino_proveedor')}
    />
  )}

</FormSection>`,
},
{
  file: 'HU47_T6_actualizacion_stock.png',
  title: 'HU47·T6 · MovimientoForm.jsx — Invalidación + trigger BD · línea 257',
  lang: 'javascript',
  code: `onSuccess: (_, values) => {
  // 1. Verifica alertas de stock mínimo post-salida
  if (values.tipo === 'salida' && insumoSeleccionado) {
    checkStockMinimo({
      insumoNombre: insumoSeleccionado.nombre,
      stockPost:    Math.max(0,
        insumoSeleccionado.stock_actual - Number(values.cantidad)),
      stockMinimo:  insumoSeleccionado.stock_minimo ?? 0,
      unidad:       insumoSeleccionado.unidad_medida,
    })
  }
  // 2. Invalida la caché → el listado y detalle
  //    muestran el stock actualizado por el trigger de BD
  qc.invalidateQueries({ queryKey: ['insumos'] })
  qc.invalidateQueries({ queryKey: ['movimientos-insumo'] })

  toast.success('Movimiento registrado correctamente')
  navigate('/dashboard/insumos')
},`,
},
{
  file: 'HU47_T7_insert_movimiento.png',
  title: 'HU47·T7 · MovimientoForm.jsx — INSERT del movimiento · líneas 243–246',
  lang: 'javascript',
  code: `// Inserción del movimiento en la BD
// El trigger fn_movimiento_update_stock actualiza
// automáticamente el stock_actual del insumo
const { error } = await supabase
  .from('movimientos_insumos')
  .insert({
    ...values,
    registrado_por: perfil.id,   // usuario autenticado
    // created_at se asigna automáticamente (DEFAULT NOW())
  })
if (error) throw error`,
},
{
  file: 'HU47_T8_auditoria.png',
  title: 'HU47·T8 · MovimientoForm.jsx — Auditoría: usuario y fecha · líneas 243–244',
  lang: 'javascript',
  code: `await supabase.from('movimientos_insumos').insert({
  fecha:             values.fecha,
  tipo:              values.tipo,
  insumo_id:         values.insumo_id,
  cantidad:          values.cantidad,
  destino_proveedor: values.destino_proveedor,
  observaciones:     values.observaciones,
  registrado_por:    perfil.id,  // FK → perfiles: quién registró
  // created_at → DEFAULT NOW() en la BD: fecha y hora exacta
})
// El trigger trg_audit_movimientos_insumos (auditoria_global.sql)
// también persiste INSERT en public.auditoria`,
},
{
  file: 'HU47_T9_acceso.png',
  title: 'HU47·T9 · InsumosList.jsx — Botón visible solo para admin · líneas 109–118',
  lang: 'javascript',
  code: `{/* "Registrar movimiento" solo aparece para administradores */}
actions={isAdmin && (
  <div className="flex gap-2">
    <Link to="/dashboard/insumos/movimiento/nuevo">
      <Button variant="secondary">Registrar movimiento</Button>
    </Link>
    <Link to="/dashboard/insumos/nuevo">
      <Button icon={Plus}>Nuevo producto</Button>
    </Link>
  </div>
)}

{/* Encargado: solo puede registrar salidas
    (restricción aplicada dentro del propio formulario) */}
{!isAdmin && <input type="hidden" value="salida" {...register('tipo')} />}`,
},

// ═══════════════════════════════════════════════════════════════
// HU 48 — LISTADO DE PROVEEDORES
// ═══════════════════════════════════════════════════════════════

{
  file: 'HU48_T1_listado_query.png',
  title: 'HU48·T1 · ProveedoresList.jsx — Consulta y listado en cards · líneas 162–169',
  lang: 'javascript',
  code: `const { data, isLoading } = useQuery({
  queryKey: ['proveedores'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('proveedores').select('*').order('nombre')
    if (error) throw error
    return data || []
  },
})

// Cada proveedor se renderiza como ProveedorCard con:
// nombre, tipo, teléfono, correo, estado y acciones (Ver/Editar)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {paginated.map(p => <ProveedorCard key={p.id} p={p} />)}
</div>`,
},
{
  file: 'HU48_T2_badges_estado.png',
  title: 'HU48·T2 · ProveedoresList.jsx — Badge visual de estado · líneas 125–135',
  lang: 'javascript',
  code: `{/* Badge de estado dentro de ProveedorCard */}
<div className={\`inline-flex items-center gap-1.5 px-2.5 py-1
  rounded-full text-[11px] font-semibold w-fit \${
    isActivo
      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'
      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
  }\`}>
  {isActivo
    ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
    : <><XCircle className="h-3 w-3" /> Inactivo</>
  }
</div>`,
},
{
  file: 'HU48_T3_filtros.png',
  title: 'HU48·T3 · ProveedoresList.jsx — Filtros y lógica de filtrado · líneas 173–180, 231–242',
  lang: 'javascript',
  code: `// Lógica de filtrado — líneas 173-180
const filtered = useMemo(() => {
  const q = search.toLowerCase().trim()
  return todos.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q)
        || p.telefono?.includes(q)
        || p.correo?.toLowerCase().includes(q)) &&
    (!filterEstado || p.estado === filterEstado) &&
    (!filterTipo   || p.tipo_proveedor === filterTipo)
  )
}, [todos, search, filterEstado, filterTipo])

// Selectores de filtro — líneas 231-242
<select value={filterEstado} onChange={handleFilter(setFilterEstado)}>
  <option value="">Todos los estados</option>
  <option value="activo">Activo</option>
  <option value="inactivo">Inactivo</option>
</select>
<select value={filterTipo} onChange={handleFilter(setFilterTipo)}>
  <option value="">Todos los tipos</option>
  {TIPOS_PROVEEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
</select>`,
},
{
  file: 'HU48_T4_busqueda.png',
  title: 'HU48·T4 · ProveedoresList.jsx — Campo de búsqueda · líneas 220–228',
  lang: 'javascript',
  code: `{/* Búsqueda en tiempo real por nombre, teléfono o correo */}
<div className="relative flex-1 min-w-[180px]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                     text-stone-400 pointer-events-none" />
  <input
    type="text"
    value={search}
    onChange={e => { setSearch(e.target.value); setPage(1) }}
    placeholder="Buscar por nombre, teléfono o correo…"
    className="input-base pl-9 w-full"
  />
</div>
// El filtrado se aplica en useMemo → no hace fetch extra`,
},
{
  file: 'HU48_T5_contador.png',
  title: 'HU48·T5 · ProveedoresList.jsx — Stats y contador · líneas 186–189, 265–270',
  lang: 'javascript',
  code: `// Cálculo de estadísticas — líneas 186-189
const activos   = todos.filter(p => p.estado === 'activo').length
const inactivos = todos.filter(p => p.estado === 'inactivo').length
const deInsumos = todos.filter(p =>
  p.tipo_proveedor === 'insumos' || p.tipo_proveedor === 'ambos'
).length

// KPI cards — líneas 209-214
<StatCard label="Total"   value={todos.length} icon={Truck} />
<StatCard label="Activos" value={activos}       icon={CheckCircle2} />

// Contador de resultados en paginación — líneas 265-270
<p className="text-xs text-stone-400">
  Mostrando <strong>{paginated.length}</strong> de{' '}
  <strong>{filtered.length}</strong> proveedores
</p>`,
},
{
  file: 'HU48_T6_acciones_tarjeta.png',
  title: 'HU48·T6 · ProveedoresList.jsx — Botones Ver y Editar · líneas 138–149',
  lang: 'javascript',
  code: `{/* Botones de acción dentro de ProveedorCard */}
<div className="flex gap-2">
  {/* Ver detalle: accesible para todos */}
  <Link to={\`/dashboard/proveedores/\${p.id}\`} className="flex-1">
    <Button variant="secondary" size="sm" icon={Eye}
            className="w-full justify-center">
      Ver
    </Button>
  </Link>

  {/* Editar: accesible para todos (sin restricción isAdmin aquí) */}
  <Link to={\`/dashboard/proveedores/\${p.id}/editar\`} className="flex-1">
    <Button variant="ghost" size="sm" icon={Pencil}
            className="w-full justify-center">
      Editar
    </Button>
  </Link>
</div>`,
},
{
  file: 'HU48_T7_actualizacion.png',
  title: 'HU48·T7 · ProveedorForm.jsx — Invalidación de caché tras cambios · línea 297',
  lang: 'javascript',
  code: `const mutation = useMutation({
  mutationFn: async (values) => {
    // insert o update del proveedor...
  },
  onSuccess: () => {
    // Invalida la caché de proveedores → el listado se recarga
    qc.invalidateQueries({ queryKey: ['proveedores'] })

    toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor registrado')
    navigate('/dashboard/proveedores')
  },
  onError: e => toast.error(e.message || 'Error al guardar'),
})`,
},
{
  file: 'HU48_T8_estado_vacio.png',
  title: 'HU48·T8 · ProveedoresList.jsx — Estado vacío · líneas 250–258',
  lang: 'javascript',
  code: `{paginated.length === 0 ? (
  <EmptyState
    icon={Truck}
    title={
      filtered.length === 0 && todos.length > 0
        ? 'Sin resultados'
        : 'No hay proveedores'
    }
    description={
      filtered.length === 0 && todos.length > 0
        ? 'Intenta ajustar los filtros de búsqueda.'
        : 'Registra el primer proveedor usando el botón superior.'
    }
  />
) : (
  // grid de cards...
)}`,
},

// ═══════════════════════════════════════════════════════════════
// HU 49 — REGISTRO DE PROVEEDORES
// ═══════════════════════════════════════════════════════════════

{
  file: 'HU49_T1_schema_form.png',
  title: 'HU49·T1 · ProveedorForm.jsx — Schema y estructura del formulario · líneas 22–30',
  lang: 'javascript',
  code: `const schema = z.object({
  nombre:         z.string().min(1, 'Requerido'),
  telefono:       z.string().min(1, 'Requerido'),
  correo:         z.string().email('Correo inválido').optional()
                    .or(z.literal('')),
  direccion:      z.string().optional(),
  tipo_proveedor: z.string().min(1, 'Requerido'),
  estado:         z.enum(['activo', 'inactivo']),
  notas:          z.string().optional(),
})

// Campos del formulario: nombre, tipo, estado (identificación)
// teléfono, correo, dirección (contacto)
// CheckList de insumos + CheckList de razas (asociaciones)
// notas (opcional)`,
},
{
  file: 'HU49_T2_validaciones.png',
  title: 'HU49·T2 · ProveedorForm.jsx — Validaciones obligatorias · líneas 349, 380',
  lang: 'javascript',
  code: `{/* Nombre — requerido */}
<Input
  label="Nombre del proveedor"
  placeholder="Ej: Distribuidora Avícola Norte…"
  error={errors.nombre?.message}    // → 'Requerido'
  {...register('nombre')}
/>

{/* Teléfono — requerido */}
<Input
  label="Teléfono"
  placeholder="+57 300 000 0000"
  error={errors.telefono?.message}  // → 'Requerido'
  {...register('telefono')}
/>

{/* Tipo de proveedor — requerido */}
<Select
  label="Tipo de proveedor"
  options={TIPOS_PROVEEDOR}
  error={errors.tipo_proveedor?.message}  // → 'Requerido'
  {...register('tipo_proveedor')}
/>`,
},
{
  file: 'HU49_T3_email.png',
  title: 'HU49·T3 · ProveedorForm.jsx — Validación de correo electrónico · línea 25',
  lang: 'javascript',
  code: `const schema = z.object({
  // ...
  correo: z.string()
             .email('Correo inválido')   // valida formato RFC
             .optional()
             .or(z.literal('')),         // permite campo vacío
  // ...
})

// En el formulario:
<Input
  label="Correo electrónico (opcional)"
  type="email"
  placeholder="contacto@proveedor.com"
  error={errors.correo?.message}   // → 'Correo inválido'
  {...register('correo')}
/>`,
},
{
  file: 'HU49_T4_tipo_proveedor.png',
  title: 'HU49·T4 · ProveedorForm.jsx — Selector de tipo de proveedor · líneas 353–358',
  lang: 'javascript',
  code: `// TIPOS_PROVEEDOR importado de utils
<Select
  label="Tipo de proveedor"
  options={TIPOS_PROVEEDOR}   // Insumos | Aves/Razas | Mixto | Otro
  placeholder="Seleccionar tipo"
  error={errors.tipo_proveedor?.message}
  {...register('tipo_proveedor')}
/>

// Definición en src/lib/utils.js:
export const TIPOS_PROVEEDOR = [
  { value: 'insumos', label: 'Insumos' },
  { value: 'razas',   label: 'Aves / Razas' },
  { value: 'ambos',   label: 'Insumos y Aves' },
  { value: 'otro',    label: 'Otro' },
]`,
},
{
  file: 'HU49_T5_insumos_asociados.png',
  title: 'HU49·T5 · ProveedorForm.jsx — Asociación de insumos · líneas 230–236, 287–290',
  lang: 'javascript',
  code: `// Carga insumos activos disponibles — líneas 230-236
const { data: insumos } = useQuery({
  queryKey: ['insumos-activos'],
  queryFn: async () => {
    const { data } = await supabase.from('insumos')
      .select('id, nombre').eq('estado', 'activo').order('nombre')
    return data || []
  },
})

// CheckList de selección múltiple — líneas 399-407
<FormSection title={\`Insumos que suministra (\${selectedInsumos.length})\`}>
  <CheckList items={insumos} selected={selectedInsumos}
             onToggle={toggleInsumo} />
</FormSection>

// Persistencia de la relación — líneas 287-290
await supabase.from('proveedores_insumos').delete()
  .eq('proveedor_id', proveedorId)
if (selectedInsumos.length > 0)
  await supabase.from('proveedores_insumos').insert(
    selectedInsumos.map(iid => ({ proveedor_id: proveedorId, insumo_id: iid }))
  )`,
},
{
  file: 'HU49_T6_razas_asociadas.png',
  title: 'HU49·T6 · ProveedorForm.jsx — Asociación de razas · líneas 238–244, 291–294',
  lang: 'javascript',
  code: `// Carga razas disponibles — líneas 238-244
const { data: razas } = useQuery({
  queryKey: ['razas'],
  queryFn: async () => {
    const { data } = await supabase.from('razas')
      .select('id, nombre').order('nombre')
    return data || []
  },
})

// CheckList de selección múltiple — líneas 409-416
<FormSection title={\`Razas que provee (\${selectedRazas.length})\`}>
  <CheckList items={razas} selected={selectedRazas}
             onToggle={toggleRaza} />
</FormSection>

// Persistencia de la relación — líneas 291-294
await supabase.from('proveedores_razas').delete()
  .eq('proveedor_id', proveedorId)
if (selectedRazas.length > 0)
  await supabase.from('proveedores_razas').insert(
    selectedRazas.map(rid => ({ proveedor_id: proveedorId, raza_id: rid }))
  )`,
},
{
  file: 'HU49_T7_insert.png',
  title: 'HU49·T7 · ProveedorForm.jsx — INSERT proveedor y relaciones · líneas 282–294',
  lang: 'javascript',
  code: `mutationFn: async (values) => {
  let proveedorId = id
  if (isEdit) {
    const { error } = await supabase
      .from('proveedores').update(values).eq('id', id)
    if (error) throw error
  } else {
    // Inserción del proveedor — obtiene el id generado
    const { data, error } = await supabase
      .from('proveedores').insert(values).select('id').single()
    if (error) throw error
    proveedorId = data.id
  }
  // Sincronización de relaciones insumos y razas (delete + re-insert)
  await supabase.from('proveedores_insumos').delete()
    .eq('proveedor_id', proveedorId)
  if (selectedInsumos.length > 0)
    await supabase.from('proveedores_insumos').insert(
      selectedInsumos.map(iid => ({ proveedor_id: proveedorId, insumo_id: iid }))
    )
  await supabase.from('proveedores_razas').delete()
    .eq('proveedor_id', proveedorId)
  if (selectedRazas.length > 0)
    await supabase.from('proveedores_razas').insert(
      selectedRazas.map(rid => ({ proveedor_id: proveedorId, raza_id: rid }))
    )
}`,
},
{
  file: 'HU49_T8_auditoria_trigger.png',
  title: 'HU49·T8 · 20260605_audit_proveedores.sql — Trigger de auditoría · líneas 1–8',
  lang: 'sql',
  code: `-- Agrega trigger de auditoría a la tabla proveedores.
-- La tabla fue omitida en la migración global de auditoría.

DROP TRIGGER IF EXISTS trg_audit_proveedores ON public.proveedores;

CREATE TRIGGER trg_audit_proveedores
  AFTER INSERT OR UPDATE OR DELETE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- fn_audit_trigger registra en public.auditoria:
--   INSERT → datos_nuevos + usuario_id + created_at (fecha y hora)
--   UPDATE → datos_anteriores + datos_nuevos + usuario
--   DELETE → datos_anteriores + usuario`,
},

// ═══════════════════════════════════════════════════════════════
// HU 50 — EDICIÓN DE PROVEEDORES
// ═══════════════════════════════════════════════════════════════

{
  file: 'HU50_T1_boton_editar.png',
  title: 'HU50·T1 · ProveedoresList.jsx + ProveedorDetalle.jsx — Acceso a editar · líneas 144–148',
  lang: 'javascript',
  code: `{/* Desde el listado — ProveedoresList.jsx líneas 144-148 */}
<Link to={\`/dashboard/proveedores/\${p.id}/editar\`} className="flex-1">
  <Button variant="ghost" size="sm" icon={Pencil}
          className="w-full justify-center">
    Editar
  </Button>
</Link>

{/* Desde el detalle — ProveedorDetalle.jsx líneas 165-169 */}
actions={
  <Link to={\`/dashboard/proveedores/\${id}/editar\`}>
    <Button variant="secondary" icon={Pencil}>Editar</Button>
  </Link>
}`,
},
{
  file: 'HU50_T2_carga_datos.png',
  title: 'HU50·T2 · ProveedorForm.jsx — Carga de datos para edición · líneas 221–271',
  lang: 'javascript',
  code: `// Consulta el proveedor por ID — líneas 221-228
const { data: proveedor } = useQuery({
  queryKey: ['proveedor', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores').select('*').eq('id', id).single()
    return data
  },
  enabled: isEdit,
})

// Precarga los campos del formulario — líneas 264-271
useEffect(() => {
  if (proveedor) reset({
    nombre:         proveedor.nombre,
    telefono:       proveedor.telefono || '',
    correo:         proveedor.correo || '',
    direccion:      proveedor.direccion || '',
    tipo_proveedor: proveedor.tipo_proveedor,
    estado:         proveedor.estado,
    notas:          proveedor.notas || '',
  })
}, [proveedor, reset])`,
},
{
  file: 'HU50_T4_modificar_insumos.png',
  title: 'HU50·T4 · ProveedorForm.jsx — Carga y actualización de insumos asociados · líneas 246–252, 287–290',
  lang: 'javascript',
  code: `// Carga los insumos ya asociados al proveedor — líneas 246-252
const { data: insumosAsignados } = useQuery({
  queryKey: ['proveedor-insumos', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedores_insumos').select('insumo_id')
      .eq('proveedor_id', id)
    return (data || []).map(r => r.insumo_id)
  },
  enabled: isEdit,
})

// Inicializa el estado de selección — línea 273
useEffect(() => {
  if (insumosAsignados) setSelectedInsumos(insumosAsignados)
}, [insumosAsignados])

// Al guardar: elimina todos y reinserta los seleccionados — líneas 287-290
await supabase.from('proveedores_insumos').delete()
  .eq('proveedor_id', proveedorId)
if (selectedInsumos.length > 0)
  await supabase.from('proveedores_insumos').insert(...)`,
},
{
  file: 'HU50_T6_update.png',
  title: 'HU50·T6 · ProveedorForm.jsx — UPDATE proveedor · líneas 276–301',
  lang: 'javascript',
  code: `const mutation = useMutation({
  mutationFn: async (values) => {
    let proveedorId = id
    if (isEdit) {
      // Actualización de datos básicos del proveedor
      const { error } = await supabase
        .from('proveedores').update(values).eq('id', id)
      if (error) throw error
    }
    // Sincronización de relaciones (delete + re-insert)
    await supabase.from('proveedores_insumos').delete()
      .eq('proveedor_id', proveedorId)
    if (selectedInsumos.length > 0)
      await supabase.from('proveedores_insumos').insert(...)

    await supabase.from('proveedores_razas').delete()
      .eq('proveedor_id', proveedorId)
    if (selectedRazas.length > 0)
      await supabase.from('proveedores_razas').insert(...)
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['proveedores'] })
    toast.success('Proveedor actualizado')
    navigate('/dashboard/proveedores')
  },
})`,
},
{
  file: 'HU50_T7_consistencia.png',
  title: 'HU50·T7 · ProveedorForm.jsx — Consistencia relaciones · líneas 287–294',
  lang: 'javascript',
  code: `// Patrón DELETE + RE-INSERT garantiza consistencia:
// elimina todas las asociaciones anteriores y
// reinserta solo las seleccionadas actualmente

// Insumos
await supabase.from('proveedores_insumos')
  .delete().eq('proveedor_id', proveedorId)
if (selectedInsumos.length > 0)
  await supabase.from('proveedores_insumos').insert(
    selectedInsumos.map(iid =>
      ({ proveedor_id: proveedorId, insumo_id: iid }))
  )

// Razas
await supabase.from('proveedores_razas')
  .delete().eq('proveedor_id', proveedorId)
if (selectedRazas.length > 0)
  await supabase.from('proveedores_razas').insert(
    selectedRazas.map(rid =>
      ({ proveedor_id: proveedorId, raza_id: rid }))
  )`,
},
{
  file: 'HU50_T8_cancelar.png',
  title: 'HU50·T8 · ProveedorForm.jsx — Cancelar edición · líneas 434–436',
  lang: 'javascript',
  code: `{/* Botón Cancelar: descarta cambios y regresa al listado */}
<Button
  type="button"
  variant="secondary"
  onClick={() => navigate('/dashboard/proveedores')}
>
  Cancelar
</Button>
{/* No se hace ninguna llamada a la BD;
    los estados selectedInsumos y selectedRazas
    se descartan al desmontar el componente */}`,
},

]  // fin SNIPPETS

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1100, height: 2000, deviceScaleFactor: 2 })

  for (const s of SNIPPETS) {
    process.stdout.write(`${s.file} ... `)
    const lang        = s.lang === 'sql' ? 'sql' : 'javascript'
    const langLabel   = s.lang === 'sql' ? 'SQL' : 'JSX'
    const highlighted = hljs.highlight(s.code, { language: lang }).value
    const html        = buildHtml(s.title, langLabel, highlighted)
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const el = await page.$('.window')
    await el.screenshot({ path: path.join(OUT_DIR, s.file) })
    console.log('✓')
  }

  await browser.close()
  console.log(`\n${SNIPPETS.length} capturas guardadas en: capturas-hu45-50/`)
})()
