"""Extract separate RADARSAT-1 and Mini-RF evidence for the pilot."""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import Request, urlopen
from shutil import copyfileobj

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import GCPTransformer
from rasterio.warp import transform
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parents[1]
EODMS = "https://www.eodms-sgdot.nrcan-rncan.gc.ca/search/collections/"
RADARSAT = EODMS + "Radarsat-1-L1-COG/items/b5017f66-b39a-5d89-9f5f-cbbeb0050106"
MINI = ("https://pds-geosciences.wustl.edu/lro/lro-l-mrflro-5-global-mosaic-v1/"
        "lromrf_1001/data/128ppd/global_cpr_128ppd_simp_0c")
PREVIEW = ROOT / "public/evidence/radarsat-55742.jpg"


def read(url):
    with urlopen(url, timeout=35) as response:
        return response.read()


def inside(point, ring):
    x, y = point
    return sum((a[1] > y) != (b[1] > y) and
               x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]
               for a, b in zip(ring, ring[1:])) % 2 == 1


def read_crop(asset, points):
    with rasterio.open(asset) as ds:
        gcps, gcp_crs = ds.gcps
        if ds.crs:
            crs = ds.crs
            xs, ys = transform("EPSG:4326", crs, *zip(*points))
            rr, cc = zip(*(ds.index(x, y) for x, y in zip(xs, ys)))
        elif gcps and gcp_crs:
            crs = gcp_crs
            xs, ys = transform("EPSG:4326", crs, *zip(*points))
            with GCPTransformer(gcps) as georeference:
                rr, cc = georeference.rowcol(xs, ys)
        else:
            raise ValueError("RADARSAT lacks georeferencing")
        window = Window(min(cc), min(rr), max(cc)-min(cc)+1, max(rr)-min(rr)+1)
        if window.intersection(Window(0, 0, ds.width, ds.height)) != window:
            raise ValueError("RADARSAT image does not contain window")
        image = ds.read(1, window=window, out_shape=(440, 440),
                        masked=True, resampling=Resampling.nearest)
        return image, {"crs": str(crs), "window": [int(v) for v in window.flatten()], "controlPoints": len(gcps),
                       "dtype": ds.dtypes[0], "nodata": ds.nodata}


def radarsat(points):
    item = json.loads(read(RADARSAT))
    asset = item["assets"]["cog"]["href"]
    ring = item["geometry"]["coordinates"][0]
    # Check the entire requested envelope, not merely the STAC bounding box.
    lon, lat = zip(*points)
    if not all(inside((x,y), ring) for x in (min(lon),max(lon)) for y in (min(lat),max(lat))):
        raise ValueError("RADARSAT footprint does not cover pilot envelope")
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT="20"):
        try:
            image, metadata = read_crop(asset, points)
        except rasterio.errors.RasterioIOError:
            with TemporaryDirectory() as directory:
                path = Path(directory) / "radarsat.tif"
                with urlopen(asset, timeout=45) as response, path.open("wb") as dest:
                    copyfileobj(response, dest)
                image, metadata = read_crop(path, points)
    valid = image.compressed()
    low, high = np.percentile(valid, [2,98])
    if not high > low:
        raise ValueError("RADARSAT preview lacks a display range")
    stretched = np.clip((image.astype(float)-low)*255/(high-low), 0, 255)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(stretched.filled(0).astype(np.uint8)).save(PREVIEW, quality=90)
    props = item["properties"]
    return {"id": item["id"], "source": RADARSAT, "asset": asset, "footprint": item["geometry"],
            "preview": "/evidence/" + PREVIEW.name, "date": props["datetime"],
            "resolutionM": props["resolution"], "polarizations": props["sar:polarizations"],
            "frequencyBand": props["sar:frequency_band"], "native": metadata,
            "displayStretch": [float(low),float(high)], "validDisplayPixels": int(valid.size),
            "licence": "https://www.asc-csa.gc.ca/eng/satellites/radarsat1/data-access.asp"}


def mini_rf(points):
    label = read(MINI + ".lbl")
    def field(key):
        return re.search(rb"^\s*" + key.encode() + rb"\s*=\s*([^\r\n]+)", label, re.M)[1].strip()
    width, height = int(field("LINE_SAMPLES")), int(field("LINES"))
    if (width, height, field("SAMPLE_TYPE"), int(field("SAMPLE_BITS"))) != (46080,23040,b"PC_REAL",32):
        raise ValueError("Unexpected Mini-RF raster layout")
    if not (field("MAP_PROJECTION_TYPE") == b'"SIMPLE CYLINDRICAL"' and
            field("MAP_RESOLUTION").split()[0] == b"128.0" and
            float(field("SCALING_FACTOR")) == 1 and float(field("OFFSET")) == 0 and
            field("WESTERNMOST_LONGITUDE").split()[0] == b"-180.0" and
            field("MAXIMUM_LATITUDE").split()[0] == b"90.0"):
        raise ValueError("Unexpected Mini-RF coordinates or scale")
    indices = [(int((90-y)*128), int((x+180)*128)) for x,y in points]
    first, last = min(r for r,_ in indices), max(r for r,_ in indices)
    start, end = first*width*4, (last+1)*width*4-1
    request = Request(MINI + ".img", headers={"Range": f"bytes={start}-{end}"})
    with urlopen(request, timeout=45) as response:
        if response.status != 206 or response.headers.get("Content-Range") != f"bytes {start}-{end}/{width*height*4}":
            raise ValueError("Mini-RF range not honored")
        raw = response.read(end-start+2)
    if len(raw) != end-start+1:
        raise ValueError("Incomplete Mini-RF range")
    data = np.frombuffer(raw, dtype="<f4").reshape(last-first+1,width)
    values = [float(data[r-first,c]) for r,c in indices]
    # ISIS special pixels are negative. CPR itself is a nonnegative ratio.
    values = [x if np.isfinite(x) and x >= 0 else None for x in values]
    return {"id": field("PRODUCT_ID").decode().strip('"'), "source": MINI+".img", "labelUrl": MINI+".lbl",
            "labelSha256": hashlib.sha256(label).hexdigest(), "from": field("START_TIME").decode(),
            "to": field("STOP_TIME").decode(), "band": "S", "quantity": "CPR", "pixelsPerDegree": 128,
            "range": {"start": start, "end": end, "sha256": hashlib.sha256(raw).hexdigest()},
            "values": values}


def main():
    pilot = json.loads((ROOT/"data/pilot-evidence.json").read_text(encoding="utf8"))
    bundle = {"candidateId": pilot["candidateId"], "referenceId": pilot["referenceId"],
              "retrievedAt": datetime.now(timezone.utc).isoformat(), "spacingM": pilot["spacingM"],
              "radarsat": radarsat(pilot["coordinates"]["earthLonLat"]),
              "miniRf": mini_rf(pilot["coordinates"]["moonLonLat"])}
    bundle["rcmSearch"] = EODMS + "RCMImageProducts/items?bbox=-72.39,-15.44,-72.34,-15.40&limit=3"
    bundle["rcmMatches"] = len(json.loads(read(bundle["rcmSearch"]))["features"])
    (ROOT/"data/pilot-radar.json").write_text(json.dumps(bundle, indent=2)+"\n",encoding="utf8")
    print("RADARSAT", bundle["radarsat"]["id"], "Mini-RF valid nodes:",
          sum(x is not None for x in bundle["miniRf"]["values"]), "RCM:", bundle["rcmMatches"])


if __name__ == "__main__":
    main()
