"""Dibuja diagramas ER por módulo imitando el estilo del documento guía."""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

OUT_DIR = Path(r"C:\Users\USUARIO\Desktop\sistema-avicola-mc\docs\img")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Paleta guide
HEADER_FILL = "#1F3864"
HEADER_TEXT = "#FFFFFF"
BODY_FILL = "#DEE6F2"
BORDER = "#1F3864"
EXT_HEADER = "#7F7F7F"
EXT_BODY = "#D9D9D9"
LINE_COLOR = "#1F3864"
TAG_COLOR = "#1F3864"

ROW_H = 0.22
HEADER_H = 0.32
PAD_TOP = 0.04
PAD_BOT = 0.06
TAG_W = 0.3


def draw_entity(ax, x, y, w, title, cols, external=False):
    """
    cols: list of dicts {tag:'PK|FK|UQ|', name:'nombre', type:'int', nn:True|False}
    """
    body_h = HEADER_H + PAD_TOP + max(len(cols), 1) * ROW_H + PAD_BOT
    hf = EXT_HEADER if external else HEADER_FILL
    bf = EXT_BODY if external else BODY_FILL

    # body
    ax.add_patch(Rectangle((x, y - body_h), w, body_h,
                           facecolor=bf, edgecolor=BORDER, linewidth=1.0, zorder=2))
    # header
    ax.add_patch(Rectangle((x, y - HEADER_H), w, HEADER_H,
                           facecolor=hf, edgecolor=BORDER, linewidth=1.0, zorder=3))
    ax.text(x + w / 2, y - HEADER_H / 2, title,
            ha="center", va="center", color=HEADER_TEXT,
            fontsize=8.5, fontweight="bold", zorder=4)

    # columns
    cy = y - HEADER_H - PAD_TOP - ROW_H / 2
    row_entries = []
    for c in cols:
        tag = c.get("tag", "")
        name = c.get("name", "")
        tipo = c.get("type", "")
        nn = c.get("nn", False)

        if tag:
            ax.text(x + 0.06, cy, tag, ha="left", va="center",
                    fontsize=6.5, color=TAG_COLOR, fontweight="bold", zorder=4,
                    family="DejaVu Sans")
        label = name + (" *" if nn else "")
        ax.text(x + TAG_W + 0.04, cy, label, ha="left", va="center",
                fontsize=7, zorder=4, family="DejaVu Sans")
        ax.text(x + w - 0.08, cy, tipo, ha="right", va="center",
                fontsize=6.5, color="#555555", zorder=4,
                family="DejaVu Sans", style="italic")
        row_entries.append({"name": name, "y": cy})
        cy -= ROW_H

    return {
        "x": x, "y": y, "w": w, "h": body_h,
        "cx": x + w / 2, "cy": y - body_h / 2,
        "left": x, "right": x + w, "top": y, "bottom": y - body_h,
        "rows": row_entries,
    }


def row_y(ent, col_name):
    for r in ent["rows"]:
        if r["name"] == col_name:
            return r["y"]
    return ent["cy"]


def one_marker(ax, x, y, side):
    """Doble barra justo FUERA del lado indicado."""
    s = 0.06
    gap = 0.03
    if side == "right":
        for dx in (gap, gap + s):
            ax.plot([x + dx, x + dx], [y - 0.07, y + 0.07],
                    color=LINE_COLOR, linewidth=1.2, zorder=5)
    elif side == "left":
        for dx in (-gap, -gap - s):
            ax.plot([x + dx, x + dx], [y - 0.07, y + 0.07],
                    color=LINE_COLOR, linewidth=1.2, zorder=5)
    elif side == "top":
        for dy in (gap, gap + s):
            ax.plot([x - 0.07, x + 0.07], [y + dy, y + dy],
                    color=LINE_COLOR, linewidth=1.2, zorder=5)
    elif side == "bottom":
        for dy in (-gap, -gap - s):
            ax.plot([x - 0.07, x + 0.07], [y + dy, y + dy],
                    color=LINE_COLOR, linewidth=1.2, zorder=5)


def many_marker(ax, x, y, side):
    """Pata de gallo: 3 líneas cortas que divergen DESDE la línea HACIA la entidad.
    Punto de encuentro de las 3 patas = extremo de la línea (lejos de la caja).
    Patas terminan en el borde de la caja, abriéndose a los lados."""
    s = 0.18
    gap = 0.015
    spread = 0.12
    lw = 1.1
    if side == "right":
        join_x = x + gap + s
        tip_x = x + gap
        for ty in (-spread, 0, spread):
            ax.plot([join_x, tip_x], [y, y + ty], color=LINE_COLOR, linewidth=lw, zorder=5)
    elif side == "left":
        join_x = x - gap - s
        tip_x = x - gap
        for ty in (-spread, 0, spread):
            ax.plot([join_x, tip_x], [y, y + ty], color=LINE_COLOR, linewidth=lw, zorder=5)
    elif side == "top":
        join_y = y + gap + s
        tip_y = y + gap
        for tx in (-spread, 0, spread):
            ax.plot([x, x + tx], [join_y, tip_y], color=LINE_COLOR, linewidth=lw, zorder=5)
    elif side == "bottom":
        join_y = y - gap - s
        tip_y = y - gap
        for tx in (-spread, 0, spread):
            ax.plot([x, x + tx], [join_y, tip_y], color=LINE_COLOR, linewidth=lw, zorder=5)


_DIR2SIDE = {"left": "left", "right": "right", "up": "top", "down": "bottom"}


def connect(ax, p1, dir1, c1, p2, dir2, c2):
    """
    p1,p2: (x,y) anclado en el borde correspondiente de la entidad.
    dir1,dir2: 'left','right','up','down' — hacia dónde sale la línea.
    c1,c2: 'one' | 'many'.
    """
    x1, y1 = p1
    x2, y2 = p2
    gap = 0.22  # separación línea-caja (coincide con join point del marker)

    def start(x, y, d):
        if d == "right": return (x + gap, y)
        if d == "left":  return (x - gap, y)
        if d == "up":    return (x, y + gap)
        if d == "down":  return (x, y - gap)

    sx1, sy1 = start(x1, y1, dir1)
    sx2, sy2 = start(x2, y2, dir2)

    if dir1 in ("left", "right") and dir2 in ("left", "right"):
        mid = (sx1 + sx2) / 2
        ax.plot([sx1, mid, mid, sx2], [sy1, sy1, sy2, sy2],
                color=LINE_COLOR, linewidth=1.0, zorder=1)
    elif dir1 in ("up", "down") and dir2 in ("up", "down"):
        mid = (sy1 + sy2) / 2
        ax.plot([sx1, sx1, sx2, sx2], [sy1, mid, mid, sy2],
                color=LINE_COLOR, linewidth=1.0, zorder=1)
    else:
        if dir1 in ("left", "right"):
            ax.plot([sx1, sx2, sx2], [sy1, sy1, sy2], color=LINE_COLOR, linewidth=1.0, zorder=1)
        else:
            ax.plot([sx1, sx1, sx2], [sy1, sy2, sy2], color=LINE_COLOR, linewidth=1.0, zorder=1)

    s1 = _DIR2SIDE[dir1]
    s2 = _DIR2SIDE[dir2]
    (one_marker if c1 == "one" else many_marker)(ax, x1, y1, s1)
    (one_marker if c2 == "one" else many_marker)(ax, x2, y2, s2)


def side_point(ent, side, row_name=None):
    if row_name is not None:
        y = row_y(ent, row_name)
    else:
        y = ent["cy"]
    if side == "left":
        return (ent["left"], y)
    if side == "right":
        return (ent["right"], y)
    if side == "top":
        return (ent["cx"], ent["top"])
    if side == "bottom":
        return (ent["cx"], ent["bottom"])


def add_module_title(ax, text):
    ax.text(0.1, 0.985, text, transform=ax.transAxes,
            ha="left", va="top", fontsize=11, fontweight="bold")


def add_legend(ax):
    txt1 = ("PK: llave primaria  ·  FK: llave foránea  ·  UQ: valor único  ·  "
            "* obligatorio (NOT NULL)  ·  tablas en gris: definidas en otro módulo")
    txt2 = "Relación: doble barra = uno  ·  pata de gallo = muchos"
    ax.text(0.1, 0.03, txt1, transform=ax.transAxes,
            ha="left", va="bottom", fontsize=6.5, color="#333")
    ax.text(0.1, 0.005, txt2, transform=ax.transAxes,
            ha="left", va="bottom", fontsize=6.5, color="#333")


def new_fig(w=11, h=7.5):
    fig, ax = plt.subplots(figsize=(w, h), dpi=180)
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.axis("off")
    return fig, ax


def save(fig, name):
    path = OUT_DIR / name
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  {path}")


# ============================================================
# Figura 1 — Módulo 1. Seguridad, perfiles y empleados
# ============================================================
def fig1():
    fig, ax = new_fig(11, 5.5)
    add_module_title(ax, "Módulo 1. Seguridad, perfiles y empleados")

    e_auth = draw_entity(ax, 0.3, 4.8, 2.9, "auth.users",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "email", "type": "text", "nn": True},
                          {"tag": "", "name": "raw_user_meta_data", "type": "jsonb"}],
                         external=True)

    e_perf = draw_entity(ax, 4.0, 4.8, 3.4, "perfiles",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "nombre_completo", "type": "text", "nn": True},
                          {"tag": "", "name": "email", "type": "text"},
                          {"tag": "", "name": "rol", "type": "text", "nn": True},
                          {"tag": "", "name": "estado", "type": "text", "nn": True},
                          {"tag": "FK", "name": "empleado_id", "type": "uuid"},
                          {"tag": "", "name": "ultimo_acceso", "type": "timestamptz"},
                          {"tag": "", "name": "avatar_url", "type": "text"},
                          {"tag": "", "name": "created_at", "type": "timestamptz"}])

    e_emp = draw_entity(ax, 8.0, 4.8, 2.9, "empleados",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                         {"tag": "", "name": "nombre_completo", "type": "text", "nn": True},
                         {"tag": "UQ", "name": "documento_identidad", "type": "text"},
                         {"tag": "", "name": "cargo", "type": "text"},
                         {"tag": "UQ", "name": "telefono", "type": "text"},
                         {"tag": "", "name": "fecha_ingreso", "type": "date"},
                         {"tag": "", "name": "estado", "type": "text", "nn": True},
                         {"tag": "", "name": "notas", "type": "text"}])

    connect(ax,
            side_point(e_auth, "right", "id"), "right", "one",
            side_point(e_perf, "left", "id"), "left", "one")
    connect(ax,
            side_point(e_emp, "left", "id"), "left", "one",
            side_point(e_perf, "right", "empleado_id"), "right", "many")

    add_legend(ax)
    save(fig, "fig1_modulo1.png")


# ============================================================
# Figura 2 — Módulo 2. Operación avícola
# ============================================================
def fig2():
    fig, ax = new_fig(11, 7)
    add_module_title(ax, "Módulo 2. Operación avícola: galpones y lotes")

    e_perf = draw_entity(ax, 0.3, 6.3, 2.6, "perfiles",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)

    e_galp = draw_entity(ax, 3.8, 6.3, 3.4, "galpones",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "nombre", "type": "text", "nn": True},
                          {"tag": "", "name": "capacidad_maxima", "type": "int", "nn": True},
                          {"tag": "", "name": "descripcion", "type": "text"},
                          {"tag": "", "name": "estado", "type": "text", "nn": True},
                          {"tag": "FK", "name": "encargado_id", "type": "uuid"},
                          {"tag": "", "name": "created_at", "type": "timestamptz"},
                          {"tag": "", "name": "updated_at", "type": "timestamptz"}])

    e_raza = draw_entity(ax, 8.1, 6.3, 2.6, "razas",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "nombre", "type": "text", "nn": True},
                          {"tag": "", "name": "tipo", "type": "text", "nn": True},
                          {"tag": "", "name": "descripcion", "type": "text"},
                          {"tag": "", "name": "created_at", "type": "timestamptz"}])

    e_lote = draw_entity(ax, 3.8, 3.0, 3.6, "lotes",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "nombre_numero", "type": "text", "nn": True},
                          {"tag": "FK", "name": "galpon_id", "type": "uuid", "nn": True},
                          {"tag": "FK", "name": "raza_id", "type": "uuid"},
                          {"tag": "", "name": "cantidad_inicial_aves", "type": "int", "nn": True},
                          {"tag": "", "name": "cantidad_aves_actuales", "type": "int", "nn": True},
                          {"tag": "", "name": "fecha_ingreso", "type": "date", "nn": True},
                          {"tag": "", "name": "fecha_salida", "type": "date"},
                          {"tag": "", "name": "estado", "type": "text", "nn": True}])

    connect(ax,
            side_point(e_perf, "right", "id"), "right", "one",
            side_point(e_galp, "left", "encargado_id"), "left", "many")
    connect(ax,
            side_point(e_galp, "bottom"), "down", "one",
            side_point(e_lote, "top"), "up", "many")
    connect(ax,
            side_point(e_raza, "bottom"), "down", "one",
            (e_lote["right"], row_y(e_lote, "raza_id")), "right", "many")

    add_legend(ax)
    save(fig, "fig2_modulo2.png")


# ============================================================
# Figura 3 — Módulo 3. Inventario
# ============================================================
def fig3():
    fig, ax = new_fig(11, 5.5)
    add_module_title(ax, "Módulo 3. Inventario: insumos y movimientos")

    e_ins = draw_entity(ax, 0.3, 4.8, 3.2, "insumos",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                         {"tag": "", "name": "nombre", "type": "text", "nn": True},
                         {"tag": "", "name": "categoria", "type": "text", "nn": True},
                         {"tag": "", "name": "unidad_medida", "type": "text", "nn": True},
                         {"tag": "", "name": "stock_actual", "type": "numeric"},
                         {"tag": "", "name": "stock_minimo", "type": "numeric"},
                         {"tag": "", "name": "estado", "type": "text", "nn": True},
                         {"tag": "", "name": "created_at", "type": "timestamptz"}])

    e_mov = draw_entity(ax, 4.4, 4.8, 3.8, "movimientos_insumos",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                         {"tag": "", "name": "fecha", "type": "date", "nn": True},
                         {"tag": "", "name": "tipo", "type": "text", "nn": True},
                         {"tag": "FK", "name": "insumo_id", "type": "uuid", "nn": True},
                         {"tag": "", "name": "cantidad", "type": "numeric", "nn": True},
                         {"tag": "", "name": "destino_proveedor", "type": "text"},
                         {"tag": "", "name": "observaciones", "type": "text"},
                         {"tag": "FK", "name": "registrado_por", "type": "uuid"},
                         {"tag": "", "name": "created_at", "type": "timestamptz"}])

    e_perf = draw_entity(ax, 9.1, 4.8, 1.9, "perfiles",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)

    connect(ax,
            side_point(e_ins, "right", "id"), "right", "one",
            side_point(e_mov, "left", "insumo_id"), "left", "many")
    connect(ax,
            side_point(e_perf, "left", "id"), "left", "one",
            side_point(e_mov, "right", "registrado_por"), "right", "many")

    add_legend(ax)
    save(fig, "fig3_modulo3.png")


# ============================================================
# Figura 4 — Módulo 4. Producción, mortalidad y tratamientos
# ============================================================
def fig4():
    fig, ax = new_fig(13, 9)
    add_module_title(ax, "Módulo 4. Producción, mortalidad y tratamientos")

    # Padres fila superior
    e_galp = draw_entity(ax, 0.3, 8.5, 2.3, "galpones",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)
    e_lote = draw_entity(ax, 3.1, 8.5, 2.3, "lotes",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)
    e_perf = draw_entity(ax, 5.9, 8.5, 2.3, "perfiles",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)
    e_ins = draw_entity(ax, 8.7, 8.5, 2.3, "insumos",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                        external=True)
    e_emp = draw_entity(ax, 11.1, 8.5, 1.7, "empleados",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                        external=True)

    # Entidades operativas
    e_prod = draw_entity(ax, 0.3, 6.2, 3.6, "produccion",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "fecha", "type": "date", "nn": True},
                          {"tag": "FK", "name": "galpon_id", "type": "uuid", "nn": True},
                          {"tag": "FK", "name": "lote_id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "huevos_producidos", "type": "int", "nn": True},
                          {"tag": "", "name": "consumo_alimento_kg", "type": "numeric", "nn": True},
                          {"tag": "", "name": "porcentaje_postura", "type": "numeric"},
                          {"tag": "FK", "name": "registrado_por", "type": "uuid"}])

    e_mort = draw_entity(ax, 4.3, 6.2, 3.6, "mortalidad",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "fecha", "type": "date", "nn": True},
                          {"tag": "FK", "name": "galpon_id", "type": "uuid", "nn": True},
                          {"tag": "FK", "name": "lote_id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "cantidad_bajas", "type": "int", "nn": True},
                          {"tag": "", "name": "causa", "type": "text", "nn": True},
                          {"tag": "", "name": "causa_otra", "type": "text"},
                          {"tag": "FK", "name": "registrado_por", "type": "uuid"}])

    e_trat = draw_entity(ax, 8.3, 6.6, 4.5, "tratamientos",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "fecha_inicio", "type": "date", "nn": True},
                          {"tag": "", "name": "fecha_fin", "type": "date"},
                          {"tag": "FK", "name": "galpon_id", "type": "uuid", "nn": True},
                          {"tag": "FK", "name": "lote_id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "tipo", "type": "text", "nn": True},
                          {"tag": "", "name": "nombre_producto", "type": "text", "nn": True},
                          {"tag": "", "name": "dosis_aplicacion", "type": "text", "nn": True},
                          {"tag": "", "name": "responsable", "type": "text", "nn": True},
                          {"tag": "", "name": "estado", "type": "text", "nn": True},
                          {"tag": "FK", "name": "insumo_id", "type": "uuid"},
                          {"tag": "FK", "name": "empleado_id", "type": "uuid"}])

    # Conexiones
    connect(ax, side_point(e_galp, "bottom"), "down", "one",
            (e_prod["x"] + e_prod["w"] * 0.2, e_prod["top"]), "up", "many")
    connect(ax, side_point(e_lote, "bottom"), "down", "one",
            (e_prod["x"] + e_prod["w"] * 0.5, e_prod["top"]), "up", "many")
    connect(ax, side_point(e_perf, "bottom"), "down", "one",
            (e_prod["x"] + e_prod["w"] * 0.8, e_prod["top"]), "up", "many")

    connect(ax, (e_galp["x"] + e_galp["w"] * 0.5, e_galp["bottom"]), "down", "one",
            (e_mort["x"] + e_mort["w"] * 0.15, e_mort["top"]), "up", "many")
    connect(ax, (e_lote["x"] + e_lote["w"] * 0.5, e_lote["bottom"]), "down", "one",
            (e_mort["x"] + e_mort["w"] * 0.5, e_mort["top"]), "up", "many")
    connect(ax, (e_perf["x"] + e_perf["w"] * 0.5, e_perf["bottom"]), "down", "one",
            (e_mort["x"] + e_mort["w"] * 0.85, e_mort["top"]), "up", "many")

    connect(ax, side_point(e_ins, "bottom"), "down", "one",
            (e_trat["x"] + e_trat["w"] * 0.4, e_trat["top"]), "up", "many")
    connect(ax, side_point(e_emp, "bottom"), "down", "one",
            (e_trat["x"] + e_trat["w"] * 0.8, e_trat["top"]), "up", "many")

    add_legend(ax)
    save(fig, "fig4_modulo4.png")


# ============================================================
# Figura 5 — Módulo 5. Proveedores
# ============================================================
def fig5():
    fig, ax = new_fig(11, 7)
    add_module_title(ax, "Módulo 5. Proveedores y catálogos")

    e_prov = draw_entity(ax, 3.9, 6.3, 3.4, "proveedores",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                          {"tag": "", "name": "nombre", "type": "text", "nn": True},
                          {"tag": "", "name": "telefono", "type": "text", "nn": True},
                          {"tag": "", "name": "correo", "type": "text"},
                          {"tag": "", "name": "direccion", "type": "text"},
                          {"tag": "", "name": "tipo_proveedor", "type": "text", "nn": True},
                          {"tag": "", "name": "estado", "type": "text", "nn": True}])

    e_pi = draw_entity(ax, 0.3, 3.5, 3.0, "proveedores_insumos",
                       [{"tag": "PK FK", "name": "proveedor_id", "type": "uuid", "nn": True},
                        {"tag": "PK FK", "name": "insumo_id", "type": "uuid", "nn": True}])

    e_pr = draw_entity(ax, 7.9, 3.5, 3.0, "proveedores_razas",
                       [{"tag": "PK FK", "name": "proveedor_id", "type": "uuid", "nn": True},
                        {"tag": "PK FK", "name": "raza_id", "type": "uuid", "nn": True}])

    e_ins = draw_entity(ax, 0.3, 1.4, 2.8, "insumos",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                        external=True)

    e_raza = draw_entity(ax, 8.2, 1.4, 2.8, "razas",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)

    connect(ax, (e_prov["left"], e_prov["cy"]), "left", "one",
            (e_pi["right"], e_pi["cy"]), "right", "many")
    connect(ax, (e_prov["right"], e_prov["cy"]), "right", "one",
            (e_pr["left"], e_pr["cy"]), "left", "many")
    connect(ax, side_point(e_ins, "top"), "up", "one",
            side_point(e_pi, "bottom"), "down", "many")
    connect(ax, side_point(e_raza, "top"), "up", "one",
            side_point(e_pr, "bottom"), "down", "many")

    add_legend(ax)
    save(fig, "fig5_modulo5.png")


# ============================================================
# Figura 6 — Módulo 6. Configuración y auditoría
# ============================================================
def fig6():
    fig, ax = new_fig(12, 8.5)
    add_module_title(ax, "Módulo 6. Configuración y auditoría")

    e_prod = draw_entity(ax, 0.3, 7.9, 2.4, "produccion",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)
    e_mort = draw_entity(ax, 0.3, 5.5, 2.4, "mortalidad",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)
    e_perf = draw_entity(ax, 9.1, 6.8, 2.4, "perfiles",
                         [{"tag": "PK", "name": "id", "type": "uuid", "nn": True}],
                         external=True)

    e_apr = draw_entity(ax, 3.5, 7.9, 4.8, "auditoria_produccion",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                         {"tag": "FK", "name": "produccion_id", "type": "uuid", "nn": True},
                         {"tag": "FK", "name": "editado_por", "type": "uuid", "nn": True},
                         {"tag": "", "name": "datos_anteriores", "type": "jsonb", "nn": True},
                         {"tag": "", "name": "datos_nuevos", "type": "jsonb", "nn": True},
                         {"tag": "", "name": "editado_at", "type": "timestamptz", "nn": True}])

    e_amo = draw_entity(ax, 3.5, 5.5, 4.8, "auditoria_mortalidad",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                         {"tag": "FK", "name": "mortalidad_id", "type": "uuid", "nn": True},
                         {"tag": "FK", "name": "editado_por", "type": "uuid", "nn": True},
                         {"tag": "", "name": "datos_anteriores", "type": "jsonb", "nn": True},
                         {"tag": "", "name": "datos_nuevos", "type": "jsonb", "nn": True},
                         {"tag": "", "name": "editado_at", "type": "timestamptz", "nn": True}])

    e_cfg = draw_entity(ax, 0.3, 3.0, 4.0, "configuracion",
                        [{"tag": "PK", "name": "id", "type": "int", "nn": True},
                         {"tag": "", "name": "granja", "type": "jsonb"},
                         {"tag": "", "name": "produccion", "type": "jsonb"},
                         {"tag": "", "name": "notificaciones", "type": "jsonb"},
                         {"tag": "", "name": "updated_at", "type": "timestamptz"}])

    e_aud = draw_entity(ax, 5.0, 3.0, 6.8, "auditoria",
                        [{"tag": "PK", "name": "id", "type": "uuid", "nn": True},
                         {"tag": "", "name": "tabla", "type": "text", "nn": True},
                         {"tag": "", "name": "operacion", "type": "text", "nn": True},
                         {"tag": "", "name": "registro_id", "type": "text"},
                         {"tag": "", "name": "usuario_id", "type": "uuid"},
                         {"tag": "", "name": "usuario_nombre", "type": "text"},
                         {"tag": "", "name": "datos_anteriores", "type": "jsonb"},
                         {"tag": "", "name": "datos_nuevos", "type": "jsonb"},
                         {"tag": "", "name": "created_at", "type": "timestamptz", "nn": True}])

    connect(ax,
            side_point(e_prod, "right", "id"), "right", "one",
            side_point(e_apr, "left", "produccion_id"), "left", "many")
    connect(ax,
            side_point(e_mort, "right", "id"), "right", "one",
            side_point(e_amo, "left", "mortalidad_id"), "left", "many")
    connect(ax,
            side_point(e_perf, "left", "id"), "left", "one",
            side_point(e_apr, "right", "editado_por"), "right", "many")
    connect(ax,
            side_point(e_perf, "left", "id"), "left", "one",
            side_point(e_amo, "right", "editado_por"), "right", "many")

    add_legend(ax)
    save(fig, "fig6_modulo6.png")


if __name__ == "__main__":
    print("Dibujando diagramas ER (estilo guide)...")
    fig1(); fig2(); fig3(); fig4(); fig5(); fig6()
    print("OK")
