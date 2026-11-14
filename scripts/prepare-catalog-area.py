"""Build comparable 4 km rasters for the archived candidates and references."""
import json
import math
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from area_terrain import ROOT, edges, window, summarize

def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf8"))

def glo_tile(lat, lon):
    south, west = math.floor(lat), math.floor(lon)
    tile = f"Copernicus_DSM_COG_10_{'N' if south >= 0 else 'S'}{abs(south):02d}_00_{'E' if west >= 0 else 'W'}{abs(west):03d}_00_DEM"
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{tile}/{tile}.tif"

def product(name, source, raw, sx, sy, center, radius, native, timestamp):
    scales = []
    for step in (500, 1000):
        x, y = edges(center["lat"], center["lon"], radius, step)
        scales.append(summarize(raw, sx, sy, x, y, step))
    return dict(name=name, source=source, nativePixelM=native, sourcePixels=raw.size,
                quality={"maskSource": None}, scales=scales, retrievedAt=timestamp)

def earth(center, timestamp):
    x, y = edges(center["lat"], center["lon"], 6371000)
    url = glo_tile(center["lat"], center["lon"])
    try:
        raw, sx, sy = window(url, x, y)
    except OSError:
        regional = url.replace("https://copernicus-dem-30m.s3.amazonaws.com/",
                               "https://s3.eu-central-1.amazonaws.com/copernicus-dem-30m/")
        raw, sx, sy = window(regional, x, y)
    raw[(raw < -500) | (raw > 9000)] = np.nan
    return product("Copernicus GLO-30", url, raw, sx, sy, center, 6371000, 30, timestamp)

def planet(p):
    w = p["window"]
    raw = np.array(w["values"], dtype=float).reshape(w["rows"], w["cols"])[::-1].copy()
    raw[raw == -32768] = np.nan
    sx = w["west"] + np.arange(w["cols"] + 1) / w["ppd"]
    sy = w["north"] - np.arange(w["rows"], -1, -1) / w["ppd"]
    return product("NASA LOLA" if p["body"] == "Luna" else "NASA MOLA", p["imageUrl"],
                   raw * w["scale"], sx, sy, p["center"], p["radiusKm"] * 1000,
                   p["nativeCellM"], p["retrievedAt"])

def main():
    now = datetime.now(timezone.utc).isoformat()
    candidates = load("data/catalog-validation.json")["candidates"]
    rows = {row["id"] for batch in load("data/contrast-validation.json") for row in batch["results"] if row["signature"]}
    references = {}
    for path in sorted((ROOT / "data/planetary").glob("*.json")):
        p = load(path.relative_to(ROOT))
        references[p["id"]] = planet(p)
    def measure(center):
        print("Processing", center["id"], flush=True)
        try:
            return str(center["id"]), dict(lat=center["lat"], lon=center["lon"], product=earth(center, now)), None
        except (OSError, ValueError) as error:
            print("Unavailable", center["id"], error, flush=True)
            return str(center["id"]), None, str(error)
    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(measure, (c for c in candidates if c["id"] in rows)))
    sites = {key: site for key, site, error in results if error is None}
    unavailable = {key: error for key, _, error in results if error is not None}
    report = dict(version="full-window-area-v1", generatedAt=now, sites=sites, references=references, unavailable=unavailable)
    output = ROOT / "data/catalog-area-terrain.json"
    if unavailable and output.exists():
        raise RuntimeError(f"Acquisition incomplete; existing archive preserved: {list(unavailable)}")
    output.write_text(json.dumps(report, allow_nan=False, separators=(",", ":")) + "\n", encoding="utf8")

if __name__ == "__main__":
    main()
