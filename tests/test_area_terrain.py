import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from area_terrain import aggregate, edges, metrics, native_record


class AreaTerrainTests(unittest.TestCase):
    def test_constant_area_and_missing_pixel(self):
        source = np.arange(5, dtype=float)
        target = np.array([0, 2, 4], dtype=float)
        raw = np.full((4, 4), 100.)
        mean, coverage = aggregate(raw, source, source, target, target)
        np.testing.assert_allclose(mean, 100)
        np.testing.assert_allclose(coverage, 1)
        raw[0, 0] = np.nan
        mean, coverage = aggregate(raw, source, source, target, target)
        self.assertTrue(np.isnan(mean[0, 0]))
        self.assertLess(coverage[0, 0], 1)
        self.assertAlmostEqual(mean[1, 1], 100)

    def test_spherical_area_weighting_is_not_unweighted_pixel_average(self):
        raw = np.array([[0., 0.], [100., 100.]])
        mean, _ = aggregate(raw, np.array([0.,1.,2.]), np.array([0.,30.,60.]),
                            np.array([0.,2.]), np.array([0.,60.]))
        expected = 100*(np.sin(np.pi/3)-np.sin(np.pi/6))/np.sin(np.pi/3)
        self.assertAlmostEqual(mean[0,0], expected)
        self.assertNotAlmostEqual(mean[0,0],50)

    def test_full_archived_window_recomputes_from_pixels_and_masks(self):
        report=json.loads((ROOT/'data/pilot-area-terrain.json').read_text())
        native=json.loads((ROOT/'data/pilot-area-terrain-native.json').read_text())
        for product in report['products']:
            record=next(p for p in native['products'] if p['id']==product['id'])
            raw=np.array(record['values'],dtype=float).reshape(record['rows'],record['cols'])
            self.assertEqual(native_record(raw,record['lonEdges'],record['latEdges'])['sha256'],record['sha256'])
            if 'maskValues' in record:
                mask=np.array(record['maskValues'],dtype=float).reshape(raw.shape)
                raw[(~np.isfinite(mask)) | (mask!=0)]=np.nan
            for scale in product['scales']:
                mean,coverage=aggregate(raw,record['lonEdges'],record['latEdges'],scale['lonEdges'],scale['latEdges'])
                np.testing.assert_allclose(mean.ravel(),scale['values'],atol=1e-9)
                np.testing.assert_allclose(coverage.ravel(),scale['coverage'],atol=1e-10)
                for key,value in metrics(mean,scale['spacingM']).items():
                    self.assertAlmostEqual(value,scale['metrics'][key],places=9)
        self.assertIsNone(report['uncertainty']['absoluteVerticalErrorM'])
        self.assertIsNone(report['uncertainty']['lunarVerticalErrorM'])

    def test_common_physical_support_on_both_bodies(self):
        for lat,lon,radius in [(-15.4191,-72.36447,6371000),(-84.6,31,1737400)]:
            x,y=edges(lat,lon,radius)
            self.assertEqual(len(x),9)
            self.assertAlmostEqual(np.radians(y[-1]-y[0])*radius,4000,places=6)
            self.assertAlmostEqual(np.radians(x[-1]-x[0])*radius*np.cos(np.radians(lat)),4000,places=6)

    def test_catalog_archive_covers_each_comparable_site_and_reference(self):
        def load(name):
            return json.loads((ROOT / 'data' / name).read_text(encoding='utf8'))
        archive = load('catalog-area-terrain.json')
        contrasts = load('contrast-validation.json')
        expected = {str(r['id']) for batch in contrasts for r in batch['results'] if r['signature']}
        self.assertEqual(set(archive['sites']), expected)
        self.assertEqual(set(archive['references']), {p['id'] for p in [
            load('planetary/moon-hadley.json'), load('planetary/moon-mons-mouton.json'), load('planetary/mars-insight.json'),
        ]})
        products = [s['product'] for s in archive['sites'].values()] + list(archive['references'].values())
        for product in products:
            self.assertEqual([(s['spacingM'], s['completeCells']) for s in product['scales']], [(500, 64), (1000, 16)])
            for s in product['scales']:
                values = np.array(s['values']).reshape(s['side'], s['side'])
                for key, expected_value in metrics(values, s['spacingM']).items():
                    self.assertAlmostEqual(expected_value, s['metrics'][key], places=9)


if __name__ == '__main__':
    unittest.main()
