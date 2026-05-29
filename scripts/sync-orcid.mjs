#!/usr/bin/env node
/**
 * Syncs publications from ORCID + CrossRef into src/content/cv/index.json.
 *
 * - Fetches all works from ORCID public API (no auth needed)
 * - For each DOI not already in the JSON, fetches full metadata from CrossRef
 * - Preserves existing `role` and `pdb_ids` fields for matched DOIs
 * - Sorts by year descending
 * - Writes the result back to cv/index.json
 *
 * Usage:  node scripts/sync-orcid.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir   = dirname(fileURLToPath(import.meta.url));
const CV_PATH = resolve(__dir, '../src/content/cv/index.json');
const ORCID   = '0000-0001-6324-8722';

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': 'personal-site-sync/1.0', ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// ── 1. Fetch all ORCID works ──────────────────────────────────────────────────
console.log('Fetching ORCID works…');
const orcidData = await get(
  `https://pub.orcid.org/v3.0/${ORCID}/works`,
  { Accept: 'application/json' }
);

const orcidWorks = orcidData.group.flatMap(g => g['work-summary']).map(w => {
  const doi = w['external-ids']?.['external-id']
    ?.find(e => e['external-id-type'] === 'doi')
    ?.['external-id-value']?.toLowerCase()
    ?.trim();
  return {
    doi,
    title: w.title?.title?.value,
    year:  parseInt(w['publication-date']?.year?.value ?? '0'),
    journal: w['journal-title']?.value,
  };
}).filter(w => w.doi);

// deduplicate by DOI (ORCID can list a paper multiple times from different sources)
const seen = new Set();
const uniqueWorks = orcidWorks.filter(w => {
  if (seen.has(w.doi)) return false;
  seen.add(w.doi);
  return true;
});
console.log(`  Found ${uniqueWorks.length} unique works with DOIs`);

// ── 2. Load existing CV ───────────────────────────────────────────────────────
const cv = JSON.parse(readFileSync(CV_PATH, 'utf8'));
const existing = cv.publications ?? [];

// Build lookup by normalised DOI
const existingByDoi = Object.fromEntries(
  existing.map(p => [p.doi?.toLowerCase()?.trim(), p]).filter(([k]) => k)
);

// ── 3. Fetch CrossRef for any DOIs not already in CV ─────────────────────────
async function crossrefAuthors(doi) {
  try {
    const data = await get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    const item = data.message;
    const authors = (item.author ?? [])
      .map(a => [a.family, a.given ? a.given.replace(/(\w)\w+\s?/g, '$1.') : '']
        .filter(Boolean).join(', '))
      .join('; ');
    const title   = item.title?.[0] ?? null;
    const journal = item['container-title']?.[0] ?? item['short-container-title']?.[0] ?? null;
    const year    = item.published?.['date-parts']?.[0]?.[0]
                 ?? item['published-print']?.['date-parts']?.[0]?.[0]
                 ?? null;
    return { authors: authors || null, title: title || null, journal: journal || null, year: year || null };
  } catch {
    return null;
  }
}

let newCount = 0;
const merged = [];

for (const work of uniqueWorks) {
  const existing = existingByDoi[work.doi];
  if (existing) {
    // Keep existing entry as-is (preserves role, pdb_ids, etc.)
    merged.push(existing);
    continue;
  }

  // New paper — fetch full metadata from CrossRef
  process.stdout.write(`  [new] Fetching CrossRef for ${work.doi}… `);
  const cr = await crossrefAuthors(work.doi);

  // Decode HTML entities in title/journal from ORCID
  const cleanTitle   = (cr?.title   ?? work.title  ?? '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,'');
  const cleanJournal = (cr?.journal ?? work.journal ?? '').replace(/&amp;/g,'&');

  const entry = {
    authors: cr?.authors ?? '',
    title:   cleanTitle,
    journal: cleanJournal,
    year:    cr?.year ?? work.year,
    doi:     work.doi,
  };
  merged.push(entry);
  console.log(`added "${cleanTitle.slice(0, 60)}…"`);
  newCount++;

  // Be polite to CrossRef
  await new Promise(r => setTimeout(r, 200));
}

// ── 4. Sort newest first & write ──────────────────────────────────────────────
merged.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

cv.publications = merged;
writeFileSync(CV_PATH, JSON.stringify(cv, null, 2) + '\n', 'utf8');

console.log(`\nDone. ${newCount} new publication(s) added. Total: ${merged.length}`);
if (newCount > 0) {
  console.log('\nNew entries have no `role` set — edit cv/index.json or use the CMS to add first/co-first/corresponding etc.');
}
