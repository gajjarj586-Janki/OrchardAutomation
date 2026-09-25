import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import fs from 'node:fs';
import path from 'node:path';

function findTestFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findTestFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

const srcDir = path.join(process.cwd(), 'src');
const files = fs.existsSync(srcDir) ? findTestFiles(srcDir) : [];

if (files.length === 0) {
  console.log('No unit test files found under src/.');
  process.exit(0);
}

const stream = run({ files, concurrency: true });

stream.on('test:fail', () => {
  process.exitCode = 1;
});

(stream as unknown as { compose: (fn: unknown) => NodeJS.ReadableStream })
  .compose(spec)
  .pipe(process.stdout);
