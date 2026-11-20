import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_TIMEOUT_MS   = 45000
const CACHE_TTL_MS      = 60_000
const HEARTBEAT_EVERY_MS = 10_000

// Cache en memoria por usuario (Edge Function warm-start la reusa)
const farmCache = new Map<string, { data: any; expires: number }>()
function cacheGet(key: string) {
  const hit = farmCache.get(key)
  if (hit && hit.expires > Date.now()) return hit.data
  if (hit) farmCache.delete(key)
  return null
}
function cacheSet(key: string, data: any) {
  farmCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

// ── Datos para encargados (solo sus galpones, últimos 14 días) ────────────
async function fetchEncargadoData(supabase: any, galponIds: string[]) {
  const hoy = new Date().toISOString().slice(0, 10)
  const d14 = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10)

  const [lotesR, prodR, mortR, tratR] = await Promise.all([
    supabase.from('lotes')
      .select('nombre_numero, cantidad_inicial_aves, cantidad_aves_actuales, fecha_ingreso, galpon:galpones(nombre), raza:razas(nombre)')
      .in('galpon_id', galponIds).eq('estado', 'activo'),
    supabase.from('produccion')
      .select('fecha, huevos_producidos, porcentaje_postura, consumo_alimento_kg, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .in('galpon_id', galponIds).gte('fecha', d14).order('fecha', { ascending: false }).limit(60),
    supabase.from('mortalidad')
      .select('fecha, cantidad_bajas, causa, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .in('galpon_id', galponIds).gte('fecha', d14).order('fecha', { ascending: false }).limit(60),
    supabase.from('tratamientos')
      .select('tipo, estado, fecha_inicio, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .in('galpon_id', galponIds).eq('estado', 'activo'),
  ])

  const lotes  = lotesR.data ?? []
  const prod14 = prodR.data  ?? []
  const mort14 = mortR.data  ?? []
  const tratas = tratR.data  ?? []

  const prodHoy = prod14.filter((r: any) => r.fecha === hoy)
  const mortHoy = mort14.filter((r: any) => r.fecha === hoy)

  return {
    fecha_hoy: hoy,
    resumen: {
      lotes_activos: lotes.length,
      total_aves: lotes.reduce((s: number, l: any) => s + (l.cantidad_aves_actuales ?? 0), 0),
      huevos_hoy: prodHoy.reduce((s: number, p: any) => s + (p.huevos_producidos ?? 0), 0),
      bajas_hoy: mortHoy.reduce((s: number, m: any) => s + (m.cantidad_bajas ?? 0), 0),
      total_huevos_14d: prod14.reduce((s: number, p: any) => s + (p.huevos_producidos ?? 0), 0),
      total_bajas_14d: mort14.reduce((s: number, m: any) => s + (m.cantidad_bajas ?? 0), 0),
      total_alimento_14d_kg: prod14.reduce((s: number, p: any) => s + (p.consumo_alimento_kg ?? 0), 0).toFixed(1),
    },
    lotes: lotes.map((l: any) => ({
      nombre: l.nombre_numero,
      galpon: l.galpon?.nombre,
      raza: l.raza?.nombre ?? 'Sin raza',
      aves_actuales: l.cantidad_aves_actuales,
      aves_iniciales: l.cantidad_inicial_aves,
      supervivencia_pct: l.cantidad_inicial_aves > 0
        ? ((l.cantidad_aves_actuales / l.cantidad_inicial_aves) * 100).toFixed(1) + '%'
        : '100%',
      dias_en_granja: Math.floor((Date.now() - new Date(l.fecha_ingreso + 'T00:00:00').getTime()) / 86400000),
    })),
    produccion_14d: prod14.slice(0, 30).map((r: any) => ({
      fecha: r.fecha, galpon: r.galpon?.nombre, lote: r.lote?.nombre_numero,
      huevos: r.huevos_producidos, postura_pct: r.porcentaje_postura, alimento_kg: r.consumo_alimento_kg ?? 0,
    })),
    mortalidad_14d: mort14.map((r: any) => ({
      fecha: r.fecha, galpon: r.galpon?.nombre, lote: r.lote?.nombre_numero,
      bajas: r.cantidad_bajas, causa: r.causa ?? 'No especificada',
    })),
    tratamientos_activos: tratas.map((t: any) => ({
      tipo: t.tipo, galpon: t.galpon?.nombre, lote: t.lote?.nombre_numero,
      inicio: t.fecha_inicio,
      dias_activo: Math.floor((Date.now() - new Date(t.fecha_inicio + 'T00:00:00').getTime()) / 86400000),
    })),
  }
}

// ── Datos completos para administradores ──────────────────────────────────
async function fetchAdminData(supabase: any) {
  const hoy  = new Date().toISOString().slice(0, 10)
  const d7   = new Date(Date.now() -   6 * 86400000).toISOString().slice(0, 10)
  const d30  = new Date(Date.now() -  29 * 86400000).toISOString().slice(0, 10)
  const d90  = new Date(Date.now() -  89 * 86400000).toISOString().slice(0, 10)
  const d365 = new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10)

  const [
    galponesR, lotesR, prod90R, mort90R,
    insumosR, tratR, perfilesR, razasR,
    prodHistR, mortHistR,
  ] = await Promise.all([
    supabase.from('galpones').select('id, nombre'),
    supabase.from('lotes')
      .select('nombre_numero, estado, cantidad_inicial_aves, cantidad_aves_actuales, fecha_ingreso, galpon:galpones(nombre), raza:razas(nombre)')
      .order('fecha_ingreso', { ascending: false }).limit(200),
    supabase.from('produccion')
      .select('fecha, huevos_producidos, porcentaje_postura, consumo_alimento_kg, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .gte('fecha', d90).order('fecha', { ascending: false }).limit(200),
    supabase.from('mortalidad')
      .select('fecha, cantidad_bajas, causa, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .gte('fecha', d90).order('fecha', { ascending: false }).limit(150),
    supabase.from('insumos')
      .select('nombre, stock_actual, stock_minimo, unidad_medida, estado').order('nombre'),
    supabase.from('tratamientos')
      .select('tipo, estado, fecha_inicio, fecha_fin, galpon:galpones(nombre), lote:lotes(nombre_numero)')
      .order('fecha_inicio', { ascending: false }).limit(50),
    supabase.from('perfiles').select('nombre_completo, rol').order('rol'),
    supabase.from('razas').select('nombre'),
    supabase.from('produccion').select('huevos_producidos, consumo_alimento_kg').gte('fecha', d365).limit(500),
    supabase.from('mortalidad').select('cantidad_bajas, causa').gte('fecha', d365).limit(500),
  ])

  const galpones = galponesR.data ?? []
  const lotes    = lotesR.data    ?? []
  const prod90   = prod90R.data   ?? []
  const mort90   = mort90R.data   ?? []
  const insumos  = insumosR.data  ?? []
  const trats    = tratR.data     ?? []
  const perfiles = perfilesR.data ?? []
  const razas    = razasR.data    ?? []
  const prodHist = prodHistR.data ?? []
  const mortHist = mortHistR.data ?? []

  const sum = (arr: any[], key: string) => arr.reduce((s: number, r: any) => s + (r[key] ?? 0), 0)

  const prodHoy = prod90.filter((r: any) => r.fecha === hoy)
  const prod7   = prod90.filter((r: any) => r.fecha >= d7)
  const prod30  = prod90.filter((r: any) => r.fecha >= d30)
  const mortHoy = mort90.filter((r: any) => r.fecha === hoy)
  const mort7   = mort90.filter((r: any) => r.fecha >= d7)
  const mort30  = mort90.filter((r: any) => r.fecha >= d30)

  // Producción agrupada por galpón (últimos 30 días)
  const prodPorGalpon: Record<string, any> = {}
  for (const r of prod30) {
    const g = r.galpon?.nombre ?? 'Sin galpon'
    if (!prodPorGalpon[g]) prodPorGalpon[g] = { huevos: 0, alimento_kg: 0 }
    prodPorGalpon[g].huevos      += r.huevos_producidos   ?? 0
    prodPorGalpon[g].alimento_kg += r.consumo_alimento_kg ?? 0
  }

  // Causas de mortalidad (últimos 90 días y último año)
  const causas90: Record<string, number>   = {}
  const causasAnio: Record<string, number> = {}
  for (const r of mort90)   { const c = r.causa ?? 'No especificada'; causas90[c]   = (causas90[c]   ?? 0) + (r.cantidad_bajas ?? 0) }
  for (const r of mortHist) { const c = r.causa ?? 'No especificada'; causasAnio[c] = (causasAnio[c] ?? 0) + (r.cantidad_bajas ?? 0) }

  const lotesActivos  = lotes.filter((l: any) => l.estado === 'activo')
  const lotesCerrados = lotes.filter((l: any) => l.estado !== 'activo')

  return {
    fecha_hoy: hoy,

    resumen_general: {
      galpones_total:       galpones.length,
      lotes_activos:        lotesActivos.length,
      lotes_cerrados:       lotesCerrados.length,
      total_aves:           lotesActivos.reduce((s: number, l: any) => s + (l.cantidad_aves_actuales ?? 0), 0),
      administradores:      perfiles.filter((p: any) => p.rol === 'administrador').length,
      encargados:           perfiles.filter((p: any) => p.rol === 'encargado').length,
      razas_registradas:    razas.length,
      insumos_criticos:     insumos.filter((i: any) => i.stock_actual <= i.stock_minimo && i.estado === 'activo').length,
      tratamientos_activos: trats.filter((t: any) => t.estado === 'activo').length,
    },

    produccion: {
      hoy:             { huevos: sum(prodHoy, 'huevos_producidos'),  alimento_kg: +sum(prodHoy, 'consumo_alimento_kg').toFixed(1) },
      ultimos_7_dias:  { huevos: sum(prod7,   'huevos_producidos'),  alimento_kg: +sum(prod7,   'consumo_alimento_kg').toFixed(1) },
      ultimos_30_dias: { huevos: sum(prod30,  'huevos_producidos'),  alimento_kg: +sum(prod30,  'consumo_alimento_kg').toFixed(1) },
      ultimo_anio:     { huevos: sum(prodHist,'huevos_producidos'),  alimento_kg: +sum(prodHist,'consumo_alimento_kg').toFixed(1), dias_con_registro: prodHist.length },
      por_galpon_30d:  prodPorGalpon,
      ultimos_7_registros: prod90.slice(0, 7).map((r: any) => ({
        fecha: r.fecha, galpon: r.galpon?.nombre, lote: r.lote?.nombre_numero,
        huevos: r.huevos_producidos, postura_pct: r.porcentaje_postura,
      })),
    },

    mortalidad: {
      hoy:             sum(mortHoy, 'cantidad_bajas'),
      ultimos_7_dias:  sum(mort7,   'cantidad_bajas'),
      ultimos_30_dias: sum(mort30,  'cantidad_bajas'),
      ultimo_anio:     { total: sum(mortHist, 'cantidad_bajas'), registros: mortHist.length },
      causas_90d:      causas90,
      causas_anio:     causasAnio,
      ultimos_10_registros: mort90.slice(0, 10).map((r: any) => ({
        fecha: r.fecha, galpon: r.galpon?.nombre, lote: r.lote?.nombre_numero,
        bajas: r.cantidad_bajas, causa: r.causa ?? 'No especificada',
      })),
    },

    galpones: galpones.map((g: any) => ({ nombre: g.nombre })),

    lotes_activos: lotesActivos.map((l: any) => ({
      nombre: l.nombre_numero, galpon: l.galpon?.nombre, raza: l.raza?.nombre ?? 'Sin raza',
      aves_actuales: l.cantidad_aves_actuales, aves_iniciales: l.cantidad_inicial_aves,
      supervivencia_pct: l.cantidad_inicial_aves > 0
        ? ((l.cantidad_aves_actuales / l.cantidad_inicial_aves) * 100).toFixed(1) + '%' : '100%',
      dias_en_granja: Math.floor((Date.now() - new Date(l.fecha_ingreso + 'T00:00:00').getTime()) / 86400000),
    })),

    lotes_cerrados: lotesCerrados.slice(0, 30).map((l: any) => ({
      nombre: l.nombre_numero, galpon: l.galpon?.nombre, raza: l.raza?.nombre ?? 'Sin raza',
      estado: l.estado, aves_iniciales: l.cantidad_inicial_aves, fecha_ingreso: l.fecha_ingreso,
    })),

    insumos: insumos.map((i: any) => ({
      nombre: i.nombre, stock: i.stock_actual, minimo: i.stock_minimo,
      unidad: i.unidad_medida, estado_item: i.estado,
      alerta: i.stock_actual <= i.stock_minimo ? 'CRITICO'
        : (i.stock_minimo > 0 && i.stock_actual <= i.stock_minimo * 1.5) ? 'PROXIMO AL MINIMO' : 'OK',
    })),

    tratamientos: trats.map((t: any) => ({
      tipo: t.tipo, estado: t.estado, galpon: t.galpon?.nombre, lote: t.lote?.nombre_numero,
      fecha_inicio: t.fecha_inicio, fecha_fin: t.fecha_fin ?? null,
      dias_desde_inicio: Math.floor((Date.now() - new Date(t.fecha_inicio + 'T00:00:00').getTime()) / 86400000),
    })),

    personal: perfiles.map((p: any) => ({ nombre: p.nombre_completo, rol: p.rol })),
    razas: razas.map((r: any) => r.nombre),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_KEY) throw new Error('GROQ_API_KEY no está configurada en los secrets')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401, headers: corsHeaders })
    }

    const { data: perfil } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single()
    const isAdmin = perfil?.rol === 'administrador'

    let farmData: any
    let model: string

    if (isAdmin) {
      const cacheKey = `admin:${user.id}`
      farmData = cacheGet(cacheKey)
      if (!farmData) {
        farmData = await fetchAdminData(supabaseAdmin)
        cacheSet(cacheKey, farmData)
      }
      model = 'llama-3.3-70b-versatile'
    } else {
      const cacheKey = `enc:${user.id}`
      farmData = cacheGet(cacheKey)
      if (!farmData) {
        const { data: galponesData } = await supabaseAdmin.from('galpones').select('id').eq('encargado_id', user.id)
        const galponIds: string[] = (galponesData ?? []).map((g: any) => g.id)
        farmData = galponIds.length > 0
          ? await fetchEncargadoData(supabaseAdmin, galponIds)
          : { fecha_hoy: new Date().toISOString().slice(0, 10), sin_galpones: true }
        cacheSet(cacheKey, farmData)
      }
      model = 'llama-3.1-8b-instant'
    }

    const { messages } = await req.json()

    const systemPrompt = isAdmin
      ? `Eres el asistente analítico de AvicolaMC con acceso completo al sistema como administrador.
Responde SOLO en español usando los datos exactos del contexto. NUNCA inventes ni estimes cifras.

PUEDES ANALIZAR:
- Producción: totales por hoy, 7d, 30d y último año; comparativas por galpón
- Mortalidad: totales por período, desglose por causas (90d y anual)
- Inventario: todos los insumos activos e inactivos con alertas de stock
- Lotes activos y cerrados: supervivencia, razas, días en granja
- Tratamientos: activos e historial reciente con duraciones
- Personal: administradores y encargados registrados en el sistema
- Galpones: estructura completa de la granja

FORMATO DE RESPUESTA:
- Usa "- " para listar más de 2 datos
- Usa **negrita** para resaltar cifras importantes
- Incluye números exactos del contexto
- Si algo no está en los datos, dilo claramente

Hoy es ${farmData.fecha_hoy}.

DATOS COMPLETOS DE LA GRANJA:
${JSON.stringify(farmData)}`
      : `Eres el asistente de AvicolaMC, sistema de gestión avícola.
Responde SOLO en español usando los datos exactos del contexto. NUNCA inventes cifras.

FORMATO:
- Máximo 130 palabras
- Usa "- " al inicio de línea para listar más de 2 datos
- Usa **negrita** para resaltar números y valores clave
- Si no hay datos disponibles para la consulta, dilo en una sola oración

Hoy es ${farmData.fecha_hoy}.

DATOS DE LA GRANJA:
${JSON.stringify(farmData)}`

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages as any[]).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ]

    const url = new URL(req.url)
    const stream = url.searchParams.get('stream') === '1'

    const groqCtrl = new AbortController()
    const groqTimeout = setTimeout(() => {
      try { groqCtrl.abort() } catch (_) { /* nop */ }
    }, GROQ_TIMEOUT_MS)

    let groqRes: Response
    try {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: groqCtrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: groqMessages,
          temperature: 0.2,
          max_tokens: 1024,
          stream,
        }),
      })
    } catch (fetchErr: any) {
      clearTimeout(groqTimeout)
      if (fetchErr?.name === 'AbortError') {
        throw new Error('El modelo tardó demasiado en responder. Reintenta.')
      }
      throw new Error(`No se pudo conectar al modelo: ${fetchErr?.message || 'error de red'}`)
    }

    if (!groqRes.ok) {
      clearTimeout(groqTimeout)
      let groqMsg = ''
      try {
        const errBody = await groqRes.json()
        groqMsg = errBody?.error?.message ?? ''
      } catch (_) { /* respuesta no-JSON de Groq */ }

      if (groqRes.status === 429) {
        // Groq headers: retry-after (seconds), x-ratelimit-reset-requests, etc.
        const retryAfterHeader = groqRes.headers.get('retry-after') ?? groqRes.headers.get('x-ratelimit-reset-requests')
        let retryAfter = 20
        if (retryAfterHeader) {
          const parsed = parseFloat(retryAfterHeader)
          if (!isNaN(parsed) && parsed > 0) retryAfter = Math.min(Math.ceil(parsed), 120)
        } else {
          const m = groqMsg.match(/try again in ([\d.]+)\s*(s|sec|second|m|min|minute)/i)
          if (m) {
            const val = parseFloat(m[1])
            const unit = m[2].toLowerCase()
            retryAfter = unit.startsWith('m') ? Math.ceil(val * 60) : Math.ceil(val)
          }
        }
        return new Response(
          JSON.stringify({
            error: 'Límite de consultas alcanzado. Espera unos segundos.',
            code: 'rate_limit',
            retry_after: retryAfter,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
          },
        )
      }
      if (groqRes.status === 413 || groqMsg.toLowerCase().includes('context') || groqMsg.toLowerCase().includes('token')) {
        throw new Error('La conversación es demasiado larga. Limpia el historial con el ícono de papelera e intenta de nuevo.')
      }
      throw new Error(groqMsg || `Error del asistente (${groqRes.status}). Intenta de nuevo en unos momentos.`)
    }

    // ── Streaming SSE ──
    if (stream && groqRes.body) {
      clearTimeout(groqTimeout)
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      const reader  = groqRes.body.getReader()

      const readable = new ReadableStream({
        async start(controller) {
          let buf = ''
          let gotDelta = false
          const heartbeat = setInterval(() => {
            try { controller.enqueue(encoder.encode('data: {"ping":1}\n\n')) } catch (_) { /* cerrado */ }
          }, HEARTBEAT_EVERY_MS)
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buf += decoder.decode(value, { stream: true })
              const lines = buf.split('\n')
              buf = lines.pop() ?? ''
              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data:')) continue
                const payload = trimmed.slice(5).trim()
                if (payload === '[DONE]') {
                  if (!gotDelta) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'El modelo no devolvió contenido. Reintenta.' })}\n\n`))
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  clearInterval(heartbeat)
                  controller.close()
                  return
                }
                try {
                  const json  = JSON.parse(payload)
                  const delta = json?.choices?.[0]?.delta?.content ?? ''
                  if (delta) {
                    gotDelta = true
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
                  }
                } catch {
                  /* linea no-JSON, ignorar */
                }
              }
            }
            if (!gotDelta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'El modelo no devolvió contenido. Reintenta.' })}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            clearInterval(heartbeat)
            controller.close()
          } catch (err: any) {
            clearInterval(heartbeat)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err?.message || 'stream error' })}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        },
      })
    }

    // ── Respuesta sincrónica (fallback) ──
    clearTimeout(groqTimeout)
    const groqData = await groqRes.json()
    const text = groqData?.choices?.[0]?.message?.content?.trim() ?? 'No pude generar una respuesta.'

    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    const message = err?.message || err?.toString() || 'Error interno del servidor'
    console.error('chat-avicola error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
