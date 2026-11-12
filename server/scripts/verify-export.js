import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FIELDS, validateLecturer } from '../src/validation.js';

try {
  if (!process.argv[2])
    throw new Error(
      'Chỉ định đường dẫn JSON: npm.cmd run verify-export -- ../exports/GiangVien.json',
    );
  const rows = JSON.parse(await readFile(resolve(process.argv[2]), 'utf8'));
  if (!Array.isArray(rows)) throw new Error('JSON phải là mảng giảng viên.');
  const codes = new Set();
  for (const [index, row] of rows.entries()) {
    if (
      !row ||
      Object.keys(row).length !== FIELDS.length ||
      !FIELDS.every((key) => Object.hasOwn(row, key))
    )
      throw new Error(`Dòng ${index + 1} không có đúng bốn trường của đề.`);
    const value = await validateLecturer(row);
    if (codes.has(value.IDGV)) throw new Error(`Dòng ${index + 1} có IDGV trùng.`);
    codes.add(value.IDGV);
  }
  console.log(
    `JSON hợp lệ: ${rows.length} giảng viên, mỗi bản ghi đúng IDGV, Fullname, Image, SumClass. Không sửa file.`,
  );
} catch (error) {
  console.error(error.fields ? 'JSON có giá trị trường không hợp lệ.' : error.message);
  process.exitCode = 1;
}
