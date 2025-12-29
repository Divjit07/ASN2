// augment-photos-picsum.mjs
// CSV -> JSON, adds stable Picsum images (random theme, deterministic by seed)
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const INPUT_CSV   = process.argv[2] || 'airbnb_data.csv';
const OUTPUT_JSON = process.argv[3] || 'airbnb_with_photos.json';

const THUMB = { w: 400, h: 300 };
const FULL  = { w: 600, h: 400 };

// Prefer numeric listing id for a stable seed; fallback to row index
function seedFor(rec, idx) {
  const idRaw = rec.id ?? rec.ID ?? rec['listing id'] ?? rec['listing_id'];
  if (idRaw !== undefined) {
    const n = parseInt(String(idRaw).replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(n)) return n;
  }
  return idx;
}

// Build Picsum URLs (deterministic per seed)
const pThumb = (seed) => `https://picsum.photos/seed/${encodeURIComponent(String(seed))}/${THUMB.w}/${THUMB.h}`;
const pFull  = (seed) => `https://picsum.photos/seed/${encodeURIComponent(String(seed))}/${FULL.w}/${FULL.h}`;

try {
  const raw  = fs.readFileSync(INPUT_CSV, 'utf8').replace(/^\uFEFF/, '');
  const rows = parse(raw, { columns: true, skip_empty_lines: true });

  const augmented = rows.map((rec, idx) => {
    const seed = seedFor(rec, idx);
    return {
      ...rec,
      thumbnail: pThumb(seed),
      images: [ pFull(`${seed}a`), pFull(`${seed}b`), pFull(`${seed}c`) ]
    };
  });

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(augmented, null, 2));
  console.log(`✅ Wrote ${OUTPUT_JSON} with ${augmented.length} rows (provider=Picsum)`);
} catch (err) {
  console.error('❌ Failed:', err.message);
  process.exit(1);
}
