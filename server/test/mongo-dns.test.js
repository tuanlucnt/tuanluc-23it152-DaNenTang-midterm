import { test } from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns';
import { configureMongoDns, readMongoDnsServers } from '../src/mongo-dns.js';
import { loadConfig } from '../src/config.js';
import { randomBytes } from 'node:crypto';

test('resolver công cộng được áp dụng cho cả API DNS callback và promises của Node', () => {
  const original = dns.getServers();
  try {
    const servers = readMongoDnsServers({ MONGODB_DNS_SERVERS: ' 1.1.1.1, 8.8.8.8,1.1.1.1 ' });
    configureMongoDns('mongodb+srv://example.mongodb.net/QLHocPhan', servers);
    assert.deepEqual(dns.getServers(), ['1.1.1.1', '8.8.8.8']);
    assert.deepEqual(dns.promises.getServers(), ['1.1.1.1', '8.8.8.8']);
  } finally {
    dns.setServers(original);
  }
});

test('URI MongoDB cục bộ hoặc danh sách DNS trống giữ resolver hiện tại', () => {
  const original = dns.getServers();
  configureMongoDns('mongodb://127.0.0.1/QLHocPhan_test', ['1.1.1.1']);
  assert.deepEqual(dns.getServers(), original);
  configureMongoDns('mongodb+srv://example.mongodb.net/QLHocPhan', readMongoDnsServers({}));
  assert.deepEqual(dns.getServers(), original);
});

test('DNS sai, CIDR mở mọi IP và URI có credentials bị từ chối mà không lộ giá trị', () => {
  for (const value of [
    '0.0.0.0/0',
    '0.0.0.0',
    '::',
    '255.255.255.255',
    'dns.example.org',
    'mongodb+srv://user:private@example.org',
    '1.1.1.1,2.2.2.2,3.3.3.3,4.4.4.4,5.5.5.5',
  ]) {
    assert.throws(
      () => readMongoDnsServers({ MONGODB_DNS_SERVERS: value }),
      (error) => {
        assert.match(error.message, /^MONGODB_DNS_SERVERS/);
        assert.ok(!error.message.includes(value));
        return true;
      },
    );
  }
});

test('loadConfig chuyển DNS từ env sang cấu hình kết nối và giữ nguyên URI', () => {
  const uri = 'mongodb+srv://example.mongodb.net/QLHocPhan';
  const config = loadConfig({
    MONGODB_URI: uri,
    MONGODB_DNS_SERVERS: '1.1.1.1,8.8.8.8',
    JWT_SECRET: randomBytes(32).toString('hex'),
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: randomBytes(16).toString('hex'),
  });
  assert.equal(config.mongodbUri, uri);
  assert.deepEqual(config.mongoDnsServers, ['1.1.1.1', '8.8.8.8']);
});
