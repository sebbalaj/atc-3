import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, '.cache', 'assets');
const vendorDir = join(root, 'assets', 'vendor');
const force = process.argv.includes('--force');

const packs = [
  {
    id: 'kenney-top-down-shooter',
    page: 'https://kenney.nl/assets/top-down-shooter',
    url: 'https://kenney.nl/media/pages/assets/top-down-shooter/230204340a-1677694684/kenney_top-down-shooter.zip',
    license: 'Creative Commons CC0 1.0 Universal (public domain dedication)',
  },
];

await mkdir(cacheDir, { recursive: true });
await mkdir(vendorDir, { recursive: true });

for (const pack of packs) {
  const destination = join(vendorDir, pack.id);
  const marker = join(destination, '.source.json');

  if (!force && (await exists(marker))) {
    console.log(`Skipping ${pack.id}; already fetched. Use --force to refresh.`);
    continue;
  }

  const archivePath = join(cacheDir, basename(new URL(pack.url).pathname));
  const temporaryDestination = `${destination}.tmp`;

  console.log(`Downloading ${pack.id} from ${pack.page}`);
  const response = await fetch(pack.url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Asset download failed (${response.status} ${response.statusText}): ${pack.url}`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  if (archive.length < 4 || archive.subarray(0, 2).toString('ascii') !== 'PK') {
    throw new Error(`Downloaded file is not a ZIP archive: ${pack.url}`);
  }

  await writeFile(archivePath, archive);
  await rm(temporaryDestination, { recursive: true, force: true });
  await mkdir(temporaryDestination, { recursive: true });
  await extractArchiveSafely(archive, temporaryDestination);

  const metadata = {
    ...pack,
    fetchedAt: new Date().toISOString(),
    archiveBytes: archive.length,
    note: 'Files are optional placeholders. Runtime art remains replaceable and procedurally generated where practical.',
  };
  await writeFile(join(temporaryDestination, '.source.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(
    join(temporaryDestination, 'ASSET-LICENSE.txt'),
    [
      `Source: ${pack.page}`,
      `Download: ${pack.url}`,
      `License: ${pack.license}`,
      'Kenney states that attribution is not required. Source metadata is retained for auditing.',
      '',
    ].join('\n'),
  );

  await rm(destination, { recursive: true, force: true });
  await rename(temporaryDestination, destination);
  const writtenMarker = JSON.parse(await readFile(marker, 'utf8'));
  console.log(`Installed ${writtenMarker.id} (${writtenMarker.archiveBytes} bytes).`);
}

async function extractArchiveSafely(archive, destination) {
  const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
  const MAX_EXTRACTED_BYTES = 250 * 1024 * 1024;
  const MAX_FILES = 5_000;

  if (archive.length > MAX_ARCHIVE_BYTES) {
    throw new Error(`Asset archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
  }

  const entries = Object.entries(unzipSync(archive));
  if (entries.length > MAX_FILES) {
    throw new Error(`Asset archive contains more than ${MAX_FILES} entries.`);
  }

  const destinationRoot = `${resolve(destination)}${sep}`;
  let extractedBytes = 0;

  for (const [archiveName, data] of entries) {
    const safeName = archiveName.replace(/\\/g, '/');
    const segments = safeName.split('/').filter(Boolean);
    const unsafe =
      safeName.startsWith('/') ||
      /^[a-zA-Z]:/.test(safeName) ||
      segments.some((segment) => segment === '..');

    if (unsafe || segments.length === 0) {
      throw new Error(`Unsafe ZIP entry path rejected: ${archiveName}`);
    }

    const outputPath = resolve(destination, ...segments);
    if (!outputPath.startsWith(destinationRoot)) {
      throw new Error(`ZIP entry escaped destination: ${archiveName}`);
    }

    extractedBytes += data.byteLength;
    if (extractedBytes > MAX_EXTRACTED_BYTES) {
      throw new Error(`Expanded asset archive exceeds ${MAX_EXTRACTED_BYTES} bytes.`);
    }

    if (safeName.endsWith('/')) {
      await mkdir(outputPath, { recursive: true });
      continue;
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, data, { flag: 'wx' });
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
