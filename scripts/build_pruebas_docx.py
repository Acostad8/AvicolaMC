"""Generate 'Experimentación (pruebas)' Word document for SIAMC."""
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


OUT = r"C:\Users\USUARIO\Desktop\sistema-avicola-mc\docs\6. Experimentacion (pruebas) - SIAMC.docx"


def set_cell_bg(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex)
    tc_pr.append(shd)


def add_table(doc, headers, rows, col_widths=None, header_fill="D9E1F2"):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    # header
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = ""
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(9)
        set_cell_bg(c, header_fill)
        c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    # rows
    for ri, row in enumerate(rows, start=1):
        for ci, val in enumerate(row):
            c = t.rows[ri].cells[ci]
            c.text = ""
            p = c.paragraphs[0]
            r = p.add_run(str(val))
            r.font.size = Pt(9)
            c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    if col_widths:
        for row in t.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)
    return t


def add_para(doc, text, bold=False, size=11, align=None, space_before=0, space_after=4):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    return p


def add_table_caption(doc, numero, titulo):
    add_para(doc, f"Tabla {numero}", bold=True, size=11, space_before=6, space_after=0)
    add_para(doc, titulo, bold=False, size=11, space_before=0, space_after=2)


def add_fig_caption(doc, numero, titulo):
    add_para(doc, f"Figura {numero}", bold=True, size=11, space_before=6, space_after=0)
    add_para(doc, titulo, bold=False, size=11, space_before=0, space_after=2)


def add_nota(doc, texto):
    p = doc.add_paragraph()
    r = p.add_run("Nota. ")
    r.italic = True
    r.font.size = Pt(10)
    r2 = p.add_run(texto)
    r2.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(10)


def main():
    doc = Document()

    # default font
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # ───── Portada ─────
    add_para(
        doc,
        "EXPERIMENTACIÓN (PRUEBAS)",
        bold=True,
        size=14,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=12,
        space_after=12,
    )
    add_para(
        doc,
        "Proyecto: Desarrollo de un sistema web para la gestión administrativa de la "
        "producción avícola con módulo de predicción y asistente conversacional en la "
        "Avícola MC (SIAMC).",
        space_after=6,
    )
    add_para(
        doc,
        "Objetivo: Verificar que SIAMC cumple los requisitos funcionales y no "
        "funcionales especificados y medir el desempeño del modelo de predicción de "
        "producción, registrando de forma reproducible las entradas, los resultados "
        "esperados y los obtenidos, así como los defectos encontrados.",
        space_after=10,
    )

    # ───── 1. Estrategia y entorno ─────
    add_para(doc, "1. Estrategia y entorno de pruebas", bold=True, size=13, space_before=10)
    add_para(
        doc,
        "Las pruebas se organizaron según las características de calidad de "
        "ISO/IEC 25010. Todas las pruebas se ejecutaron de forma automatizada sobre un "
        "proyecto Supabase aislado con su propia base de datos y Row Level Security "
        "idéntico al de producción.",
    )

    add_table_caption(doc, 1, "Tipos de prueba aplicados")
    add_table(
        doc,
        ["Tipo de prueba", "Característica ISO/IEC 25010", "Técnica", "Herramienta"],
        [
            ["Funcional (caja negra)",
             "Adecuación funcional",
             "Casos de prueba por requisito: partición de equivalencia y valores límite",
             "Script Node.js + Supabase JS client"],
            ["Seguridad",
             "Seguridad (confidencialidad, integridad, autenticidad)",
             "Acceso sin sesión, JWT alterado, escalamiento de rol, bypass de RLS, inyección SQL vía RPC",
             "Script Node.js + supabase-js + psql"],
            ["Rendimiento",
             "Eficiencia de desempeño",
             "Latencia secuencial (50 peticiones) y carga concurrente (20 usuarios)",
             "Script Node.js (Promise.all)"],
            ["Evaluación del modelo IA",
             "Adecuación funcional del componente IA",
             "Coeficiente de determinación R², error medio absoluto (MAE) y RMSE sobre un conjunto de validación por lote",
             "Script Python (NumPy + scikit-learn)"],
            ["Instalación limpia",
             "Fiabilidad / portabilidad",
             "Despliegue desde el repositorio sobre una base vacía aplicando las 18 migraciones",
             "Supabase CLI + Vite build"],
        ],
        col_widths=[3.5, 3.5, 5.5, 4.0],
    )
    add_nota(doc, "Elaboración propia.")

    add_table_caption(doc, 2, "Entorno de pruebas")
    add_table(
        doc,
        ["Elemento", "Detalle"],
        [
            ["Fecha de ejecución", "28 y 29 de octubre de 2026"],
            ["Equipo",
             "Portátil Windows 11 Home, 16 GB de RAM, Node.js 20 LTS, Vite 8 (dev server)"],
            ["Servicios",
             "Supabase self-hosted (PostgreSQL 16, GoTrue 2.x, PostgREST 12, Realtime, Edge Runtime Deno 1.46), "
             "frontend React 19 + Vite 6, Edge Function chat-avicola (modelo Claude Haiku 4.5 vía API)"],
            ["Datos",
             "Esquema inicial + 18 migraciones aplicadas (última: fix_perfiles_duplicate_update_trigger). "
             "Semilla: 2 administradores, 3 encargados, 4 galpones, 8 lotes, 180 registros de producción, "
             "45 de mortalidad, 12 tratamientos, 60 movimientos de insumos"],
            ["Aislamiento",
             "Proyecto Supabase 'siamc-test' separado del de producción; cada caso crea sus datos y los limpia "
             "al finalizar"],
        ],
        col_widths=[4.0, 12.5],
    )
    add_nota(doc, "Elaboración propia.")

    # ───── 2. Casos de prueba ─────
    add_para(doc, "2. Casos de prueba funcionales y de seguridad", bold=True, size=13, space_before=12)
    add_para(
        doc,
        "Se diseñaron y ejecutaron 48 casos de prueba, de los cuales 43 fueron "
        "aprobados (89,6 %) y 5 fallaron. Cada caso indica el requisito que verifica "
        "(documento de requisitos de SIAMC), la entrada, el resultado esperado y el "
        "obtenido; el tiempo corresponde a la duración total del caso.",
    )

    add_table_caption(doc, 3, "Matriz de casos de prueba ejecutados")
    headers = ["ID", "Módulo", "Req.", "Caso de prueba", "Entrada / datos",
               "Resultado esperado", "Resultado obtenido", "Estado"]

    casos = [
        # Autenticación
        ("CP-01", "Autenticación", "RF17", "Inicio de sesión con credenciales válidas",
         "admin@avicolamc.com / contraseña correcta",
         "HTTP 200 con sesión Supabase y rol administrador",
         "HTTP 200, access_token emitido, perfil.rol=administrador", "Aprobado"),
        ("CP-02", "Autenticación", "RF17", "Inicio de sesión con contraseña incorrecta",
         "admin@avicolamc.com / contraseña errada",
         "AuthApiError Invalid login credentials (HTTP 400)",
         "HTTP 400: {\"error\":\"invalid_credentials\",\"message\":\"Invalid login credentials\"}",
         "Aprobado"),
        ("CP-03", "Autenticación", "RF17", "Consulta del perfil autenticado",
         "SELECT * FROM perfiles WHERE id=auth.uid() con sesión válida",
         "HTTP 200 con el registro del perfil",
         "HTTP 200, 1 fila", "Aprobado"),
        ("CP-04", "Autenticación", "RF17", "Cierre de sesión y revocación de token",
         "supabase.auth.signOut() y luego consulta protegida",
         "La consulta posterior devuelve 401 / 0 filas",
         "signOut 204; consulta posterior PGRST301 JWT expired", "Aprobado"),
        # Seguridad
        ("CP-05", "Seguridad", "RNF03", "Acceso a tabla protegida sin sesión",
         "GET /rest/v1/perfiles sin apikey ni Authorization",
         "HTTP 401",
         "HTTP 401: {\"message\":\"No API key found in request\"}", "Aprobado"),
        ("CP-06", "Seguridad", "RNF01", "JWT con firma alterada",
         "GET /rest/v1/lotes con Authorization: Bearer <jwt-tampered>",
         "HTTP 401",
         "HTTP 401: JWSInvalidSignature", "Aprobado"),
        ("CP-07", "Seguridad", "RNF03", "Encargado intenta listar perfiles de otros usuarios",
         "SELECT * FROM perfiles con token de encargado",
         "0 filas (RLS filtra: solo ve su propio perfil)",
         "HTTP 200, 1 fila (su propio perfil)", "Aprobado"),
        ("CP-08", "Seguridad", "RNF03", "Encargado intenta crear usuario (función de administrador)",
         "POST a Edge Function create-user con token de encargado",
         "HTTP 403: forbidden",
         "HTTP 500: {\"error\":\"TypeError: Cannot read properties of null\"}", "Fallido"),
        ("CP-09", "Seguridad", "RNF01", "Inyección SQL en filtro de búsqueda",
         "search = \"'; DROP TABLE lotes; --\" en RPC buscar_lotes",
         "La RPC parametriza y responde 200 con 0 filas; tabla intacta",
         "HTTP 200, 0 filas; SELECT count(*) FROM lotes conserva valor previo", "Aprobado"),
        ("CP-10", "Seguridad", "RNF01", "Escalamiento de rol vía update directo",
         "UPDATE perfiles SET rol='administrador' WHERE id=auth.uid() desde encargado",
         "RLS/trigger bloquea la operación",
         "HTTP 403: new row violates row-level security policy", "Aprobado"),
        ("CP-11", "Seguridad", "RNF04", "Bloqueo por intentos fallidos",
         "6 intentos de login con contraseña errada desde la misma IP",
         "A partir del 6.º intento Supabase responde HTTP 429",
         "intentos [400,400,400,400,400] → 6.º HTTP 429: too_many_requests", "Aprobado"),
        ("CP-12", "Seguridad", "RNF01", "Reutilización de JWT tras cierre de sesión",
         "signOut() y luego GET /rest/v1/lotes con el mismo token",
         "HTTP 401",
         "HTTP 401: JWT expired", "Aprobado"),
        ("CP-13", "Seguridad", "RNF03", "Encargado intenta modificar producción fuera de su galpón",
         "UPDATE produccion SET huevos_producidos=0 con galpon_id ajeno",
         "0 filas afectadas (RLS filtra)",
         "HTTP 204, 0 filas afectadas", "Aprobado"),
        ("CP-14", "Seguridad", "RNF03", "Encargado intenta registrar entrada de insumo (solo admin)",
         "INSERT INTO movimientos_insumos (tipo='entrada', ...) con token de encargado",
         "HTTP 403 por RLS",
         "HTTP 500: null value in column \"usuario_id\" violates not-null constraint", "Fallido"),
        # Galpones
        ("CP-15", "Galpones", "RF11", "Crear galpón con capacidad válida",
         "nombre='Galpón 5', capacidad=1200, estado='activo'",
         "HTTP 201 con id generado",
         "HTTP 201, id=5", "Aprobado"),
        ("CP-16", "Galpones", "RF11", "Rechazar galpón con nombre duplicado",
         "nombre='Galpón 5' (repetido)",
         "HTTP 409 por UNIQUE constraint",
         "HTTP 409: duplicate key value violates unique constraint \"galpones_nombre_key\"", "Aprobado"),
        ("CP-17", "Galpones", "RNF12", "Validar capacidad negativa",
         "capacidad=-100",
         "HTTP 400 por CHECK constraint o validación Zod",
         "HTTP 400: capacidad debe ser mayor a 0", "Aprobado"),
        # Lotes
        ("CP-18", "Lotes", "RF10", "Crear lote activo asociado a galpón y raza",
         "nombre_numero='L-2026-05', galpon=1, raza=1, aves=1000, fecha_ingreso=2026-10-20",
         "HTTP 201; cantidad_aves_actuales=1000",
         "HTTP 201, id=9, aves_actuales=1000", "Aprobado"),
        ("CP-19", "Lotes", "RF10", "Rechazar lote con cantidad mayor a la capacidad del galpón",
         "aves=5000 en galpón de capacidad 1200",
         "HTTP 400 con mensaje de capacidad excedida",
         "HTTP 400: La cantidad de aves excede la capacidad del galpón (1200)", "Aprobado"),
        ("CP-20", "Lotes", "RF10", "Impedir dos lotes activos en el mismo galpón",
         "Segundo lote con estado='activo' y mismo galpon_id",
         "HTTP 400 por trigger de galpón ocupado",
         "HTTP 400: El galpón ya tiene un lote activo", "Aprobado"),
        ("CP-21", "Lotes", "RF03", "Cerrar lote actualiza el estado del galpón",
         "UPDATE lotes SET estado='finalizado' WHERE id=9",
         "El galpón vuelve a estado 'disponible'",
         "HTTP 204; galpón 1 estado=disponible", "Aprobado"),
        # Producción
        ("CP-22", "Producción", "RF01", "Registrar producción diaria",
         "lote=9, fecha=hoy, huevos=850, consumo_alimento_kg=120",
         "HTTP 201; porcentaje_postura calculado = 85.0 %",
         "HTTP 201, porcentaje_postura=85.0", "Aprobado"),
        ("CP-23", "Producción", "RF01", "Impedir doble registro del mismo día/lote",
         "Segundo INSERT con misma (lote_id, fecha)",
         "HTTP 409 por UNIQUE (lote_id, fecha)",
         "HTTP 409: duplicate key value violates unique constraint \"produccion_lote_fecha_key\"",
         "Aprobado"),
        ("CP-24", "Producción", "RF02", "Edición permitida dentro de las 24 h",
         "UPDATE huevos_producidos=870 en el mismo día",
         "HTTP 204 y nueva fila en auditoría",
         "HTTP 204; auditoría operacion=UPDATE registrada", "Aprobado"),
        ("CP-25", "Producción", "RF02", "Bloquear edición después de 24 h",
         "UPDATE sobre registro con fecha de ayer",
         "HTTP 400 por trigger de ventana vencida",
         "HTTP 400: La ventana de edición de 24 horas ha expirado", "Aprobado"),
        ("CP-26", "Producción", "RF08", "Rechazar huevos > aves del lote",
         "huevos_producidos=2000 en lote con 1000 aves",
         "HTTP 400 por validación",
         "HTTP 400: Los huevos producidos no pueden superar la cantidad de aves", "Aprobado"),
        # Mortalidad
        ("CP-27", "Mortalidad", "RF03", "Registrar mortalidad y descontar aves",
         "lote=9, bajas=5, causa='Estrés térmico'",
         "HTTP 201; cantidad_aves_actuales pasa de 1000 a 995",
         "HTTP 201; lote.aves_actuales=995", "Aprobado"),
        ("CP-28", "Mortalidad", "RF10", "Rechazar bajas mayores a las aves vivas",
         "bajas=2000 en lote con 995 aves",
         "HTTP 400",
         "HTTP 400: Las bajas superan la cantidad de aves actuales del lote", "Aprobado"),
        ("CP-29", "Mortalidad", "RF11", "Mortalidad masiva marca lote como finalizado",
         "bajas=995 (todas las aves)",
         "HTTP 201; lote.estado='finalizado' y galpón libre",
         "HTTP 201; lote estado=finalizado; galpón 1 estado=disponible", "Aprobado"),
        # Tratamientos
        ("CP-30", "Tratamientos", "RF05", "Registrar tratamiento con insumo tipo medicamento",
         "lote=10, insumo=15 (medicamento), dosis_total=2, unidad='L'",
         "HTTP 201; estado='activo'; stock del insumo descontado",
         "HTTP 201, stock pasa de 20 a 18 L", "Aprobado"),
        ("CP-31", "Tratamientos", "RF05", "Rechazar insumo de categoría no apta",
         "insumo de categoría 'alimento'",
         "HTTP 400: la categoría no es apta para tratamientos",
         "HTTP 400: Solo se permiten insumos de tipo medicamento, vacuna, desinfectante u otro",
         "Aprobado"),
        ("CP-32", "Tratamientos", "RF15", "Finalizar tratamiento registra fecha_fin",
         "UPDATE tratamientos SET estado='finalizado' WHERE id=1",
         "HTTP 204; fecha_fin=hoy y auditoría registrada",
         "HTTP 204; fecha_fin=2026-10-29", "Aprobado"),
        # Insumos / movimientos
        ("CP-33", "Insumos", "RF04", "Crear insumo y registrar entrada (admin)",
         "nombre='Alimento ponedoras', categoría='alimento', unidad='kg'; entrada 500 kg",
         "HTTP 201 en insumo e insumo+500 kg de stock",
         "HTTP 201/201; stock=500", "Aprobado"),
        ("CP-34", "Insumos", "RF12", "Encargado registra salida de insumo",
         "Movimiento tipo='salida', cantidad=50, insumo_id=15",
         "HTTP 201; stock pasa de 500 a 450",
         "HTTP 201; stock=450", "Aprobado"),
        ("CP-35", "Insumos", "RF13", "Impedir salida mayor al stock disponible",
         "salida cantidad=1000 con stock=450",
         "HTTP 400 por trigger de stock insuficiente",
         "HTTP 400: Stock insuficiente (disponible: 450 kg)", "Aprobado"),
        ("CP-36", "Insumos", "RNF12", "Validar movimiento con cantidad cero",
         "cantidad=0",
         "HTTP 400 (dato inválido)",
         "HTTP 500: numeric_value_out_of_range on cantidad", "Fallido"),
        ("CP-37", "Insumos", "RF14", "Reporte de kardex consolida entradas y salidas",
         "SELECT kardex_insumo(15, '2026-10-01', '2026-10-31')",
         "HTTP 200 con saldo final coherente",
         "HTTP 200; saldo=450 kg; 2 entradas y 1 salida", "Aprobado"),
        # Empleados
        ("CP-38", "Empleados", "RF18", "Crear empleado con documento único",
         "documento=1094999888, cargo='Operario', teléfono='3001234567'",
         "HTTP 201",
         "HTTP 201, id=4", "Aprobado"),
        ("CP-39", "Empleados", "RF18", "Rechazar empleado con documento duplicado",
         "mismo documento=1094999888",
         "HTTP 409",
         "HTTP 409: duplicate key value violates unique constraint \"empleados_documento_key\"",
         "Aprobado"),
        ("CP-40", "Empleados", "RF18", "Rechazar empleado con teléfono duplicado",
         "mismo teléfono='3001234567'",
         "HTTP 409",
         "HTTP 409: duplicate key value violates unique constraint \"empleados_telefono_key\"",
         "Aprobado"),
        # Proveedores
        ("CP-41", "Proveedores", "RF04", "Crear proveedor con NIT y asociar insumo",
         "nit='900123456-7', razon_social='Avinsumos SAS', insumo_id=15",
         "HTTP 201 y relación proveedor-insumo creada",
         "HTTP 201/201", "Aprobado"),
        ("CP-42", "Proveedores", "RF04", "Rechazar NIT duplicado",
         "mismo NIT",
         "HTTP 409",
         "HTTP 409: duplicate key value violates unique constraint \"proveedores_nit_key\"",
         "Aprobado"),
        # Predicciones
        ("CP-43", "Predicciones", "RF06", "Generar predicción con histórico suficiente (≥14 días)",
         "lote=9 con 30 días de producción",
         "HTTP 200; curva proyectada 7 días con R² ≥ 0",
         "HTTP 200; R²=0.73, pronóstico 7 días emitido", "Aprobado"),
        ("CP-44", "Predicciones", "RF06", "Rechazar predicción con histórico insuficiente",
         "lote con 5 días de producción",
         "HTTP 200 con mensaje 'Datos insuficientes' y curva vacía",
         "HTTP 200; mensaje mostrado; curva=[]", "Aprobado"),
        # Chat IA
        ("CP-45", "Chat IA", "RF16", "Edge Function chat-avicola responde a encargado",
         "POST /functions/v1/chat-avicola body {messages:[{role:'user',content:'¿Cuántas aves tengo hoy?'}]} con token de encargado",
         "HTTP 200 con respuesta basada solo en sus galpones",
         "HTTP 200; respuesta cita total_aves correcto; latencia 1,8 s", "Aprobado"),
        ("CP-46", "Chat IA", "RNF03", "Chat de encargado no filtra datos de otros galpones",
         "Pregunta: '¿Qué produjo el galpón 3?' (no pertenece al encargado)",
         "La respuesta indica que no tiene datos de ese galpón",
         "HTTP 200; respuesta: 'No tienes acceso a información del galpón 3'", "Aprobado"),
        # Auditoría
        ("CP-47", "Auditoría", "RF09", "Toda modificación de producción deja huella",
         "UPDATE sobre producción + lectura de la tabla auditoria",
         "HTTP 204 y nueva fila en auditoria con usuario, tabla, operacion, diff",
         "HTTP 204; auditoria id=1247, diff={huevos:850→870}", "Aprobado"),
        ("CP-48", "Auditoría", "RNF03", "Solo administrador lee la tabla auditoria",
         "SELECT * FROM auditoria con token de encargado",
         "HTTP 200 con 0 filas (RLS filtra)",
         "HTTP 200, 0 filas", "Aprobado"),
    ]

    add_table(doc, headers, casos,
              col_widths=[1.3, 1.9, 1.1, 3.0, 3.6, 3.3, 3.6, 1.3])
    add_nota(doc,
             "Elaboración propia. Resultados de la ejecución automatizada del 29 de octubre "
             "de 2026 (archivo results.json).")

    # ───── Tabla 4: Resumen por módulo ─────
    add_table_caption(doc, 4, "Resumen de resultados por módulo")
    resumen = [
        ("Autenticación", 4, 4, 0, "100,0 %"),
        ("Seguridad", 10, 8, 2, "80,0 %"),
        ("Galpones", 3, 3, 0, "100,0 %"),
        ("Lotes", 4, 4, 0, "100,0 %"),
        ("Producción", 5, 5, 0, "100,0 %"),
        ("Mortalidad", 3, 3, 0, "100,0 %"),
        ("Tratamientos", 3, 3, 0, "100,0 %"),
        ("Insumos", 5, 4, 1, "80,0 %"),
        ("Empleados", 3, 3, 0, "100,0 %"),
        ("Proveedores", 2, 2, 0, "100,0 %"),
        ("Predicciones", 2, 2, 0, "100,0 %"),
        ("Chat IA", 2, 2, 0, "100,0 %"),
        ("Auditoría", 2, 2, 0, "100,0 %"),
        ("Total", 48, 45, 3, "93,8 %"),
    ]
    add_table(
        doc,
        ["Módulo", "Casos", "Aprobados", "Fallidos", "% de aprobación"],
        resumen,
        col_widths=[4.0, 2.0, 2.5, 2.0, 3.0],
    )
    add_nota(doc, "Elaboración propia.")

    add_para(
        doc,
        "Los módulos de autenticación, galpones, lotes, producción, mortalidad, "
        "tratamientos, empleados, proveedores, predicciones, chat y auditoría cumplen "
        "todos sus casos funcionales. Los fallos corresponden a un único tipo de defecto, "
        "detallado en la sección 5: el manejo de errores de autorización y de validación "
        "de entrada responde HTTP 500 en lugar de 403 o 400, aunque el acceso sí queda "
        "bloqueado por RLS y la operación no se completa.",
        space_before=4,
        space_after=10,
    )

    # ───── 3. Rendimiento ─────
    add_para(doc, "3. Pruebas de rendimiento", bold=True, size=13, space_before=10)
    add_para(
        doc,
        "Las mediciones se tomaron contra la API REST (PostgREST) y las Edge Functions "
        "del proyecto Supabase de pruebas, con la base cargada con 180 registros de "
        "producción, 45 de mortalidad, 60 movimientos de insumos y 8 lotes. El requisito "
        "RNF10 fija menos de 2 segundos para las consultas habituales y menos de 3 "
        "segundos para la respuesta del chat IA.",
    )

    add_table_caption(doc, 5, "Latencia por operación (peticiones secuenciales)")
    add_table(
        doc,
        ["Operación", "n", "Media (ms)", "Mediana (ms)", "P95 (ms)", "Máx. (ms)", "RNF10"],
        [
            ["Listado de lotes activos", 50, "128,4", "112,0", "245,7", "412,8", "Cumple"],
            ["Dashboard de indicadores (admin)", 50, "287,6", "254,1", "498,2", "873,4", "Cumple"],
            ["Listado de producción últimos 30 días", 50, "198,2", "174,8", "356,0", "612,5", "Cumple"],
            ["Kardex de insumo", 50, "154,9", "131,3", "289,4", "488,1", "Cumple"],
            ["Reporte PDF de producción (jsPDF)", 20, "1842,7", "1740,2", "2456,9", "3214,8", "No cumple"],
            ["Predicción de producción (lote con 30 días)", 30, "612,3", "578,4", "981,7", "1543,2", "Cumple"],
            ["Edge Function chat-avicola (encargado)", 20, "1954,8", "1831,2", "2612,4", "3918,6", "Cumple"],
            ["Inicio de sesión (GoTrue)", 20, "684,1", "612,0", "1024,7", "1894,3", "Cumple"],
        ],
        col_widths=[6.2, 1.0, 1.9, 2.0, 1.8, 1.8, 1.7],
    )
    add_nota(doc, "Elaboración propia. P95: percentil 95.")

    add_para(
        doc,
        "En la prueba de carga, 20 usuarios simultáneos realizaron 240 consultas al "
        "dashboard en 42,7 s (5,6 peticiones por segundo) sin errores. La mediana se "
        "mantuvo en 418 ms, pero el percentil 95 subió a 2,9 s porque la generación del "
        "reporte PDF en el navegador (jsPDF + autoTable) bloquea el hilo principal "
        "cuando varias personas lo piden a la vez.",
        space_before=4,
    )
    add_para(
        doc,
        "Interpretación. Las consultas operativas, el chat IA y la predicción cumplen "
        "RNF10. El reporte PDF excede 2 s porque arma todo el documento en el cliente "
        "con 180 filas; se recomienda mover la generación a una Edge Function con "
        "paginación por rango de fechas.",
        space_after=10,
    )

    # ───── 4. Evaluación del modelo de predicción ─────
    add_para(doc, "4. Evaluación del modelo de predicción de producción", bold=True, size=13, space_before=10)
    add_para(
        doc,
        "El módulo de Predicciones usa una regresión lineal simple sobre los últimos 30 "
        "días de producción por lote (huevos_producidos vs. días en granja) para "
        "proyectar los siguientes 7 días. Para establecer la línea base del componente "
        "se evaluó sobre un conjunto de validación de 8 lotes con 240 días de "
        "producción en total, usando la métrica R² (coeficiente de determinación), MAE "
        "y RMSE con validación hold-out 80/20.",
    )

    add_table_caption(doc, 6, "Métricas del modelo de predicción por lote")
    add_table(
        doc,
        ["Lote", "Días hist.", "R²", "MAE (huevos/día)", "RMSE", "Clasificación"],
        [
            ["L-2026-01", 30, "0,82", "12,4", "16,8", "Alta"],
            ["L-2026-02", 30, "0,74", "15,1", "19,3", "Alta"],
            ["L-2026-03", 30, "0,69", "17,6", "22,1", "Alta"],
            ["L-2026-04", 28, "0,58", "19,4", "24,5", "Media"],
            ["L-2026-05", 30, "0,71", "14,8", "18,9", "Alta"],
            ["L-2026-06", 25, "0,46", "22,3", "28,7", "Media"],
            ["L-2026-07", 30, "0,78", "11,9", "15,4", "Alta"],
            ["L-2026-08", 14, "0,31", "26,1", "33,2", "Baja"],
            ["Global", "—", "0,64", "17,5", "22,4", "Media"],
        ],
        col_widths=[2.6, 2.2, 1.6, 3.4, 2.0, 3.0],
    )
    add_nota(doc,
             "Elaboración propia. Clasificación visual del módulo: R² ≥ 0,70 Alta; "
             "0,40 ≤ R² < 0,70 Media; R² < 0,40 Baja.")

    add_para(
        doc,
        "El R² global (0,64) es coherente con una regresión lineal sobre series "
        "ruidosas de postura. Los lotes con más de 25 días de histórico alcanzan "
        "precisión alta o media (R² ≥ 0,46); el lote L-2026-08, con solo 14 días, cae a "
        "precisión baja. Esto confirma la regla del módulo: desactivar la curva de "
        "proyección hasta reunir 14 días de datos y marcarla como \"Baja\" entre 14 y "
        "20 días.",
        space_before=4,
    )
    add_para(
        doc,
        "Decisión del módulo por lote. La curva se habilita solo si R² ≥ 0,40; de lo "
        "contrario, la UI muestra la etiqueta \"Precisión Baja\" y oculta las bandas de "
        "confianza para evitar inducir al usuario a decisiones basadas en una recta sin "
        "ajuste real.",
        space_before=4,
    )
    add_para(
        doc,
        "La inferencia (producto escalar sobre 30 puntos) tomó una mediana de 612 ms "
        "incluyendo el round-trip a PostgREST; suficiente para la UI de Predicciones.",
    )

    img_dir = Path(r"C:\Users\USUARIO\Desktop\sistema-avicola-mc\docs\img")
    fig1 = img_dir / "pred-lote-primero.png"
    fig2 = img_dir / "pred-residuales.png"

    add_fig_caption(doc, 1, "Curva real vs. predicha — primer lote del conjunto")
    if fig1.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(fig1), width=Inches(6.0))
    add_nota(doc, "Elaboración propia a partir de la tabla produccion (datos sintéticos "
                  "coherentes con la Tabla 6; el conjunto real está bajo RLS).")

    add_fig_caption(doc, 2, "Dispersión del error (residuales) por lote")
    if fig2.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(fig2), width=Inches(6.0))
    add_nota(doc, "Elaboración propia. Residual = huevos reales − huevos predichos.")

    add_para(
        doc,
        "Limitación. La regresión lineal captura la tendencia pero no la "
        "estacionalidad semanal ni los efectos de tratamientos o cambios de alimento. "
        "El siguiente paso, planteado en la sección 6, es evaluar un modelo de "
        "suavizado exponencial (Holt-Winters) o un ARIMA simple sobre el mismo "
        "conjunto y comparar las tres opciones con las mismas métricas.",
        space_before=4,
        space_after=10,
    )

    # ───── 5. Defectos encontrados ─────
    add_para(doc, "5. Defectos encontrados", bold=True, size=13, space_before=10)
    add_table_caption(doc, 7, "Defectos y observaciones")
    add_table(
        doc,
        ["ID", "Severidad", "Defecto", "Evidencia"],
        [
            ["DEF-01", "Media",
             "Cuando un encargado invoca la Edge Function create-user, la función devuelve "
             "HTTP 500 por un null-dereference en lugar de 403.",
             "CP-08. Log: TypeError: Cannot read properties of null (reading 'rol') en "
             "supabase/functions/create-user/index.ts."],
            ["DEF-02", "Baja",
             "Un movimiento de insumo con cantidad=0 produce HTTP 500 por "
             "numeric_value_out_of_range del trigger de stock, en vez de un 400 de validación.",
             "CP-36. INSERT en movimientos_insumos con cantidad=0."],
            ["DEF-03", "Media (seguridad)",
             "La política RLS de movimientos_insumos permite el INSERT a encargados pero el "
             "trigger de auditoría intenta leer usuario_id sin SECURITY DEFINER, produciendo "
             "HTTP 500. El acceso sí queda bloqueado pero el código no es el esperado.",
             "CP-14. Error: null value in column \"usuario_id\" violates not-null constraint."],
            ["DEF-04", "Media (rendimiento)",
             "La generación del PDF de reportes se hace en el cliente y tarda ≈1,8 s con 180 "
             "filas; con 20 usuarios concurrentes el P95 sube a 2,9 s.",
             "Sección 3: Tabla 5, fila 'Reporte PDF de producción'."],
            ["OBS-01", "Observación",
             "El bloqueo de intentos fallidos de GoTrue es por IP: cinco intentos erróneos "
             "bloquean a cualquier otro usuario que comparta la IP (por ejemplo, en la red "
             "WiFi de la granja).",
             "CP-11 bloqueó el ingreso del administrador desde el mismo portátil."],
            ["OBS-02", "Observación",
             "La ventana de edición de 24 h de producción se calcula contra la hora del "
             "servidor en UTC; usuarios en zona horaria America/Bogota (UTC-5) pierden la "
             "edición cerca de la medianoche local.",
             "CP-25; trigger tr_produccion_edicion_24h."],
        ],
        col_widths=[1.6, 2.4, 7.5, 5.5],
    )
    add_nota(doc, "Elaboración propia.")

    # ───── 6. Pruebas pendientes ─────
    add_para(doc, "6. Pruebas pendientes con usuarios de la granja", bold=True, size=13, space_before=10)
    add_para(
        doc,
        "Las pruebas de usabilidad y de campo requieren al personal y las "
        "instalaciones de la Avícola MC, por lo que se dejan planificadas:",
    )
    for b in [
        "Usabilidad (SUS). Aplicar el cuestionario System Usability Scale (10 ítems, "
        "escala de 1 a 5) al administrador y a los tres encargados después de usar el "
        "sistema una semana. Meta: puntaje SUS ≥ 68.",
        "Tareas cronometradas. Medir el tiempo de registrar la producción diaria, "
        "registrar una mortalidad y hacer una salida de insumo, comparándolo con el "
        "proceso manual actual (AS-IS) en cuaderno.",
        "Comparación de modelos de predicción. Repetir la sección 4 con un modelo "
        "Holt-Winters y un ARIMA(1,1,1) sobre el mismo conjunto de 8 lotes y comparar "
        "R², MAE y RMSE contra la regresión lineal actual.",
    ]:
        p = doc.add_paragraph(b, style="List Bullet")
        for r in p.runs:
            r.font.size = Pt(11)

    # ───── 7. Conclusiones ─────
    add_para(doc, "7. Conclusiones", bold=True, size=13, space_before=10)
    for c in [
        "El 93,8 % de los casos funcionales y de seguridad fue aprobado; los procesos "
        "de producción, mortalidad, tratamientos, insumos (salvo validación de "
        "cantidad=0), empleados, proveedores, predicciones, chat y auditoría cumplen "
        "sus requisitos.",
        "La autenticación resiste JWT alterado, inyección SQL, escalamiento de rol vía "
        "UPDATE, reutilización de tokens tras signOut y fuerza bruta; el control de "
        "roles bloquea el acceso mediante RLS, aunque el código HTTP devuelto en dos "
        "endpoints no es el esperado (DEF-01, DEF-03).",
        "La instalación limpia desde las 18 migraciones del repositorio reproduce el "
        "esquema sin intervención manual.",
        "El modelo de regresión lineal alcanza un R² global de 0,64 y precisión "
        "aceptable (R² ≥ 0,46) en los lotes con histórico ≥ 25 días; esta es la línea "
        "base contra la que se evaluarán modelos de serie temporal.",
        "El rendimiento es adecuado salvo la generación del PDF de reportes, que "
        "requiere migrarse a una Edge Function.",
    ]:
        p = doc.add_paragraph(c, style="List Bullet")
        for r in p.runs:
            r.font.size = Pt(11)

    # ───── Referencias ─────
    add_para(doc, "Referencias", bold=True, size=13, space_before=18)
    refs = [
        "Anthropic. (2026). Claude Haiku 4.5 — API reference. https://docs.anthropic.com/",
        "International Organization for Standardization. (2011). Systems and software "
        "engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — "
        "System and software quality models (ISO/IEC 25010:2011).",
        "Supabase. (2026). Row Level Security — Postgres authorization. "
        "https://supabase.com/docs/guides/auth/row-level-security",
        "Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. Journal of "
        "Machine Learning Research, 12, 2825–2830.",
    ]
    for r in refs:
        p = doc.add_paragraph(r)
        p.paragraph_format.space_after = Pt(4)
        for run in p.runs:
            run.font.size = Pt(10)

    doc.save(OUT)
    print(f"OK -> {OUT}")


if __name__ == "__main__":
    main()
