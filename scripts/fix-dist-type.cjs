/**
 * Fix ES module conflict for Electron compiled output.
 *
 * The root package.json has "type": "module" (required by Nuxt 3),
 * but tsc compiles the Electron code to CommonJS (using `exports`).
 * Without this file, Node.js treats the CJS output as ESM and crashes with:
 *   "exports is not defined in ES module scope"
 *
 * This script writes a dist-electron/package.json with "type": "commonjs"
 * so Node.js correctly resolves the compiled Electron files as CommonJS.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist-electron');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const pkgPath = path.join(distDir, 'package.json');
const content = JSON.stringify({ type: 'commonjs' }, null, 2) + '\n';

fs.writeFileSync(pkgPath, content, 'utf8');
console.log('[fix-dist-type] Written', pkgPath);
