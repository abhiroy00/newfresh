#!/usr/bin/env node
/**
 * fix-jsx.js
 * Fixes double-curly-brace compression in .tsx files.
 *
 * The Notion AI system compresses token patterns in JSX.
 * This script replaces common Moti prop patterns and Image source props
 * with the correct JSX object syntax.
 *
 * Run: node scripts/fix-jsx.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT = path.resolve(__dirname, '..');

// Find all .tsx files
const files = glob.sync('**/*.tsx', {
  cwd: ROOT,
  ignore: ['node_modules/**', '.expo/**'],
  absolute: true,
});

let totalFixed = 0;

for (const filePath of files) {
  let src = fs.readFileSync(filePath, 'utf8');
  let fixed = src;

  // Fix Moti `from=` prop — replace compressed tokens with empty objects
  // Pattern: from=NNN → from= opacity: 0, translateY: 20 
  // Since we can't know original values, we use sensible defaults.
  // For best results, review each file manually after running this script.

  // Fix Image source=NNN patterns to source= uri: '...' 
  // These are handled per-file.

  // Fix style=NNN to style={{}}
  fixed = fixed.replace(/style=\{\{\d+\}\}/g, 'style={{}}');

  // Fix from=NNN → from= opacity: 0, translateY: 24 
  fixed = fixed.replace(/from=\{\{\d+\}\}/g, "from= opacity: 0, translateY: 24 ");

  // Fix animate=NNN → animate= opacity: 1, translateY: 0 
  fixed = fixed.replace(/animate=\{\{\d+\}\}/g, "animate= opacity: 1, translateY: 0 ");

  // Fix transition=NNN → transition= type: 'spring', damping: 18 
  fixed = fixed.replace(/transition=\{\{\d+\}\}/g, "transition= type: 'spring', damping: 18 ");

  // Fix source=NNN → source= uri: '' 
  fixed = fixed.replace(/source=\{\{\d+\}\}/g, "source= uri: '' ");

  // Fix View/Pressable style= height: NNN  → style= height: 80 
  fixed = fixed.replace(/style=\{\{(\d+)\}\}/g, 'style={{}}');

  if (fixed !== src) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    totalFixed++;
    console.log(`✅ Fixed: ${path.relative(ROOT, filePath)}`);
  }
}

console.log(`\n🎉 Done! Fixed ${totalFixed} file(s).`);
console.log('\n⚠️  Note: Review fixed files to ensure Moti prop values are correct.');
console.log('   from= opacity: 0, translateY: 24  is used as a default.');
