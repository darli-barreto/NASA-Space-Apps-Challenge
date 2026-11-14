"""Extract the Mons Mouton pilot window from Lemelin et al. (2022), version 2."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import mean
from tempfile import TemporaryDirectory
from shutil import copyfileobj
from urllib.request import urlopen
from zipfile import ZipFile

import numpy as np
import rasterio
from affine import Affine
from rasterio.transform import rowcol
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://zenodo.org/records/7108163"
PRODUCTS = {
    "counts": ("gridded_spectral_profiler_counts_south_pole.tif", "6114aa94a163e8c795458deafef17855"),
    "plagioclase": ("gridded_plagioclase_mosaic_south_pole.tiff", "991cfc6b124c0a5911a3ab74f1d2e524"),
    "olivine": ("gridded_olivine_mosaic_south_pole.tiff", "ab4f59c1c1e5d75936426939e65a8c84"),
    "low-calcium-pyroxene": ("gridded_low_calcium_pyroxene_mosaic_south_pole.tiff", "4dec67970236d30ec68f7258033ea6b7"),
    "high-calcium-pyroxene": ("gridded_high_calcium_pyroxene_mosaic_south_pole.tiff", "56a1c510474717d9a0e86a8c12098d7b"),
}
SIDE = 4


def load(key, cache, temp, x, y):
    filename, checksum = PRODUCTS[key]
    url = f"{SOURCE}/files/{filename}.zip?download=1"
    path = cache / f"{filename}.zip"
    if not path.exists():
        partial = temp / path.name
        with urlopen(url, timeout=30) as response, partial.open("wb") as stream:
            copyfileobj(response, stream)
        partial.replace(path)
    with path.open("rb") as stream:
        if hashlib.file_digest(stream, "md5").hexdigest() != checksum:
            raise ValueError(f"Archive checksum mismatch: {path}")
    with ZipFile(path) as archive:
        # The v2 world file supplies the affine. The TIFF's internal display
        # coordinates are not projected metres.
        stem = Path(filename).stem
        a, d, b, e, c, f = map(float, archive.read(stem + ".tfwx").split())
        transform = Affine(a, b, c, d, e, f) * Affine.translation(-0.5, -0.5)
        tif = temp / filename
        tif.write_bytes(archive.read(filename))
    # Select native pixel centres inside a 4 km square on the polar grid.
    top, left = rowcol(transform, x - 2000, y - 2000, op=lambda v: math.ceil(v - 0.5))
    bottom, right = rowcol(transform, x + 2000, y + 2000, op=lambda v: math.ceil(v - 0.5))
    window = Window(left, top, right - left, bottom - top)
    with rasterio.open(tif) as ds:
        if window.intersection(Window(0, 0, ds.width, ds.height)) != window:
            raise ValueError("Pilot window extends beyond the lunar raster")
        grid = ds.read(1, window=window, masked=True).astype(float).filled(np.nan)
    return grid, transform, window, {"asset": url, "md5": checksum}


def extract(cache, temp):
    ref = json.loads((ROOT / "data/planetary/moon-mons-mouton.json").read_text(encoding="utf-8"))
    lat, lon = (math.radians(ref["center"][key]) for key in ("lat", "lon"))
    # Spherical south polar stereographic on the Moon 2000 datum, lon_0=0.
    radius = 2 * ref["radiusKm"] * 1000 * math.tan((math.pi / 2 + lat) / 2)
    x, y = radius * math.sin(lon), radius * math.cos(lon)
    counts, transform, window, counts_source = load("counts", cache, temp, x, y)
    if counts.shape != (SIDE, SIDE) or not np.all(np.isfinite(counts) & (counts >= 0) & (counts == np.floor(counts))):
        raise ValueError("Unexpected observation-count grid")
    layers = []
    supported = counts > 0
    for key, label in (("plagioclase", "Plagioclasa"), ("olivine", "Olivino"),
                       ("low-calcium-pyroxene", "Piroxeno bajo en calcio"),
                       ("high-calcium-pyroxene", "Piroxeno alto en calcio")):
        grid, layer_transform, layer_window, source = load(key, cache, temp, x, y)
        if not transform.almost_equals(layer_transform) or window != layer_window:
            raise ValueError(f"{key} grid does not align with the observation counts")
        if key == "plagioclase":
            # Exclude zero-filled pixels in this feldspathic window. Zero for
            # a mafic mineral can be a valid model result at a supported pixel.
            supported &= (grid > 0) & (grid <= 1)
        scaled = grid * 100
        usable = supported & np.isfinite(scaled) & (scaled >= 0) & (scaled <= 100)
        values = [round(float(v), 4) if valid else None for v, valid in zip(scaled.flat, usable.flat)]
        measured = [v for v in values if v is not None]
        layers.append({
            "id": key, "label": label, "values": values,
            "mean": round(mean(measured), 4) if measured else None,
            "validCells": len(measured), **source,
        })
    return {
        "referenceId": ref["id"], "center": ref["center"],
        "datasetUrl": SOURCE, "studyUrl": "https://doi.org/10.3847/PSJ/ac532c",
        "mineralAbundanceModelRmseWtPct": 9,
        "grid": {
            "resolutionM": round(transform.a, 2), "windowM": 4000,
            "rows": counts.shape[0], "columns": counts.shape[1],
            "rowOffset": int(window.row_off), "columnOffset": int(window.col_off),
            "worldTransform": list(transform)[:6],
            "counts": counts.astype(int).flatten().tolist(), **counts_source,
        },
        "method": "Celdas con centro dentro de 4 × 4 km en la proyección polar. Media de celdas con observaciones Kaguya y estimación válida. Se excluyen celdas sin observaciones directas.",
        "layers": layers,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache", type=Path, help="Directorio para los ZIP originales")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=args.cache) as folder:
        data = extract(args.cache, Path(folder))
    target = ROOT / "data/pilot-lunar-mineralogy.json"
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
