import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { readMongoDnsServers } from './mongo-dns.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export function readMongoUri(env = process.env) {
  const uri = env.MONGODB_URI?.trim();
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri) || /[<>]/.test(uri)) {
    throw new Error('Điền MONGODB_URI thật trong server/.env.');
  }
  return uri;
}

export function loadConfig(env = process.env) {
  const mongodbUri = readMongoUri(env);
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET phải có ít nhất 32 ký tự ngẫu nhiên.');
  }
  if (!env.ADMIN_USERNAME?.trim() || env.ADMIN_USERNAME.trim().length > 100) {
    throw new Error('Điền ADMIN_USERNAME (1–100 ký tự).');
  }
  if (
    typeof env.ADMIN_PASSWORD !== 'string' ||
    !env.ADMIN_PASSWORD.trim() ||
    env.ADMIN_PASSWORD.length < 8 ||
    Buffer.byteLength(env.ADMIN_PASSWORD, 'utf8') > 72
  ) {
    throw new Error(
      'Điền ADMIN_PASSWORD trong server/.env (ít nhất 8 ký tự, tối đa 72 byte UTF-8).',
    );
  }
  const port = Number(env.PORT || 4000);
  const ttlMinutes = Number(env.JWT_TTL_MINUTES || 60);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT không hợp lệ.');
  if (!Number.isInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 1440) {
    throw new Error('JWT_TTL_MINUTES phải từ 1 đến 1440.');
  }
  const origins = (env.CORS_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    origins.some((origin) => {
      try {
        return new URL(origin).origin !== origin || !/^https?:/.test(origin);
      } catch {
        return true;
      }
    })
  )
    throw new Error('CORS_ORIGINS phải chứa các origin HTTP/HTTPS hợp lệ, không có dấu / cuối.');
  return {
    mongodbUri,
    mongoDnsServers: readMongoDnsServers(env),
    port,
    host: env.HOST || '0.0.0.0',
    origins,
    ttlMinutes,
    jwtSecret: env.JWT_SECRET,
    adminUsername: env.ADMIN_USERNAME.trim(),
    adminPassword: env.ADMIN_PASSWORD,
  };
}
