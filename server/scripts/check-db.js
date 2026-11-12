import { readMongoUri } from '../src/config.js';
import { readMongoDnsServers } from '../src/mongo-dns.js';
import { openDatabase } from '../src/database.js';

let connection;
try {
  const servers = readMongoDnsServers();
  connection = await openDatabase(readMongoUri(), servers);
  await connection.db.command({ ping: 1 });
  const row = await connection.db
    .collection('GiangVien')
    .findOne(
      { IDGV: 'GV001' },
      { projection: { _id: 0, IDGV: 1, Fullname: 1, Image: 1, SumClass: 1 } },
    );
  console.log('Kết nối Atlas thành công: QLHocPhan.GiangVien.');
  console.log(
    servers.length ? `DNS riêng của Node: ${servers.join(', ')}.` : 'Đang dùng DNS hệ thống.',
  );
  console.log(row ? 'Đọc được GV001.' : 'Kết nối được nhưng chưa tìm thấy GV001.');
  console.log('Chỉ đọc: không tạo index, thêm, sửa, xóa hoặc xuất dữ liệu.');
} catch (error) {
  const isDns =
    error.syscall?.startsWith('query') ||
    ['ENOTFOUND', 'ESERVFAIL', 'ETIMEOUT'].includes(error.code);
  const isConfig = /^(Điền |MONGODB_DNS_SERVERS)/.test(error.message);
  console.error(
    isConfig
      ? error.message
      : isDns
        ? 'Không truy vấn được DNS Atlas. Kiểm tra MONGODB_DNS_SERVERS và mạng.'
        : 'Không kết nối/đọc được Atlas. Kiểm tra mạng, database user và IP Access List.',
  );
  process.exitCode = 1;
} finally {
  await connection?.close();
}
