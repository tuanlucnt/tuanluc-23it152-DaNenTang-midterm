import { mkdir, open } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMongoUri } from '../src/config.js';
import { readMongoDnsServers } from '../src/mongo-dns.js';
import { openDatabase } from '../src/database.js';
import { submissionRecord } from '../src/validation.js';

const target = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL('../../exports/GiangVien.json', import.meta.url));
let connection;
let file;
try {
  connection = await openDatabase(readMongoUri(), readMongoDnsServers());
  await mkdir(dirname(target), { recursive: true });
  file = await open(target, 'wx'); // Không ghi đè một bản xuất đã có.
  await file.write('[\n');
  let count = 0;
  const cursor = connection.db
    .collection('GiangVien')
    .find({}, { projection: { _id: 0, IDGV: 1, Fullname: 1, Image: 1, SumClass: 1 } })
    .sort({ IDGV: 1 });
  for await (const row of cursor) {
    await file.write(`${count ? ',\n' : ''}${JSON.stringify(submissionRecord(row), null, 2)}`);
    count++;
  }
  await file.write('\n]\n');
  console.log(
    `Đã xuất ${count} giảng viên từ QLHocPhan.GiangVien đến ${target}. Không sửa dữ liệu gốc.`,
  );
} catch (error) {
  console.error(
    error.code === 'EEXIST'
      ? 'File đích đã tồn tại. Hãy chọn tên file mới.'
      : 'Xuất thất bại. Kiểm tra MONGODB_URI, mạng và quyền ghi file; file dở dang (nếu có) không dùng để nộp.',
  );
  process.exitCode = 1;
} finally {
  await file?.close();
  await connection?.close();
}
