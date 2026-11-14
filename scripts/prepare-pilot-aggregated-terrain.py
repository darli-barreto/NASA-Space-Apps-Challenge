"""Aggregate the pilot's three native DEMs to matching nominal 1 km cells."""
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from shutil import copyfileobj
from tempfile import TemporaryDirectory
from urllib.request import urlopen

import numpy as np
import rasterio
from rasterio.windows import from_bounds

ROOT = Path(__file__).resolve().parents[1]
STEP_M = 1000
SIDE = 3


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf8"))


def edges(lat, lon, radius):
    offsets = (np.arange(SIDE + 1) - SIDE / 2) * STEP_M
    latitudes = lat + np.degrees(offsets / radius)
    longitudes = lon + np.degrees(offsets / (radius * math.cos(math.radians(lat))))
    return longitudes, latitudes


def overlaps(target_edges, source_edges):
    lo = np.maximum(target_edges[:-1, None], source_edges[None, :-1])
    hi = np.minimum(target_edges[1:, None], source_edges[None, 1:])
    return np.maximum(0, hi - lo)


def aggregate(values, source_lon, source_lat, target_lon, target_lat):
    # Spherical strip areas are proportional to longitude × difference of sine latitude.
    wx = overlaps(np.radians(target_lon), np.radians(source_lon))
    wy = overlaps(np.sin(np.radians(target_lat)), np.sin(np.radians(source_lat)))
    expected = np.outer(np.diff(np.sin(np.radians(target_lat))), np.diff(np.radians(target_lon)))
    valid = np.isfinite(values)
    weights = wy @ valid.astype(float) @ wx.T
    coverage = weights / expected
    sums = wy @ np.where(valid, values, 0) @ wx.T
    means = np.divide(sums, weights, out=np.zeros_like(sums), where=weights > 0)
    return {
        "values": [float(v) if c >= 1 - 1e-8 else None for v, c in zip(means.flat, coverage.flat)],
        "coverage": np.clip(coverage, 0, 1).flatten().tolist(),
    }


def earth_window(path, lon, lat, band_is_mask=False):
    with rasterio.open(path) as ds:
        if ds.crs is None or ds.crs.to_epsg() != 4326 or ds.transform.b or ds.transform.d:
            raise ValueError("Expected an unrotated WGS84 source grid")
        w = from_bounds(lon[0], lat[0], lon[-1], lat[-1], ds.transform)
        x0, y0 = math.floor(w.col_off), math.floor(w.row_off)
        x1, y1 = math.ceil(w.col_off + w.width), math.ceil(w.row_off + w.height)
        if not (0 <= x0 < x1 <= ds.width and 0 <= y0 < y1 <= ds.height):
            raise ValueError("Target extent not covered by source tile")
        from rasterio.windows import Window
        pixels = ds.read(1, window=Window(x0, y0, x1-x0, y1-y0), masked=True)
        raw = pixels.astype(float).filled(np.nan)[::-1]
        if not band_is_mask:
            raw[(raw < -500) | (raw > 9000)] = np.nan
        source_lon = ds.transform.c + ds.transform.a * np.arange(x0, x1 + 1)
        source_lat = ds.transform.f + ds.transform.e * np.arange(y1, y0 - 1, -1)
        return raw, source_lon, source_lat


def read_window(url, lon, lat, band_is_mask=False):
    with TemporaryDirectory() as tmp:
        path = Path(tmp) / "source.tif"
        with urlopen(url, timeout=60) as response, path.open("wb") as file:
            copyfileobj(response, file)
        return earth_window(path, lon, lat, band_is_mask)


def earth_result(product, lon, lat):
    raw, source_lon, source_lat = read_window(product["asset"], lon, lat)
    quality = {}
    if "maskAsset" in product:
        mask, mask_lon, mask_lat = read_window(product["maskAsset"], lon, lat, True)
        if not (np.array_equal(source_lon, mask_lon) and np.array_equal(source_lat, mask_lat)):
            raise ValueError("AW3D30 mask grid does not match heights")
        quality = {
            "maskAsset": product["maskAsset"],
            "nonzeroMaskPixels": int(np.count_nonzero(np.isfinite(mask) & (mask != 0))),
            "unavailableMaskPixels": int(np.count_nonzero(~np.isfinite(mask))),
            "maskPixelCount": int(mask.size),
        }
    return {**aggregate(raw, source_lon, source_lat, lon, lat), "quality": quality,
            "windowSha256": hashlib.sha256(raw.astype("<f8").tobytes()).hexdigest()}


def lunar_result(profile, lon, lat):
    w = profile["window"]
    raw = np.asarray(w["values"], dtype=float).reshape(w["rows"], w["cols"])[::-1].copy()
    raw[raw == -32768] = np.nan
    source_lon = w["west"] + np.arange(w["cols"]+1)/w["ppd"]
    source_lat = w["north"] - np.arange(w["rows"], -1, -1)/w["ppd"]
    return {**aggregate(raw * w["scale"], source_lon, source_lat, lon, lat),
            "labelUrl": profile["labelUrl"], "sourceRange": profile["sourceRange"]}


def main():
    pilot = load("data/pilot-evidence.json")
    moon = load("data/planetary/moon-mons-mouton.json")
    earth_lon, earth_lat = pilot["coordinates"]["earthLonLat"][40]
    elon, elat = edges(earth_lat, earth_lon, 6371000)
    mlon, mlat = edges(moon["center"]["lat"], moon["center"]["lon"], moon["radiusKm"]*1000)
    products = []
    for p in pilot["terrain"]:
        print("Aggregating", p["id"], flush=True)
        result = lunar_result(moon, mlon, mlat) if p["id"] == "lola" else earth_result(p, elon, elat)
        products.append({"id": p["id"], "name": p["name"], "source": p["source"],
                         "asset": p.get("asset", p["source"]), **result})
    bundle = {
        "candidateId": pilot["candidateId"], "referenceId": pilot["referenceId"],
        "method": "native-pixel-spherical-area-1", "side": SIDE, "spacingM": STEP_M,
        "order": "south-to-north rows, west-to-east columns",
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "earthEdges": {"lon": elon.tolist(), "lat": elat.tolist()},
        "moonEdges": {"lon": mlon.tolist(), "lat": mlat.tolist()},
        "terrain": products,
    }
    (ROOT / "data/pilot-terrain-aggregated.json").write_text(
        json.dumps(bundle, indent=2, allow_nan=False) + "\n", encoding="utf8")
    print([(p["id"], sum(v is not None for v in p["values"])) for p in products])


if __name__ == "__main__":
    main()
