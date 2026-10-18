import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputDir = join(root, 'public', 'assets', 'maps');
const imagePath = join(outputDir, 'regional-satellite.jpg');
const force = process.argv.includes('--force');

const endpoint = new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi');
const parameters = {
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  VERSION: '1.1.1',
  LAYERS: 'BlueMarble_ShadedRelief_Bathymetry',
  STYLES: '',
  FORMAT: 'image/jpeg',
  TRANSPARENT: 'false',
  WIDTH: '1024',
  HEIGHT: '1536',
  SRS: 'EPSG:4326',
  BBOX: '-124.6,43.2,-122.8,45.9',
};
Object.entries(parameters).forEach(([key, value]) => endpoint.searchParams.set(key, value));

await mkdir(outputDir, { recursive: true });
if (!force && (await exists(imagePath))) {
  console.log('Regional satellite image already exists. Use --force to refresh it.');
  process.exit(0);
}

console.log(`Downloading selected NASA GIBS imagery: ${endpoint.href}`);
const response = await fetch(endpoint, { redirect: 'follow' });
if (!response.ok) {
  throw new Error(`NASA GIBS request failed (${response.status} ${response.statusText}).`);
}
if (response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg') !== true) {
  throw new Error(`NASA GIBS returned an unexpected content type: ${response.headers.get('content-type')}`);
}

const image = Buffer.from(await response.arrayBuffer());
if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
  throw new Error('NASA GIBS response is not a valid JPEG signature.');
}
if (image.length > 10 * 1024 * 1024) {
  throw new Error('NASA GIBS response exceeded the 10 MB asset limit.');
}

const provenance = {
  id: 'regional-satellite-nasa-blue-marble',
  source: 'NASA Earthdata Global Imagery Browse Services (GIBS)',
  sourcePage: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api',
  mediaPolicy: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  request: endpoint.href,
  layer: parameters.LAYERS,
  boundingBox: parameters.BBOX,
  fetchedAt: new Date().toISOString(),
  bytes: image.length,
  credit: 'NASA Earth Observatory / NASA Earthdata GIBS',
  note: 'Locally bundled visual backdrop for a fictional game map; not current or navigational data. No NASA endorsement is implied.',
};

await writeFile(imagePath, image);
await writeFile(
  join(outputDir, 'regional-satellite.source.json'),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
await writeFile(
  join(outputDir, 'REGIONAL-SATELLITE-NOTICE.txt'),
  [
    `Credit: ${provenance.credit}`,
    `Source API: ${provenance.sourcePage}`,
    `NASA media guidelines: ${provenance.mediaPolicy}`,
    'NASA material is generally not protected by copyright unless otherwise noted; NASA identifiers and logos are excluded.',
    'This fictional ATC game does not imply NASA endorsement and does not present the image as current or navigational data.',
    '',
  ].join('\n'),
);
console.log(`Installed regional satellite image (${image.length} bytes).`);

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
