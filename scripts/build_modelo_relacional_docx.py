"""Genera 'Modelo relacional.docx' siguiendo la estructura del documento guía."""
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT_PATH = Path(r"C:\Users\USUARIO\Desktop\sistema-avicola-mc\docs\Modelo relacional.docx")
IMG_DIR = Path(r"C:\Users\USUARIO\Desktop\sistema-avicola-mc\docs\img")


def set_cell_shading(cell, color_hex: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex)
    tc_pr.append(shd)


def set_cell_borders(cell):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        border = OxmlElement(f"w:{edge}")
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "4")
        border.set(qn("w:color"), "999999")
        tc_borders.append(border)
    tc_pr.append(tc_borders)


def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = "Times New Roman"
        run.font.color.rgb = RGBColor(0, 0, 0)
    return h


def add_paragraph(doc, text, bold=False, italic=False, align=None, size=12):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(6)
    return p


def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER

    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ""
        p = hdr[i].paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0, 0, 0)
        set_cell_shading(hdr[i], "D9D9D9")
        hdr[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = table.rows[ri + 1].cells[ci]
            cell.text = ""
            p = cell.paragraphs[0]
            run = p.add_run(str(val))
            run.font.name = "Times New Roman"
            run.font.size = Pt(10)
            if ri % 2 == 1:
                set_cell_shading(cell, "F2F2F2")

    if col_widths:
        for row in table.rows:
            for ci, w in enumerate(col_widths):
                row.cells[ci].width = w
    return table


def add_note(doc, text):
    p = doc.add_paragraph()
    r1 = p.add_run("Nota. ")
    r1.italic = True
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(10)
    r2 = p.add_run(text)
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(12)


def add_figure_caption(doc, number, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    r1 = p.add_run(f"Figura {number}\n")
    r1.bold = True
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(11)
    r2 = p.add_run(title)
    r2.italic = True
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(11)


def add_table_caption(doc, number, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    r1 = p.add_run(f"Tabla {number}\n")
    r1.bold = True
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(11)
    r2 = p.add_run(title)
    r2.italic = True
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(11)


def main():
    doc = Document()

    # Estilo global: Times New Roman 12
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(12)

    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)

    # ---------------- TÍTULO ----------------
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("MODELO RELACIONAL Y NO RELACIONAL")
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(14)

    add_paragraph(
        doc,
        "Proyecto: Sistema de Gestión Avícola MC — plataforma web para la administración "
        "integral de granjas avícolas (galpones, lotes, insumos, producción, mortalidad y "
        "tratamientos).",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    add_paragraph(
        doc,
        "Objetivo: Documentar la estructura de datos del sistema: el modelo relacional en "
        "PostgreSQL (Supabase) que guarda la información transaccional y el almacenamiento "
        "no relacional de objetos (Supabase Storage) donde se conservan los archivos "
        "binarios asociados al sistema.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )

    # ---------------- 1. Decisión ----------------
    add_heading(doc, "1. Decisión de modelo de datos", level=1)
    add_paragraph(
        doc,
        "La información que maneja una granja avícola es fuertemente estructurada y "
        "relacional: un galpón alberga lotes, cada lote pertenece a una raza y acumula "
        "registros diarios de producción, mortalidad y tratamientos; un insumo tiene stock "
        "que se afecta por movimientos de entrada y salida; un proveedor abastece insumos o "
        "razas específicos; una cuenta de usuario está asociada a un empleado y a un rol. "
        "Además, varias reglas de negocio deben garantizarse a nivel de datos (un único "
        "registro diario de producción por galpón, descuento automático de aves al "
        "registrar mortalidad, actualización automática de stock al registrar un "
        "movimiento, control de acceso por galpón según el rol del usuario). Por eso el "
        "núcleo es un modelo relacional en PostgreSQL 15+ (gestionado por Supabase), que "
        "asegura integridad referencial, restricciones y transacciones (Codd, 1970; "
        "Valderrey Sanz, 2013).",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    add_paragraph(
        doc,
        "Los archivos binarios (fotografías de avatar de los usuarios) no se almacenan en "
        "la base de datos sino en el almacenamiento no relacional de objetos de Supabase "
        "Storage (compatible con la API S3). La base de datos solo guarda la URL pública "
        "del objeto; el archivo se entrega al navegador a través del CDN de Supabase, lo "
        "que mantiene la base liviana y centraliza las políticas de acceso.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )

    add_table_caption(doc, 1, "Componentes de persistencia del Sistema Avícola MC")
    add_table(
        doc,
        ["Componente", "Tipo", "Tecnología", "Qué almacena"],
        [
            [
                "Base de datos transaccional",
                "Relacional",
                "PostgreSQL 15+ (Supabase)",
                "16 tablas: seguridad, empleados, operación avícola, inventario, producción, mortalidad, tratamientos, proveedores, configuración y auditoría",
            ],
            [
                "Autenticación",
                "Relacional (esquema reservado)",
                "Supabase Auth (auth.users)",
                "Credenciales, email, UUID y metadatos de los usuarios registrados",
            ],
            [
                "Almacenamiento de objetos",
                "No relacional (clave-objeto)",
                "Supabase Storage (API S3)",
                "Bucket avatars: imágenes de perfil de los usuarios",
            ],
            [
                "Sesión del navegador",
                "No relacional (memoria/cookie)",
                "JWT firmado por Supabase",
                "Token de acceso con vigencia corta y renovación automática",
            ],
        ],
    )
    add_note(doc, "Elaboración propia.")

    # ---------------- 2. Resumen ----------------
    add_heading(doc, "2. Resumen del modelo relacional", level=1)
    add_table_caption(doc, 2, "Distribución de las tablas por módulo")
    add_table(
        doc,
        ["Módulo", "Tablas", "Entidades", "Llaves foráneas"],
        [
            ["1. Seguridad, perfiles y empleados", "2", "perfiles, empleados", "2"],
            ["2. Operación avícola: galpones y lotes", "3", "galpones, lotes, razas", "3"],
            ["3. Inventario: insumos y movimientos", "2", "insumos, movimientos_insumos", "2"],
            [
                "4. Producción, mortalidad y tratamientos",
                "3",
                "produccion, mortalidad, tratamientos",
                "11",
            ],
            [
                "5. Proveedores y catálogos",
                "3",
                "proveedores, proveedores_insumos, proveedores_razas",
                "4",
            ],
            [
                "6. Configuración y auditoría",
                "4",
                "configuracion, auditoria, auditoria_produccion, auditoria_mortalidad",
                "4",
            ],
        ],
    )
    add_note(
        doc,
        "Elaboración propia a partir del esquema desplegado (install.sql) y las "
        "migraciones vigentes.",
    )

    add_paragraph(
        doc,
        "Normalización. Las tablas están en tercera forma normal: cada atributo depende "
        "solo de la llave primaria; los catálogos (razas, proveedores) y los dominios con "
        "valores finitos (estado, tipo, categoria, rol, causa) se controlan con "
        "restricciones CHECK para no repetir cadenas libres, y las relaciones muchos a "
        "muchos se resuelven con tablas intermedias (proveedores_insumos, "
        "proveedores_razas). Se desnormaliza a propósito en dos casos: "
        "lotes.cantidad_aves_actuales se actualiza por trigger al registrar mortalidad "
        "para evitar recalcular el saldo en cada consulta, e insumos.stock_actual se "
        "actualiza por trigger al registrar un movimiento para que el inventario esté "
        "siempre disponible sin agregar.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )
    add_paragraph(
        doc,
        "Integridad. Además de las llaves foráneas, el esquema define restricciones CHECK "
        "sobre dominios (razas.tipo en {ponedoras, engorde}; insumos.categoria en "
        "{alimento, medicamento, vacuna, desinfectante, herramienta, otro}; "
        "mortalidad.causa en {enfermedad, accidente, causa_desconocida, depredador, "
        "calor_frio_extremo, otra}; tratamientos.tipo en {vacunacion, medicacion, "
        "desparasitacion, vitaminas, antibiotico, otro}; galpones.estado en {disponible, "
        "en_produccion, en_mantenimiento}; perfiles.rol en {administrador, encargado}) y "
        "restricciones UNIQUE que implementan reglas de negocio: UNIQUE (fecha, "
        "galpon_id) en producción (un único registro de producción diario por galpón) e "
        "índices únicos parciales en empleados.telefono y empleados.documento_identidad "
        "(no se repiten cuando están presentes). Los triggers de dominio "
        "(fn_mortalidad_update_lote, fn_movimiento_update_stock, fn_sync_galpon_estado, "
        "fn_create_perfil_on_signup) y de auditoría global (fn_audit_trigger) registran "
        "todos los cambios sensibles. El Row Level Security (RLS) está habilitado en "
        "todas las tablas, con políticas que usan las funciones is_admin() y "
        "can_access_galpon(uuid) para restringir el acceso de los encargados a los "
        "galpones que tienen asignados.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    )

    # ---------------- 3. Diagramas ER ----------------
    add_heading(doc, "3. Diagramas entidad-relación por módulo", level=1)

    er_figures = [
        (1, "Modelo entidad-relación. Módulo 1. Seguridad, perfiles y empleados",
         "fig1_modulo1.png"),
        (2, "Modelo entidad-relación. Módulo 2. Operación avícola: galpones y lotes",
         "fig2_modulo2.png"),
        (3, "Modelo entidad-relación. Módulo 3. Inventario: insumos y movimientos",
         "fig3_modulo3.png"),
        (4, "Modelo entidad-relación. Módulo 4. Producción, mortalidad y tratamientos",
         "fig4_modulo4.png"),
        (5, "Modelo entidad-relación. Módulo 5. Proveedores y catálogos",
         "fig5_modulo5.png"),
        (6, "Modelo entidad-relación. Módulo 6. Configuración y auditoría",
         "fig6_modulo6.png"),
    ]
    for num, titulo, png in er_figures:
        add_figure_caption(doc, num, titulo)
        img_path = IMG_DIR / png
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        run.add_picture(str(img_path), width=Inches(6.3))
        add_note(
            doc,
            "Elaboración propia a partir del esquema de la base de datos. Notación pata "
            "de gallo.",
        )

    # ---------------- 4. Diccionario de tablas ----------------
    add_heading(doc, "4. Diccionario de tablas", level=1)

    modulos = [
        (
            "Módulo 1. Seguridad, perfiles y empleados",
            [
                [
                    "perfiles",
                    "Perfil de aplicación de cada usuario; extiende auth.users con rol, estado, nombre completo y empleado vinculado. Se crea automáticamente al registrar un usuario mediante el trigger fn_create_perfil_on_signup.",
                    "id",
                    "id → auth.users.id (ON DELETE CASCADE); empleado_id → empleados.id",
                ],
                [
                    "empleados",
                    "Catálogo del personal de la granja (nombre, documento, cargo, teléfono, fecha de ingreso). Puede existir sin tener cuenta de usuario asociada.",
                    "id",
                    "—",
                ],
            ],
        ),
        (
            "Módulo 2. Operación avícola: galpones y lotes",
            [
                [
                    "galpones",
                    "Instalaciones físicas donde se alojan las aves. Cada galpón tiene capacidad máxima, estado operativo y un encargado responsable.",
                    "id",
                    "encargado_id → perfiles.id",
                ],
                [
                    "lotes",
                    "Grupos de aves que ingresan al galpón en una fecha; conserva el saldo actual de aves y el estado del ciclo. El trigger fn_sync_galpon_estado sincroniza el estado del galpón con el del lote activo.",
                    "id",
                    "galpon_id → galpones.id (ON DELETE CASCADE); raza_id → razas.id",
                ],
                [
                    "razas",
                    "Catálogo de razas avícolas (ponedoras o engorde) con descripción.",
                    "id",
                    "—",
                ],
            ],
        ),
        (
            "Módulo 3. Inventario: insumos y movimientos",
            [
                [
                    "insumos",
                    "Catálogo de insumos (alimento, medicamento, vacuna, desinfectante, herramienta u otro) con unidad de medida, stock actual y stock mínimo para generar alertas.",
                    "id",
                    "—",
                ],
                [
                    "movimientos_insumos",
                    "Historial de entradas y salidas de insumos con destino o proveedor. El trigger fn_movimiento_update_stock actualiza automáticamente insumos.stock_actual.",
                    "id",
                    "insumo_id → insumos.id; registrado_por → perfiles.id",
                ],
            ],
        ),
        (
            "Módulo 4. Producción, mortalidad y tratamientos",
            [
                [
                    "produccion",
                    "Registro diario de huevos producidos y consumo de alimento por galpón; UNIQUE (fecha, galpon_id) evita duplicados.",
                    "id",
                    "galpon_id → galpones.id; lote_id → lotes.id; registrado_por → perfiles.id",
                ],
                [
                    "mortalidad",
                    "Registro de bajas de aves con causa tipificada. El trigger fn_mortalidad_update_lote descuenta las bajas de lotes.cantidad_aves_actuales.",
                    "id",
                    "galpon_id → galpones.id; lote_id → lotes.id; registrado_por → perfiles.id",
                ],
                [
                    "tratamientos",
                    "Vacunaciones, medicaciones, desparasitaciones, aplicaciones vitamínicas y antibióticas con rango de fechas, dosis, responsable, insumo consumido y empleado ejecutor.",
                    "id",
                    "galpon_id → galpones.id; lote_id → lotes.id; insumo_id → insumos.id; empleado_id → empleados.id (ON DELETE SET NULL)",
                ],
            ],
        ),
        (
            "Módulo 5. Proveedores y catálogos",
            [
                [
                    "proveedores",
                    "Proveedores de insumos o razas con datos de contacto; tipo_proveedor distingue si abastece insumos, razas, ambos u otro rubro.",
                    "id",
                    "—",
                ],
                [
                    "proveedores_insumos",
                    "Tabla intermedia (muchos a muchos) entre proveedores e insumos.",
                    "(proveedor_id, insumo_id)",
                    "proveedor_id → proveedores.id; insumo_id → insumos.id",
                ],
                [
                    "proveedores_razas",
                    "Tabla intermedia (muchos a muchos) entre proveedores y razas.",
                    "(proveedor_id, raza_id)",
                    "proveedor_id → proveedores.id; raza_id → razas.id",
                ],
            ],
        ),
        (
            "Módulo 6. Configuración y auditoría",
            [
                [
                    "configuracion",
                    "Configuración global del sistema en una única fila (id=1): datos de la granja, umbrales de producción y preferencias de notificación. Se almacena en columnas JSONB para flexibilidad.",
                    "id",
                    "—",
                ],
                [
                    "auditoria",
                    "Auditoría global de operaciones (INSERT, UPDATE, DELETE) sobre las tablas operativas; registra valor anterior y nuevo en JSONB. Alimentada por el trigger fn_audit_trigger.",
                    "id",
                    "—",
                ],
                [
                    "auditoria_produccion",
                    "Auditoría específica de ediciones a produccion con snapshot anterior y nuevo en JSONB.",
                    "id",
                    "produccion_id → produccion.id (ON DELETE CASCADE); editado_por → perfiles.id",
                ],
                [
                    "auditoria_mortalidad",
                    "Auditoría específica de ediciones a mortalidad con snapshot anterior y nuevo en JSONB.",
                    "id",
                    "mortalidad_id → mortalidad.id (ON DELETE CASCADE); editado_por → perfiles.id",
                ],
            ],
        ),
    ]
    for titulo, filas in modulos:
        add_heading(doc, titulo, level=2)
        add_table(doc, ["Tabla", "Descripción", "PK", "Llaves foráneas"], filas)
        doc.add_paragraph("")

    # ---------------- 5. Almacenamiento no relacional ----------------
    add_heading(doc, "5. Almacenamiento no relacional (Supabase Storage)", level=1)
    add_table_caption(doc, 3, "Buckets de almacenamiento de objetos")
    add_table(
        doc,
        ["Bucket", "Acceso", "Contenido", "Ruta típica del objeto"],
        [
            [
                "avatars",
                "Público (lectura por URL del CDN)",
                "Imágenes de perfil de los usuarios",
                "avatars/{uuid}.{ext}",
            ],
        ],
    )
    add_note(
        doc,
        "La URL pública del objeto se guarda en la columna perfiles.avatar_url. La "
        "escritura y eliminación requieren una sesión autenticada; la lectura es pública "
        "para que el navegador pueda cargar la imagen directamente desde el CDN de "
        "Supabase sin firmar URLs.",
    )

    # ---------------- Anexo A ----------------
    doc.add_page_break()
    add_heading(doc, "Anexo A. Diccionario de columnas", level=1)

    column_dict = [
        (
            "perfiles",
            "Perfil de aplicación de cada usuario; extiende auth.users.",
            [
                ("id", "UUID", "No", "PK, FK → auth.users.id (ON DELETE CASCADE)"),
                ("nombre_completo", "TEXT", "No", ""),
                ("email", "TEXT", "Sí", ""),
                ("rol", "TEXT", "No", "CHECK IN (administrador, encargado)"),
                ("estado", "TEXT", "No", "CHECK IN (activo, inactivo); default activo"),
                ("empleado_id", "UUID", "Sí", "FK → empleados.id"),
                ("ultimo_acceso", "TIMESTAMPTZ", "Sí", ""),
                ("avatar_url", "TEXT", "Sí", ""),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "empleados",
            "Catálogo del personal.",
            [
                ("id", "UUID", "No", "PK"),
                ("nombre_completo", "TEXT", "No", ""),
                ("documento_identidad", "TEXT", "Sí", "UQ parcial (no nulo ni vacío)"),
                ("cargo", "TEXT", "Sí", ""),
                ("telefono", "TEXT", "Sí", "UQ parcial (no nulo ni vacío)"),
                ("fecha_ingreso", "DATE", "Sí", ""),
                ("estado", "TEXT", "No", "CHECK IN (activo, inactivo); default activo"),
                ("notas", "TEXT", "Sí", ""),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "galpones",
            "Instalaciones físicas de alojamiento.",
            [
                ("id", "UUID", "No", "PK"),
                ("nombre", "TEXT", "No", ""),
                ("capacidad_maxima", "INTEGER", "No", ""),
                ("descripcion", "TEXT", "Sí", ""),
                (
                    "estado",
                    "TEXT",
                    "No",
                    "CHECK IN (disponible, en_produccion, en_mantenimiento); default disponible",
                ),
                ("encargado_id", "UUID", "Sí", "FK → perfiles.id"),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
                (
                    "updated_at",
                    "TIMESTAMPTZ",
                    "No",
                    "default NOW() (trigger trg_galpones_updated_at)",
                ),
            ],
        ),
        (
            "lotes",
            "Grupos de aves alojadas en un galpón.",
            [
                ("id", "UUID", "No", "PK"),
                ("nombre_numero", "TEXT", "No", ""),
                ("galpon_id", "UUID", "No", "FK → galpones.id (ON DELETE CASCADE)"),
                ("raza_id", "UUID", "Sí", "FK → razas.id"),
                ("cantidad_inicial_aves", "INTEGER", "No", ""),
                ("cantidad_aves_actuales", "INTEGER", "No", ""),
                ("fecha_ingreso", "DATE", "No", ""),
                ("fecha_salida", "DATE", "Sí", ""),
                ("estado", "TEXT", "No", "CHECK IN (activo, finalizado); default activo"),
                ("notas", "TEXT", "Sí", ""),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "razas",
            "Catálogo de razas avícolas.",
            [
                ("id", "UUID", "No", "PK"),
                ("nombre", "TEXT", "No", ""),
                ("tipo", "TEXT", "No", "CHECK IN (ponedoras, engorde)"),
                ("descripcion", "TEXT", "Sí", ""),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "insumos",
            "Catálogo de insumos con stock.",
            [
                ("id", "UUID", "No", "PK"),
                ("nombre", "TEXT", "No", ""),
                (
                    "categoria",
                    "TEXT",
                    "No",
                    "CHECK IN (alimento, medicamento, vacuna, desinfectante, herramienta, otro)",
                ),
                ("unidad_medida", "TEXT", "No", ""),
                ("stock_actual", "DECIMAL(10,2)", "Sí", "default 0"),
                ("stock_minimo", "DECIMAL(10,2)", "Sí", "default 0"),
                ("estado", "TEXT", "No", "CHECK IN (activo, inactivo); default activo"),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "movimientos_insumos",
            "Entradas y salidas de inventario.",
            [
                ("id", "UUID", "No", "PK"),
                ("fecha", "DATE", "No", ""),
                ("tipo", "TEXT", "No", "CHECK IN (entrada, salida)"),
                ("insumo_id", "UUID", "No", "FK → insumos.id"),
                ("cantidad", "DECIMAL(10,2)", "No", ""),
                ("destino_proveedor", "TEXT", "Sí", ""),
                ("observaciones", "TEXT", "Sí", ""),
                ("registrado_por", "UUID", "Sí", "FK → perfiles.id"),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "produccion",
            "Registro diario de producción por galpón.",
            [
                ("id", "UUID", "No", "PK"),
                ("fecha", "DATE", "No", "UQ (fecha, galpon_id)"),
                ("galpon_id", "UUID", "No", "FK → galpones.id; UQ (fecha, galpon_id)"),
                ("lote_id", "UUID", "No", "FK → lotes.id"),
                ("huevos_producidos", "INTEGER", "No", ""),
                ("consumo_alimento_kg", "DECIMAL(10,2)", "No", ""),
                ("porcentaje_postura", "DECIMAL(5,2)", "Sí", ""),
                ("observaciones", "TEXT", "Sí", ""),
                ("registrado_por", "UUID", "Sí", "FK → perfiles.id"),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "mortalidad",
            "Registro de bajas de aves.",
            [
                ("id", "UUID", "No", "PK"),
                ("fecha", "DATE", "No", ""),
                ("galpon_id", "UUID", "No", "FK → galpones.id"),
                ("lote_id", "UUID", "No", "FK → lotes.id"),
                ("cantidad_bajas", "INTEGER", "No", ""),
                (
                    "causa",
                    "TEXT",
                    "No",
                    "CHECK IN (enfermedad, accidente, causa_desconocida, depredador, calor_frio_extremo, otra)",
                ),
                ("causa_otra", "TEXT", "Sí", ""),
                ("observaciones", "TEXT", "Sí", ""),
                ("registrado_por", "UUID", "Sí", "FK → perfiles.id"),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "tratamientos",
            "Vacunaciones, medicaciones y aplicaciones sanitarias.",
            [
                ("id", "UUID", "No", "PK"),
                ("fecha_inicio", "DATE", "No", ""),
                ("fecha_fin", "DATE", "Sí", ""),
                ("galpon_id", "UUID", "No", "FK → galpones.id"),
                ("lote_id", "UUID", "No", "FK → lotes.id"),
                (
                    "tipo",
                    "TEXT",
                    "No",
                    "CHECK IN (vacunacion, medicacion, desparasitacion, vitaminas, antibiotico, otro)",
                ),
                ("nombre_producto", "TEXT", "No", ""),
                ("dosis_aplicacion", "TEXT", "No", ""),
                ("responsable", "TEXT", "No", ""),
                ("estado", "TEXT", "No", "CHECK IN (activo, finalizado); default activo"),
                ("observaciones", "TEXT", "Sí", ""),
                ("insumo_id", "UUID", "Sí", "FK → insumos.id"),
                ("cantidad_usada", "DECIMAL(10,2)", "Sí", ""),
                ("empleado_id", "UUID", "Sí", "FK → empleados.id (ON DELETE SET NULL)"),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
                (
                    "updated_at",
                    "TIMESTAMPTZ",
                    "No",
                    "default NOW() (trigger trg_tratamientos_updated_at)",
                ),
            ],
        ),
        (
            "proveedores",
            "Catálogo de proveedores externos.",
            [
                ("id", "UUID", "No", "PK"),
                ("nombre", "TEXT", "No", ""),
                ("telefono", "TEXT", "No", ""),
                ("correo", "TEXT", "Sí", ""),
                ("direccion", "TEXT", "Sí", ""),
                (
                    "tipo_proveedor",
                    "TEXT",
                    "No",
                    "CHECK IN (insumos, razas, ambos, otro)",
                ),
                ("estado", "TEXT", "No", "CHECK IN (activo, inactivo); default activo"),
                ("notas", "TEXT", "Sí", ""),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "proveedores_insumos",
            "Tabla intermedia proveedor ↔ insumo.",
            [
                (
                    "proveedor_id",
                    "UUID",
                    "No",
                    "PK compuesta; FK → proveedores.id (ON DELETE CASCADE)",
                ),
                (
                    "insumo_id",
                    "UUID",
                    "No",
                    "PK compuesta; FK → insumos.id (ON DELETE CASCADE)",
                ),
            ],
        ),
        (
            "proveedores_razas",
            "Tabla intermedia proveedor ↔ raza.",
            [
                (
                    "proveedor_id",
                    "UUID",
                    "No",
                    "PK compuesta; FK → proveedores.id (ON DELETE CASCADE)",
                ),
                ("raza_id", "UUID", "No", "PK compuesta; FK → razas.id (ON DELETE CASCADE)"),
            ],
        ),
        (
            "configuracion",
            "Configuración global del sistema (fila única id=1).",
            [
                ("id", "INTEGER", "No", "PK (siempre 1)"),
                ("granja", "JSONB", "Sí", "nombre, NIT, dirección, ciudad, teléfono, email"),
                (
                    "produccion",
                    "JSONB",
                    "Sí",
                    "umbrales de postura, alerta de mortalidad, peso del huevo, peso del saco",
                ),
                (
                    "notificaciones",
                    "JSONB",
                    "Sí",
                    "banderas de notificaciones habilitadas por tipo",
                ),
                ("updated_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "auditoria",
            "Auditoría global de operaciones.",
            [
                ("id", "UUID", "No", "PK"),
                ("tabla", "TEXT", "No", "nombre de la tabla afectada"),
                ("operacion", "TEXT", "No", "INSERT, UPDATE o DELETE"),
                ("registro_id", "TEXT", "Sí", "ID del registro afectado"),
                ("usuario_id", "UUID", "Sí", "auth.uid() al momento de la operación"),
                ("usuario_nombre", "TEXT", "Sí", "perfiles.nombre_completo"),
                ("datos_anteriores", "JSONB", "Sí", "snapshot anterior"),
                ("datos_nuevos", "JSONB", "Sí", "snapshot nuevo"),
                ("descripcion", "TEXT", "Sí", ""),
                ("created_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "auditoria_produccion",
            "Auditoría específica de producción.",
            [
                ("id", "UUID", "No", "PK"),
                (
                    "produccion_id",
                    "UUID",
                    "No",
                    "FK → produccion.id (ON DELETE CASCADE)",
                ),
                ("editado_por", "UUID", "No", "FK → perfiles.id"),
                ("datos_anteriores", "JSONB", "No", ""),
                ("datos_nuevos", "JSONB", "No", ""),
                ("editado_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
        (
            "auditoria_mortalidad",
            "Auditoría específica de mortalidad.",
            [
                ("id", "UUID", "No", "PK"),
                (
                    "mortalidad_id",
                    "UUID",
                    "No",
                    "FK → mortalidad.id (ON DELETE CASCADE)",
                ),
                ("editado_por", "UUID", "No", "FK → perfiles.id"),
                ("datos_anteriores", "JSONB", "No", ""),
                ("datos_nuevos", "JSONB", "No", ""),
                ("editado_at", "TIMESTAMPTZ", "No", "default NOW()"),
            ],
        ),
    ]

    for tabla, descripcion, columnas in column_dict:
        p = doc.add_paragraph()
        r1 = p.add_run(f"{tabla} — ")
        r1.bold = True
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(11)
        r2 = p.add_run(descripcion)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(11)
        add_table(doc, ["Columna", "Tipo", "Nulo", "Llave"], columnas)
        doc.add_paragraph("")

    # ---------------- Referencias ----------------
    add_heading(doc, "Referencias", level=1)
    refs = [
        "Codd, E. F. (1970). A relational model of data for large shared data banks. "
        "Communications of the ACM, 13(6), 377–387. "
        "https://doi.org/10.1145/362384.362685",
        "Valderrey Sanz, P. (2013). Administración de sistemas gestores de bases de "
        "datos. Ecoe Ediciones.",
        "Supabase Inc. (2024). PostgreSQL database and Row Level Security documentation. "
        "https://supabase.com/docs",
    ]
    for ref in refs:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-1.27)
        r = p.add_run(ref)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT_PATH)
    print(f"OK -> {OUT_PATH}")


if __name__ == "__main__":
    main()
