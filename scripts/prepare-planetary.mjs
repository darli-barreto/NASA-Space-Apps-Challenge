// Reproducible small extracts of official NASA PDS binary rasters. No fabricated fallback.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript'), math = {};
runInNewContext(ts.transpileModule(await readFile(new URL('../lib/analog-math.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: math });
const moonBase = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/';
const marsBase = 'https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/';
const profiles = [
  { id: 'moon-hadley', body: 'Luna', name: 'Hadley–Apollo 15 · entorno del alunizaje', center: { lat: 26.13239, lon: 3.63330 }, radiusKm: 1737.4, base: moonBase, file: 'ldem_64', ppd: 64, north: 90, west: 0, width: 23040, height: 11520, endian: 'LE', scale: .5, version: 'V3.1', coordinateSource: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html', geologySource: 'https://science.nasa.gov/solar-system/analog-explorer/', description: 'Entorno de mare basáltico, rima y relieves próximos. La ventana incluye terreno heterogéneo; no representa toda la Luna ni el polo sur.', use: 'Reconocimiento geológico y planificación de recorridos a escala kilométrica; después, validar obstáculos y materiales en campo.' },
  { id: 'mars-insight', body: 'Marte', name: 'Elysium–InSight · entorno del aterrizaje', center: { lat: 4.50238, lon: 135.62343 }, radiusKm: 3396, base: marsBase, file: 'megt44n090hb', ppd: 128, north: 44, west: 90, width: 11520, height: 5632, endian: 'BE', scale: 1, version: '2.0', coordinateSource: 'https://ntrs.nasa.gov/citations/20200002910', geologySource: 'https://ntrs.nasa.gov/citations/20205003726', description: 'Llanura de lava basáltica recubierta por regolito. El basamento volcánico no implica que la superficie sea lava expuesta.', use: 'Planificación de reconocimiento en llanuras y emplazamiento de instrumentos; validar el regolito y la respuesta mecánica antes de ensayos.' },
];
profiles.push({
  ...profiles[0],
  id: 'moon-mons-mouton',
  name: 'Mons Mouton · región polar lunar',
  center: { lat: -84.60, lon: 31.00 },
  coordinateSource: 'https://planetarynames.wr.usgs.gov/Feature/16070',
  geologySource: 'https://www.hou.usra.edu/meetings/lpsc2024/pdf/2086.pdf',
  description: 'Ventana exploratoria centrada en la formación cartografiada por IAU/USGS. La comparación mide solo topografía; la geología polar de impactos difiere de las unidades lávicas del piloto peruano.',
  use: 'Diseñar recorridos de reconocimiento de relieve a escala kilométrica. Las condiciones térmicas, iluminación y transitabilidad requieren sus propios datos.',
});
const selected = process.argv.slice(2);
if (selected.some(id => !profiles.some(p => p.id === id))) throw new Error('Perfil desconocido');
const output = new URL('../data/planetary/', import.meta.url);
await mkdir(output, { recursive: true });
async function get(url, options = {}) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  return r;
}
for (const p of profiles.filter(p => !selected.length || selected.includes(p.id))) {
  const labelUrl = `${p.base}${p.file}.lbl`, imageUrl = `${p.base}${p.file}.img`;
  const label = await (await get(labelUrl)).text();
  const field = name => label.match(new RegExp(`^\\s*${name}\\s*=\\s*([^\\r\\n]+)`, 'm'))?.[1].trim().replaceAll('"', '');
  if (Number(field('LINE_SAMPLES')) !== p.width || Number(field('LINES')) !== p.height || Number(field('SAMPLE_BITS')) !== 16 || field('UNIT') !== 'METER' || field('SAMPLE_TYPE') !== (p.endian === 'LE' ? 'LSB_INTEGER' : 'MSB_INTEGER') || field('PRODUCT_VERSION_ID') !== p.version || (p.body === 'Luna' && Number(field('SCALING_FACTOR')) !== .5)) throw new Error(`Changed label: ${p.id}`);
  const grid = math.stencil(p.center, p.radiusKm, 2);
  const xs = grid.map(g => (g.lon - p.west) * p.ppd - .5), ys = grid.map(g => (p.north - g.lat) * p.ppd - .5);
  const x0 = Math.floor(Math.min(...xs)) - 1, x1 = Math.ceil(Math.max(...xs)) + 1;
  const y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1;
  const start = y0 * p.width * 2, end = (y1 + 1) * p.width * 2 - 1;
  const response = await get(imageUrl, { headers: { Range: `bytes=${start}-${end}` } });
  if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${p.width * p.height * 2}`) { await response.body?.cancel(); throw new Error('Server did not honor exact range'); }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== end - start + 1) throw new Error('Incomplete raster range');
  const values = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const offset = ((y - y0) * p.width + x) * 2;
    values.push(p.endian === 'LE' ? bytes.readInt16LE(offset) : bytes.readInt16BE(offset));
  }
  const window = { north: p.north - y0 / p.ppd, west: p.west + x0 / p.ppd, ppd: p.ppd, rows: y1 - y0 + 1, cols: x1 - x0 + 1, scale: p.scale, values };
  const samples = grid.map(point => ({ ...point, elevation: math.sampleRaster(point, window) }));
  const signature = math.signature(samples);
  if (!signature) throw new Error('Missing reference elevations');
  const reference = { id: p.id, body: p.body, name: p.name, center: p.center, radiusKm: p.radiusKm, description: p.description, use: p.use, coordinateSource: p.coordinateSource, geologySource: p.geologySource, dataset: field('DATA_SET_ID'), product: field('PRODUCT_ID'), version: field('PRODUCT_VERSION_ID'), observationStart: field('START_TIME'), observationEnd: field('STOP_TIME'), created: field('PRODUCT_CREATION_TIME'), retrievedAt: new Date().toISOString(), labelUrl, imageUrl, nativeCellM: 2 * Math.PI * p.radiusKm * 1000 / 360 / p.ppd, interpolation: 'Bilinear, 4 vecinos; pueden incluir celdas interpoladas por el productor. Sin garantía de observación láser en cada celda.', referenceSurface: p.body === 'Luna' ? 'Esfera de 1737.4 km; HEIGHT = DN × 0.5 m, sin sumar OFFSET.' : 'Areoide GMM3 (mgm1025), grado/orden 50; DN en metros.', sourceRange: { start, end, sha256: createHash('sha256').update(bytes).digest('hex') }, labelSha256: createHash('sha256').update(label).digest('hex'), window, samples, signature };
  await writeFile(new URL(`${p.id}.lbl`, output), label);
  await writeFile(new URL(`${p.id}.json`, output), JSON.stringify(reference, null, 2) + '\n');
  console.log(p.id, signature);
}
