import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const folder of ['src', 'scripts', 'test']) {
  const root = new URL(`../${folder}/`, import.meta.url);
  for (const name of await readdir(root)) {
    if (!name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(name, root))], {
      stdio: 'inherit',
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
console.log('Cú pháp JavaScript backend hợp lệ.');
