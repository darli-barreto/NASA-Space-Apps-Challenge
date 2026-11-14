"""Area-weighted aggregation of every overlapping source pixel; no gap filling."""
import hashlib
import math
from tempfile import NamedTemporaryFile
from pathlib import Path
from urllib.request import urlopen
import numpy as np
import rasterio
from rasterio.windows import Window, from_bounds

ROOT = Path(__file__).resolve().parents[1]


def edges(lat, lon, radius_m, step=500, extent=4000):
    offsets = np.linspace(-extent/2, extent/2, int(extent/step)+1)
    return (lon + np.degrees(offsets/(radius_m*math.cos(math.radians(lat)))),
            lat + np.degrees(offsets/radius_m))


def overlaps(target, source):
    return np.maximum(0, np.minimum(target[1:, None], source[None, 1:]) -
                      np.maximum(target[:-1, None], source[None, :-1]))


def aggregate(raw, sx, sy, tx, ty):
    wx = overlaps(np.radians(tx), np.radians(sx))
    wy = overlaps(np.sin(np.radians(ty)), np.sin(np.radians(sy)))
    expected = np.outer(np.diff(np.sin(np.radians(ty))), np.diff(np.radians(tx)))
    valid = np.isfinite(raw)
    weights = wy @ valid.astype(float) @ wx.T
    coverage = np.clip(weights/expected, 0, 1)
    means = np.divide(wy @ np.where(valid, raw, 0) @ wx.T, weights,
                      out=np.full_like(weights, np.nan), where=weights > 0)
    means[coverage < 1-1e-8] = np.nan
    return means, coverage


def numbers(array):
    return [float(v) if np.isfinite(v) else None for v in np.asarray(array).flat]


def window(url, tx, ty):
    cache = ROOT / '.cache' / 'dem'
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / (hashlib.sha256(url.encode()).hexdigest()+'.tif')
    if not path.exists():
        import shutil
        from urllib.request import Request
        partial = None
        try:
            with NamedTemporaryFile(dir=cache, suffix='.part', delete=False) as out:
                partial = Path(out.name)
                with urlopen(Request(url, headers={'User-Agent': 'TERRA/1.0'}), timeout=20) as response:
                    shutil.copyfileobj(response, out)
            partial.replace(path)
        finally:
            if partial is not None:
                partial.unlink(missing_ok=True)
    with rasterio.open(path) as ds:
        if ds.crs.to_epsg() != 4326 or ds.transform.b or ds.transform.d:
            raise ValueError('Expected unrotated EPSG:4326 raster')
        w = from_bounds(tx[0], ty[0], tx[-1], ty[-1], ds.transform)
        x0, y0 = math.floor(w.col_off), math.floor(w.row_off)
        x1, y1 = math.ceil(w.col_off+w.width), math.ceil(w.row_off+w.height)
        if not (0 <= x0 < x1 <= ds.width and 0 <= y0 < y1 <= ds.height):
            raise ValueError('Source does not cover the requested window')
        raw = ds.read(1, window=Window(x0,y0,x1-x0,y1-y0), masked=True).astype(float).filled(np.nan)[::-1]
        sx = ds.transform.c + ds.transform.a*np.arange(x0,x1+1)
        sy = ds.transform.f + ds.transform.e*np.arange(y1,y0-1,-1)
    return raw, sx, sy


def metrics(z, step):
    if not np.isfinite(z).all():
        return None
    gradients = np.degrees(np.arctan(np.concatenate((np.abs(np.diff(z,axis=0)).ravel(),
                                                     np.abs(np.diff(z,axis=1)).ravel()))/step))
    deviations = z[1:-1,1:-1] - (z[:-2,1:-1]+z[2:,1:-1]+z[1:-1,:-2]+z[1:-1,2:])/4
    return dict(relief=float(np.ptp(z)), centralRelief=float(np.percentile(z,90)-np.percentile(z,10)),
                medianGradient=float(np.median(gradients)), highGradient=float(np.percentile(gradients,90)),
                localDeviation=float(np.sqrt(np.mean(deviations**2))))


def summarize(raw, sx, sy, tx, ty, step):
    means, coverage = aggregate(raw,sx,sy,tx,ty)
    return dict(side=len(tx)-1, spacingM=step, values=numbers(means), coverage=numbers(coverage),
                completeCells=int(np.isfinite(means).sum()), totalCells=means.size,
                metrics=metrics(means,step))


def native_record(raw, sx, sy):
    return dict(rows=raw.shape[0], cols=raw.shape[1], values=numbers(raw),
                lonEdges=numbers(sx), latEdges=numbers(sy),
                sha256=hashlib.sha256(raw.astype('<f8').tobytes()).hexdigest())
