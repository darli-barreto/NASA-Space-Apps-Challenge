"""Acquire the complete 4 km pilot window; preserve quality flags and source pixels."""
import json
from datetime import datetime, timezone
import numpy as np
from area_terrain import ROOT, edges, window, summarize, numbers, native_record


def read(path):
    return json.loads((ROOT/path).read_text(encoding='utf8'))


def main():
    pilot = read('data/pilot-evidence.json')
    moon = read('data/planetary/moon-mons-mouton.json')
    lon, lat = pilot['coordinates']['earthLonLat'][40]
    products, natives = [], []
    for source in pilot['terrain']:
        lunar = source['id'] == 'lola'
        center = moon['center'] if lunar else dict(lat=lat,lon=lon)
        radius = moon['radiusKm']*1000 if lunar else 6371000
        tx,ty = edges(center['lat'],center['lon'],radius)
        print('Reading all overlapping pixels:',source['id'],flush=True)
        if lunar:
            w = moon['window']
            raw = np.array(w['values'],dtype=float).reshape(w['rows'],w['cols'])[::-1].copy()
            raw[raw == -32768] = np.nan
            raw *= w['scale']
            sx = w['west']+np.arange(w['cols']+1)/w['ppd']
            sy = w['north']-np.arange(w['rows'],-1,-1)/w['ppd']
        else:
            raw,sx,sy = window(source['asset'],tx,ty)
            raw[(raw < -500) | (raw > 9000)] = np.nan
        strict = raw.copy()
        quality = dict(policy='NODATA only; per-pixel accuracy unknown',maskSource=None,excludedPixels=0)
        native = native_record(raw,sx,sy)
        if 'maskAsset' in source:
            mask,mx,my = window(source['maskAsset'],tx,ty)
            if not (np.array_equal(sx,mx) and np.array_equal(sy,my)):
                raise ValueError('Mask is not registered to the DSM')
            rejected = ~np.isfinite(mask) | (mask != 0)
            strict[rejected] = np.nan
            quality = dict(policy='Conservative: only MSK=0; excludes fill, water and low-correlation flags as well as invalid pixels',
                           maskSource=source['maskAsset'],excludedPixels=int(rejected.sum()),
                           counts={str(int(k)):int(v) for k,v in zip(*np.unique(mask[np.isfinite(mask)],return_counts=True))})
            native['maskValues'] = numbers(mask)
        scopes = []
        for step in [500,1000]:
            x,y = edges(center['lat'],center['lon'],radius,step)
            scopes.append(dict(**summarize(strict,sx,sy,x,y,step),
                               unfiltered=summarize(raw,sx,sy,x,y,step),lonEdges=numbers(x),latEdges=numbers(y)))
        products.append(dict(id=source['id'],name=source['name'],source=source['source'],asset=source.get('asset',source['source']),
                             nativePixelM=source['nativeM'],quality=quality,sourcePixels=int(raw.size),scales=scopes,
                             nativeSha256=native['sha256']))
        natives.append(dict(id=source['id'],**native))
    earth = [p for p in products if p['id'] != 'lola']
    disagreement = []
    for i,step in enumerate([500,1000]):
        a,b = [np.array(p['scales'][i]['values'],dtype=float) for p in earth]
        valid = np.isfinite(a) & np.isfinite(b)
        delta = a[valid]-b[valid]
        disagreement.append(dict(spacingM=step,pairedCells=int(valid.sum()),
            meanOffsetM=float(np.mean(delta)) if delta.size else None,
            centeredRmseM=float(np.sqrt(np.mean((delta-np.mean(delta))**2))) if delta.size else None,
            interpretation='Inter-product disagreement after constant offset removal; not absolute accuracy or a confidence interval.'))
    report = dict(version='full-window-area-v1',candidateId=pilot['candidateId'],referenceId=pilot['referenceId'],
        retrievedAt=datetime.now(timezone.utc).isoformat(),extentM=4000,order='south-to-north, west-to-east',
        method='Mean weighted by spherical overlap area of all original pixels; require full valid area per cell; no gap filling.',
        products=products,uncertainty=dict(absoluteVerticalErrorM=None,lunarVerticalErrorM=None,earthProductDisagreement=disagreement),
        limitations=['Equal nominal cell support, not equal effective sensor resolution.',
          'GLO-30 and LOLA: NODATA checked; no per-pixel quality or height-error mask acquired.',
          'AW3D30 strict selection is a conservative project policy, not a claim that every nonzero flag is invalid.',
          'Different Earth vertical datums: absolute mean offset is not a measured elevation error.',
          'Gradients of cell means are not local slopes; no landing or mobility certification.'])
    (ROOT/'data/pilot-area-terrain-native.json').write_text(json.dumps(dict(products=natives),allow_nan=False)+'\n',encoding='utf8')
    (ROOT/'data/pilot-area-terrain.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf8')
    print([(p['id'],p['sourcePixels'],p['scales'][0]['completeCells']) for p in products])
    print(disagreement)


if __name__ == '__main__':
    main()
