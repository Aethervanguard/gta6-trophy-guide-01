// Leonida Trophy Guide — the entry program (Node 22, standard library only).
//
// The guide itself is plain static files under app/: index.html, style.css,
// app.js and data/trophies.json. It needs no build step and loads nothing over
// the network at run time — the browser only fetches the local data file.
// This program hands the entry in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun library.
//
// vendor/makefun-frontend.ts is the kit's copy and must stay untouched: the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Local check (outside the grader's container, /output is replaced):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the directory this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));
// The grader sets /output; locally MAKEFUN_OUTPUT_DIR stands in for it.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// The whole app: pages, styles, scripts and the trophy data.
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
// The screenshots the judge sees first (the first by name is the cover).
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// buildDossier refuses anything the scorer would refuse, so a bad entry
// fails here loudly instead of passing silently: at most 4 screenshots,
// each at most 256 KiB; at most 993 files and 48 MiB in app/ (the output
// as a whole shares the platform's 1000-entry cap with screenshots/ and
// dossier.json, so the app leaves room for both).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
