#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();

const pairs = [
  { from: path.join(root, 'app', 'api'), to: path.join(root, 'app', '__api_disabled__') },
  { from: path.join(root, 'middleware.ts'), to: path.join(root, 'middleware.ts.disabled') },
];

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function renameSafe(from, to) {
  if (!exists(from)) return;
  try {
    fs.renameSync(from, to);
    console.log(`[export] Renamed: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  } catch (e) {
    console.error(`[export] Failed to rename ${from} -> ${to}:`, e.message);
  }
}

function restore() {
  // restore in reverse order
  for (const { from, to } of pairs.slice().reverse()) {
    if (exists(to)) {
      try {
        fs.renameSync(to, from);
        console.log(`[export] Restored: ${path.relative(root, to)} -> ${path.relative(root, from)}`);
      } catch (e) {
        console.error(`[export] Failed to restore ${to} -> ${from}:`, e.message);
      }
    }
  }
}

(function main() {
  // Pre: disable server-only features
  for (const p of pairs) renameSafe(p.from, p.to);

  // Build
  let code = 0;
  try {
    const res = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '_next_build_export_internal'], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    code = typeof res.status === 'number' ? res.status : 0;
  } catch (e) {
    console.error('[export] Build failed:', e.message);
    code = 1;
  } finally {
    // Post: always restore
    restore();
  }

  process.exit(code);
})();
