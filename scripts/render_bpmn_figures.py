"""Dibuja las 7 figuras BPMN del documento de modelado."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from bpmn_renderer import BPMNCanvas

OUT = r"C:/Users/USUARIO/Desktop/sistema-avicola-mc/docs/diagramas"


# ============ Figura 1: AS-IS Produccion/Mortalidad manual ============
def fig1():
    c = BPMNCanvas("AS-IS 1. Registro manual de producción y mortalidad (proceso actual)",
                   lanes=["Encargado", "Administrador"], width=16, lane_h=2.2)
    s = c.start("Encargado", 1.1, "Fin de\njornada")
    t1 = c.task("Encargado", 2.6, "Recorrer jaulas\ny contar huevos", "user")
    t2 = c.task("Encargado", 4.6, "Anotar cifras\nen cuaderno", "manual")
    t3 = c.task("Encargado", 6.6, "Observar aves\nmuertas y causa", "user")
    t4 = c.task("Encargado", 8.6, "Anotar mortalidad\nen cuaderno", "manual")
    g1 = c.gateway("Encargado", 10.3, "¿Fin de semana?")
    e1 = c.end("Encargado", 11.6, "Día cerrado\nsin cruce")

    t5 = c.task("Administrador", 10.3, "Transcribir a\nhoja de cálculo", "manual")
    t6 = c.task("Administrador", 12.4, "Calcular totales\nmanualmente", "manual")
    g2 = c.gateway("Administrador", 14.0, "¿Coincide con\nventas?")
    e2 = c.end("Administrador", 15.3, "Sin evidencia\ntrazable")

    c.flow(s, t1); c.flow(t1, t2); c.flow(t2, t3); c.flow(t3, t4); c.flow(t4, g1)
    c.flow(g1, e1, label="No")
    c.flow(g1, t5, src_side="bottom", dst_side="top", label="Sí")
    c.flow(t5, t6); c.flow(t6, g2); c.flow(g2, e2, label="No")
    c.save(os.path.join(OUT, "fig1.png"))


# ============ Figura 2: AS-IS Inventario manual ============
def fig2():
    c = BPMNCanvas("AS-IS 2. Control de inventario de insumos y tratamientos (proceso actual)",
                   lanes=["Proveedor / Encargado", "Administrador"], width=18, lane_h=2.2)
    s = c.start("Proveedor / Encargado", 1.1, "Llega pedido\no uso insumo")
    t1 = c.task("Proveedor / Encargado", 3.1, "Entrega factura\nal administrador", "user")
    t2 = c.task("Proveedor / Encargado", 10.0, "Usar insumo\nsin registrar", "user")
    e1 = c.end("Proveedor / Encargado", 12.5, "Sin trazabilidad\nsanitaria")

    t3 = c.task("Administrador", 3.1, "Guarda factura\nen carpeta", "manual")
    g1 = c.gateway("Administrador", 5.3, "¿Recuerda\ncopiar?")
    t4 = c.task("Administrador", 7.5, "Copia a lista\nen papel", "manual")
    t5 = c.task("Administrador", 10.5, "Pide más al\nproveedor de memoria", "manual", w=2.0)
    e2 = c.end("Administrador", 13.0, "Stock real\ndesconocido")
    doc = c.document("Administrador", 15.0, "Lista en papel\naislada", y_off=0.1)

    c.flow(s, t1); c.flow(t1, t3, src_side="bottom", dst_side="top")
    c.flow(t3, g1); c.flow(g1, t4, label="Sí")
    c.flow(g1, t5, src_side="bottom", dst_side="bottom", label="No",
           bend=(7.5, c.lane_y["Administrador"] - 1.0))
    c.flow(t2, e1); c.flow(t4, t5); c.flow(t5, e2)
    c.ax.plot([t4[0] + 0.8, doc[0]], [t4[1] - 0.45, doc[1] + 0.3], color="#525252", linewidth=1.0, linestyle="--", zorder=4)
    c.save(os.path.join(OUT, "fig2.png"))


# ============ Figura 3: TO-BE 1 Produccion con ventana 24h ============
def fig3():
    c = BPMNCanvas("TO-BE 1. Registro diario de producción con ventana de edición de 24 h (SIAMC)",
                   lanes=["Encargado", "SIAMC (web + API)", "Base de datos"], width=22, lane_h=2.2)
    s = c.start("Encargado", 1.1, "Fin de\njornada")
    t1 = c.task("Encargado", 2.9, "Abrir módulo\nProducción", "user")
    t2 = c.task("Encargado", 5.0, "Seleccionar lote\nactivo y fecha", "user")
    t3 = c.task("Encargado", 7.1, "Ingresar buenos,\nrotos, pequeños", "user")
    t7 = c.task("Encargado", 17.5, "Edita si ≤24h\no es admin", "user")

    v1 = c.task("SIAMC (web + API)", 9.1, "Validar Zod y\nRLS del galpón", "system")
    g1 = c.gateway("SIAMC (web + API)", 11.0, "¿Duplicado\nlote+fecha?")
    v2 = c.task("SIAMC (web + API)", 13.0, "Insert con creado_por\ny fecha_registro", "system")
    v3 = c.task("SIAMC (web + API)", 15.3, "Trigger auditoría\nregistra diff", "system")
    v4 = c.task("SIAMC (web + API)", 17.5, "Refresca KPIs\n(TanStack Query)", "system")
    e1 = c.end("SIAMC (web + API)", 19.5, "Registro\npublicado")
    err = c.end("SIAMC (web + API)", 11.0, "Error\nconstraint", y_off=-1.05)

    db = c.datastore("Base de datos", 14.0, "produccion\n+ auditoria", y_off=0.1)

    c.flow(s, t1); c.flow(t1, t2); c.flow(t2, t3)
    c.flow(t3, v1, src_side="bottom", dst_side="top")
    c.flow(v1, g1); c.flow(g1, v2, label="No")
    c.flow(g1, err, src_side="bottom", dst_side="top", label="Sí")
    c.flow(v2, v3); c.flow(v3, v4); c.flow(v4, e1)
    c.ax.plot([v2[0], db[0]], [v2[1] - 0.45, db[1] + 0.3], color="#525252",
              linewidth=1.0, linestyle="--", zorder=4)
    c.flow(v4, t7, src_side="top", dst_side="bottom", label="≤24h")
    c.save(os.path.join(OUT, "fig3.png"))


# ============ Figura 4: TO-BE 2 Mortalidad ============
def fig4():
    c = BPMNCanvas("TO-BE 2. Registro de mortalidad con actualización automática del lote (SIAMC)",
                   lanes=["Encargado", "SIAMC (web + API)", "Administrador"], width=22, lane_h=2.2)
    s = c.start("Encargado", 1.1, "Detecta aves\nmuertas")
    t1 = c.task("Encargado", 2.9, "Abrir módulo\nMortalidad", "user")
    t2 = c.task("Encargado", 5.0, "Lote, causa\ny cantidad", "user")

    g1 = c.gateway("SIAMC (web + API)", 7.1, "¿Cantidad ≤\naves vivas?")
    err = c.end("SIAMC (web + API)", 7.1, "Error\nvalidación", y_off=-1.1)
    t3 = c.task("SIAMC (web + API)", 9.2, "Insert mortalidad\nen transacción", "system")
    t4 = c.task("SIAMC (web + API)", 11.5, "Trigger descuenta\nvivas del lote", "system")
    g2 = c.gateway("SIAMC (web + API)", 13.6, "¿Lote queda\nen cero?")
    t5 = c.task("SIAMC (web + API)", 15.7, "Proponer\nfinalizar lote", "system")
    g3 = c.gateway("SIAMC (web + API)", 17.6, "¿Supera\numbral?")
    t6 = c.task("SIAMC (web + API)", 19.6, "Emitir\nnotificación", "mail", w=1.6)
    e1 = c.end("SIAMC (web + API)", 21.0, "Registro\ncerrado", y_off=-1.05)

    n = c.task("Administrador", 19.6, "Revisa alerta\nen header", "user")

    c.flow(s, t1); c.flow(t1, t2); c.flow(t2, g1, src_side="bottom", dst_side="top")
    c.flow(g1, err, src_side="bottom", dst_side="top", label="No")
    c.flow(g1, t3, label="Sí"); c.flow(t3, t4); c.flow(t4, g2)
    c.flow(g2, t5, label="Sí"); c.flow(t5, g3)
    c.flow(g2, g3, src_side="bottom", dst_side="bottom", label="No",
           bend=(15.7, c.lane_y["SIAMC (web + API)"] - 1.0))
    c.flow(g3, t6, label="Sí"); c.flow(g3, e1, src_side="bottom", dst_side="top", label="No")
    c.flow(t6, n, src_side="bottom", dst_side="top")
    c.save(os.path.join(OUT, "fig4.png"))


# ============ Figura 5: TO-BE 3 Insumos por rol ============
def fig5():
    c = BPMNCanvas("TO-BE 3. Movimientos de inventario con separación por rol (SIAMC)",
                   lanes=["Administrador", "Encargado", "SIAMC (web + API)"], width=21, lane_h=2.2)
    s1 = c.start("Administrador", 1.1, "Llega\ninsumo")
    t1 = c.task("Administrador", 3.0, "Registrar entrada\n(proveedor, soporte)", "user")

    s2 = c.start("Encargado", 1.1, "Necesita\nsalida")
    t2 = c.task("Encargado", 3.0, "Registrar salida\na nombre propio", "user")

    v1 = c.task("SIAMC (web + API)", 5.3, "RLS valida rol\ny registrado_por", "system")
    t3 = c.task("SIAMC (web + API)", 7.6, "Insert movimiento\n+ recalcular stock", "system")
    g1 = c.gateway("SIAMC (web + API)", 9.7, "¿Stock\n≥ 0?")
    err = c.end("SIAMC (web + API)", 9.7, "Rollback\ntransacción", y_off=-1.05)
    t4 = c.task("SIAMC (web + API)", 11.9, "Confirmar\nmovimiento", "system")
    g2 = c.gateway("SIAMC (web + API)", 13.9, "¿Stock\n< mínimo?")
    t5 = c.task("SIAMC (web + API)", 16.3, "Notificar\nreposición", "mail", w=1.8)
    e1 = c.end("SIAMC (web + API)", 18.8, "Movimiento\ncerrado")

    c.flow(s1, t1); c.flow(s2, t2)
    c.flow(t1, v1, src_side="bottom", dst_side="top")
    c.flow(t2, v1, src_side="bottom", dst_side="top")
    c.flow(v1, t3); c.flow(t3, g1); c.flow(g1, err, src_side="bottom", dst_side="top", label="No")
    c.flow(g1, t4, label="Sí"); c.flow(t4, g2); c.flow(g2, t5, label="Sí"); c.flow(t5, e1)
    c.flow(g2, e1, src_side="bottom", dst_side="bottom", label="No",
           bend=(16.3, c.lane_y["SIAMC (web + API)"] - 1.0))
    c.save(os.path.join(OUT, "fig5.png"))


# ============ Figura 6: TO-BE 4 Tratamientos ============
def fig6():
    c = BPMNCanvas("TO-BE 4. Aplicación y seguimiento de tratamientos sanitarios (SIAMC)",
                   lanes=["Encargado / Admin", "SIAMC (web + API)", "Base de datos"],
                   width=21, lane_h=2.2)
    s = c.start("Encargado / Admin", 1.1, "Lote requiere\ntratamiento")
    t1 = c.task("Encargado / Admin", 3.1, "Registrar tipo,\nlote, insumo", "user")
    t2 = c.task("Encargado / Admin", 5.3, "Definir fechas\ny observaciones", "user")
    t7 = c.task("Encargado / Admin", 15.2, "Admin confirma\ncierre", "user")

    g1 = c.gateway("SIAMC (web + API)", 7.4, "¿Fechas e\ninsumo válido?")
    err = c.end("SIAMC (web + API)", 7.4, "Error\nvalidación", y_off=-1.1)
    v1 = c.task("SIAMC (web + API)", 9.6, "Insert estado\nactivo + salida", "system")
    v2 = c.task("SIAMC (web + API)", 11.9, "Mostrar días\ntranscurridos/restantes", "system")
    g2 = c.gateway("SIAMC (web + API)", 13.8, "¿Llegó\nfecha_fin?")
    v3 = c.task("SIAMC (web + API)", 17.5, "Estado finalizado\n(irreversible)", "system")
    e1 = c.end("SIAMC (web + API)", 19.5, "Historial\ndisponible")

    db = c.datastore("Base de datos", 10.8, "tratamientos +\nmovimientos", y_off=0.1)

    c.flow(s, t1); c.flow(t1, t2); c.flow(t2, g1, src_side="bottom", dst_side="top")
    c.flow(g1, err, src_side="bottom", dst_side="top", label="No")
    c.flow(g1, v1, label="Sí"); c.flow(v1, v2); c.flow(v2, g2)
    c.flow(g2, v2, src_side="top", dst_side="top", label="No",
           bend=(11.9, c.lane_y["SIAMC (web + API)"] + 0.9))
    c.flow(g2, t7, src_side="top", dst_side="bottom", label="Sí")
    c.flow(t7, v3, src_side="bottom", dst_side="top")
    c.flow(v3, e1); c.ax.plot([v1[0], db[0]], [v1[1] - 0.45, db[1] + 0.3],
                              color="#525252", linewidth=1.0, linestyle="--", zorder=4)
    c.save(os.path.join(OUT, "fig6.png"))


# ============ Figura 7: TO-BE 5 Predicciones + Reportes ============
def fig7():
    c = BPMNCanvas("TO-BE 5. Predicción de producción y generación de reportes PDF (SIAMC)",
                   lanes=["Administrador", "SIAMC (web + API)", "Base de datos"],
                   width=22, lane_h=2.2)
    s = c.start("Administrador", 1.1, "Necesita\nproyección")
    t1 = c.task("Administrador", 3.0, "Abrir módulo\nPredicciones", "user")
    t2 = c.task("Administrador", 5.2, "Elegir lote y\nhorizonte ≤30d", "user")
    g2 = c.gateway("Administrador", 13.0, "¿Exportar\nPDF?")
    t5 = c.task("Administrador", 15.6, "Elegir filtros\nde reporte", "user")
    e2 = c.end("Administrador", 20.6, "PDF\ndescargado")
    e3 = c.end("Administrador", 13.0, "Consulta\ncerrada", y_off=-1.05)

    v1 = c.task("SIAMC (web + API)", 7.4, "Consultar\nhistórico", "system")
    g1 = c.gateway("SIAMC (web + API)", 9.4, "¿≥7\nregistros?")
    v2 = c.task("SIAMC (web + API)", 11.5, "Regresión lineal\n+ R²", "system")
    err = c.end("SIAMC (web + API)", 9.4, "Datos\ninsuficientes", y_off=-1.05)
    v3 = c.task("SIAMC (web + API)", 18.2, "jsPDF + autoTable\ncon usuario y ts", "system")

    db = c.datastore("Base de datos", 7.4, "produccion\n(histórico)", y_off=0.1)

    c.flow(s, t1); c.flow(t1, t2); c.flow(t2, v1, src_side="bottom", dst_side="top")
    c.flow(v1, g1); c.flow(g1, err, src_side="bottom", dst_side="top", label="No")
    c.flow(g1, v2, label="Sí")
    c.flow(v2, g2, src_side="top", dst_side="bottom")
    c.flow(g2, e3, src_side="bottom", dst_side="top", label="No")
    c.flow(g2, t5, label="Sí"); c.flow(t5, v3, src_side="bottom", dst_side="top")
    c.flow(v3, e2, src_side="top", dst_side="bottom")
    c.ax.plot([v1[0], db[0]], [v1[1] - 0.45, db[1] + 0.3], color="#525252",
              linewidth=1.0, linestyle="--", zorder=4)
    c.save(os.path.join(OUT, "fig7.png"))


if __name__ == "__main__":
    for i, fn in enumerate([fig1, fig2, fig3, fig4, fig5, fig6, fig7], start=1):
        print(f"rendering fig{i}...")
        fn()
    print("done")
