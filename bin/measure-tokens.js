#!/usr/bin/env node
// Approximate token count using ~4 chars/token heuristic.
// Measures body only, frontmatter excluded.
import fs from 'fs';

export function measureTokens(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const body = content.replace(/^---[\s\S]*?---\n/, '');
  return Math.round(body.length / 4);
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) { console.error('usage: measure-tokens.js <file>'); process.exit(1); }
  console.log(measureTokens(file));
}
