#!/usr/bin/env node
// Inject `tokens: N` metadata into YAML frontmatter of all agents, skills, rules.
// Transparency only — not a budget. Authors should update when editing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { measureTokens } from './measure-tokens.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

// Collect target files
function walkDir(dir, pattern = /\.md$/) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(full);
      }
    }
  }
  return results;
}

function collectTargets() {
  const targets = new Set();

  // Agents
  for (const p of [
    'packages/core/agents',
    'packages/stack-agents',
    'packages/frontend-3d/agents',
    'packages/frontend-ui/agents',
  ]) {
    walkDir(path.join(ROOT, p)).forEach(f => targets.add(f));
  }

  // Extras flat files (only .md at top level of packages/extras)
  const extrasDir = path.join(ROOT, 'packages/extras');
  if (fs.existsSync(extrasDir)) {
    for (const entry of fs.readdirSync(extrasDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        targets.add(path.join(extrasDir, entry.name));
      }
    }
  }

  // Skills — only SKILL.md files
  for (const p of [
    'packages/core/skills',
    'packages/frontend-3d/skills',
    'packages/frontend-ui/skills',
  ]) {
    walkDir(path.join(ROOT, p), /^SKILL\.md$/).forEach(f => targets.add(f));
  }
  const skillsmp = path.join(ROOT, 'packages/extras/skillsmp-search/SKILL.md');
  if (fs.existsSync(skillsmp)) targets.add(skillsmp);

  // Rules
  for (const p of [
    'packages/core/rules',
    'packages/stack-rules',
    'packages/frontend-3d/rules',
    'packages/frontend-ui/rules',
  ]) {
    walkDir(path.join(ROOT, p)).forEach(f => targets.add(f));
  }

  return Array.from(targets).sort();
}

// Parse/modify frontmatter. Returns { status, oldTokens, newTokens, content }.
// status: 'updated' | 'inserted' | 'kept' | 'skipped-no-frontmatter' | 'skipped-malformed'
function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // Detect frontmatter: must start with "---\n" and have a closing "---\n" later
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    return { status: 'skipped-no-frontmatter' };
  }

  // Find end of frontmatter
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return { status: 'skipped-malformed' };
  }

  const frontmatterBlock = match[0];
  const frontmatterBody = match[1];
  const body = raw.slice(frontmatterBlock.length);
  const newTokens = Math.round(body.length / 4);

  // Look for existing tokens field
  const lines = frontmatterBody.split(/\r?\n/);
  const tokensIdx = lines.findIndex(l => /^tokens:\s*\d+\s*$/.test(l));

  if (tokensIdx !== -1) {
    const existing = parseInt(lines[tokensIdx].match(/^tokens:\s*(\d+)/)[1], 10);
    // Within ±20%? Leave alone.
    const tolerance = existing * 0.2;
    if (Math.abs(existing - newTokens) <= tolerance) {
      return { status: 'kept', oldTokens: existing, newTokens };
    }
    // Update in place
    lines[tokensIdx] = `tokens: ${newTokens}`;
    const newFrontmatter = `---\n${lines.join('\n')}\n---\n`;
    return {
      status: 'updated',
      oldTokens: existing,
      newTokens,
      content: newFrontmatter + body,
    };
  }

  // Insert. After `description:` line if exists, else before closing ---
  const descIdx = lines.findIndex(l => /^description:/.test(l));
  if (descIdx !== -1) {
    // Handle possible multi-line description (YAML block) — find next top-level key
    let insertAt = descIdx + 1;
    // If the description continues onto next lines (indented), skip those
    while (insertAt < lines.length && /^\s+/.test(lines[insertAt])) {
      insertAt++;
    }
    lines.splice(insertAt, 0, `tokens: ${newTokens}`);
  } else {
    lines.push(`tokens: ${newTokens}`);
  }

  const newFrontmatter = `---\n${lines.join('\n')}\n---\n`;
  return {
    status: 'inserted',
    newTokens,
    content: newFrontmatter + body,
  };
}

// Main
const targets = collectTargets();
const counts = { updated: 0, inserted: 0, kept: 0, skippedNoFm: 0, skippedMalformed: 0 };
const tokenValues = [];
const skipped = [];
const changes = [];

for (const file of targets) {
  const result = processFile(file);
  const rel = path.relative(ROOT, file);
  switch (result.status) {
    case 'updated':
      counts.updated++;
      tokenValues.push({ file: rel, tokens: result.newTokens });
      changes.push(`UPDATE ${rel}: ${result.oldTokens} → ${result.newTokens}`);
      if (!DRY_RUN) fs.writeFileSync(file, result.content);
      break;
    case 'inserted':
      counts.inserted++;
      tokenValues.push({ file: rel, tokens: result.newTokens });
      changes.push(`INSERT ${rel}: ${result.newTokens}`);
      if (!DRY_RUN) fs.writeFileSync(file, result.content);
      break;
    case 'kept':
      counts.kept++;
      tokenValues.push({ file: rel, tokens: result.oldTokens });
      break;
    case 'skipped-no-frontmatter':
      counts.skippedNoFm++;
      skipped.push(`${rel} — no frontmatter`);
      break;
    case 'skipped-malformed':
      counts.skippedMalformed++;
      skipped.push(`${rel} — malformed frontmatter`);
      break;
  }
}

console.log(`\n=== inject-tokens ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
console.log(`Targets scanned: ${targets.length}`);
console.log(`  Inserted: ${counts.inserted}`);
console.log(`  Updated:  ${counts.updated}`);
console.log(`  Kept:     ${counts.kept}`);
console.log(`  Skipped (no frontmatter): ${counts.skippedNoFm}`);
console.log(`  Skipped (malformed):      ${counts.skippedMalformed}`);

if (changes.length && (DRY_RUN || process.argv.includes('--verbose'))) {
  console.log('\n--- Changes ---');
  for (const c of changes) console.log(c);
}

if (skipped.length) {
  console.log('\n--- Skipped ---');
  for (const s of skipped) console.log(s);
}

// Stats on token distribution
if (tokenValues.length) {
  const nums = tokenValues.map(t => t.tokens).sort((a, b) => a - b);
  const min = nums[0];
  const max = nums[nums.length - 1];
  const median = nums[Math.floor(nums.length / 2)];
  console.log(`\n--- Token distribution (all ${tokenValues.length} files) ---`);
  console.log(`min=${min} median=${median} max=${max}`);
}
