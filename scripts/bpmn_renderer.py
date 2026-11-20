"""BPMN swimlane renderer en matplotlib. Estilo bpmn-io/Camunda."""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, Polygon, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D
import matplotlib.patheffects as pe

LANE_LABEL_W = 0.6
LANE_HEADER_FILL = "#f4f6fa"
LANE_ALT_FILL = "#eef2f7"
LANE_BORDER = "#9aa5b1"

TASK_COLORS = {
    "user":    {"edge": "#3b82f6", "fill": "#eff6ff", "icon": "☺"},
    "system":  {"edge": "#16a34a", "fill": "#f0fdf4", "icon": "⚙"},
    "mail":    {"edge": "#ea580c", "fill": "#fff7ed", "icon": "✉"},
    "ai":      {"edge": "#dc2626", "fill": "#fef2f2", "icon": "✱"},
    "manual":  {"edge": "#525252", "fill": "#fafafa", "icon": "✍"},
}


class BPMNCanvas:
    def __init__(self, title, lanes, width=16, lane_h=2.0):
        self.title = title
        self.lanes = lanes
        self.lane_h = lane_h
        self.lane_y = {}
        total_h = lane_h * len(lanes) + 1.3
        self.fig, self.ax = plt.subplots(figsize=(width, total_h))
        self.ax.set_xlim(0, width)
        self.ax.set_ylim(0, total_h)
        self.ax.set_aspect("equal")
        self.ax.axis("off")
        self.width = width
        self.total_h = total_h
        self._draw_lanes()
        self._draw_title()

    def _draw_title(self):
        self.ax.text(0.1, self.total_h - 0.35, self.title,
                     fontsize=12, fontweight="bold", va="center", ha="left")

    def _draw_lanes(self):
        y_top = self.total_h - 0.9
        for i, name in enumerate(self.lanes):
            y_bottom = y_top - self.lane_h
            fill = LANE_HEADER_FILL if i % 2 == 0 else LANE_ALT_FILL
            self.ax.add_patch(Rectangle(
                (0, y_bottom), self.width, self.lane_h,
                facecolor=fill, edgecolor=LANE_BORDER, linewidth=0.8, zorder=1))
            self.ax.add_patch(Rectangle(
                (0, y_bottom), LANE_LABEL_W, self.lane_h,
                facecolor="#ffffff", edgecolor=LANE_BORDER, linewidth=0.8, zorder=1))
            self.ax.text(
                LANE_LABEL_W / 2, y_bottom + self.lane_h / 2, name,
                rotation=90, fontsize=9, fontweight="bold",
                va="center", ha="center", zorder=2)
            self.lane_y[name] = y_bottom + self.lane_h / 2
            y_top = y_bottom

    def task(self, lane, x, text, kind="user", w=1.6, h=0.9, y_off=0):
        y = self.lane_y[lane] + y_off
        c = TASK_COLORS[kind]
        box = FancyBboxPatch(
            (x - w / 2, y - h / 2), w, h,
            boxstyle="round,pad=0.02,rounding_size=0.1",
            linewidth=1.6, edgecolor=c["edge"], facecolor=c["fill"], zorder=3)
        self.ax.add_patch(box)
        self.ax.text(x - w / 2 + 0.11, y + h / 2 - 0.14, c["icon"],
                     fontsize=7, color=c["edge"], va="center", ha="center", zorder=4)
        self.ax.text(x, y, text, fontsize=8, va="center", ha="center", zorder=4,
                     wrap=True)
        return (x, y, w, h)

    def start(self, lane, x, label="", y_off=0):
        y = self.lane_y[lane] + y_off
        self.ax.add_patch(Circle((x, y), 0.28, facecolor="#dcfce7",
                                 edgecolor="#16a34a", linewidth=2, zorder=3))
        if label:
            self.ax.text(x, y - 0.5, label, fontsize=7.5, va="top", ha="center", zorder=4)
        return (x, y, 0.28, 0.28)

    def end(self, lane, x, label="", y_off=0):
        y = self.lane_y[lane] + y_off
        self.ax.add_patch(Circle((x, y), 0.28, facecolor="#fee2e2",
                                 edgecolor="#dc2626", linewidth=3, zorder=3))
        if label:
            self.ax.text(x, y - 0.5, label, fontsize=7.5, va="top", ha="center", zorder=4)
        return (x, y, 0.28, 0.28)

    def timer(self, lane, x, label="", y_off=0):
        y = self.lane_y[lane] + y_off
        self.ax.add_patch(Circle((x, y), 0.3, facecolor="#dcfce7",
                                 edgecolor="#16a34a", linewidth=2, zorder=3))
        self.ax.add_patch(Circle((x, y), 0.22, facecolor="none",
                                 edgecolor="#16a34a", linewidth=1.2, zorder=4))
        self.ax.plot([x, x], [y, y + 0.14], color="#16a34a", linewidth=1.2, zorder=5)
        self.ax.plot([x, x + 0.1], [y, y], color="#16a34a", linewidth=1.2, zorder=5)
        if label:
            self.ax.text(x, y - 0.52, label, fontsize=7.5, va="top", ha="center", zorder=4)
        return (x, y, 0.3, 0.3)

    def gateway(self, lane, x, label_top="", y_off=0):
        y = self.lane_y[lane] + y_off
        d = 0.4
        diamond = Polygon(
            [(x, y + d), (x + d, y), (x, y - d), (x - d, y)],
            closed=True, facecolor="#fef3c7", edgecolor="#b45309",
            linewidth=1.6, zorder=3)
        self.ax.add_patch(diamond)
        self.ax.text(x, y, "X", fontsize=11, fontweight="bold",
                     color="#92400e", va="center", ha="center", zorder=4)
        if label_top:
            self.ax.text(x, y + d + 0.12, label_top, fontsize=8,
                         fontweight="bold", va="bottom", ha="center", zorder=4)
        return (x, y, d * 2, d * 2)

    def datastore(self, lane, x, label="", y_off=0):
        y = self.lane_y[lane] + y_off
        w, h = 0.55, 0.5
        self.ax.add_patch(Rectangle(
            (x - w / 2, y - h / 2 + 0.05), w, h - 0.1,
            facecolor="#f5f5f4", edgecolor="#525252", linewidth=1.2, zorder=3))
        from matplotlib.patches import Ellipse
        self.ax.add_patch(Ellipse((x, y + h / 2 - 0.05), w, 0.14,
                                  facecolor="#f5f5f4", edgecolor="#525252",
                                  linewidth=1.2, zorder=4))
        self.ax.add_patch(Ellipse((x, y - h / 2 + 0.05), w, 0.14,
                                  facecolor="#f5f5f4", edgecolor="#525252",
                                  linewidth=1.2, zorder=4))
        if label:
            self.ax.text(x, y - h / 2 - 0.2, label, fontsize=7.5,
                         va="top", ha="center", zorder=4, style="italic")
        return (x, y, w, h)

    def document(self, lane, x, label="", y_off=0):
        y = self.lane_y[lane] + y_off
        w, h = 0.5, 0.6
        pts = [(x - w / 2, y + h / 2), (x + w / 2 - 0.12, y + h / 2),
               (x + w / 2, y + h / 2 - 0.12), (x + w / 2, y - h / 2),
               (x - w / 2, y - h / 2)]
        self.ax.add_patch(Polygon(pts, closed=True, facecolor="#ffffff",
                                  edgecolor="#525252", linewidth=1.2, zorder=3))
        self.ax.plot([x + w / 2 - 0.12, x + w / 2 - 0.12, x + w / 2],
                     [y + h / 2, y + h / 2 - 0.12, y + h / 2 - 0.12],
                     color="#525252", linewidth=1.0, zorder=4)
        if label:
            self.ax.text(x, y - h / 2 - 0.2, label, fontsize=7.5,
                         va="top", ha="center", zorder=4, style="italic")
        return (x, y, w, h)

    def _edge_point(self, box, direction):
        x, y, w, h = box
        if direction == "right":  return (x + w / 2, y)
        if direction == "left":   return (x - w / 2, y)
        if direction == "top":    return (x, y + h / 2)
        if direction == "bottom": return (x, y - h / 2)
        return (x, y)

    def flow(self, src, dst, src_side="right", dst_side="left", label="", dashed=False, bend=None):
        x1, y1 = self._edge_point(src, src_side)
        x2, y2 = self._edge_point(dst, dst_side)
        style = "--" if dashed else "-"
        if bend is None:
            if src_side in ("right", "left") and dst_side in ("right", "left") and abs(y1 - y2) > 0.05:
                mid_x = (x1 + x2) / 2
                xs = [x1, mid_x, mid_x, x2]
                ys = [y1, y1, y2, y2]
                self.ax.plot(xs, ys, color="#111827", linewidth=1.1, linestyle=style, zorder=5)
                self._arrowhead(xs[-2], ys[-2], xs[-1], ys[-1])
            elif src_side in ("top", "bottom") and dst_side in ("top", "bottom"):
                mid_y = (y1 + y2) / 2
                xs = [x1, x1, x2, x2]
                ys = [y1, mid_y, mid_y, y2]
                self.ax.plot(xs, ys, color="#111827", linewidth=1.1, linestyle=style, zorder=5)
                self._arrowhead(xs[-2], ys[-2], xs[-1], ys[-1])
            else:
                self.ax.plot([x1, x2], [y1, y2], color="#111827", linewidth=1.1,
                             linestyle=style, zorder=5)
                self._arrowhead(x1, y1, x2, y2)
        else:
            bx, by = bend
            xs = [x1, bx, bx, x2]
            ys = [y1, y1, y2, y2]
            self.ax.plot(xs, ys, color="#111827", linewidth=1.1, linestyle=style, zorder=5)
            self._arrowhead(xs[-2], ys[-2], xs[-1], ys[-1])
        if label:
            lx = (x1 + x2) / 2
            ly = (y1 + y2) / 2 + 0.14
            self.ax.text(lx, ly, label, fontsize=7.5, style="italic",
                         color="#b45309", ha="center", va="bottom",
                         path_effects=[pe.withStroke(linewidth=2.5, foreground="white")],
                         zorder=6)

    def _arrowhead(self, x1, y1, x2, y2):
        from matplotlib.patches import FancyArrow
        import math
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1
        ux, uy = dx / L, dy / L
        ax, ay = x2 - ux * 0.001, y2 - uy * 0.001
        self.ax.add_patch(FancyArrow(
            x2 - ux * 0.14, y2 - uy * 0.14, ux * 0.001, uy * 0.001,
            width=0, head_width=0.14, head_length=0.14,
            length_includes_head=True, color="#111827", zorder=6))

    def save(self, path, dpi=200):
        self.fig.tight_layout()
        self.fig.savefig(path, dpi=dpi, bbox_inches="tight", facecolor="white")
        plt.close(self.fig)
