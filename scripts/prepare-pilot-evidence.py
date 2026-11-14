"""Build the #55742 evidence bundle from public sources (requires rasterio, Pillow)."""
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urljoin
from urllib.request import urlopen
from shutil import copyfileobj
from contextlib import contextmanager

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.warp import transform
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parents[1]
GLO_TILE = "Copernicus_DSM_COG_10_S16_00_W073_00_DEM"
GLO = f"https://copernicus-dem-30m.s3.amazonaws.com/{GLO_TILE}/{GLO_TILE}.tif"
AW = ("https://s3.ap-northeast-1.wasabisys.com/je-pds/cog/v1/"
      "JAXA.EORC_ALOS.PRISM_AW3D30.v4.1_global/2024-04/3/W073.00-W072.00/S16.00-S15.00.json")
S2 = "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_18LYH_20260729_0_L2A"
LROC = "https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MOUTNPLTLO1"
LROC_IMAGE = ("https://lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/"
              "BROWSE/NAC_ROI/MOUTNPLTLO1/NAC_ROI_MOUTNPLTLO1_P843S0306.BROWSE.PNG")
OUT = ROOT / "data" / "pilot-evidence.json"
PREVIEW = ROOT / "public" / "evidence" / "sentinel-55742.jpg"
SPACING = 500
SIDE = 9


def load(url):
    with urlopen(url, timeout=30) as response:
        return json.load(response)


def grid(lat, lon, radius):
    phi, lam = map(math.radians, (lat, lon))
    for y in range(-4, 5):
        for x in range(-4, 5):
            d = math.hypot(x, y) * SPACING / radius
            bearing = math.atan2(x, y)
            p = math.asin(math.sin(phi)*math.cos(d) + math.cos(phi)*math.sin(d)*math.cos(bearing))
            q = lam + math.atan2(math.sin(bearing)*math.sin(d)*math.cos(phi), math.cos(d)-math.sin(phi)*math.sin(p))
            yield (math.degrees(q), math.degrees(p))


def raster_samples(asset, points, mask=False):
    with rasterio.open(asset) as ds:
        xs, ys = transform("EPSG:4326", ds.crs, *zip(*points))
        values = []
        for sample in ds.sample(zip(xs, ys), masked=True):
            v = sample[0]
            if np.ma.is_masked(v) or not np.isfinite(v) or (not mask and not -500 <= v <= 9000):
                raise ValueError("Missing or invalid elevation")
            values.append(float(v))
        return values


def earth_samples(url, points, mask=False):
    try:
        return raster_samples(url, points, mask)
    except rasterio.errors.RasterioIOError:
        # Some COG hosts deny range reads for raster blocks. Fetch the source
        # once to temporary storage and repeat the same native-pixel sampling.
        with TemporaryDirectory() as directory:
            path = Path(directory) / "tile.tif"
            with urlopen(url, timeout=45) as response, path.open("wb") as dest:
                copyfileobj(response, dest)
            return raster_samples(path, points, mask)


def moon_samples(w, points):
    data = np.asarray(w["values"]).reshape(w["rows"], w["cols"])
    values = []
    for lon, lat in points:
        x, y = (lon % 360-w["west"])*w["ppd"]-.5, (w["north"]-lat)*w["ppd"]-.5
        i, j = math.floor(x), math.floor(y)
        if not (0 <= i < w["cols"]-1 and 0 <= j < w["rows"]-1):
            raise ValueError("Lunar node outside original raster")
        pixels = data[j:j+2, i:i+2]
        if (pixels == -32768).any():
            raise ValueError("Missing lunar elevation")
        dx, dy = x-i, y-j
        values.append(float(np.array([1-dy,dy]) @ pixels @ np.array([1-dx,dx]) * w["scale"]))
    return values


def sentinel_preview(asset, points):
    with rasterio.open(asset) as ds:
        xs, ys = transform("EPSG:4326", ds.crs, *zip(*points))
        rc = [ds.index(x, y) for x, y in zip(xs, ys)]
        r, c = map(np.array, zip(*rc))
        window = Window(int(c.min()), int(r.min()), int(c.max()-c.min()+1), int(r.max()-r.min()+1))
        if window.intersection(Window(0, 0, ds.width, ds.height)) != window:
            raise ValueError("Sentinel visual does not cover window")
        rgb = ds.read((1, 2, 3), window=window, out_shape=(3, 440, 440), resampling=Resampling.bilinear)
        PREVIEW.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgb.transpose(1, 2, 0)).save(PREVIEW, quality=88)


@contextmanager
def downloaded(url):
    with TemporaryDirectory() as directory:
        path = Path(directory) / "tile.tif"
        with urlopen(url, timeout=60) as response, path.open("wb") as dest:
            copyfileobj(response, dest)
        yield path


def sentinel(points):
    item = load(S2)
    visual, scl = [item["assets"][key]["href"] for key in ("visual", "scl")]
    try:
        sentinel_preview(visual, points)
    except rasterio.errors.RasterioIOError:
        with downloaded(visual) as path:
            sentinel_preview(path, points)
    labels = [int(value) for value in earth_samples(scl, points, mask=True)]
    return {"id": item["id"], "source": S2, "datetime": item["properties"]["datetime"],
            "visualAsset": visual, "classificationAsset": scl, "preview": "/evidence/" + PREVIEW.name,
            "classification": {str(n): labels.count(n) for n in sorted(set(labels))}}


def main():
    catalog = json.loads((ROOT / "data/catalog-validation.json").read_text(encoding="utf8"))
    candidate = next(c for c in catalog["candidates"] if c["id"] == 55742)
    moon = json.loads((ROOT / "data/planetary/moon-mons-mouton.json").read_text(encoding="utf8"))
    earth = list(grid(candidate["lat"], candidate["lon"], 6371000))
    lunar = list(grid(moon["center"]["lat"], moon["center"]["lon"], 1737400))
    bundle = {
        "candidateId": candidate["id"], "referenceId": moon["id"], "spacingM": SPACING, "side": SIDE,
        "retrievedAt": datetime.now(timezone.utc).isoformat(), "terrain": [], "failures": {},
        "lroc": {"id": "NAC_ROI_MOUTNPLTLO1_P843S0306", "source": LROC, "preview": LROC_IMAGE,
                 "nativePixelM": 1, "from": "2010-07-28", "to": "2023-04-04"},
    }
    bundle["terrain"].append({"id": "lola", "name": "LRO/LOLA", "source": moon["imageUrl"],
                             "nativeM": moon["nativeCellM"], "values": moon_samples(moon["window"], lunar)})
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT="35", GDAL_HTTP_MAX_RETRY="1"):
        for key, name, source in [("glo30", "Copernicus GLO-30", GLO), ("aw3d30", "JAXA AW3D30 v4.1", AW)]:
            try:
                asset = source
                quality = {}
                if key == "aw3d30":
                    assets = load(AW)["assets"]
                    asset = urljoin(AW, assets["DSM"]["href"])
                    mask_asset = urljoin(AW, assets["MSK"]["href"])
                    quality = {"maskAsset": mask_asset, "maskValues": earth_samples(mask_asset, earth, mask=True)}
                bundle["terrain"].append({"id": key, "name": name, "source": source, "asset": asset,
                                         "nativeM": 30, "values": earth_samples(asset, earth), **quality})
            except Exception as exc:
                bundle["failures"][key] = str(exc)
        try:
            bundle["sentinel"] = sentinel(earth)
        except Exception as exc:
            bundle["failures"]["sentinel"] = str(exc)
    bundle["coordinates"] = {"earthLonLat": earth, "moonLonLat": lunar}
    OUT.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf8")
    print("Products:", [p["id"] for p in bundle["terrain"]], bundle.get("sentinel", {}).get("id"))
    print("Failures:", bundle["failures"])


if __name__ == "__main__":
    main()
