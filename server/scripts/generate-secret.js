import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../.env', import.meta.url);
try {
  const content = await readFile(path, 'utf8');
  const line = content.match(/^JWT_SECRET=(.*)$/m);
  if (line && line[1].trim())
    throw new Error('JWT_SECRET đã có giá trị; không tự ghi đè secret đang dùng.');
  const replacement = `JWT_SECRET=${randomBytes(48).toString('hex')}`;
  const next = line
    ? content.replace(/^JWT_SECRET=.*$/m, replacement)
    : `${content}\n${replacement}\n`;
  await writeFile(path, next, { encoding: 'utf8', mode: 0o600 });
  console.log('Đã tạo JWT_SECRET trong server/.env (không in giá trị).');
} catch (error) {
  console.error(
    error.code === 'ENOENT'
      ? 'Hãy sao chép server/.env.example thành server/.env trước.'
      : error.message,
  );
  process.exitCode = 1;
}
