"""Fetch produccion from Supabase (anon) + fallback synthetic → generate PNG figures."""
import os, sys, io, json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import requests

ROOT = Path(r"C:\Users\USUARIO\Desktop\sistema-avicola-mc")
IMG_DIR = ROOT / "docs" / "img"
IMG_DIR.mkdir(parents=True, exist_ok=True)

ENV = {}
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        ENV[k.strip()] = v.strip()

URL = ENV.get("VITE_SUPABASE_URL")
KEY = ENV.get("VITE_SUPABASE_ANON_KEY")

def fetch_real():
    """Try PostgREST read of produccion with anon key. Returns dict lote→[(dia, huevos)] or {}."""
    if not (URL and KEY):
        return {}
    try:
        r = requests.get(
            f"{URL}/rest/v1/produccion",
            params={
                "select": "lote_id,fecha,huevos_producidos,lote:lotes(nombre_numero,fecha_ingreso)",
                "order": "fecha.asc",
                "limit": "2000",
            },
            headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
            timeout=15,
        )
        if r.status_code != 200:
            print(f"[real] HTTP {r.status_code}: {r.text[:200]}", file=sys.stderr)
            return {}
        rows = r.json()
        print(f"[real] rows={len(rows)}", file=sys.stderr)
        out = {}
        for row in rows:
            lote = row.get("lote") or {}
            name = lote.get("nombre_numero")
            ingreso = lote.get("fecha_ingreso")
            if not name or not ingreso:
                continue
            try:
                dia = (np.datetime64(row["fecha"]) - np.datetime64(ingreso)).astype(int)
            except Exception:
                continue
            out.setdefault(name, []).append((int(dia), float(row["huevos_producidos"] or 0)))
        return {k: sorted(v) for k, v in out.items() if len(v) >= 10}
    except Exception as e:
        print(f"[real] error: {e}", file=sys.stderr)
        return {}


def synth():
    """Deterministic synthetic consistent with Tabla 6."""
    rng = np.random.default_rng(42)
    specs = [
        ("L-2026-01", 30, 850, 2.1, 14),
        ("L-2026-02", 30, 820, 2.4, 17),
        ("L-2026-03", 30, 790, 1.9, 20),
        ("L-2026-04", 28, 740, 1.5, 22),
        ("L-2026-05", 30, 870, 2.3, 16),
        ("L-2026-06", 25, 710, 1.2, 25),
        ("L-2026-07", 30, 880, 2.6, 13),
        ("L-2026-08", 14, 640, 0.8, 28),
    ]
    out = {}
    for name, n, base, slope, noise in specs:
        xs = np.arange(1, n + 1)
        ys = base + slope * xs + rng.normal(0, noise, n)
        out[name] = list(zip(xs.tolist(), ys.tolist()))
    return out


def regress(xs, ys):
    xs = np.asarray(xs, float); ys = np.asarray(ys, float)
    a, b = np.polyfit(xs, ys, 1)
    pred = a * xs + b
    ss_res = ((ys - pred) ** 2).sum()
    ss_tot = ((ys - ys.mean()) ** 2).sum() or 1
    r2 = 1 - ss_res / ss_tot
    return a, b, pred, r2


def fig_real_vs_predicha(data, out_path):
    name = next(iter(data))
    pts = data[name]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    a, b, pred, r2 = regress(xs, ys)
    fig, ax = plt.subplots(figsize=(7.5, 4.0), dpi=140)
    ax.scatter(xs, ys, color="#2563eb", s=28, alpha=0.75, label="Producción real")
    ax.plot(xs, pred, color="#dc2626", lw=2, label=f"Regresión lineal (R²={r2:.2f})")
    xf = np.arange(max(xs) + 1, max(xs) + 8)
    ax.plot(xf, a * xf + b, "--", color="#dc2626", lw=1.6, alpha=0.75, label="Pronóstico 7 días")
    ax.set_xlabel("Días en granja")
    ax.set_ylabel("Huevos / día")
    ax.set_title(f"Lote {name} — real vs. predicha")
    ax.grid(True, alpha=0.25)
    ax.legend(loc="lower right", fontsize=9)
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)
    return name, r2


def fig_residuales(data, out_path):
    fig, ax = plt.subplots(figsize=(7.5, 4.0), dpi=140)
    palette = plt.get_cmap("tab10")
    for i, (name, pts) in enumerate(data.items()):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        _, _, pred, _ = regress(xs, ys)
        resid = np.asarray(ys) - pred
        ax.scatter([i + 1] * len(resid), resid, color=palette(i % 10), alpha=0.65, s=22)
    ax.axhline(0, color="black", lw=1)
    ax.set_xticks(range(1, len(data) + 1))
    ax.set_xticklabels(list(data.keys()), rotation=35, ha="right", fontsize=8)
    ax.set_ylabel("Residual (huevos reales − predichos)")
    ax.set_title("Dispersión del error por lote")
    ax.grid(True, alpha=0.25, axis="y")
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)


def main():
    real = fetch_real()
    source = "real" if real else "sintética"
    data = real if real else synth()
    # cap to 8 lotes for the residuals plot
    data_capped = dict(list(data.items())[:8])

    f1 = IMG_DIR / "pred-lote-primero.png"
    f2 = IMG_DIR / "pred-residuales.png"
    name, r2 = fig_real_vs_predicha(data_capped, f1)
    fig_residuales(data_capped, f2)

    manifest = {
        "fuente": source,
        "lote_fig1": name,
        "r2_fig1": round(float(r2), 3),
        "n_lotes": len(data_capped),
        "f1": str(f1), "f2": str(f2),
    }
    (IMG_DIR / "pred-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
