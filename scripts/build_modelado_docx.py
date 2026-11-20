"""Genera docs/Modelado del proceso - SIAMC.docx siguiendo formato APA del documento de referencia."""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

FONT = "Arial"
SIZE_BODY = Pt(11)
SIZE_HEADING = Pt(12)
SIZE_NOTA = Pt(9)


def set_run(run, size=SIZE_BODY, bold=False, italic=False):
    run.font.name = FONT
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rFonts.set(qn(attr), FONT)
    run.font.size = size
    run.bold = bold
    run.italic = italic


def add_para(doc, text, *, size=SIZE_BODY, bold=False, italic=False, align=None, space_after=Pt(6)):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = space_after
    p.paragraph_format.space_before = Pt(0)
    r = p.add_run(text)
    set_run(r, size=size, bold=bold, italic=italic)
    return p


def add_mixed(doc, parts, *, align=None, space_after=Pt(6)):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = space_after
    p.paragraph_format.space_before = Pt(0)
    for text, bold, italic, size in parts:
        r = p.add_run(text)
        set_run(r, size=size or SIZE_BODY, bold=bold, italic=italic)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run("•  ")
    set_run(r)
    r2 = p.add_run(text)
    set_run(r2)
    return p


def set_cell_borders(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{edge}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), "4")
        b.set(qn("w:space"), "0")
        b.set(qn("w:color"), "000000")
        tcBorders.append(b)
    tcPr.append(tcBorders)


def fill_cell(cell, text, *, bold=False, italic=False, size=SIZE_BODY, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    r = p.add_run(text)
    set_run(r, size=size, bold=bold, italic=italic)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_cell_borders(cell)


def add_table(doc, header, rows, *, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(header))
    table.autofit = False
    for i, h in enumerate(header):
        fill_cell(table.rows[0].cells[i], h, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    for r_idx, row in enumerate(rows, start=1):
        for c_idx, val in enumerate(row):
            fill_cell(table.rows[r_idx].cells[c_idx], val)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = w
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


DIAG_DIR = r"C:/Users/USUARIO/Desktop/sistema-avicola-mc/docs/diagramas"


def add_figure_image(doc, filename, width_cm=15):
    import os
    path = os.path.join(DIAG_DIR, filename)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run()
    run.add_picture(path, width=Cm(width_cm))


# ============ DOCUMENT ============
doc = Document()

# page: letter, APA margins 2.54cm
for section in doc.sections:
    section.page_height = Cm(27.94)
    section.page_width = Cm(21.59)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)

# Normal style default
style = doc.styles["Normal"]
style.font.name = FONT
style.font.size = SIZE_BODY

# Title
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("MODELADO DE PROCESOS")
set_run(r, bold=True)

# Header meta
add_mixed(doc, [
    ("Proyecto: ", True, False, SIZE_BODY),
    ("Desarrollo de un sistema web para la gestión avícola de granjas productoras de huevo con registro de producción, control sanitario, inventario de insumos y predicción de rendimiento — Sistema Avícola MC (SIAMC).", False, False, SIZE_BODY),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY)

add_mixed(doc, [
    ("Asignatura: ", True, False, SIZE_BODY),
    ("Proyecto Integrador.", False, False, SIZE_BODY),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY)

add_mixed(doc, [
    ("Objetivo: ", True, False, SIZE_BODY),
    ("Representar los procesos de la granja avícola tal como se realizan hoy (AS-IS) y como quedan soportados por SIAMC (TO-BE), para identificar los puntos de mejora, los actores y las reglas de negocio que el sistema debe implementar.", False, False, SIZE_BODY),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY)

# 1. Notación
add_para(doc, "1. Notación y alcance", size=SIZE_HEADING, bold=True, space_after=Pt(6))
add_para(doc,
    "Los diagramas siguen la notación BPMN 2.0: cada carril (lane) corresponde a un actor o componente; los círculos verdes son eventos de inicio (con reloj si los dispara el tiempo), los círculos rojos son eventos de fin, los rombos son compuertas exclusivas (X) y los rectángulos redondeados son tareas. El color de la tarea indica quién la realiza: azul para tareas de usuario, verde para tareas del sistema, amarillo para tareas programadas o notificaciones y rojo para tareas de validación crítica. El cilindro representa los datos que se guardan en la base de datos de Supabase (PostgreSQL con RLS), y la línea discontinua indica asociación de datos.",
    align=WD_ALIGN_PARAGRAPH.JUSTIFY)
add_para(doc,
    "Se modelan dos procesos actuales (AS-IS), que son los que originan el problema, y cinco procesos propuestos (TO-BE), que corresponden a los módulos de SIAMC. La Tabla 1 resume el inventario de procesos.",
    align=WD_ALIGN_PARAGRAPH.JUSTIFY)

# Tabla 1
add_para(doc, "Tabla 1", bold=True, space_after=Pt(0))
add_para(doc, "Inventario de procesos modelados", italic=True, space_after=Pt(3))

add_table(
    doc,
    header=["Código", "Proceso", "Tipo", "Actores", "Módulo de SIAMC", "Requisitos"],
    rows=[
        ["P1", "Registro diario de producción de huevos", "Misional", "Encargado, administrador, sistema", "Producción", "RF01, RF02, RF08, RF09"],
        ["P2", "Registro de mortalidad y actualización del lote", "Misional", "Encargado, administrador, sistema", "Mortalidad / Lotes", "RF03, RF10, RF11"],
        ["P3", "Movimientos de inventario de insumos", "Apoyo (inventario)", "Encargado, administrador, sistema", "Insumos", "RF04, RF12, RF13, RF14"],
        ["P4", "Aplicación y seguimiento de tratamientos sanitarios", "Apoyo (sanidad)", "Encargado, administrador, sistema", "Tratamientos", "RF05, RF15"],
        ["P5", "Predicción de producción y generación de reportes", "Misional", "Administrador, sistema", "Predicciones / Reportes", "RF06, RF07, RF16"],
    ],
    col_widths=[Cm(1.5), Cm(4.5), Cm(2.3), Cm(3.5), Cm(2.8), Cm(2.8)],
)

add_mixed(doc, [
    ("Nota.", False, True, SIZE_NOTA),
    (" Elaboración propia. Los códigos RF corresponden al documento de requisitos funcionales de SIAMC.", False, False, SIZE_NOTA),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=Pt(12))

# 2. AS-IS
add_para(doc, "2. Procesos actuales (AS-IS)", size=SIZE_HEADING, bold=True)

add_para(doc, "Figura 1", bold=True, space_after=Pt(0))
add_para(doc, "AS-IS 1. Registro manual de producción y mortalidad", italic=True, space_after=Pt(3))
add_figure_image(doc, "fig1.png")
add_mixed(doc, [
    ("Nota.", False, True, SIZE_NOTA),
    (" Elaboración propia con base en la observación del proceso en la granja.", False, False, SIZE_NOTA),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=Pt(6))
add_para(doc,
    "El encargado del galpón recorre las jaulas al final del día, cuenta los huevos por bandeja y anota las cifras en un cuaderno junto con las aves muertas y la causa aparente. Al final de la semana, el administrador transcribe los datos a una hoja de cálculo para calcular totales. No hay validación de doble registro, ni ventana de edición, ni cruce automático con el inventario del lote: si el encargado olvida un día o anota una cifra errada, el administrador no se entera hasta que compara la hoja con lo que vendió, y para entonces los huevos ya salieron de la granja sin trazabilidad.",
    align=WD_ALIGN_PARAGRAPH.JUSTIFY)

add_para(doc, "Figura 2", bold=True, space_after=Pt(0))
add_para(doc, "AS-IS 2. Control de inventario de insumos y tratamientos", italic=True, space_after=Pt(3))
add_figure_image(doc, "fig2.png")
add_mixed(doc, [
    ("Nota.", False, True, SIZE_NOTA),
    (" Elaboración propia con base en la observación del proceso en la granja.", False, False, SIZE_NOTA),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=Pt(6))
add_para(doc,
    "Las entradas de alimento, vacunas y medicamentos quedan anotadas en la factura del proveedor y, cuando el administrador se acuerda, se copian a una lista en papel. Las salidas (consumo diario de alimento, aplicación de tratamientos) no se registran: se asume que el bulto se acaba cuando se acaba. El resultado es que la granja no sabe el stock real, no puede justificar cuándo se aplicó un tratamiento ni a qué lote, y los pedidos al proveedor se hacen de memoria.",
    align=WD_ALIGN_PARAGRAPH.JUSTIFY)

add_para(doc, "Problemas identificados en el AS-IS", bold=True, space_after=Pt(3))
for b in [
    "Información dispersa en cuadernos y hojas de cálculo que no se cruzan (producción, mortalidad, inventario, tratamientos).",
    "Sin validación de registros duplicados por lote y fecha; sin ventana de edición controlada.",
    "Stock de insumos desconocido en tiempo real; pedidos al proveedor basados en memoria.",
    "Trazabilidad sanitaria inexistente: no hay evidencia fechada de qué tratamiento se aplicó, a qué lote, por quién.",
    "Transcripción manual semanal, con riesgo de errores y sin bitácora de quién modificó qué.",
    "Imposibilidad de proyectar la producción futura por falta de histórico estructurado.",
]:
    add_bullet(doc, b)

# 3. TO-BE
add_para(doc, "3. Procesos propuestos con SIAMC (TO-BE)", size=SIZE_HEADING, bold=True, space_after=Pt(6))

tobe = [
    (
        "Figura 3",
        "TO-BE 1. Registro diario de producción con ventana de edición de 24 h",
        "Elaboración propia. Implementado en ProduccionForm.jsx, ProduccionList.jsx y los triggers de la tabla produccion.",
        "El encargado abre el módulo de Producción, selecciona el lote activo y la fecha, e ingresa cantidades por categoría (buenos, rotos, pequeños, deformes). SIAMC valida en el cliente con react-hook-form + Zod y en el servidor con reglas RLS que el usuario pueda acceder al galpón del lote. Al guardar, el registro queda con creado_por y fecha_registro; durante las siguientes 24 horas el mismo encargado o un administrador puede editarlo, después de esa ventana solo el administrador puede modificarlo y cada cambio se envía al log de auditoría con el diff antes/después. El dashboard actualiza los KPIs animados y la gráfica de producción al instante vía TanStack Query.",
        "una sola producción por lote y fecha (constraint único); no se permiten fechas futuras; la edición queda bloqueada para el encargado 24 h después de fecha_registro; todo cambio queda en auditoria con usuario, operación y diff.",
    ),
    (
        "Figura 4",
        "TO-BE 2. Registro de mortalidad con actualización automática del lote",
        "Elaboración propia. Implementado en MortalidadForm.jsx y los triggers de la tabla mortalidad.",
        "El encargado registra las aves muertas del día indicando el lote, la cantidad y la causa (enfermedad, accidente, causa_desconocida, depredador, calor_frio_extremo, otra). SIAMC descuenta la cantidad del contador vivo del lote mediante un trigger SECURITY DEFINER que sortea RLS, y si el lote queda en cero propone marcarlo como finalizado. El sistema emite una notificación en la categoría mortalidad cuando la mortalidad diaria supera el umbral configurado por el administrador en el módulo de Configuración.",
        "la cantidad no puede exceder las aves vivas del lote; la causa es obligatoria y debe pertenecer al dominio cerrado; el descuento del lote y el registro en auditoría ocurren en la misma transacción; la alerta de umbral se dispara en el frontend al recibir el evento de TanStack Query.",
    ),
    (
        "Figura 5",
        "TO-BE 3. Movimientos de inventario de insumos con separación por rol",
        "Elaboración propia. Implementado en MovimientoForm.jsx, InsumosList.jsx y las políticas RLS de movimientos_insumos.",
        "El administrador registra entradas al inventario indicando insumo, cantidad, proveedor y documento soporte; el encargado solo puede registrar salidas y únicamente a nombre propio (registrado_por = auth.uid()). Un trigger de la tabla recalcula el stock del insumo en la misma transacción. Si una salida dejaría el stock en negativo, la transacción se aborta y el formulario muestra el error. Cuando el stock cae por debajo del mínimo definido en el insumo, el sistema genera una notificación en la categoría sistema para el administrador.",
        "entradas solo las registra administrador (política RLS); salidas solo el usuario autenticado y a nombre propio; stock resultante nunca negativo; cada movimiento queda en auditoría con cantidad, saldo anterior y saldo nuevo.",
    ),
    (
        "Figura 6",
        "TO-BE 4. Aplicación y seguimiento de tratamientos sanitarios",
        "Elaboración propia. Implementado en TratamientoForm.jsx, TratamientoDetalle.jsx y la tabla tratamientos.",
        "El encargado o administrador registra el tratamiento (vacunación, medicación, desparasitación, vitaminas, antibiótico u otro) indicando lote, insumo aplicado, fecha de inicio, fecha de finalización planificada y observaciones. Mientras el tratamiento esté en estado activo, el detalle muestra los días transcurridos y los días restantes. Al llegar la fecha de finalización, el sistema sugiere al administrador cerrarlo; una vez cerrado pasa a finalizado y queda disponible para auditorías sanitarias. El movimiento del insumo asociado se registra en paralelo como salida de inventario.",
        "fecha_fin >= fecha_inicio; el insumo del tratamiento debe pertenecer a una categoría sanitaria (medicamento, vacuna, desinfectante); el cierre del tratamiento es irreversible y queda en auditoría.",
    ),
    (
        "Figura 7",
        "TO-BE 5. Predicción de producción y generación de reportes PDF",
        "Elaboración propia. Implementado en Predicciones.jsx, lib/estadistica.js y Reportes.jsx.",
        "El administrador elige el lote y el horizonte de días a proyectar. SIAMC consulta el histórico de producción del lote, aplica regresión lineal simple sobre la serie temporal y devuelve la proyección junto con el coeficiente de determinación (R²) para que el usuario interprete la confianza del pronóstico. Desde el módulo de Reportes el administrador exporta a PDF (jsPDF + autoTable) con filtros por rango de fecha, lote o módulo (producción, mortalidad, insumos, tratamientos). El PDF incluye encabezado con el nombre del usuario que lo generó y marca de tiempo.",
        "la proyección requiere al menos 7 registros de producción del lote; el horizonte máximo es 30 días; los reportes solo los puede exportar un usuario autenticado y respetan RLS (un encargado solo exporta datos de sus galpones).",
    ),
]

fig_files = {"Figura 3": "fig3.png", "Figura 4": "fig4.png", "Figura 5": "fig5.png", "Figura 6": "fig6.png", "Figura 7": "fig7.png"}
for fig, titulo, nota, descripcion, reglas in tobe:
    add_para(doc, fig, bold=True, space_after=Pt(0))
    add_para(doc, titulo, italic=True, space_after=Pt(3))
    add_figure_image(doc, fig_files[fig])
    add_mixed(doc, [
        ("Nota.", False, True, SIZE_NOTA),
        (f" {nota}", False, False, SIZE_NOTA),
    ], align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=Pt(6))
    add_mixed(doc, [
        ("Descripción. ", True, False, SIZE_BODY),
        (descripcion, False, False, SIZE_BODY),
    ], align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    add_mixed(doc, [
        ("Reglas de negocio: ", True, False, SIZE_BODY),
        (reglas, False, False, SIZE_BODY),
    ], align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=Pt(12))

# 4. Comparación
add_para(doc, "4. Comparación AS-IS frente a TO-BE", size=SIZE_HEADING, bold=True, space_after=Pt(6))

add_para(doc, "Tabla 2", bold=True, space_after=Pt(0))
add_para(doc, "Cambios introducidos por SIAMC en cada proceso", italic=True, space_after=Pt(3))

add_table(
    doc,
    header=["Aspecto", "Proceso actual (AS-IS)", "Proceso con SIAMC (TO-BE)"],
    rows=[
        ["Registro de producción", "Cuaderno al final del día, transcripción semanal", "Formulario validado por lote y fecha, con ventana de edición de 24 h"],
        ["Doble registro de producción", "Posible, nadie lo detecta", "Bloqueado por constraint único (lote, fecha)"],
        ["Mortalidad", "Anotada en papel, sin cruce con el lote", "Descuento automático del lote y notificación por umbral"],
        ["Trazabilidad sanitaria", "Inexistente", "Tratamiento con lote, insumo, fechas y responsable, auditado"],
        ["Inventario de insumos", "Lista en papel, salidas no registradas", "Entradas (admin) y salidas (encargado) con stock recalculado por trigger"],
        ["Separación de responsabilidades", "No existe, cualquiera anota todo", "Políticas RLS: entradas solo admin, salidas solo a nombre propio"],
        ["Pedidos al proveedor", "De memoria", "Alertas automáticas al cruzar el stock mínimo"],
        ["Proyección de producción", "Imposible por falta de histórico", "Regresión lineal con R² sobre el histórico del lote"],
        ["Auditoría", "No existe", "Log con diff antes/después para cada operación sensible"],
        ["Reportes", "Hoja de cálculo manual", "PDF filtrable por rango, lote o módulo con marca de usuario y fecha"],
    ],
    col_widths=[Cm(4.5), Cm(5.5), Cm(6.5)],
)

add_mixed(doc, [
    ("Nota.", False, True, SIZE_NOTA),
    (" Elaboración propia.", False, False, SIZE_NOTA),
], align=WD_ALIGN_PARAGRAPH.JUSTIFY)

out = r"C:/Users/USUARIO/Desktop/sistema-avicola-mc/docs/Modelado del proceso - SIAMC.docx"
doc.save(out)
print("saved:", out)
