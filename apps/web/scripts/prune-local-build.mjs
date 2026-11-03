import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const outputRoot = resolve(process.cwd(), 'out');
const localOnlyRoutes = ['admin', 'pricing', 'settings'];

if (!existsSync(resolve(outputRoot, 'index.html'))) {
  throw new Error('Local build output is missing; refusing to prune an unknown directory.');
}

for (const route of localOnlyRoutes) {
  for (const suffix of ['', '.html', '.txt']) {
    const target = resolve(outputRoot, `${route}${suffix}`);
    if (!target.startsWith(`${outputRoot}/`)) {
      throw new Error(`Unsafe build target: ${target}`);
    }
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
}

console.log('Local-only build: removed admin, pricing, settings, and billing routes.');
