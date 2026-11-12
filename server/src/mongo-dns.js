import dns from 'node:dns';
import { isIP } from 'node:net';

export function readMongoDnsServers(env = process.env) {
  const value = env.MONGODB_DNS_SERVERS ?? '';
  if (typeof value !== 'string')
    throw new Error('MONGODB_DNS_SERVERS phải là danh sách địa chỉ IP DNS.');
  const servers = [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
  if (
    servers.length > 4 ||
    servers.some((server) => !isIP(server) || ['0.0.0.0', '::', '255.255.255.255'].includes(server))
  ) {
    throw new Error(
      'MONGODB_DNS_SERVERS cần 1–4 IP DNS hợp lệ, phân cách bằng dấu phẩy; để trống để dùng DNS hệ thống.',
    );
  }
  return servers;
}

export function configureMongoDns(uri, servers = []) {
  if (!uri.startsWith('mongodb+srv://') || servers.length === 0) return;
  // Chỉ đổi resolver của tiến trình Node này, trước mọi truy vấn SRV/TXT.
  // Không thay DNS Windows, URI, authSource hay cấu hình TLS của Atlas.
  dns.setServers(servers);
}
