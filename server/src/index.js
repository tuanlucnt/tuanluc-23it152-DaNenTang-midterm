import { loadConfig } from './config.js';
import { connectDatabase } from './database.js';
import { createApp } from './app.js';

let connection;
try {
  const config = loadConfig();
  const database = await connectDatabase(config.mongodbUri, config.mongoDnsServers);
  connection = database.connection;
  const app = createApp({ config, Model: database.Model });
  const server = app.listen(config.port, config.host, () => {
    console.log(`API sẵn sàng trên cổng ${config.port}; database QLHocPhan, collection GiangVien.`);
  });
  server.on('error', async (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? 'Cổng API đang được sử dụng. Đổi PORT hoặc dừng tiến trình cũ.'
        : 'Không thể mở cổng API.',
    );
    await connection.close();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    server.close(async () => {
      await connection.close();
    });
    server.closeIdleConnections();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  // Chỉ đưa ra các lỗi cấu hình do chính ứng dụng tạo; không lộ URI của driver.
  const known = /^(Điền |JWT_|ADMIN_|PORT |CORS_|MONGODB_DNS_SERVERS|IDGV trùng)/.test(
    error.message,
  );
  console.error(
    known
      ? error.message
      : 'Không thể kết nối/chuẩn bị MongoDB. Kiểm tra URI, quyền database, IP Access List và mạng; chưa mở cổng API.',
  );
  if (connection) await connection.close();
  process.exitCode = 1;
}
