import fs from 'node:fs';
import path from 'node:path';

const TARGETS = ['dist', 'reports', 'test-results', 'playwright-report', 'blob-report'];

for (const target of TARGETS) {
  const targetPath = path.join(process.cwd(), target);
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(`Removed ${target}/`);
  }
}
