// Leonida Trophy Guide — entry program (Node 22, standard library only).
//
// The guide itself is a plain static site: app/index.html plus its scripts,
// styles, and app/data/trophies.json. There is no build step and nothing is
// fetched from the network at runtime, so the whole thing works offline.
//
// This file is only the hand-in step. It copies the app/ folder and the
// screenshots/ folder next to this file into the output directory, then asks
// the vendored make.fun helper to write dossier.json there — the summary the
// judge reads (screenshots, the first load's files and bytes, and the source
// of this entry). The helper in vendor/ is used exactly as shipped.
//
// Run it locally like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader's container the output directory is /output, which is
// also the default when MAKEFUN_OUTPUT_DIR is not set.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The folder this file lives in — app/ and screenshots/ sit beside it.
const here = fileURLToPath(new URL('.', import.meta.url));

// Where the finished entry goes. The grader uses /output; local runs can
// point somewhere else with MAKEFUN_OUTPUT_DIR.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy the whole guide into the output directory first.
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });

// Screenshots are optional on disk but expected by the dossier, so make sure
// the folder exists in the output even if this checkout has none yet.
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own limits: at most 163840 bytes of text,
// at most 4 screenshots of at most 262144 bytes each, and at most 993 files
// totalling 50331648 bytes inside app/. Anything past a cap is refused
// instead of silently trimmed, so keep the guide inside them.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
